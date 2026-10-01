"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ACCOUNT_TYPES = new Set(["checking", "savings", "cash", "investment", "other"]);
const KINDS = new Set(["income", "expense"]);

function fail(message: string): never {
  redirect("/finance?error=" + encodeURIComponent(message));
}

function success(message: string): never {
  revalidatePath("/");
  revalidatePath("/finance");
  revalidatePath("/automation");
  redirect("/finance?message=" + encodeURIComponent(message));
}

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || typeof userId !== "string") {
    redirect("/login");
  }

  return { supabase, userId };
}

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseMoney(value: FormDataEntryValue | null, fallback?: number) {
  const raw = cleanText(value).replace(",", ".");

  if (!raw && fallback !== undefined) return fallback;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export async function createAccount(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const name = cleanText(formData.get("name"));
  const accountType = cleanText(formData.get("account_type"));
  const initialBalance = parseMoney(formData.get("initial_balance"), 0);

  if (name.length < 2 || name.length > 80) fail("Informe um nome de conta entre 2 e 80 caracteres.");
  if (!ACCOUNT_TYPES.has(accountType)) fail("Tipo de conta inválido.");
  if (!Number.isFinite(initialBalance)) fail("Saldo inicial inválido.");

  const { error } = await supabase.from("accounts").insert({
    user_id: userId,
    name,
    account_type: accountType,
    initial_balance: initialBalance,
    currency: "BRL",
  });

  if (error) fail("Não foi possível criar a conta.");
  success("Conta adicionada.");
}

export async function createCategory(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const name = cleanText(formData.get("name"));
  const kind = cleanText(formData.get("kind"));

  if (name.length < 2 || name.length > 80) fail("Informe uma categoria entre 2 e 80 caracteres.");
  if (!KINDS.has(kind)) fail("Tipo de categoria inválido.");

  const { error } = await supabase.from("categories").insert({
    user_id: userId,
    name,
    kind,
  });

  if (error?.code === "23505") fail("Essa categoria já existe.");
  if (error) fail("Não foi possível criar a categoria.");
  success("Categoria adicionada.");
}

export async function createTransaction(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const kind = cleanText(formData.get("kind"));
  const amount = parseMoney(formData.get("amount"));
  const occurredOn = cleanText(formData.get("occurred_on"));
  const accountId = cleanText(formData.get("account_id"));
  const categoryId = cleanText(formData.get("category_id"));
  const merchantId = cleanText(formData.get("merchant_id"));
  const paymentMethodId = cleanText(formData.get("payment_method_id"));
  const description = cleanText(formData.get("description"));

  if (!KINDS.has(kind)) fail("Tipo de movimentação inválido.");
  if (!Number.isFinite(amount) || amount <= 0) fail("Informe um valor maior que zero.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) fail("Data inválida.");
  if (!accountId) fail("Selecione uma conta.");
  if (description.length > 160) fail("A descrição pode ter no máximo 160 caracteres.");

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .maybeSingle();

  if (accountError || !account) fail("Conta não encontrada.");

  if (categoryId) {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id, kind")
      .eq("id", categoryId)
      .maybeSingle();

    if (categoryError || !category) fail("Categoria não encontrada.");
    if (category.kind !== kind) fail("A categoria não corresponde ao tipo do lançamento.");
  }

  if (merchantId) {
    const { data: merchant, error: merchantError } = await supabase
      .from("merchants")
      .select("id")
      .eq("id", merchantId)
      .eq("is_active", true)
      .maybeSingle();

    if (merchantError || !merchant) fail("Estabelecimento não encontrado ou inativo.");
  }

  if (paymentMethodId) {
    const { data: method, error: methodError } = await supabase
      .from("payment_methods")
      .select("id")
      .eq("id", paymentMethodId)
      .eq("is_active", true)
      .maybeSingle();

    if (methodError || !method) fail("Forma de pagamento não encontrada ou inativa.");
  }

  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    account_id: accountId,
    category_id: categoryId || null,
    merchant_id: merchantId || null,
    payment_method_id: paymentMethodId || null,
    kind,
    amount,
    occurred_on: occurredOn,
    description: description || null,
  });

  if (error?.message?.includes("row-level security")) {
    fail("Esse mês está fechado e não pode receber novos lançamentos.");
  }
  if (error) fail("Não foi possível registrar a movimentação.");
  success(kind === "income" ? "Receita registrada." : "Despesa registrada.");
}

export async function deleteTransaction(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const id = cleanText(formData.get("id"));

  if (!id) fail("Movimentação inválida.");

  const { data, error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error || !data) fail("Movimentação não encontrada ou pertencente a um mês fechado.");
  success("Movimentação excluída.");
}
