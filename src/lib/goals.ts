export type Goal = {
  id: string;
  name: string;
  target_amount: number | string;
  initial_amount: number | string;
  saved_amount: number | string;
  target_date: string;
  notes: string | null;
  status: "active" | "archived";
  contribution_count: number | string;
};

export function moneyCents(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function validGoalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "2000-01-01" || value > "2100-12-31") return false;
  const date = new Date(value + "T12:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function goalMetrics(goal: Pick<Goal, "target_amount" | "saved_amount" | "target_date">, today: string) {
  const target = Math.round(Number(goal.target_amount) * 100);
  const saved = Math.round(Number(goal.saved_amount) * 100);
  const remaining = Math.max(target - saved, 0);
  const [year, month] = today.split("-").map(Number);
  const [targetYear, targetMonth] = goal.target_date.split("-").map(Number);
  const overdue = remaining > 0 && goal.target_date < today;
  const months = Math.max(1, (targetYear - year) * 12 + targetMonth - month + 1);
  return {
    remaining: remaining / 100,
    saved: saved / 100,
    progress: Math.min(100, Math.max(0, target > 0 ? Math.floor(saved * 100 / target) : 0)),
    complete: remaining === 0,
    overdue,
    months,
    monthly: overdue ? null : Math.ceil(remaining / months) / 100,
  };
}
