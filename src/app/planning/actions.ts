"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeMonthKey } from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";

function cleanText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseMoney(value: FormDataEntryValue | null, fallback = 0) {
  const raw = cleanText(value).replace(",", ".");
  if (!raw) return fallback;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function fail(month: string, message: string): never {
  redirect("/planning?month=" + encodeURIComponent(month) + "&error=" + encodeURIComponent(message));
}

function success(month: string, message: string): never {
  revalidatePath("/");
  revalidatePath("/planning");
  redirect("/planning?month=" + encodeURIComponent(month) + "&message=" + encodeURIComponent(message));
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

async function getOrCreatePlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  month: string,
) {
  const monthDate = month + "-01";

  const { data: existing, error: selectError } = await supabase
    .from("monthly_plans")
    .select("id")
    .eq("month", monthDate)
    .maybeSingle();

  if (selectError) return { id: null as string | null, error: selectError };

  if (existing?.id) return { id: existing.id as string, error: null };

  const { data: created, error: insertError } = await supabase
    .from("monthly_plans")
    .insert({
      user_id: userId,
      month: monthDate,
      planned_income: 0,
    })
    .select("id")
    .single();

  return { id: (created?.id as string | undefined) ?? null, error: insertError };
}

export async function saveMonthlyPlan(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const month = normalizeMonthKey(cleanText(formData.get("month")));
  const plannedIncome = parseMoney(formData.get("planned_income"));
  const notes = cleanText(formData.get("notes"));

  if (!Number.isFinite(plannedIncome) || plannedIncome < 0) {
    fail(month, "Receita planejada inválida.");
  }

  if (notes.length > 300) {
    fail(month, "As observações podem ter no máximo 300 caracteres.");
  }

  const { error } = await supabase
    .from("monthly_plans")
    .upsert(
      {
        user_id: userId,
        month: month + "-01",
        planned_income: plannedIncome,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,month" },
    );

  if (error) fail(month, "Não foi possível salvar o planejamento.");
  success(month, "Planejamento mensal salvo.");
}

export async function saveCategoryBudget(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const month = normalizeMonthKey(cleanText(formData.get("month")));
  const categoryId = cleanText(formData.get("category_id"));
  const amount = parseMoney(formData.get("planned_amount"));

  if (!categoryId) fail(month, "Categoria inválida.");
  if (!Number.isFinite(amount) || amount < 0) fail(month, "Limite planejado inválido.");

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, kind")
    .eq("id", categoryId)
    .maybeSingle();

  if (categoryError || !category || category.kind !== "expense") {
    fail(month, "Categoria de despesa não encontrada.");
  }

  const plan = await getOrCreatePlan(supabase, userId, month);
  if (plan.error || !plan.id) fail(month, "Não foi possível preparar o plano do mês.");

  if (amount === 0) {
    const { error } = await supabase
      .from("category_budgets")
      .delete()
      .eq("plan_id", plan.id)
      .eq("category_id", categoryId)
      .eq("user_id", userId);

    if (error) fail(month, "Não foi possível remover o limite.");
    success(month, "Limite da categoria removido.");
  }

  const { error } = await supabase
    .from("category_budgets")
    .upsert(
      {
        user_id: userId,
        plan_id: plan.id,
        category_id: categoryId,
        planned_amount: amount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "plan_id,category_id" },
    );

  if (error) fail(month, "Não foi possível salvar o limite da categoria.");
  success(month, "Limite da categoria salvo.");
}
