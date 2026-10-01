"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moneyCents, type PlanningSourceMode } from "@/lib/planning-engine";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const MODES = new Set<PlanningSourceMode>(["current_plan","trailing_3_closed","manual"]);

function fail(message: string): never {
  redirect("/forecast?error=" + encodeURIComponent(message));
}

function done(message: string): never {
  revalidatePath("/forecast");
  revalidatePath("/");
  redirect("/forecast?message=" + encodeURIComponent(message));
}

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

export async function savePlanningEngineProfile(form: FormData) {
  const { supabase, userId } = await requireUser();

  const horizonMonths = Number.parseInt(text(form,"horizon_months"),10);
  const incomeMode = text(form,"planned_income_mode") as PlanningSourceMode;
  const expenseMode = text(form,"planned_expense_mode") as PlanningSourceMode;
  const probableWindow = Number.parseInt(text(form,"probable_window_months"),10);
  const incomeRaw = text(form,"manual_monthly_income");
  const expenseRaw = text(form,"manual_monthly_expense");
  const reserveRaw = text(form,"reserve_monthly_allocation") || "0";
  const manualIncome = incomeRaw ? moneyCents(incomeRaw) : null;
  const manualExpense = expenseRaw ? moneyCents(expenseRaw) : null;
  const reserveAllocation = moneyCents(reserveRaw);
  const notes = text(form,"notes");

  if (!Number.isInteger(horizonMonths) || horizonMonths < 3 || horizonMonths > 24) {
    fail("Escolha um horizonte entre 3 e 24 meses.");
  }
  if (!MODES.has(incomeMode) || !MODES.has(expenseMode)) {
    fail("Fonte de planejamento inválida.");
  }
  if (!Number.isInteger(probableWindow) || probableWindow < 1 || probableWindow > 12) {
    fail("A janela histórica deve ter entre 1 e 12 meses.");
  }
  if (incomeMode === "manual" && manualIncome === null) {
    fail("Informe a renda mensal manual.");
  }
  if (expenseMode === "manual" && manualExpense === null) {
    fail("Informe a despesa mensal manual.");
  }
  if (incomeRaw && manualIncome === null) fail("Renda manual inválida.");
  if (expenseRaw && manualExpense === null) fail("Despesa manual inválida.");
  if (reserveAllocation === null) fail("Aporte mensal da reserva inválido.");
  if (notes.length > 400) fail("Use até 400 caracteres nas observações.");

  const { error } = await supabase.from("planning_engine_profiles").upsert({
    user_id: userId,
    horizon_months: horizonMonths,
    planned_income_mode: incomeMode,
    planned_expense_mode: expenseMode,
    manual_monthly_income: manualIncome === null ? null : manualIncome / 100,
    manual_monthly_expense: manualExpense === null ? null : manualExpense / 100,
    probable_window_months: probableWindow,
    reserve_monthly_allocation: reserveAllocation / 100,
    include_goals: form.get("include_goals") === "on",
    include_provisions: form.get("include_provisions") === "on",
    include_debt_minimums: form.get("include_debt_minimums") === "on",
    include_debt_extra: form.get("include_debt_extra") === "on",
    notes: notes || null,
    updated_at: new Date().toISOString(),
  });

  if (error) fail("Não foi possível salvar as premissas do motor.");
  done("Premissas do motor de planejamento salvas.");
}
