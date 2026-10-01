"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moneyCents, type PaymentMethodKind } from "@/lib/automation";
import { currentMonthKey, normalizeMonthKey } from "@/lib/finance";

const KINDS = new Set<PaymentMethodKind>([
  "pix","credit_card","debit_card","cash","bank_transfer","other",
]);

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const uuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function route(month: string | null, key: "error"|"message", message: string): never {
  const safeMonth = month && /^\d{4}-\d{2}$/.test(month) ? normalizeMonthKey(month) : null;
  const qs = new URLSearchParams();
  if (safeMonth) qs.set("month",safeMonth);
  qs.set(key,message);
  redirect("/automation?" + qs.toString());
}

function fail(month: string | null, message: string): never {
  route(month,"error",message);
}

function done(month: string | null, message: string): never {
  revalidatePath("/automation");
  revalidatePath("/finance");
  revalidatePath("/");
  route(month,"message",message);
}

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, userId:data.user.id };
}

function nullableUuid(form: FormData, key: string, month: string | null) {
  const value = text(form,key);
  if (!value) return null;
  if (!uuid(value)) fail(month,"Referência inválida em " + key + ".");
  return value;
}

function recurringFields(form: FormData, month: string | null) {
  const description = text(form,"description");
  const amountCents = moneyCents(text(form,"amount"));
  const day = Number.parseInt(text(form,"day_of_month"),10);
  const effectiveMonthRaw = text(form,"effective_from");
  const effectiveMonth = normalizeMonthKey(effectiveMonthRaw);

  if (description.length < 1 || description.length > 160) {
    fail(month,"Informe uma descrição com até 160 caracteres.");
  }
  if (amountCents === null || amountCents <= 0) {
    fail(month,"Informe um valor recorrente maior que zero.");
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    fail(month,"O dia da recorrência deve ficar entre 1 e 31.");
  }
  if (!/^\d{4}-\d{2}$/.test(effectiveMonthRaw) || effectiveMonth !== effectiveMonthRaw) {
    fail(month,"Mês inicial inválido.");
  }

  const accountId = nullableUuid(form,"account_id",month);
  if (!accountId) fail(month,"Selecione a conta de origem.");

  return {
    p_effective_from:effectiveMonth + "-01",
    p_description:description,
    p_amount:amountCents / 100,
    p_day_of_month:day,
    p_account_id:accountId,
    p_category_id:nullableUuid(form,"category_id",month),
    p_merchant_id:nullableUuid(form,"merchant_id",month),
    p_payment_method_id:nullableUuid(form,"payment_method_id",month),
  };
}

function recurringError(message: string | undefined) {
  const value = message ?? "";
  if (
    value.includes("row-level security") ||
    value.includes("closed financial period") ||
    value.includes("violates")
  ) {
    return "Essa alteração não pode atingir um mês já fechado. Escolha o mês aberto seguinte.";
  }
  if (value.includes("duplicate key")) {
    return "Já existe uma versão para esse mês. Ajuste a própria versão aberta ou escolha outro mês.";
  }
  return "Não foi possível salvar a recorrência.";
}

export async function createPaymentMethod(form: FormData) {
  const { supabase,userId } = await requireUser();
  const month = text(form,"month") || currentMonthKey();
  const kind = text(form,"kind") as PaymentMethodKind;
  const name = text(form,"name");
  const brand = text(form,"card_brand");

  if (!KINDS.has(kind)) fail(month,"Tipo de pagamento inválido.");
  if (name.length < 1 || name.length > 100) fail(month,"Informe um nome com até 100 caracteres.");
  if (brand.length > 60) fail(month,"Use até 60 caracteres na bandeira.");

  const { error } = await supabase.from("payment_methods").insert({
    user_id:userId,
    kind,
    name,
    card_brand:["credit_card","debit_card"].includes(kind) && brand ? brand : null,
    is_active:true,
  });

  if (error?.code === "23505") fail(month,"Já existe uma forma de pagamento com esse nome.");
  if (error) fail(month,"Não foi possível cadastrar a forma de pagamento.");
  done(month,"Forma de pagamento cadastrada.");
}

