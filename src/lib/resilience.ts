export type BaselineMode = "manual" | "current_plan" | "trailing_3_closed";

export type ResilienceProfile = {
  user_id: string;
  protection_months: number;
  baseline_mode: BaselineMode;
  manual_essential_monthly: number | string | null;
  emergency_reserve_amount: number | string;
  notes: string | null;
};

export type AnnualProvision = {
  id: string;
  name: string;
  annual_amount: number | string;
  reserved_amount: number | string;
  due_month: number | null;
  notes: string | null;
  status: "active" | "archived";
};

export function moneyCents(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99) return null;
  return Math.round(amount * 100);
}

export function resilienceMetrics(monthlyEssential: number, reserveAmount: number, protectionMonths: number) {
  const monthly = Math.max(0, Math.round(monthlyEssential * 100) / 100);
  const reserve = Math.max(0, Math.round(reserveAmount * 100) / 100);
  const months = Math.max(1, Math.min(24, Math.trunc(protectionMonths || 1)));
  const target = Math.round(monthly * months * 100) / 100;
  const gap = Math.max(0, Math.round((target - reserve) * 100) / 100);
  const coverage = monthly > 0 ? reserve / monthly : null;
  const progress = target > 0 ? Math.min(100, Math.max(0, (reserve / target) * 100)) : 0;
  return { monthly, reserve, months, target, gap, coverage, progress };
}

export function provisionMonthly(annualAmount: number) {
  const cents = Math.max(0, Math.round(annualAmount * 100));
  return Math.ceil(cents / 12) / 100;
}

export function provisionProgress(annualAmount: number, reservedAmount: number) {
  if (annualAmount <= 0) return 0;
  return Math.min(100, Math.max(0, (reservedAmount / annualAmount) * 100));
}

export function monthName(month: number | null) {
  if (!month || month < 1 || month > 12) return "sem mês definido";
  return new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(2026, month - 1, 1)));
}
