import { redirect } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { SubmitButton } from "@/components/submit-button";
import {
  buildBehaviorSignals,
  categoryMovements,
  intentionLabel,
  merchantConcentration,
  spendingSummary,
  type BehaviorCheckin,
  type BehaviorProfile,
  type BehaviorTransaction,
} from "@/lib/behavior";
import {
  currentMonthKey,
  formatBRL,
  monthLabelFromKey,
  monthRangeFromKey,
  normalizeMonthKey,
  shiftMonthKey,
} from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";
import { saveBehaviorCheckin, saveBehaviorProfile } from "./actions";

type PeriodRow = {
  month: string;
  status: "open" | "closed";
  reconciliation_status: string;
};

type CategoryRow = {
  id: string;
  name: string;
  is_active: boolean;
};

type MerchantRow = {
  id: string;
  name: string;
};

const DEFAULT_PROFILE: Omit<BehaviorProfile,"user_id"> = {
  comparison_window_months: 3,
  monthly_change_pct: 15,
  category_change_pct: 20,
  category_min_change: 50,
  frequency_change_pct: 20,
  merchant_min_coverage_pct: 60,
  merchant_concentration_pct: 35,
  notes: null,
};

function pct(value: number | null) {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return sign + value.toLocaleString("pt-BR",{maximumFractionDigits:1}) + "%";
}

