export type BehaviorProfile = {
  user_id: string;
  comparison_window_months: number;
  monthly_change_pct: number | string;
  category_change_pct: number | string;
  category_min_change: number | string;
  frequency_change_pct: number | string;
  merchant_min_coverage_pct: number | string;
  merchant_concentration_pct: number | string;
  notes: string | null;
};

export type BehaviorTransaction = {
  occurred_on: string;
  kind: "income" | "expense";
  amount: number | string;
  category_id: string | null;
  merchant_id: string | null;
};

export type BehaviorCheckin = {
  id: string;
  month: string;
  intention: "observe" | "maintain" | "reduce" | "redirect";
  focus_category_id: string | null;
  reflection: string | null;
  created_at: string;
  updated_at: string;
};

export type CategoryMovement = {
  categoryId: string;
  name: string;
  current: number;
  baseline: number;
  delta: number;
  changePct: number | null;
  attention: boolean;
};

export type BehaviorSignal = {
  kind: "monthly" | "frequency" | "category" | "merchant";
  title: string;
  detail: string;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;
const roundPct = (value: number) => Math.round(value * 10) / 10;

export function moneyCents(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99) return null;
  return Math.round(amount * 100);
}

export function percentageValue(value: string, max = 500) {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > max) return null;
  return amount;
}

export function spendingSummary(
  selectedMonth: string,
  baselineMonths: string[],
  rows: BehaviorTransaction[],
) {
  const selectedRows = rows.filter(
    (row) => row.kind === "expense" && row.occurred_on.slice(0, 7) === selectedMonth,
  );

  const currentTotal = selectedRows.reduce((sum, row) => sum + Number(row.amount), 0);
  const currentDays = new Set(selectedRows.map((row) => row.occurred_on)).size;
  const categorizedAmount = selectedRows
    .filter((row) => row.category_id)
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const merchantAmount = selectedRows
    .filter((row) => row.merchant_id)
    .reduce((sum, row) => sum + Number(row.amount), 0);

  const totals = new Map(baselineMonths.map((month) => [month, 0]));
  const days = new Map(baselineMonths.map((month) => [month, new Set<string>()]));

  for (const row of rows) {
    if (row.kind !== "expense") continue;
    const month = row.occurred_on.slice(0, 7);
    if (!totals.has(month)) continue;
    totals.set(month, (totals.get(month) ?? 0) + Number(row.amount));
    days.get(month)?.add(row.occurred_on);
  }

  const baselineAverage = baselineMonths.length
    ? [...totals.values()].reduce((sum, value) => sum + value, 0) / baselineMonths.length
    : null;

  const baselineAverageDays = baselineMonths.length
    ? [...days.values()].reduce((sum, value) => sum + value.size, 0) / baselineMonths.length
    : null;

  const monthlyChangePct =
    baselineAverage !== null && baselineAverage > 0
      ? ((currentTotal - baselineAverage) / baselineAverage) * 100
      : null;

  const frequencyChangePct =
    baselineAverageDays !== null && baselineAverageDays > 0
      ? ((currentDays - baselineAverageDays) / baselineAverageDays) * 100
      : null;

  return {
    currentTotal: roundMoney(currentTotal),
    currentDays,
    baselineAverage: baselineAverage === null ? null : roundMoney(baselineAverage),
    baselineAverageDays:
      baselineAverageDays === null ? null : Math.round(baselineAverageDays * 10) / 10,
    monthlyChangePct: monthlyChangePct === null ? null : roundPct(monthlyChangePct),
    frequencyChangePct: frequencyChangePct === null ? null : roundPct(frequencyChangePct),
    categoryCoveragePct: currentTotal > 0 ? roundPct((categorizedAmount / currentTotal) * 100) : 0,
    merchantCoveragePct: currentTotal > 0 ? roundPct((merchantAmount / currentTotal) * 100) : 0,
    transactionCount: selectedRows.length,
  };
}

