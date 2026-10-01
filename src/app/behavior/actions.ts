"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moneyCents, percentageValue } from "@/lib/behavior";
import { normalizeMonthKey } from "@/lib/finance";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const INTENTIONS = new Set(["observe","maintain","reduce","redirect"]);

function fail(month: string | null, message: string): never {
  const query = month ? "?month=" + encodeURIComponent(month) + "&" : "?";
  redirect("/behavior" + query + "error=" + encodeURIComponent(message));
}

function done(month: string | null, message: string): never {
  revalidatePath("/behavior");
  revalidatePath("/");
  const query = month ? "?month=" + encodeURIComponent(month) + "&" : "?";
  redirect("/behavior" + query + "message=" + encodeURIComponent(message));
}

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

export async function saveBehaviorProfile(form: FormData) {
  const { supabase, userId } = await requireUser();
  const month = text(form,"month") || null;
  const windowMonths = Number.parseInt(text(form,"comparison_window_months"),10);
  const monthlyPct = percentageValue(text(form,"monthly_change_pct"));
  const categoryPct = percentageValue(text(form,"category_change_pct"));
  const categoryMinCents = moneyCents(text(form,"category_min_change"));
  const frequencyPct = percentageValue(text(form,"frequency_change_pct"));
  const merchantCoverage = percentageValue(text(form,"merchant_min_coverage_pct"),100);
  const merchantConcentration = percentageValue(text(form,"merchant_concentration_pct"),100);
  const notes = text(form,"notes");

  if (!Number.isInteger(windowMonths) || windowMonths < 1 || windowMonths > 12) {
    fail(month,"A janela de comparação deve ter entre 1 e 12 meses.");
  }
  if (
    monthlyPct === null || categoryPct === null || categoryMinCents === null ||
    frequencyPct === null || merchantCoverage === null || merchantConcentration === null
  ) {
    fail(month,"Uma das regras de atenção é inválida.");
  }
  if (notes.length > 300) fail(month,"Use até 300 caracteres nas observações.");

  const { error } = await supabase.from("behavior_profiles").upsert({
    user_id: userId,
    comparison_window_months: windowMonths,
    monthly_change_pct: monthlyPct,
    category_change_pct: categoryPct,
    category_min_change: categoryMinCents / 100,
    frequency_change_pct: frequencyPct,
    merchant_min_coverage_pct: merchantCoverage,
    merchant_concentration_pct: merchantConcentration,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  });

  if (error) fail(month,"Não foi possível salvar as regras de comportamento.");
  done(month,"Regras de atenção atualizadas.");
}

export async function saveBehaviorCheckin(form: FormData) {
  const { supabase, userId } = await requireUser();
  const month = text(form,"month");
  const normalized = normalizeMonthKey(month);
  const intention = text(form,"intention");
  const categoryId = text(form,"focus_category_id");
  const reflection = text(form,"reflection");

  if (!/^\d{4}-\d{2}$/.test(month) || normalized !== month) {
    fail(null,"Mês do check-in inválido.");
  }
  if (!INTENTIONS.has(intention)) fail(month,"Intenção do check-in inválida.");
  if (reflection.length > 400) fail(month,"Use até 400 caracteres na reflexão.");

  let focusCategoryId: string | null = null;
  if (categoryId) {
    if (!uuid(categoryId)) fail(month,"Categoria de foco inválida.");
    const { data, error } = await supabase
      .from("categories")
      .select("id,kind")
      .eq("id",categoryId)
      .maybeSingle();
    if (error || !data || data.kind !== "expense") {
      fail(month,"Categoria de foco não encontrada.");
    }
    focusCategoryId = categoryId;
  }

  const { error } = await supabase.from("behavior_checkins").upsert(
    {
      user_id: userId,
      month: month + "-01",
      intention,
      focus_category_id: focusCategoryId,
      reflection: reflection || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,month" },
  );

  if (error) fail(month,"Não foi possível salvar o check-in.");
  done(month,"Check-in mensal salvo.");
}
