export type PaymentMethodKind =
  | "pix"
  | "credit_card"
  | "debit_card"
  | "cash"
  | "bank_transfer"
  | "other";

export type PaymentMethod = {
  id: string;
  kind: PaymentMethodKind;
  name: string;
  card_brand: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type RecurringVersion = {
  id: string;
  recurring_expense_id: string;
  effective_from: string;
  description: string;
  amount: number | string;
  day_of_month: number;
  account_id: string;
  category_id: string | null;
  merchant_id: string | null;
  payment_method_id: string | null;
  is_active: boolean;
  created_at: string;
};

export function paymentMethodKindLabel(kind: PaymentMethodKind | string) {
  const labels: Record<string, string> = {
    pix: "Pix",
    credit_card: "Cartão de crédito",
    debit_card: "Cartão de débito",
    cash: "Dinheiro",
    bank_transfer: "Transferência",
    other: "Outro",
  };
  return labels[kind] ?? "Outro";
}

export function paymentMethodLabel(method: Pick<PaymentMethod,"kind"|"name"|"card_brand">) {
  const brand =
    method.card_brand && ["credit_card","debit_card"].includes(method.kind)
      ? " · " + method.card_brand
      : "";
  return method.name + " · " + paymentMethodKindLabel(method.kind) + brand;
}

export function moneyCents(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99) return null;
  return Math.round(amount * 100);
}

export function latestVersionForMonth(versions: RecurringVersion[], monthKey: string) {
  const firstDay = monthKey + "-01";
  return versions
    .filter((version) => version.effective_from <= firstDay)
    .slice()
    .sort(
      (a,b) =>
        b.effective_from.localeCompare(a.effective_from) ||
        b.created_at.localeCompare(a.created_at),
    )[0] ?? null;
}

export function scheduledDateForMonth(monthKey: string, dayOfMonth: number) {
  const [year,month] = monthKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year,month,0)).getUTCDate();
  const day = Math.min(Math.max(Math.trunc(dayOfMonth),1),lastDay);
  return monthKey + "-" + String(day).padStart(2,"0");
}
