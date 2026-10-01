"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moneyCents, type BaselineMode } from "@/lib/resilience";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const BASELINE_MODES = new Set<BaselineMode>(["manual", "current_plan", "trailing_3_closed"]);

function fail(message: string): never {
  redirect("/resilience?error=" + encodeURIComponent(message));
}

function done(message: string): never {
  revalidatePath("/resilience");
  revalidatePath("/");
  redirect("/resilience?message=" + encodeURIComponent(message));
}

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

export async function saveResilienceProfile(form: FormData) {
  const { supabase, userId } = await requireUser();
  const months = Number.parseInt(text(form, "protection_months"), 10);
  const baselineMode = text(form, "baseline_mode") as BaselineMode;
  const manualRaw = text(form, "manual_essential_monthly");
  const reserveCents = moneyCents(text(form, "emergency_reserve_amount") || "0");
  const notes = text(form, "notes");

  if (!Number.isInteger(months) || months < 1 || months > 24) {
    fail("Escolha entre 1 e 24 meses de proteção.");
  }
  if (!BASELINE_MODES.has(baselineMode)) fail("Fonte do gasto essencial inválida.");
  const manualCents = manualRaw ? moneyCents(manualRaw) : null;
  if (baselineMode === "manual" && manualCents === null) {
    fail("Informe o gasto essencial mensal para o modo manual.");
  }
  if (manualRaw && manualCents === null) fail("Gasto essencial manual inválido.");
  if (reserveCents === null) fail("Valor da reserva de emergência inválido.");
  if (notes.length > 300) fail("Use até 300 caracteres nas observações.");

  const { error } = await supabase.from("resilience_profiles").upsert({
    user_id: userId,
    protection_months: months,
    baseline_mode: baselineMode,
    manual_essential_monthly: manualCents === null ? null : manualCents / 100,
    emergency_reserve_amount: reserveCents / 100,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  });

  if (error) fail("Não foi possível salvar a configuração de segurança financeira.");
  done("Configuração de segurança financeira salva.");
}

export async function saveEssentialCategories(form: FormData) {
  const { supabase, userId } = await requireUser();
  const selected = [...new Set(form.getAll("category_ids").map(String).filter(uuid))];
  if (selected.length !== form.getAll("category_ids").length) fail("Uma das categorias é inválida.");

  if (selected.length) {
    const { data, error } = await supabase
      .from("categories")
      .select("id")
      .eq("kind", "expense")
      .eq("is_active", true)
      .in("id", selected);
    if (error || (data ?? []).length !== selected.length) fail("Uma das categorias essenciais não está disponível.");
  }

  const { data: current, error: currentError } = await supabase
    .from("resilience_essential_categories")
    .select("category_id");
  if (currentError) fail("Não foi possível consultar as categorias essenciais.");

  const currentIds = new Set((current ?? []).map((row) => row.category_id));
  const selectedIds = new Set(selected);
  const toAdd = selected.filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !selectedIds.has(id));

  if (toAdd.length) {
    const { error } = await supabase.from("resilience_essential_categories").insert(
      toAdd.map((category_id) => ({ user_id: userId, category_id })),
    );
    if (error) fail("Não foi possível adicionar as categorias essenciais.");
  }

  if (toRemove.length) {
    const { error } = await supabase
      .from("resilience_essential_categories")
      .delete()
      .eq("user_id", userId)
      .in("category_id", toRemove);
    if (error) fail("Não foi possível remover categorias essenciais.");
  }

  done("Categorias essenciais atualizadas.");
}

function provisionFields(form: FormData) {
  const name = text(form, "name");
  const annualCents = moneyCents(text(form, "annual_amount"));
  const reservedCents = moneyCents(text(form, "reserved_amount") || "0");
  const dueRaw = text(form, "due_month");
  const dueMonth = dueRaw ? Number.parseInt(dueRaw, 10) : null;
  const notes = text(form, "notes");

  if (name.length < 2 || name.length > 80) fail("Informe um nome de provisão entre 2 e 80 caracteres.");
  if (annualCents === null || annualCents <= 0) fail("Informe um custo anual positivo.");
  if (reservedCents === null) fail("Valor já provisionado inválido.");
  if (dueMonth !== null && (!Number.isInteger(dueMonth) || dueMonth < 1 || dueMonth > 12)) {
    fail("Mês previsto inválido.");
  }
  if (notes.length > 300) fail("Use até 300 caracteres nas observações.");

  return {
    name,
    annual_amount: annualCents / 100,
    reserved_amount: reservedCents / 100,
    due_month: dueMonth,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  };
}

export async function createProvision(form: FormData) {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("annual_provisions").insert({
    ...provisionFields(form),
    user_id: userId,
  });
  if (error) fail("Não foi possível criar a provisão.");
  done("Provisão criada. Esse gasto previsível fica separado da reserva de emergência.");
}

export async function updateProvision(form: FormData) {
  const { supabase, userId } = await requireUser();
  const id = text(form, "id");
  if (!uuid(id)) fail("Provisão inválida.");
  const { data, error } = await supabase
    .from("annual_provisions")
    .update(provisionFields(form))
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error || !data) fail("Não foi possível atualizar a provisão.");
  done("Provisão atualizada.");
}

export async function changeProvisionStatus(form: FormData) {
  const { supabase, userId } = await requireUser();
  const id = text(form, "id");
  const status = text(form, "status");
  if (!uuid(id) || !["active", "archived"].includes(status)) fail("Provisão inválida.");

  const { data, error } = await supabase
    .from("annual_provisions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error || !data) fail("Não foi possível alterar a provisão.");
  done(status === "archived" ? "Provisão arquivada." : "Provisão reativada.");
}