export async function updatePaymentMethod(form: FormData) {
  const { supabase,userId } = await requireUser();
  const month = text(form,"month") || currentMonthKey();
  const id = text(form,"id");
  const kind = text(form,"kind") as PaymentMethodKind;
  const name = text(form,"name");
  const brand = text(form,"card_brand");
  const isActive = form.get("is_active") === "on";

  if (!uuid(id)) fail(month,"Forma de pagamento inválida.");
  if (!KINDS.has(kind)) fail(month,"Tipo de pagamento inválido.");
  if (name.length < 1 || name.length > 100) fail(month,"Informe um nome com até 100 caracteres.");
  if (brand.length > 60) fail(month,"Use até 60 caracteres na bandeira.");

  const { data,error } = await supabase
    .from("payment_methods")
    .update({
      kind,
      name,
      card_brand:["credit_card","debit_card"].includes(kind) && brand ? brand : null,
      is_active:isActive,
      updated_at:new Date().toISOString(),
    })
    .eq("id",id)
    .eq("user_id",userId)
    .select("id")
    .maybeSingle();

  if (error?.code === "23505") fail(month,"Já existe uma forma de pagamento com esse nome.");
  if (error || !data) fail(month,"Não foi possível atualizar a forma de pagamento.");
  done(month,"Forma de pagamento atualizada.");
}

export async function createRecurringExpense(form: FormData) {
  const { supabase } = await requireUser();
  const month = text(form,"month") || currentMonthKey();
  const fields = recurringFields(form,month);

  const { error } = await supabase.rpc("create_recurring_expense",fields);
  if (error) fail(month,recurringError(error.message));
  done(month,"Gasto recorrente criado. Ele passa a valer somente a partir do mês escolhido.");
}

export async function versionRecurringExpense(form: FormData) {
  const { supabase } = await requireUser();
  const month = text(form,"month") || currentMonthKey();
  const recurringId = text(form,"recurring_expense_id");
  if (!uuid(recurringId)) fail(month,"Recorrência inválida.");

  const fields = recurringFields(form,month);
  const { error } = await supabase.rpc("version_recurring_expense",{
    p_recurring_expense_id:recurringId,
    ...fields,
    p_is_active:form.get("is_active") === "on",
  });

  if (error) fail(month,recurringError(error.message));
  done(month,"Nova configuração da recorrência salva sem alterar meses fechados.");
}

export async function syncRecurringMonth(form: FormData) {
  const { supabase } = await requireUser();
  const rawMonth = text(form,"month");
  const month = normalizeMonthKey(rawMonth);
  if (!/^\d{4}-\d{2}$/.test(rawMonth) || month !== rawMonth) {
    fail(null,"Mês inválido.");
  }

  const { data,error } = await supabase.rpc("sync_recurring_month",{p_month:month + "-01"});
  if (error) {
    if (error.message?.includes("closed financial period")) {
      fail(month,"O mês está fechado e não pode ser sincronizado.");
    }
    fail(month,"Não foi possível sincronizar as recorrências.");
  }

  const result = (data ?? {}) as { synced?:number; removed?:number };
  done(
    month,
    "Sincronização concluída: " +
      String(result.synced ?? 0) +
      " recorrências aplicadas e " +
      String(result.removed ?? 0) +
      " lançamentos automáticos removidos.",
  );
}

export async function closeFinancialPeriod(form: FormData) {
  const { supabase } = await requireUser();
  const rawMonth = text(form,"month");
  const month = normalizeMonthKey(rawMonth);
  const reconciliation = text(form,"reconciliation_status");
  const notes = text(form,"notes");

  if (!/^\d{4}-\d{2}$/.test(rawMonth) || month !== rawMonth) {
    fail(null,"Mês inválido.");
  }
  if (form.get("confirm_close") !== "on") {
    fail(month,"Confirme que entende que o fechamento é definitivo.");
  }
  if (!["reconciled","unreconciled","incomplete"].includes(reconciliation)) {
    fail(month,"Status de conciliação inválido.");
  }
  if (notes.length > 500) fail(month,"Use até 500 caracteres nas observações.");

  const { error } = await supabase.rpc("close_financial_period",{
    p_month:month + "-01",
    p_reconciliation_status:reconciliation,
    p_notes:notes || null,
  });

  if (error) {
    if (error.message?.includes("already closed")) fail(month,"Esse mês já está fechado.");
    if (error.message?.includes("future")) fail(month,"Não é possível fechar um mês futuro.");
    fail(month,"Não foi possível fechar o mês.");
  }

  done(month,"Mês fechado. O balanço desse período agora é imutável.");
}
