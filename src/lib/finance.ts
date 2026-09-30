export type FinanceKind = "income" | "expense";

export type FinancialAccount = {
  id: string;
  name: string;
  account_type: string;
  initial_balance: number | string;
  currency: string;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  kind: FinanceKind;
  created_at: string;
};

export type FinancialTransaction = {
  id: string;
  account_id: string;
  category_id: string | null;
  kind: FinanceKind;
  amount: number | string;
  occurred_on: string;
  description: string | null;
  created_at: string;
};

export type MonthlyPlan = {
  id: string;
  month: string;
  planned_income: number | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CategoryBudget = {
  id: string;
  plan_id: string;
  category_id: string;
  planned_amount: number | string;
  created_at: string;
  updated_at: string;
};

const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

function zonedParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DEFAULT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function todayInBrazil() {
  const { year, month, day } = zonedParts();
  return [year, pad(month), pad(day)].join("-");
}

export function currentMonthKey() {
  const { year, month } = zonedParts();
  return [year, pad(month)].join("-");
}

export function normalizeMonthKey(value?: string | null) {
  const fallback = currentMonthKey();
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return fallback;

  const [year, month] = value.split("-").map(Number);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return fallback;

  return [year, pad(month)].join("-");
}

export function monthRangeFromKey(value: string) {
  const monthKey = normalizeMonthKey(value);
  const [year, month] = monthKey.split("-").map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return {
    key: monthKey,
    start: [year, pad(month), "01"].join("-"),
    end: [nextYear, pad(nextMonth), "01"].join("-"),
  };
}

export function shiftMonthKey(value: string, offset: number) {
  const { key } = monthRangeFromKey(value);
  const [year, month] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));

  return [
    shifted.getUTCFullYear(),
    pad(shifted.getUTCMonth() + 1),
  ].join("-");
}

export function monthLabelFromKey(value: string) {
  const { key } = monthRangeFromKey(value);
  const [year, month] = key.split("-").map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function currentMonthRange() {
  return monthRangeFromKey(currentMonthKey());
}

export function currentMonthLabel() {
  return monthLabelFromKey(currentMonthKey());
}

export function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatBRL(value: unknown) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numberValue(value));
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value + "T12:00:00Z"));
}

export function accountTypeLabel(type: string) {
  const labels: Record<string, string> = {
    checking: "Conta corrente",
    savings: "Poupança",
    cash: "Dinheiro",
    investment: "Investimentos",
    other: "Outra",
  };

  return labels[type] ?? "Outra";
}
