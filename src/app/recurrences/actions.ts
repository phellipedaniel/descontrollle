"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentMonthKey, normalizeMonthKey } from "@/lib/finance";
import { moneyCents } from "@/lib/automation";
import { minimumFixedMonth } from "@/lib/fixed-recurrences";
const text = (f: FormData, key: string) => String(f.get(key) ?? "").trim();
const uuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
function finish(month: string, code: string): never {
  const safe = /^\d{4}-\d{2}$/.test(month) ? normalizeMonthKey(month) : currentMonthKey();
  redirect(`/recurrences?${new URLSearchParams({ month: safe, notice: code })}`);
}
function refresh() { for (const path of ["/recurrences", "/", "/finance", "/planning"]) revalidatePath(path); }
export async function saveFixedRecurrence(form: FormData) {
  const month = text(form, "month"), kind = text(form, "kind"), item = text(form, "item_id");
  const effective = text(form, "effective_from"), description = text(form, "description"), cents = moneyCents(text(form, "amount"));
  const account = text(form, "account_id"), category = text(form, "category_id");
  if (!["income", "expense"].includes(kind) || (item && !uuid(item)) || !uuid(account) || (category && !uuid(category))
    || !description || description.length > 160 || cents === null || cents <= 0
    || !/^\d{4}-\d{2}$/.test(effective) || normalizeMonthKey(effective) !== effective || effective < minimumFixedMonth(currentMonthKey())) finish(month, "invalid");
  const db = await createClient();
  const { data, error: authError } = await db.auth.getUser();
  if (authError || !data.user) redirect("/login");
  const { error } = await db.rpc("save_fixed_recurrence", { p_item_id: item || null, p_kind: kind, p_effective_from: effective + "-01",
    p_description: description, p_amount: cents / 100, p_account_id: account, p_category_id: category || null,
    p_is_active: !item || form.get("is_active") === "on" });
  if (error) finish(month, "save-error");
  refresh(); finish(month, "saved");
}
export async function confirmFixedRecurrence(form: FormData) {
  const month = text(form, "month"), item = text(form, "item_id"), date = text(form, "occurred_on");
  if (!uuid(item) || month !== currentMonthKey() || !/^\d{4}-\d{2}-\d{2}$/.test(date)
    || date.slice(0, 7) !== month || form.get("confirm_realized") !== "on") finish(month, "invalid-confirmation");
  const db = await createClient();
  const { data, error: authError } = await db.auth.getUser();
  if (authError || !data.user) redirect("/login");
  const { error } = await db.rpc("confirm_fixed_recurrence", { p_item_id: item, p_month: month + "-01", p_occurred_on: date });
  if (error) finish(month, "confirm-error");
  refresh(); finish(month, "confirmed");
}
