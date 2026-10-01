import { redirect } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { SubmitButton } from "@/components/submit-button";
import {
  currentMonthKey,
  formatBRL,
  monthLabelFromKey,
  numberValue,
} from "@/lib/finance";
import { goalMetrics, type Goal } from "@/lib/goals";
import { provisionMonthly, resilienceMetrics, type ResilienceProfile } from "@/lib/resilience";
import {
  buildProjection,
  historicalAverage,
  shiftProjectionMonth,
  sourceModeLabel,
  type PlanningEngineProfile,
  type PlanningSourceMode,
  type ProjectionBaseline,
  type ProjectionGoal,
} from "@/lib/planning-engine";
import { createClient } from "@/lib/supabase/server";
import { savePlanningEngineProfile } from "./actions";

type PlanRow = { id:string; month:string; planned_income:number|string };
type BudgetRow = { plan_id:string; category_id:string; planned_amount:number|string };
type HistoricalTransaction = {
  occurred_on:string;
  kind:"income"|"expense";
  amount:number|string;
  category_id:string|null;
};
type ClosedPeriod = { month:string };
type ProvisionRow = { annual_amount:number|string; status:"active"|"archived" };
type DebtRow = { current_balance:number|string; minimum_payment:number|string; status:"active"|"paid"|"archived" };
type DebtProfile = { extra_monthly_payment:number|string };
type EssentialCategory = { category_id:string };

const DEFAULT_PROFILE: Omit<PlanningEngineProfile,"user_id"> = {
  horizon_months: 12,
  planned_income_mode: "current_plan",
  planned_expense_mode: "trailing_3_closed",
  manual_monthly_income: null,
  manual_monthly_expense: null,
  probable_window_months: 3,
  reserve_monthly_allocation: 0,
  include_goals: true,
  include_provisions: true,
  include_debt_minimums: true,
  include_debt_extra: true,
  notes: null,
};

function resolvePlannedSource(
  mode: PlanningSourceMode,
  manual: number|string|null,
  currentPlanValue: number|null,
  historyValue: number|null,
) {
  if (mode === "manual") return manual === null ? null : Number(manual);
  if (mode === "current_plan") return currentPlanValue;
  return historyValue;
}