export default async function BehaviorPage({
  searchParams,
}: {
  searchParams: Promise<{ month?:string; error?:string; message?:string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) redirect("/login");

  const currentMonth = currentMonthKey();

  const [
    { data: profileData, error: profileError },
    { data: latestClosedData, error: latestClosedError },
  ] = await Promise.all([
    supabase
      .from("behavior_profiles")
      .select("user_id,comparison_window_months,monthly_change_pct,category_change_pct,category_min_change,frequency_change_pct,merchant_min_coverage_pct,merchant_concentration_pct,notes")
      .maybeSingle(),
    supabase
      .from("financial_periods")
      .select("month,status,reconciliation_status")
      .eq("status","closed")
      .eq("reconciliation_status","reconciled")
      .lte("month",currentMonth + "-01")
      .order("month",{ascending:false})
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileError || latestClosedError) {
    throw new Error("Não foi possível carregar as preferências comportamentais.");
  }

  const profile = ({...DEFAULT_PROFILE,...(profileData ?? {})}) as BehaviorProfile;
  const fallbackMonth = (latestClosedData as PeriodRow|null)?.month?.slice(0,7) ?? currentMonth;
  const selectedMonth = params.month ? normalizeMonthKey(params.month) : fallbackMonth;
  const { start:selectedStart,end:selectedEnd } = monthRangeFromKey(selectedMonth);
  const windowMonths = Number(profile.comparison_window_months);

  const { data: baselinePeriodsData, error: baselineError } = await supabase
    .from("financial_periods")
    .select("month,status,reconciliation_status")
    .eq("status","closed")
    .eq("reconciliation_status","reconciled")
    .lt("month",selectedStart)
    .order("month",{ascending:false})
    .limit(windowMonths);

  if (baselineError) throw new Error("Não foi possível montar o baseline comportamental.");

  const baselinePeriods = (baselinePeriodsData ?? []) as PeriodRow[];
  const baselineMonths = baselinePeriods.map((period) => period.month.slice(0,7));
  const earliestStart = baselineMonths.length
    ? baselineMonths[baselineMonths.length - 1] + "-01"
    : selectedStart;

  const [
    { data: transactionsData, error: transactionsError },
    { data: categoriesData, error: categoriesError },
    { data: merchantsData, error: merchantsError },
    { data: selectedPeriodData, error: selectedPeriodError },
    { data: checkinData, error: checkinError },
    { data: checkinHistoryData, error: historyError },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("occurred_on,kind,amount,category_id,merchant_id")
      .gte("occurred_on",earliestStart)
      .lt("occurred_on",selectedEnd),
    supabase
      .from("categories")
      .select("id,name,is_active")
      .eq("kind","expense")
      .order("name"),
    supabase
      .from("merchants")
      .select("id,name")
      .order("name"),
    supabase
      .from("financial_periods")
      .select("month,status,reconciliation_status")
      .eq("month",selectedStart)
      .maybeSingle(),
    supabase
      .from("behavior_checkins")
      .select("id,month,intention,focus_category_id,reflection,created_at,updated_at")
      .eq("month",selectedStart)
      .maybeSingle(),
    supabase
      .from("behavior_checkins")
      .select("id,month,intention,focus_category_id,reflection,created_at,updated_at")
      .order("month",{ascending:false})
      .limit(6),
  ]);

  if (
    transactionsError || categoriesError || merchantsError ||
    selectedPeriodError || checkinError || historyError
  ) {
    throw new Error("Não foi possível carregar a análise comportamental.");
  }

  const transactions = (transactionsData ?? []) as BehaviorTransaction[];
  const categories = (categoriesData ?? []) as CategoryRow[];
  const merchants = (merchantsData ?? []) as MerchantRow[];
  const selectedPeriod = (selectedPeriodData ?? null) as PeriodRow|null;
  const checkin = (checkinData ?? null) as BehaviorCheckin|null;
  const checkinHistory = (checkinHistoryData ?? []) as BehaviorCheckin[];

  const categoryNames = new Map(categories.map((category) => [category.id,category.name]));
  const merchantNames = new Map(merchants.map((merchant) => [merchant.id,merchant.name]));

  const summary = spendingSummary(selectedMonth,baselineMonths,transactions);
  const movements = categoryMovements(
    selectedMonth,
    baselineMonths,
    transactions,
    categoryNames,
    Number(profile.category_change_pct),
    Number(profile.category_min_change),
  );
  const merchant = merchantConcentration(
    selectedMonth,
    transactions,
    merchantNames,
    Number(profile.merchant_min_coverage_pct),
    Number(profile.merchant_concentration_pct),
  );
  const signals = buildBehaviorSignals({
    summary,
    categoryMovements: movements,
    merchant,
    monthlyChangePct: Number(profile.monthly_change_pct),
    frequencyChangePct: Number(profile.frequency_change_pct),
  });

  const reliableSelected =
    selectedPeriod?.status === "closed" &&
    selectedPeriod?.reconciliation_status === "reconciled";

  const topMovements = movements.slice(0,10);
  const activeCategories = categories.filter((category) => category.is_active);

  return (
    <main className="app-shell">
      <Sidebar active="behavior" />
      <section className="workspace">
        <header className="topbar">
          <div><span className="eyebrow">DESCONTROLLLE · MVP 8</span><h1>Comportamento financeiro</h1></div>
          <div className="profile-chip"><span className="status-dot" />{auth.user.email}</div>
        </header>

        <section className="planning-toolbar">
          <Link className="month-arrow" href={"/behavior?month=" + shiftMonthKey(selectedMonth,-1)} aria-label="Mês anterior">‹</Link>
          <form className="month-form" method="get">
            <label>
              <span className="eyebrow">MÊS ANALISADO</span>
              <input type="month" name="month" defaultValue={selectedMonth} max={currentMonth} />
            </label>
            <button className="button secondary" type="submit">Analisar</button>
          </form>
          {selectedMonth < currentMonth
            ? <Link className="month-arrow" href={"/behavior?month=" + shiftMonthKey(selectedMonth,1)} aria-label="Próximo mês">›</Link>
            : <span className="month-arrow disabled" aria-hidden="true">›</span>}
        </section>

        <section className="hero-card">
          <div>
            <span className="eyebrow">PADRÕES, NÃO RÓTULOS</span>
            <h2>{monthLabelFromKey(selectedMonth)}</h2>
            <p>Esta área compara gastos observados com meses fechados anteriores. Os sinais são descrições dos dados, não diagnósticos sobre você nem recomendações automáticas.</p>
          </div>
          <div className="hero-status">
            <span>Baseline</span><strong>{baselineMonths.length} meses</strong>
            <span>Sinais ativos</span><strong>{signals.length}</strong>
            <span>Cobertura por categoria</span><strong>{summary.categoryCoveragePct.toFixed(0)}%</strong>
            <span>Check-in</span><strong>{checkin ? intentionLabel(checkin.intention) : "pendente"}</strong>
          </div>
        </section>

        {params.error && <div className="alert error" role="alert">{params.error}</div>}
        {params.message && <div className="alert success">{params.message}</div>}

        {!reliableSelected && summary.transactionCount > 0 && (
          <div className="alert forecast-warning">
            Este mês não está simultaneamente fechado e reconciliado. Os valores podem estar incompletos; use os sinais como leitura parcial.
          </div>
        )}

        {summary.transactionCount === 0 && (
          <div className="alert forecast-warning">
            Não há despesas registradas neste mês. O descontrollle não transforma ausência de lançamentos em “gasto zero confirmado”.
          </div>
        )}

        <section className="metric-grid">
          <article className="metric-card purple">
            <span>Gasto observado</span>
            <strong>{formatBRL(summary.currentTotal)}</strong>
            <small>{summary.transactionCount} lançamentos</small>
          </article>
          <article className="metric-card blue">
            <span>Variação vs baseline</span>
            <strong>{pct(summary.monthlyChangePct)}</strong>
            <small>{summary.baselineAverage === null ? "sem baseline" : "média " + formatBRL(summary.baselineAverage)}</small>
          </article>
          <article className="metric-card green">
            <span>Dias com gasto</span>
            <strong>{summary.currentDays}</strong>
            <small>{summary.baselineAverageDays === null ? "sem baseline" : "média " + summary.baselineAverageDays.toFixed(1) + " dias"}</small>
          </article>
          <article className="metric-card red">
            <span>Dados categorizados</span>
            <strong>{summary.categoryCoveragePct.toFixed(0)}%</strong>
            <small>do valor gasto no mês</small>
          </article>
        </section>

        <section className="behavior-grid">
          <article className="panel">
            <div className="panel-title">
              <div><span className="eyebrow">SINAIS DE ATENÇÃO</span><h3>O que mudou o suficiente para revisar?</h3></div>
              <span className="pill">{signals.length}</span>
            </div>
            <div className="behavior-signal-list">
              {signals.length === 0 && <div className="empty-state">Nenhum sinal ultrapassou as regras configuradas para este mês.</div>}
              {signals.map((signal,index) => (
                <div className="behavior-signal" key={signal.kind + index}>
                  <span className={"signal-dot " + signal.kind} />
                  <div><strong>{signal.title}</strong><p>{signal.detail}</p></div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel finance-panel">
            <div className="panel-title">
              <div><span className="eyebrow">CHECK-IN MENSAL</span><h3>Qual ação você quer testar?</h3></div>
              <span className="pill">{checkin ? "salvo" : "novo"}</span>
            </div>
            <form className="finance-form" action={saveBehaviorCheckin}>
              <input type="hidden" name="month" value={selectedMonth} />
              <label className="field">
                <span>Intenção</span>
                <select name="intention" defaultValue={checkin?.intention ?? "observe"}>
                  <option value="observe">Observar sem mudar ainda</option>
                  <option value="maintain">Manter o padrão atual</option>
                  <option value="reduce">Reduzir um gasto</option>
                  <option value="redirect">Redirecionar dinheiro para outra prioridade</option>
                </select>
              </label>
              <label className="field">
                <span>Categoria de foco (opcional)</span>
                <select name="focus_category_id" defaultValue={checkin?.focus_category_id ?? ""}>
                  <option value="">Sem categoria específica</option>
                  {activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Reflexão / ação concreta</span>
                <textarea name="reflection" maxLength={400} defaultValue={checkin?.reflection ?? ""} placeholder="Ex.: durante o próximo mês vou observar refeições fora de casa antes de decidir se vale ajustar o orçamento." />
              </label>
              <SubmitButton>Salvar check-in</SubmitButton>
            </form>
          </article>
        </section>

        <section className="behavior-grid">
          <article className="panel behavior-table-panel">
            <div className="panel-title">
              <div><span className="eyebrow">CATEGORIAS</span><h3>Movimento vs média anterior</h3></div>
              <span className="pill">{summary.categoryCoveragePct.toFixed(0)}% coberto</span>
            </div>
            <div className="behavior-table">
              <div className="behavior-table-head"><span>Categoria</span><span>Mês</span><span>Baseline</span><span>Diferença</span></div>
              {topMovements.length === 0 && <div className="empty-state">Sem categorias comparáveis neste mês.</div>}
              {topMovements.map((movement) => (
                <div className={"behavior-table-row " + (movement.attention ? "attention" : "")} key={movement.categoryId}>
                  <strong>{movement.name}</strong>
                  <span>{formatBRL(movement.current)}</span>
                  <span>{formatBRL(movement.baseline)}</span>
                  <span className={movement.delta > 0 ? "text-danger" : movement.delta < 0 ? "text-positive" : ""}>
                    {movement.delta > 0 ? "+" : movement.delta < 0 ? "−" : ""}{formatBRL(Math.abs(movement.delta))}
                    {movement.changePct !== null ? " · " + pct(movement.changePct) : ""}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-title">
              <div><span className="eyebrow">ESTABELECIMENTOS</span><h3>Concentração do gasto identificado</h3></div>
              <span className="pill">{merchant.coveragePct.toFixed(0)}% coberto</span>
            </div>
            {!merchant.eligible && (
              <p className="behavior-data-note">
                A cobertura por estabelecimento está abaixo dos {Number(profile.merchant_min_coverage_pct).toFixed(0)}% definidos. O ranking é mostrado, mas não gera sinal de concentração.
              </p>
            )}
            <div className="merchant-list">
              {merchant.top.length === 0 && <div className="empty-state">Nenhum estabelecimento identificado no mês.</div>}
              {merchant.top.slice(0,6).map((item) => (
                <div key={item.merchantId}>
                  <span>{item.name}</span>
                  <strong>{formatBRL(item.amount)} · {item.sharePct.toFixed(1)}%</strong>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="behavior-grid">
          <article className="panel finance-panel">
            <div className="panel-title">
              <div><span className="eyebrow">REGRAS DE ATENÇÃO</span><h3>Ajuste a sensibilidade</h3></div>
              <span className="pill">você controla</span>
            </div>
            <form className="finance-form" action={saveBehaviorProfile}>
              <input type="hidden" name="month" value={selectedMonth} />
              <label className="field">
                <span>Meses usados no baseline</span>
                <select name="comparison_window_months" defaultValue={Number(profile.comparison_window_months)}>
                  <option value="1">1 mês</option><option value="3">3 meses</option><option value="6">6 meses</option><option value="12">12 meses</option>
                </select>
              </label>
              <div className="form-row">
                <label className="field"><span>Variação mensal para sinal (%)</span><input name="monthly_change_pct" type="number" min="0" max="500" step="0.01" defaultValue={Number(profile.monthly_change_pct)} required /></label>
                <label className="field"><span>Mais dias com gasto (%)</span><input name="frequency_change_pct" type="number" min="0" max="500" step="0.01" defaultValue={Number(profile.frequency_change_pct)} required /></label>
              </div>
              <div className="form-row">
                <label className="field"><span>Variação de categoria (%)</span><input name="category_change_pct" type="number" min="0" max="500" step="0.01" defaultValue={Number(profile.category_change_pct)} required /></label>
                <label className="field"><span>Diferença mínima da categoria</span><input name="category_min_change" type="number" min="0" max="9999999999.99" step="0.01" defaultValue={Number(profile.category_min_change)} required /></label>
              </div>
              <div className="form-row">
                <label className="field"><span>Cobertura mínima de estabelecimento (%)</span><input name="merchant_min_coverage_pct" type="number" min="0" max="100" step="0.01" defaultValue={Number(profile.merchant_min_coverage_pct)} required /></label>
                <label className="field"><span>Concentração para sinal (%)</span><input name="merchant_concentration_pct" type="number" min="0" max="100" step="0.01" defaultValue={Number(profile.merchant_concentration_pct)} required /></label>
              </div>
              <label className="field"><span>Observações das regras</span><textarea name="notes" maxLength={300} defaultValue={profile.notes ?? ""} /></label>
              <SubmitButton className="button secondary">Salvar regras</SubmitButton>
            </form>
          </article>

          <article className="panel">
            <div className="panel-title">
              <div><span className="eyebrow">HISTÓRICO DE CHECK-INS</span><h3>Decisões que você registrou</h3></div>
              <span className="pill">{checkinHistory.length}</span>
            </div>
            <div className="checkin-history">
              {checkinHistory.length === 0 && <div className="empty-state">Nenhum check-in registrado ainda.</div>}
              {checkinHistory.map((item) => (
                <div className="checkin-history-row" key={item.id}>
                  <div><strong>{monthLabelFromKey(item.month.slice(0,7))}</strong><span>{intentionLabel(item.intention)}</span></div>
                  <div>
                    <span>{item.focus_category_id ? categoryNames.get(item.focus_category_id) ?? "Categoria" : "Sem categoria de foco"}</span>
                    {item.reflection && <p>{item.reflection}</p>}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="panel behavior-method">
          <span className="eyebrow">COMO LER</span>
          <h3>O que o MVP 8 não conclui sozinho</h3>
          <p>Um aumento de gasto pode ser planejado, necessário ou pontual. Mais dias com transações não significam compulsão. Concentração em um estabelecimento pode ser uma compra grande legítima. Por isso os sinais servem para revisão, e o check-in registra a sua interpretação.</p>
        </section>
      </section>
    </main>
  );
}
