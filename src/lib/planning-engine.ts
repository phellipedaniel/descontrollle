export type PlanningSourceMode = "current_plan" | "trailing_3_closed" | "manual";

export type PlanningEngineProfile = {
  user_id: string;
  horizon_months: number;
  planned_income_mode: PlanningSourceMode;
  planned_expense_mode: PlanningSourceMode;
  manual_monthly_income: number | string | null;
  manual_monthly_expense: number | string | null;
  probable_window_months: number;
  reserve_monthly_allocation: number | string;
  include_goals: boolean;
  include_provisions: boolean;
  include_debt_minimums: boolean;
  include_debt_extra: boolean;
  notes: string | null;
};

export type ProjectionBaseline = {
  income: number | null;
  expense: number | null;
};

export type ProjectionGoal = {
  id: string;
  name: string;
  target_amount: number | string;
  saved_amount: number | string;
  target_date: string;
  status: "active" | "archived";
};

export type ProjectionRow = {
  month: string;
  explicitPlan: boolean;
  plannedIncome: number | null;
  plannedExpense: number | null;
  probableIncome: number | null;
  probableExpense: number | null;
  goalAllocation: number;
  provisionAllocation: number;
  debtMinimumAllocation: number;
  debtExtraAllocation: number;
  reserveAllocation: number;
  commitments: number;
  plannedMargin: number | null;
  probableMargin: number | null;
  plannedCumulative: number | null;
  probableCumulative: number | null;
};

export type ProjectionResult = {
  rows: ProjectionRow[];
  overdueGoalGap: number;
  endingReserveGap: number;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function moneyCents(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99) return null;
  return Math.round(amount * 100);
}

export function shiftProjectionMonth(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
  ].join("-");
}

export function projectionMonthDiff(fromMonth: string, toMonth: string) {
  const [fromYear, fromValue] = fromMonth.split("-").map(Number);
  const [toYear, toValue] = toMonth.split("-").map(Number);
  return (toYear - fromYear) * 12 + toValue - fromValue;
}

export function historicalAverage(
  months: string[],
  rows: Array<{ occurred_on: string; kind: "income" | "expense"; amount: number | string }>,
  kind: "income" | "expense",
) {
  if (!months.length) return { value: null as number | null, monthsWithData: 0, complete: false };

  const totals = new Map(months.map((month) => [month, { total: 0, rows: 0 }]));
  for (const row of rows) {
    if (row.kind !== kind) continue;
    const key = row.occurred_on.slice(0, 7);
    const target = totals.get(key);
    if (!target) continue;
    target.total += Number(row.amount);
    target.rows += 1;
  }

  const values = [...totals.values()];
  const monthsWithData = values.filter((item) => item.rows > 0).length;
  if (monthsWithData !== months.length) {
    return { value: null as number | null, monthsWithData, complete: false };
  }

  return {
    value: roundMoney(values.reduce((sum, item) => sum + item.total, 0) / months.length),
    monthsWithData,
    complete: true,
  };
}