function chartPoints(values: Array<number|null>, maxAbs: number) {
  const width = 1000;
  const height = 280;
  const zero = height / 2;
  return values
    .map((value,index) => {
      if (value === null) return null;
      const x = values.length <= 1 ? 0 : (index / (values.length - 1)) * width;
      const y = zero - (value / maxAbs) * (height * .38);
      return x.toFixed(1) + "," + y.toFixed(1);
    })
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

export default async function ForecastPage({
  searchParams,
}: {
  searchParams: Promise<{ error?:string; message?:string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) redirect("/login");

  const currentMonth = currentMonthKey();
  const currentMonthDate = currentMonth + "-01";

  const [
    { data: profileData, error: profileError },
    { data: closedPeriodsData, error: periodsError },
    { data: goalsData, error: goalsError },
    { data: provisionsData, error: provisionsError },
    { data: debtsData, error: debtsError },
    { data: debtProfileData, error: debtProfileError },
    { data: resilienceData, error: resilienceError },
    { data: essentialData, error: essentialError },
  ] = await Promise.all([
    supabase
      .from("planning_engine_profiles")
      .select("user_id,horizon_months,planned_income_mode,planned_expense_mode,manual_monthly_income,manual_monthly_expense,probable_window_months,reserve_monthly_allocation,include_goals,include_provisions,include_debt_minimums,include_debt_extra,notes")
      .maybeSingle(),
    supabase
      .from("financial_periods")
      .select("month")
      .eq("status","closed")
      .eq("reconciliation_status","reconciled")
      .lt("month",currentMonthDate)
      .order("month",{ascending:false})
      .limit(12),
    supabase
      .from("financial_goal_progress")
      .select("id,name,target_amount,initial_amount,saved_amount,target_date,notes,status,contribution_count")
      .eq("status","active"),
    supabase
      .from("annual_provisions")
      .select("annual_amount,status")
      .eq("status","active"),
    supabase
      .from("debts")
      .select("current_balance,minimum_payment,status")
      .eq("status","active"),
    supabase
      .from("debt_strategy_profiles")
      .select("extra_monthly_payment")
      .maybeSingle(),
    supabase
      .from("resilience_profiles")
      .select("user_id,protection_months,baseline_mode,manual_essential_monthly,emergency_reserve_amount,notes")
      .maybeSingle(),
    supabase
      .from("resilience_essential_categories")
      .select("category_id"),
  ]);

  if (
    profileError || periodsError || goalsError || provisionsError || debtsError ||
    debtProfileError || resilienceError || essentialError
  ) {
    throw new Error("Não foi possível carregar o motor de planejamento.");
  }

  const profile = ({
    ...DEFAULT_PROFILE,
    ...(profileData ?? {}),
  }) as PlanningEngineProfile;

  const horizon = Number(profile.horizon_months);
  const endMonth = shiftProjectionMonth(currentMonth,horizon);
  const probableWindow = Number(profile.probable_window_months);
  const closedPeriods = (closedPeriodsData ?? []) as ClosedPeriod[];
  const selectedProbablePeriods = closedPeriods.slice(0,probableWindow);
  const selectedThreePeriods = closedPeriods.slice(0,3);
  const allSelectedMonths = closedPeriods.slice(0,Math.max(probableWindow,3)).map((period) => period.month.slice(0,7));

  const [
    { data: plansData, error: plansError },
    { data: transactionsData, error: transactionsError },
  ] = await Promise.all([
    supabase
      .from("monthly_plans")
      .select("id,month,planned_income")
      .gte("month",currentMonthDate)
      .lt("month",endMonth + "-01")
      .order("month"),
    allSelectedMonths.length
      ? supabase
          .from("transactions")
          .select("occurred_on,kind,amount,category_id")
          .gte("occurred_on",allSelectedMonths[allSelectedMonths.length - 1] + "-01")
          .lt("occurred_on",currentMonthDate)
      : Promise.resolve({ data: [] as HistoricalTransaction[], error: null }),
  ]);

  if (plansError || transactionsError) {
    throw new Error("Não foi possível montar os cenários.");
  }

  const plans = (plansData ?? []) as PlanRow[];
  const transactions = (transactionsData ?? []) as HistoricalTransaction[];
  const planIds = plans.map((plan) => plan.id);

  let budgets: BudgetRow[] = [];
  if (planIds.length) {
    const { data, error } = await supabase
      .from("category_budgets")
      .select("plan_id,category_id,planned_amount")
      .in("plan_id",planIds);
    if (error) throw new Error("Não foi possível carregar os orçamentos futuros.");
    budgets = (data ?? []) as BudgetRow[];
  }

  const expenseByPlan = new Map<string,number>();
  for (const budget of budgets) {
    expenseByPlan.set(
      budget.plan_id,
      (expenseByPlan.get(budget.plan_id) ?? 0) + Number(budget.planned_amount),
    );
  }

  const explicitPlans: Record<string,{income:number;expense:number}> = {};
  for (const plan of plans) {
    explicitPlans[plan.month.slice(0,7)] = {
      income: Number(plan.planned_income),
      expense: expenseByPlan.get(plan.id) ?? 0,
    };
  }

  const currentPlan = explicitPlans[currentMonth] ?? null;
  const threeMonths = selectedThreePeriods.map((period) => period.month.slice(0,7));
  const probableMonths = selectedProbablePeriods.map((period) => period.month.slice(0,7));

  const trailingIncome3 = historicalAverage(threeMonths,transactions,"income");
  const trailingExpense3 = historicalAverage(threeMonths,transactions,"expense");
  const probableIncome = historicalAverage(probableMonths,transactions,"income");
  const probableExpense = historicalAverage(probableMonths,transactions,"expense");

  const plannedFallback: ProjectionBaseline = {
    income: resolvePlannedSource(
      profile.planned_income_mode,
      profile.manual_monthly_income,
      currentPlan?.income ?? null,
      trailingIncome3.value,
    ),
    expense: resolvePlannedSource(
      profile.planned_expense_mode,
      profile.manual_monthly_expense,
      currentPlan?.expense ?? null,
      trailingExpense3.value,
    ),
  };

  const probableBaseline: ProjectionBaseline = {
    income: probableIncome.value,
    expense: probableExpense.value,
  };

  const goals = (goalsData ?? []) as Goal[];
  const projectionGoals: ProjectionGoal[] = goals.map((goal) => ({
    id: goal.id,
    name: goal.name,
    target_amount: goal.target_amount,
    saved_amount: goal.saved_amount,
    target_date: goal.target_date,
    status: goal.status,
  }));

  const provisions = (provisionsData ?? []) as ProvisionRow[];
  const monthlyProvision = provisions.reduce(
    (sum,provision) => sum + provisionMonthly(Number(provision.annual_amount)),
    0,
  );

  const debts = (debtsData ?? []) as DebtRow[];
  const activeDebts = debts.filter((debt) => Number(debt.current_balance) > 0);
  const debtMinimums = activeDebts.reduce(
    (sum,debt) => sum + Number(debt.minimum_payment),
    0,
  );
  const debtExtra = activeDebts.length ? Number((debtProfileData as DebtProfile|null)?.extra_monthly_payment ?? 0) : 0;

  const resilience = (resilienceData ?? null) as ResilienceProfile|null;
  const essentialIds = new Set(
    ((essentialData ?? []) as EssentialCategory[]).map((item) => item.category_id),
  );

  let currentEssentialPlan = 0;
  if (plans.length && essentialIds.size) {
    const currentPlanRow = plans.find((plan) => plan.month.slice(0,7) === currentMonth);
    if (currentPlanRow) {
      currentEssentialPlan = budgets
        .filter((budget) => budget.plan_id === currentPlanRow.id && essentialIds.has(budget.category_id))
        .reduce((sum,budget) => sum + Number(budget.planned_amount),0);
    }
  }

  let historicalEssential = 0;
  if (essentialIds.size && threeMonths.length) {
    const totals = new Map(threeMonths.map((month) => [month,0]));
    for (const transaction of transactions) {
      const month = transaction.occurred_on.slice(0,7);
      if (
        transaction.kind === "expense" &&
        transaction.category_id &&
        essentialIds.has(transaction.category_id) &&
        totals.has(month)
      ) {
        totals.set(month,(totals.get(month) ?? 0) + Number(transaction.amount));
      }
    }
    historicalEssential = [...totals.values()].reduce((sum,value) => sum + value,0) / threeMonths.length;
  }

  const essentialBaseline = resilience
    ? resilience.baseline_mode === "manual"
      ? Number(resilience.manual_essential_monthly ?? 0)
      : resilience.baseline_mode === "current_plan"
        ? currentEssentialPlan
        : historicalEssential
    : 0;

  const reserveMetrics = resilience
    ? resilienceMetrics(
        essentialBaseline,
        Number(resilience.emergency_reserve_amount),
        Number(resilience.protection_months),
      )
    : null;

  const projection = buildProjection({
    startMonth: currentMonth,
    horizonMonths: horizon,
    plannedFallback,
    probableBaseline,
    explicitPlans,
    goals: projectionGoals,
    includeGoals: profile.include_goals,
    monthlyProvision,
    includeProvisions: profile.include_provisions,
    debtMinimums,
    includeDebtMinimums: profile.include_debt_minimums,
    debtExtra,
    includeDebtExtra: profile.include_debt_extra,
    reserveGap: reserveMetrics?.gap ?? 0,
    reserveMonthlyAllocation: Number(profile.reserve_monthly_allocation),
  });

  const lastRow = projection.rows[projection.rows.length - 1];
  const plannedRiskMonths = projection.rows.filter((row) => row.plannedMargin !== null && row.plannedMargin < 0).length;
  const probableRiskMonths = projection.rows.filter((row) => row.probableMargin !== null && row.probableMargin < 0).length;
  const firstRow = projection.rows[0];

  const allCumulative = projection.rows.flatMap((row) => [
    row.plannedCumulative,
    row.probableCumulative,
  ]).filter((value): value is number => value !== null);
  const maxAbs = Math.max(1,...allCumulative.map((value) => Math.abs(value)));
  const plannedPoints = chartPoints(projection.rows.map((row) => row.plannedCumulative),maxAbs);
  const probablePoints = chartPoints(projection.rows.map((row) => row.probableCumulative),maxAbs);

  const plannedComplete = plannedFallback.income !== null && plannedFallback.expense !== null;
  const probableComplete = probableBaseline.income !== null && probableBaseline.expense !== null;
  const explicitPlanCount = Object.keys(explicitPlans).length;

  return (
    <main className="app-shell">
      <Sidebar active="forecast" />
      <section className="workspace">
        <header className="topbar">
          <div><span className="eyebrow">DESCONTROLLLE · MVP 7</span><h1>Projeções</h1></div>
          <div className="profile-chip"><span className="status-dot" />{auth.user.email}</div>
        </header>

        <section className="hero-card">
          <div>
            <span className="eyebrow">MOTOR DE PLANEJAMENTO</span>
            <h2>Compare o futuro que você planejou com o futuro sugerido pelo seu histórico.</h2>
            <p>O motor é determinístico: não prevê mercado nem atribui probabilidades. Ele combina suas premissas, planos explícitos e compromissos com médias de meses fechados e reconciliados.</p>
          </div>
          <div className="hero-status">
            <span>Horizonte</span><strong>{horizon} meses</strong>
            <span>Planos explícitos</span><strong>{explicitPlanCount}</strong>
            <span>Histórico provável</span><strong>{selectedProbablePeriods.length} meses</strong>
            <span>Compromissos no 1º mês</span><strong>{formatBRL(firstRow?.commitments ?? 0)}</strong>
          </div>
        </section>

        {params.error && <div className="alert error" role="alert">{params.error}</div>}
        {params.message && <div className="alert success">{params.message}</div>}

        {!plannedComplete && (
          <div className="alert error">
            O cenário planejado ainda está incompleto. A fonte escolhida não possui renda e/ou despesa suficiente. Crie um plano mensal ou informe valores manuais nas premissas.
          </div>
        )}

        {!probableComplete && (
          <div className="alert forecast-warning">
            O cenário provável não pode ser fechado com os dados atuais. O histórico possui despesas, mas não contém receitas em todos os {selectedProbablePeriods.length || probableWindow} meses selecionados. Ausência de receita não foi tratada como renda zero.
          </div>
        )}

        {projection.overdueGoalGap > 0 && profile.include_goals && (
          <div className="alert forecast-warning">
            Há {formatBRL(projection.overdueGoalGap)} de metas vencidas ainda não cobertas. Elas aparecem como pendência, mas não são forçadas em um único mês da projeção.
          </div>
        )}

        <section className="metric-grid">
          <article className="metric-card purple">
            <span>Margem planejada acumulada</span>
            <strong>{lastRow?.plannedCumulative === null ? "Incompleto" : formatBRL(lastRow?.plannedCumulative ?? 0)}</strong>
            <small>{horizon} meses após compromissos</small>
          </article>
          <article className="metric-card blue">
            <span>Margem provável acumulada</span>
            <strong>{lastRow?.probableCumulative === null ? "Incompleto" : formatBRL(lastRow?.probableCumulative ?? 0)}</strong>
            <small>baseline histórico fechado</small>
          </article>
          <article className="metric-card red">
            <span>Meses com margem negativa</span>
            <strong>{plannedRiskMonths} / {probableRiskMonths}</strong>
            <small>planejado / provável</small>
          </article>
          <article className="metric-card green">
            <span>Gap da reserva ao final</span>
            <strong>{formatBRL(projection.endingReserveGap)}</strong>
            <small>{resilience ? "com aporte configurado" : "reserva ainda não configurada"}</small>
          </article>
        </section>

        <section className="forecast-grid">
          <article className="panel finance-panel">
            <div className="panel-title">
              <div><span className="eyebrow">PREMISSAS</span><h3>Configurar motor</h3></div>
              <span className="pill">{profileData ? "salvo" : "padrão inicial"}</span>
            </div>

            <form className="finance-form" action={savePlanningEngineProfile}>
              <div className="form-row">
                <label className="field">
                  <span>Horizonte</span>
                  <select name="horizon_months" defaultValue={horizon}>
                    <option value="3">3 meses</option><option value="6">6 meses</option>
                    <option value="12">12 meses</option><option value="18">18 meses</option>
                    <option value="24">24 meses</option>
                  </select>
                </label>
                <label className="field">
                  <span>Janela do cenário provável</span>
                  <select name="probable_window_months" defaultValue={probableWindow}>
                    <option value="1">1 mês fechado</option><option value="3">3 meses fechados</option>
                    <option value="6">6 meses fechados</option><option value="12">12 meses fechados</option>
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label className="field">
                  <span>Fonte da renda planejada</span>
                  <select name="planned_income_mode" defaultValue={profile.planned_income_mode}>
                    <option value="current_plan">Plano do mês atual</option>
                    <option value="trailing_3_closed">3 meses fechados</option>
                    <option value="manual">Valor manual</option>
                  </select>
                </label>
                <label className="field">
                  <span>Fonte da despesa planejada</span>
                  <select name="planned_expense_mode" defaultValue={profile.planned_expense_mode}>
                    <option value="current_plan">Plano do mês atual</option>
                    <option value="trailing_3_closed">3 meses fechados</option>
                    <option value="manual">Valor manual</option>
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label className="field">
                  <span>Renda mensal manual</span>
                  <input name="manual_monthly_income" type="number" min="0" max="9999999999.99" step="0.01" defaultValue={profile.manual_monthly_income ?? ""} placeholder="Usada somente no modo manual" />
                </label>
                <label className="field">
                  <span>Despesa mensal manual</span>
                  <input name="manual_monthly_expense" type="number" min="0" max="9999999999.99" step="0.01" defaultValue={profile.manual_monthly_expense ?? ""} placeholder="Usada somente no modo manual" />
                </label>
              </div>

              <label className="field">
                <span>Aporte mensal desejado para a reserva</span>
                <input name="reserve_monthly_allocation" type="number" min="0" max="9999999999.99" step="0.01" defaultValue={Number(profile.reserve_monthly_allocation)} />
              </label>

              <div className="forecast-checks">
                <label><input type="checkbox" name="include_goals" defaultChecked={profile.include_goals} /> Metas com prazo</label>
                <label><input type="checkbox" name="include_provisions" defaultChecked={profile.include_provisions} /> Provisões anuais</label>
                <label><input type="checkbox" name="include_debt_minimums" defaultChecked={profile.include_debt_minimums} /> Mínimos das dívidas</label>
                <label><input type="checkbox" name="include_debt_extra" defaultChecked={profile.include_debt_extra} /> Pagamento extra de dívidas</label>
              </div>

              <p className="forecast-form-note">Se um compromisso já estiver embutido no orçamento mensal por categoria, desmarque-o aqui para evitar dupla contagem.</p>

              <label className="field">
                <span>Observações</span>
                <textarea name="notes" maxLength={400} defaultValue={profile.notes ?? ""} placeholder="Premissas importantes para interpretar o cenário." />
              </label>

              <SubmitButton>Salvar premissas</SubmitButton>
            </form>
          </article>

          <article className="panel finance-panel">
            <div className="panel-title">
              <div><span className="eyebrow">QUALIDADE DOS DADOS</span><h3>O que sustenta a projeção</h3></div>
              <span className="pill">{selectedProbablePeriods.length}/{probableWindow} meses</span>
            </div>

            <div className="forecast-health">
              <div>
                <span>Renda histórica</span>
                <strong className={probableIncome.complete ? "text-positive" : "text-danger"}>
                  {probableIncome.monthsWithData}/{selectedProbablePeriods.length} meses com dados
                </strong>
              </div>
              <div>
                <span>Despesa histórica</span>
                <strong className={probableExpense.complete ? "text-positive" : "text-danger"}>
                  {probableExpense.monthsWithData}/{selectedProbablePeriods.length} meses com dados
                </strong>
              </div>
              <div>
                <span>Baseline planejado de renda</span>
                <strong>{sourceModeLabel(profile.planned_income_mode)}</strong>
              </div>
              <div>
                <span>Baseline planejado de despesa</span>
                <strong>{sourceModeLabel(profile.planned_expense_mode)}</strong>
              </div>
              <div>
                <span>Renda provável</span>
                <strong>{probableBaseline.income === null ? "indisponível" : formatBRL(probableBaseline.income)}</strong>
              </div>
              <div>
                <span>Despesa provável</span>
                <strong>{probableBaseline.expense === null ? "indisponível" : formatBRL(probableBaseline.expense)}</strong>
              </div>
            </div>

            <div className="forecast-links">
              <Link className="button secondary inline-button" href="/planning">Editar planos mensais</Link>
              <Link className="button secondary inline-button" href="/resilience">Editar reserva</Link>
              <Link className="button secondary inline-button" href="/goals">Editar metas</Link>
              <Link className="button secondary inline-button" href="/debts">Editar dívidas</Link>
            </div>
          </article>
        </section>

        <section className="panel forecast-chart-panel">
          <div className="panel-title">
            <div><span className="eyebrow">MARGEM ACUMULADA</span><h3>Planejado × provável</h3></div>
            <div className="forecast-legend"><span className="planned">Planejado</span><span className="probable">Provável</span></div>
          </div>
          <div className="projection-chart-wrap">
            <svg className="projection-chart" viewBox="0 0 1000 280" role="img" aria-label="Margem acumulada planejada e provável">
              <line className="projection-zero" x1="0" x2="1000" y1="140" y2="140" />
              {plannedPoints && <polyline className="projection-line planned" points={plannedPoints} />}
              {probablePoints && <polyline className="projection-line probable" points={probablePoints} />}
            </svg>
            {!plannedPoints && !probablePoints && <div className="chart-overlay">Configure dados suficientes para desenhar os cenários.</div>}
          </div>
          <div className="forecast-month-labels">
            {projection.rows.map((row,index) => (
              <span key={row.month} className={index % Math.max(1,Math.ceil(horizon/6)) === 0 ? "" : "minor"}>
                {monthLabelFromKey(row.month).replace(" de ","/").slice(0,8)}
              </span>
            ))}
          </div>
        </section>

        <section className="forecast-grid">
          <article className="panel">
            <span className="eyebrow">COMPROMISSOS · 1º MÊS</span>
            <h3>Para onde vai a margem antes de sobrar</h3>
            <div className="commitment-list">
              <div><span>Metas</span><strong>{formatBRL(firstRow?.goalAllocation ?? 0)}</strong></div>
              <div><span>Provisões</span><strong>{formatBRL(firstRow?.provisionAllocation ?? 0)}</strong></div>
              <div><span>Mínimos das dívidas</span><strong>{formatBRL(firstRow?.debtMinimumAllocation ?? 0)}</strong></div>
              <div><span>Extra das dívidas</span><strong>{formatBRL(firstRow?.debtExtraAllocation ?? 0)}</strong></div>
              <div><span>Reserva de emergência</span><strong>{formatBRL(firstRow?.reserveAllocation ?? 0)}</strong></div>
              <div className="commitment-total"><span>Total</span><strong>{formatBRL(firstRow?.commitments ?? 0)}</strong></div>
            </div>
          </article>

          <article className="panel">
            <span className="eyebrow">LEITURA DO CENÁRIO</span>
            <h3>Limites do modelo</h3>
            <div className="forecast-notes">
              <p><strong>Planos explícitos vencem o baseline.</strong> Se você criar novembro e dezembro em Planejamento, esses meses usam seus próprios valores.</p>
              <p><strong>Provável não significa probabilidade.</strong> É uma continuação mecânica da média histórica dos períodos confiáveis selecionados.</p>
              <p><strong>Dívidas não têm amortização simulada.</strong> Mínimos e extra permanecem como compromisso mensal durante o horizonte.</p>
              <p><strong>Sem rentabilidade projetada.</strong> O motor não assume rendimento de investimentos ou valorização patrimonial.</p>
            </div>
          </article>
        </section>

        <section className="goals-section">
          <div className="section-heading-row">
            <div><span className="eyebrow">LINHA DO TEMPO</span><h2>Projeção mês a mês</h2></div>
            <span className="pill">{horizon} meses</span>
          </div>
          <article className="panel forecast-table-panel">
            <div className="forecast-table">
              <div className="forecast-table-head">
                <span>Mês</span><span>Planejado</span><span>Provável</span><span>Compromissos</span><span>Margem plan.</span><span>Margem prov.</span>
              </div>
              {projection.rows.map((row) => (
                <div className="forecast-table-row" key={row.month}>
                  <div><strong>{monthLabelFromKey(row.month)}</strong>{row.explicitPlan && <small>plano explícito</small>}</div>
                  <span>{row.plannedIncome === null || row.plannedExpense === null ? "—" : formatBRL(row.plannedIncome - row.plannedExpense)}</span>
                  <span>{row.probableIncome === null || row.probableExpense === null ? "—" : formatBRL(row.probableIncome - row.probableExpense)}</span>
                  <span>{formatBRL(row.commitments)}</span>
                  <strong className={row.plannedMargin !== null && row.plannedMargin < 0 ? "text-danger" : ""}>{row.plannedMargin === null ? "—" : formatBRL(row.plannedMargin)}</strong>
                  <strong className={row.probableMargin !== null && row.probableMargin < 0 ? "text-danger" : ""}>{row.probableMargin === null ? "—" : formatBRL(row.probableMargin)}</strong>
                </div>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