export function categoryMovements(
  selectedMonth: string,
  baselineMonths: string[],
  rows: BehaviorTransaction[],
  categoryNames: Map<string, string>,
  categoryChangePct: number,
  categoryMinChange: number,
) {
  const current = new Map<string, number>();
  const baselineTotals = new Map<string, number>();

  for (const row of rows) {
    if (row.kind !== "expense" || !row.category_id) continue;
    const month = row.occurred_on.slice(0, 7);
    if (month === selectedMonth) {
      current.set(row.category_id, (current.get(row.category_id) ?? 0) + Number(row.amount));
    }
    if (baselineMonths.includes(month)) {
      baselineTotals.set(
        row.category_id,
        (baselineTotals.get(row.category_id) ?? 0) + Number(row.amount),
      );
    }
  }

  const ids = new Set([...current.keys(), ...baselineTotals.keys()]);
  const result: CategoryMovement[] = [];

  for (const categoryId of ids) {
    const currentValue = roundMoney(current.get(categoryId) ?? 0);
    const baseline = roundMoney(
      baselineMonths.length ? (baselineTotals.get(categoryId) ?? 0) / baselineMonths.length : 0,
    );
    const delta = roundMoney(currentValue - baseline);
    const changePct = baseline > 0 ? roundPct((delta / baseline) * 100) : null;
    const attention =
      delta >= categoryMinChange &&
      currentValue > baseline &&
      ((changePct !== null && changePct >= categoryChangePct) ||
        (baseline === 0 && currentValue >= categoryMinChange));

    result.push({
      categoryId,
      name: categoryNames.get(categoryId) ?? "Categoria",
      current: currentValue,
      baseline,
      delta,
      changePct,
      attention,
    });
  }

  return result.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.current - a.current);
}

export function merchantConcentration(
  selectedMonth: string,
  rows: BehaviorTransaction[],
  merchantNames: Map<string, string>,
  minimumCoveragePct: number,
  concentrationPct: number,
) {
  const selected = rows.filter(
    (row) => row.kind === "expense" && row.occurred_on.slice(0, 7) === selectedMonth,
  );
  const total = selected.reduce((sum, row) => sum + Number(row.amount), 0);
  const knownTotal = selected
    .filter((row) => row.merchant_id)
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const coveragePct = total > 0 ? roundPct((knownTotal / total) * 100) : 0;

  const totals = new Map<string, number>();
  for (const row of selected) {
    if (!row.merchant_id) continue;
    totals.set(row.merchant_id, (totals.get(row.merchant_id) ?? 0) + Number(row.amount));
  }

  const top = [...totals.entries()]
    .map(([merchantId, amount]) => ({
      merchantId,
      name: merchantNames.get(merchantId) ?? "Estabelecimento",
      amount: roundMoney(amount),
      sharePct: knownTotal > 0 ? roundPct((amount / knownTotal) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const eligible = coveragePct >= minimumCoveragePct;
  const attention = eligible && Boolean(top[0] && top[0].sharePct >= concentrationPct);

  return {
    coveragePct,
    eligible,
    attention,
    top,
  };
}

export function buildBehaviorSignals(input: {
  summary: ReturnType<typeof spendingSummary>;
  categoryMovements: CategoryMovement[];
  merchant: ReturnType<typeof merchantConcentration>;
  monthlyChangePct: number;
  frequencyChangePct: number;
}) {
  const signals: BehaviorSignal[] = [];

  if (
    input.summary.monthlyChangePct !== null &&
    input.summary.monthlyChangePct >= input.monthlyChangePct
  ) {
    signals.push({
      kind: "monthly",
      title: "Gasto mensal acima do baseline",
      detail: `O mês está ${input.summary.monthlyChangePct.toFixed(1)}% acima da média dos períodos usados como referência.`,
    });
  }

  if (
    input.summary.frequencyChangePct !== null &&
    input.summary.frequencyChangePct >= input.frequencyChangePct
  ) {
    signals.push({
      kind: "frequency",
      title: "Mais dias com gasto",
      detail: `A frequência está ${input.summary.frequencyChangePct.toFixed(1)}% acima da média de dias com despesas no baseline.`,
    });
  }

  for (const movement of input.categoryMovements.filter((item) => item.attention).slice(0, 3)) {
    signals.push({
      kind: "category",
      title: `${movement.name} acima da referência`,
      detail:
        movement.changePct === null
          ? `Foram registrados R$ ${movement.current.toFixed(2)} sem gasto comparável dessa categoria no baseline.`
          : `A categoria está ${movement.changePct.toFixed(1)}% acima da média, diferença de R$ ${movement.delta.toFixed(2)}.`,
    });
  }

  if (input.merchant.attention && input.merchant.top[0]) {
    signals.push({
      kind: "merchant",
      title: "Concentração em um estabelecimento",
      detail: `${input.merchant.top[0].name} representa ${input.merchant.top[0].sharePct.toFixed(1)}% do valor com estabelecimento identificado neste mês.`,
    });
  }

  return signals;
}

export function intentionLabel(value: BehaviorCheckin["intention"]) {
  const labels: Record<BehaviorCheckin["intention"], string> = {
    observe: "Observar",
    maintain: "Manter",
    reduce: "Reduzir",
    redirect: "Redirecionar",
  };
  return labels[value];
}
