"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moneyCents, percentValue, type DebtStrategy } from "@/lib/debts";
import { todayInBrazil } from "@/lib/finance";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const TYPES = new Set(["credit_card","personal_loan","financing","overdraft","installment","other"]);
const STRATEGIES = new Set<DebtStrategy>(["avalanche","snowball"]);

function fail(message: string): never {
  redirect("/debts?error=" + encodeURIComponent(message));
}
function done(message: string): never {
  revalidatePath("/debts");
  revalidatePath("/");
  redirect("/debts?message=" + encodeURIComponent(message));
}
async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

function debtFields(form: FormData, creating: boolean) {
  const name = text(form,"name");
  const creditor = text(form,"creditor");
  const debt_type = text(form,"debt_type");
  const rateRaw = text(form,"annual_interest_rate");
  const annual_interest_rate = rateRaw ? percentValue(rateRaw) : null;
  const minimumCents = moneyCents(text(form,"minimum_payment") || "0");
  const dueRaw = text(form,"due_day");
  const due_day = dueRaw ? Number.parseInt(dueRaw,10) : null;
  const notes = text(form,"notes");

  if (name.length < 2 || name.length > 80) fail("Informe um nome de dívida entre 2 e 80 caracteres.");
  if (creditor.length > 100) fail("Use até 100 caracteres no credor.");
  if (!TYPES.has(debt_type)) fail("Tipo de dívida inválido.");
  if (Number.isNaN(annual_interest_rate)) fail("Taxa anual inválida. Use até quatro casas decimais.");
  if (minimumCents === null) fail("Parcela mínima inválida.");
  if (due_day !== null && (!Number.isInteger(due_day) || due_day < 1 || due_day > 31)) fail("Dia de vencimento inválido.");
  if (notes.length > 300) fail("Use até 300 caracteres nas observações.");

  let current_balance: number | undefined;
  if (creating) {
    const balanceCents = moneyCents(text(form,"current_balance"));
    if (balanceCents === null || balanceCents <= 0) fail("Informe um saldo atual positivo.");
    current_balance = balanceCents / 100;
  }

  return {
    name,
    creditor: creditor || null,
    debt_type,
    annual_interest_rate,
    minimum_payment: minimumCents / 100,
    due_day,
    notes: notes || null,
    ...(current_balance === undefined ? {} : { current_balance }),
    updated_at: new Date().toISOString(),
  };
}

export async function saveDebtStrategy(form: FormData) {
  const { supabase, userId } = await requireUser();
  const strategy = text(form,"strategy") as DebtStrategy;
  const extraCents = moneyCents(text(form,"extra_monthly_payment") || "0");
  const notes = text(form,"notes");

  if (!STRATEGIES.has(strategy)) fail("Estratégia inválida.");
  if (extraCents === null) fail("Pagamento extra mensal inválido.");
  if (notes.length > 300) fail("Use até 300 caracteres nas observações.");

  const { error } = await supabase.from("debt_strategy_profiles").upsert({
    user_id: userId,
    strategy,
    extra_monthly_payment: extraCents / 100,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  });
  if (error) fail("Não foi possível salvar a estratégia.");
  done("Estratégia de dívidas salva.");
}

export async function createDebt(form: FormData) {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("debts").insert({
    ...debtFields(form,true),
    user_id: userId,
    status: "active",
  });
  if (error) fail("Não foi possível cadastrar a dívida.");
  done("Dívida cadastrada.");
}

export async function updateDebt(form: FormData) {
  const { supabase, userId } = await requireUser();
  const id = text(form,"id");
  if (!uuid(id)) fail("Dívida inválida.");
  const { data, error } = await supabase
    .from("debts")
    .update(debtFields(form,false))
    .eq("id",id)
    .eq("user_id",userId)
    .select("id")
    .maybeSingle();
  if (error || !data) fail("Não foi possível atualizar a dívida.");
  done("Dívida atualizada.");
}

export async function changeDebtStatus(form: FormData) {
  const { supabase, userId } = await requireUser();
  const id = text(form,"id");
  const status = text(form,"status");
  if (!uuid(id) || !["active","archived"].includes(status)) fail("Dívida inválida.");

  const { data: debt, error: debtError } = await supabase
    .from("debts")
    .select("current_balance,status")
    .eq("id",id)
    .eq("user_id",userId)
    .maybeSingle();
  if (debtError || !debt) fail("Dívida não encontrada.");
  if (debt.status === "paid") fail("Dívida quitada não pode ser reativada neste MVP.");

  const { data, error } = await supabase
    .from("debts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id",id)
    .eq("user_id",userId)
    .select("id")
    .maybeSingle();
  if (error || !data) fail("Não foi possível alterar a dívida.");
  done(status === "archived" ? "Dívida arquivada." : "Dívida reativada.");
}

export async function recordDebtPayment(form: FormData) {
  const { supabase } = await requireUser();
  const debtId = text(form,"debt_id");
  const amountCents = moneyCents(text(form,"amount"));
  const balanceCents = moneyCents(text(form,"resulting_balance"));
  const occurredOn = text(form,"occurred_on");
  const note = text(form,"note");

  if (!uuid(debtId)) fail("Dívida inválida.");
  if (amountCents === null || amountCents <= 0) fail("Informe um pagamento positivo.");
  if (balanceCents === null) fail("Informe o novo saldo da dívida.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn) || occurredOn > todayInBrazil()) fail("Informe uma data válida, até hoje.");
  if (note.length > 160) fail("Use até 160 caracteres na descrição.");

  const { error } = await supabase.rpc("record_debt_payment", {
    p_debt_id: debtId,
    p_amount: amountCents / 100,
    p_resulting_balance: balanceCents / 100,
    p_occurred_on: occurredOn,
    p_note: note || null,
  });

  if (error) {
    if (error.message?.includes("closed financial period")) fail("Esse mês está fechado e não pode receber novos pagamentos.");
    if (error.message?.includes("resulting balance")) fail("O novo saldo não pode ser maior que o saldo atual ao registrar um pagamento.");
    fail("Não foi possível registrar o pagamento.");
  }
  done(balanceCents === 0 ? "Pagamento registrado. Dívida marcada como quitada." : "Pagamento registrado e saldo atualizado.");
}
