"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moneyCents, validGoalDate } from "@/lib/goals";
import { todayInBrazil } from "@/lib/finance";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function fail(message: string): never { redirect("/goals?error=" + encodeURIComponent(message)); }
function done(message: string): never {
  revalidatePath("/goals");
  revalidatePath("/");
  redirect("/goals?message=" + encodeURIComponent(message));
}
async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}
function goalFields(form: FormData) {
  const name = text(form, "name");
  const cents = moneyCents(text(form, "target_amount"));
  const target_date = text(form, "target_date");
  const notes = text(form, "notes");
  if (name.length < 2 || name.length > 80) fail("Informe um nome entre 2 e 80 caracteres.");
  if (cents === null || cents <= 0) fail("Informe um valor de meta positivo, com até duas casas decimais.");
  if (!validGoalDate(target_date)) fail("Informe uma data válida para a meta.");
  if (notes.length > 300) fail("Use até 300 caracteres nas observações.");
  return { name, target_amount: cents / 100, target_date, notes: notes || null };
}
export async function createGoal(form: FormData) {
  const { supabase, userId } = await requireUser();
  const fields = goalFields(form);
  const initial = moneyCents(text(form, "initial_amount") || "0");
  if (initial === null) fail("Informe um valor já reservado válido.");
  if (fields.target_date < todayInBrazil()) fail("Escolha hoje ou uma data futura para a nova meta.");
  const { error } = await supabase.from("financial_goals").insert({ ...fields, user_id: userId, initial_amount: initial / 100 });
  if (error) fail("Não foi possível criar o objetivo. Tente novamente.");
  done("Objetivo criado.");
}
export async function updateGoal(form: FormData) {
  const { supabase, userId } = await requireUser();
  const id = text(form, "id");
  if (!uuid(id)) fail("Objetivo inválido.");
  const { data, error } = await supabase.from("financial_goals").update(goalFields(form)).eq("id", id).eq("user_id", userId).select("id").maybeSingle();
  if (error || !data) fail("Não foi possível atualizar o objetivo.");
  done("Objetivo atualizado.");
}
export async function changeGoalStatus(form: FormData) {
  const { supabase, userId } = await requireUser();
  const id = text(form, "id");
  const status = text(form, "status");
  if (!uuid(id) || !["active", "archived"].includes(status)) fail("Objetivo inválido.");
  const { data, error } = await supabase.from("financial_goals").update({ status }).eq("id", id).eq("user_id", userId).select("id").maybeSingle();
  if (error || !data) fail("Não foi possível alterar o objetivo.");
  done(status === "archived" ? "Objetivo arquivado. O histórico foi preservado." : "Objetivo reativado.");
}
export async function addContribution(form: FormData) {
  const { supabase, userId } = await requireUser();
  const goal_id = text(form, "goal_id");
  const id = text(form, "id");
  const cents = moneyCents(text(form, "amount"));
  const occurred_on = text(form, "occurred_on");
  const note = text(form, "note");
  if (!uuid(goal_id) || !uuid(id)) fail("Objetivo inválido.");
  if (cents === null || cents <= 0) fail("Informe um aporte positivo, com até duas casas decimais.");
  if (!validGoalDate(occurred_on) || occurred_on > todayInBrazil()) fail("Informe uma data válida, até hoje.");
  if (note.length > 160) fail("Use até 160 caracteres na descrição.");
  const { error } = await supabase.from("goal_contributions").insert({ id, goal_id, user_id: userId, amount: cents / 100, occurred_on, note: note || null });
  if (error?.code === "23505") {
    const { data: existing } = await supabase.from("goal_contributions").select("goal_id, amount, occurred_on, note").eq("id", id).eq("user_id", userId).maybeSingle();
    if (existing && existing.goal_id === goal_id && Math.round(Number(existing.amount) * 100) === cents && existing.occurred_on === occurred_on && (existing.note ?? "") === note) done("Aporte já registrado.");
  }
  if (error) fail("Não foi possível registrar o aporte. Confira se o objetivo está ativo.");
  done("Aporte registrado.");
}
export async function removeContribution(form: FormData) {
  const { supabase, userId } = await requireUser();
  const id = text(form, "id");
  if (!uuid(id)) fail("Aporte inválido.");
  const { data, error } = await supabase.from("goal_contributions").delete().eq("id", id).eq("user_id", userId).select("id").maybeSingle();
  if (error || !data) fail("Não foi possível remover o aporte. Confira se o objetivo está ativo.");
  done("Aporte removido e progresso recalculado.");
}