export function buildProjection(input: {
  startMonth: string;
  horizonMonths: number;
  plannedFallback: ProjectionBaseline;
  probableBaseline: ProjectionBaseline;
  explicitPlans: Record<string, { income: number; expense: number }>;
  goals: ProjectionGoal[];
  includeGoals: boolean;
  monthlyProvision: number;
  includeProvisions: boolean;
  debtMinimums: number;
  includeDebtMinimums: boolean;
  debtExtra: number;
  includeDebtExtra: boolean;
  reserveGap: number;
  reserveMonthlyAllocation: number;
}) : ProjectionResult {
  const horizon = Math.max(3, Math.min(24, Math.trunc(input.horizonMonths)));
  const startMonth = input.startMonth;

  const goalStates = input.goals
    .filter((goal) => goal.status === "active")
    .map((goal) => {
      const targetMonth = goal.target_date.slice(0, 7);
      const remainingCents = Math.max(
        0,
        Math.round((Number(goal.target_amount) - Number(goal.saved_amount)) * 100),
      );
      const months = projectionMonthDiff(startMonth, targetMonth) + 1;
      return {
        id: goal.id,
        targetMonth,
        remainingCents,
        monthlyCents: months > 0 && remainingCents > 0 ? Math.ceil(remainingCents / months) : 0,
      };
    });

  const overdueGoalGap = roundMoney(
    goalStates
      .filter((goal) => goal.targetMonth < startMonth && goal.remainingCents > 0)
      .reduce((sum, goal) => sum + goal.remainingCents, 0) / 100,
  );

  let reserveRemainingCents = Math.max(0, Math.round(input.reserveGap * 100));
  const reserveMonthlyCents = Math.max(0, Math.round(input.reserveMonthlyAllocation * 100));
  let plannedCumulative: number | null = 0;
  let probableCumulative: number | null = 0;

  const rows: ProjectionRow[] = [];

  for (let index = 0; index < horizon; index += 1) {
    const month = shiftProjectionMonth(startMonth, index);
    const explicit = input.explicitPlans[month];

    const plannedIncome = explicit ? explicit.income : input.plannedFallback.income;
    const plannedExpense = explicit ? explicit.expense : input.plannedFallback.expense;

    let goalCents = 0;
    if (input.includeGoals) {
      for (const goal of goalStates) {
        if (
          goal.remainingCents <= 0 ||
          goal.targetMonth < startMonth ||
          month > goal.targetMonth
        ) continue;
        const allocation = Math.min(goal.monthlyCents, goal.remainingCents);
        goal.remainingCents -= allocation;
        goalCents += allocation;
      }
    }

    const provisionCents = input.includeProvisions
      ? Math.max(0, Math.round(input.monthlyProvision * 100))
      : 0;
    const debtMinimumCents = input.includeDebtMinimums
      ? Math.max(0, Math.round(input.debtMinimums * 100))
      : 0;
    const debtExtraCents = input.includeDebtExtra
      ? Math.max(0, Math.round(input.debtExtra * 100))
      : 0;
    const reserveCents = Math.min(reserveRemainingCents, reserveMonthlyCents);
    reserveRemainingCents -= reserveCents;

    const commitments = roundMoney(
      (goalCents + provisionCents + debtMinimumCents + debtExtraCents + reserveCents) / 100,
    );

    const plannedMargin =
      plannedIncome === null || plannedExpense === null
        ? null
        : roundMoney(plannedIncome - plannedExpense - commitments);

    const probableMargin =
      input.probableBaseline.income === null || input.probableBaseline.expense === null
        ? null
        : roundMoney(
            input.probableBaseline.income -
              input.probableBaseline.expense -
              commitments,
          );

    if (plannedCumulative !== null) {
      plannedCumulative =
        plannedMargin === null ? null : roundMoney(plannedCumulative + plannedMargin);
    }
    if (probableCumulative !== null) {
      probableCumulative =
        probableMargin === null ? null : roundMoney(probableCumulative + probableMargin);
    }

    rows.push({
      month,
      explicitPlan: Boolean(explicit),
      plannedIncome,
      plannedExpense,
      probableIncome: input.probableBaseline.income,
      probableExpense: input.probableBaseline.expense,
      goalAllocation: roundMoney(goalCents / 100),
      provisionAllocation: roundMoney(provisionCents / 100),
      debtMinimumAllocation: roundMoney(debtMinimumCents / 100),
      debtExtraAllocation: roundMoney(debtExtraCents / 100),
      reserveAllocation: roundMoney(reserveCents / 100),
      commitments,
      plannedMargin,
      probableMargin,
      plannedCumulative,
      probableCumulative,
    });
  }

  return {
    rows,
    overdueGoalGap,
    endingReserveGap: roundMoney(reserveRemainingCents / 100),
  };
}

export function sourceModeLabel(mode: PlanningSourceMode) {
  const labels: Record<PlanningSourceMode, string> = {
    current_plan: "Plano do mês atual",
    trailing_3_closed: "Média dos 3 últimos meses fechados",
    manual: "Valor manual",
  };
  return labels[mode];
}
