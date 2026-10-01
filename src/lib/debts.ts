export type DebtStrategy = "avalanche" | "snowball";

export type Debt = {
  id: string;
  name: string;
  creditor: string | null;
  debt_type: string;
  current_balance: number | string;
  annual_interest_rate: number | string | null;
  minimum_payment: number | string;
  due_day: number | null;
  notes: string | null;
  status: "active" | "paid" | "archived";
  created_at: string;
};

export type DebtPayment = {
  id: string;
  debt_id: string;
  amount: number | string;
  resulting_balance: number | string;
  occurred_on: string;
  note: string | null;
  created_at: string;
};

export function moneyCents(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99) return null;
  return Math.round(amount * 100);
}

export function percentValue(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  if (!/^\d+(\.\d{1,4})?$/.test(normalized)) return Number.NaN;
  const rate = Number(normalized);
  if (!Number.isFinite(rate) || rate < 0 || rate > 999.9999) return Number.NaN;
  return rate;
}

export function debtTypeLabel(type: string) {
  const labels: Record<string,string> = {
    credit_card: "Cartão de crédito",
    personal_loan: "Empréstimo pessoal",
    financing: "Financiamento",
    overdraft: "Cheque especial",
    installment: "Parcelamento",
    other: "Outra dívida",
  };
  return labels[type] ?? "Outra dívida";
}

export function orderDebts(debts: Debt[], strategy: DebtStrategy) {
  return debts
    .filter((debt) => debt.status === "active" && Number(debt.current_balance) > 0)
    .slice()
    .sort((a,b) => {
      const balanceA = Number(a.current_balance);
      const balanceB = Number(b.current_balance);
      const rateA = a.annual_interest_rate === null ? -1 : Number(a.annual_interest_rate);
      const rateB = b.annual_interest_rate === null ? -1 : Number(b.annual_interest_rate);
      if (strategy === "snowball") {
        return balanceA - balanceB || rateB - rateA || a.name.localeCompare(b.name, "pt-BR");
      }
      return rateB - rateA || balanceA - balanceB || a.name.localeCompare(b.name, "pt-BR");
    });
}

export function debtPortfolioMetrics(debts: Debt[]) {
  const active = debts.filter((debt) => debt.status === "active" && Number(debt.current_balance) > 0);
  const totalBalance = active.reduce((sum,debt) => sum + Number(debt.current_balance),0);
  const minimumPayments = active.reduce((sum,debt) => sum + Number(debt.minimum_payment),0);
  const knownRateBalance = active
    .filter((debt) => debt.annual_interest_rate !== null)
    .reduce((sum,debt) => sum + Number(debt.current_balance),0);
  const weightedAnnualRate = knownRateBalance > 0
    ? active
        .filter((debt) => debt.annual_interest_rate !== null)
        .reduce((sum,debt) => sum + Number(debt.current_balance) * Number(debt.annual_interest_rate),0) / knownRateBalance
    : null;
  const estimatedMonthlyInterest = active
    .filter((debt) => debt.annual_interest_rate !== null)
    .reduce((sum,debt) => sum + Number(debt.current_balance) * (Number(debt.annual_interest_rate) / 100 / 12),0);
  return { activeCount: active.length, totalBalance, minimumPayments, weightedAnnualRate, estimatedMonthlyInterest };
}
