export type FixedKind = "income" | "expense";
export type FixedVersion = {
  id: string; item_id: string; effective_from: string; description: string;
  amount: number | string; account_id: string; category_id: string | null;
  is_active: boolean; created_at: string;
};
export type FixedItem = {
  id: string; kind: FixedKind; version: FixedVersion | null; history: FixedVersion[];
  confirmation: { transaction_id: string; amount: number | string; occurred_on: string } | null;
};
export const FIXED_START_MONTH = "2026-10";
export function minimumFixedMonth(current: string) {
  return current > FIXED_START_MONTH ? current : FIXED_START_MONTH;
}
export function fixedMonthTotals(items: FixedItem[]) {
  let incomeCents = 0, expenseCents = 0, pendingIncomeCents = 0, pendingExpenseCents = 0;
  for (const item of items) {
    const version = item.version;
    // A confirmed occurrence keeps its actual amount even if the current version changes.
    if (!item.confirmation && (!version || !version.is_active)) continue;
    const cents = Math.round(Number(item.confirmation?.amount ?? version!.amount) * 100);
    if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error("Invalid fixed amount");
    if (item.kind === "income") { incomeCents += cents; if (!item.confirmation) pendingIncomeCents += cents; }
    else { expenseCents += cents; if (!item.confirmation) pendingExpenseCents += cents; }
  }
  return { income: incomeCents / 100, expense: expenseCents / 100,
    balance: (incomeCents - expenseCents) / 100,
    pendingIncome: pendingIncomeCents / 100, pendingExpense: pendingExpenseCents / 100 };
}
