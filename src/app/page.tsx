import { OverviewCharts } from "@/components/dashboard/overview-charts";
import {
  buildOverviewStory,
  loadOverviewHistory,
  type HistoryClient,
  type OverviewStory,
} from "@/lib/overview-charts";
import { paymentMethodLabel, type PaymentMethod } from "@/lib/automation";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, SectionHeader } from "@/components/layout/page-header";
import { MetricCard, type FinancialDisplayState } from "@/components/dashboard/metric-card";
import { ButtonLink, Button } from "@/components/ui/button";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import {
  currentMonthKey,
  normalizeMonthKey,
  monthRangeFromKey,
  monthLabelFromKey,
  formatBRL,
  formatDate,
  numberValue,
  todayInBrazil,
} from "@/lib/finance";
import { goalMetrics } from "@/lib/goals";
import { debtPortfolioMetrics, type Debt } from "@/lib/debts";
import { createClient } from "@/lib/supabase/server";

type DashboardSearchParams = {
  month?: string;
  category?: string;
  account?: string;
  payment?: string;
  kind?: string;
};

type KindFilter = "all" | "income" | "expense";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const safeUuid = (value?: string) => value && uuidPattern.test(value) ? value : "";
const numberFormatter = new Intl.NumberFormat("pt-BR");

function queryString(params: Record<string,string>) {
  const search = new URLSearchParams();
  for (const [key,value] of Object.entries(params)) if (value) search.set(key,value);
  const value = search.toString();
  return value ? `?${value}` : "";
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const raw = await searchParams;
  const month = normalizeMonthKey(raw.month);
  const categoryId = safeUuid(raw.category);
  const accountId = safeUuid(raw.account);
  const paymentMethodId = safeUuid(raw.payment);
  const kindFilter: KindFilter =
    raw.kind === "income" || raw.kind === "expense" ? raw.kind : "all";

  const { start, end } = monthRangeFromKey(month);
  const label = monthLabelFromKey(month);
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) redirect("/login");

  let transactionsQuery = supabase
    .from("transactions")
    .select(
      "kind,amount,category_id,account_id,payment_method_id,description,occurred_on",
      { count: "exact" },
    )
    .gte("occurred_on", start)
    .lt("occurred_on", end);

  let recentQuery = supabase
    .from("transactions")
    .select(
      "id,kind,amount,description,occurred_on,category_id,account_id,payment_method_id",
    )
    .gte("occurred_on", start)
    .lt("occurred_on", end);

  if (categoryId) {
    transactionsQuery = transactionsQuery.eq("category_id", categoryId);
    recentQuery = recentQuery.eq("category_id", categoryId);
  }
  if (accountId) {
    transactionsQuery = transactionsQuery.eq("account_id", accountId);
    recentQuery = recentQuery.eq("account_id", accountId);
  }
  if (paymentMethodId) {
    transactionsQuery = transactionsQuery.eq("payment_method_id", paymentMethodId);
    recentQuery = recentQuery.eq("payment_method_id", paymentMethodId);
  }
  if (kindFilter !== "all") {
    transactionsQuery = transactionsQuery.eq("kind", kindFilter);
    recentQuery = recentQuery.eq("kind", kindFilter);
  }

  recentQuery = recentQuery
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id")
    .limit(5);

  const [
    transactionsResult,
    planResult,
    periodResult,
    snapshotResult,
    reserveResult,
    goalsResult,
    debtsResult,
    recentResult,
    categoriesResult,
    accountsResult,
    paymentMethodsResult,
  ] = await Promise.all([
    transactionsQuery,
    supabase.from("monthly_plans").select("id,planned_income").eq("month", start).maybeSingle(),
    supabase.from("financial_periods").select("status,reconciliation_status").eq("month", start).maybeSingle(),
    supabase.from("net_worth_snapshots").select("captured_on,net_worth").order("captured_on", { ascending: false }).order("created_at", { ascending: false }).limit(1),
    supabase.from("resilience_profiles").select("emergency_reserve_amount").maybeSingle(),
    supabase.from("financial_goal_progress").select("id,name,target_amount,saved_amount,target_date,status").eq("status", "active").order("target_date").order("id").limit(3),
    supabase.from("debts").select("id,name,current_balance,minimum_payment,annual_interest_rate,status").eq("status", "active"),
    recentQuery,
    supabase.from("categories").select("id,name,kind", { count: "exact" }).order("name"),
    supabase.from("accounts").select("id,name").order("name"),
    supabase.from("payment_methods").select("id,kind,name,card_brand,is_active,created_at,updated_at").order("is_active", { ascending: false }).order("name"),
  ]);

  const categories = categoriesResult.data ?? [];
  const accounts = accountsResult.data ?? [];
  const paymentMethods = (paymentMethodsResult.data ?? []) as PaymentMethod[];
  const selectedCategory = categoryId ? categories.find(item => item.id === categoryId) : undefined;
  const breakdownKind: "income" | "expense" =
    kindFilter === "income" || (kindFilter === "all" && selectedCategory?.kind === "income")
      ? "income"
      : "expense";
  const categoryNames = new Map<string,string>(
    categories.map(item => [item.id,item.name] as const),
  );
  const accountNames = new Map<string,string>(
    accounts.map(item => [item.id,item.name] as const),
  );
  const paymentMethodMap = new Map<string,PaymentMethod>(
    paymentMethods.map(item => [item.id,item] as const),
  );

  const activeFilterLabels: string[] = [];
  if (categoryId) activeFilterLabels.push(categoryNames.get(categoryId) ?? "Categoria selecionada");
  if (accountId) activeFilterLabels.push(accountNames.get(accountId) ?? "Conta selecionada");
  if (paymentMethodId) {
    const method = paymentMethodMap.get(paymentMethodId);
    activeFilterLabels.push(method ? paymentMethodLabel(method) : "Forma de pagamento selecionada");
  }
  if (kindFilter === "expense") activeFilterLabels.push("Somente despesas");
  if (kindFilter === "income") activeFilterLabels.push("Somente receitas");
  const filterLabel = activeFilterLabels.join(" · ");

  let overviewStory: OverviewStory | null = null;
  try {
    const year = Number(month.slice(0,4));
    if (
      categoriesResult.error ||
      !categoriesResult.data ||
      categoriesResult.count === null ||
      categoriesResult.count !== categoriesResult.data.length
    ) {
      throw new Error("Incomplete categories");
    }

    const history = await loadOverviewHistory(
      supabase as unknown as HistoryClient,
      auth.user.id,
      year,
      {
        categoryId: categoryId || undefined,
        accountId: accountId || undefined,
        paymentMethodId: paymentMethodId || undefined,
        kind: kindFilter === "all" ? undefined : kindFilter,
      },
    );

    overviewStory = buildOverviewStory(
      history,
      categoriesResult.data,
      month,
      todayInBrazil(),
      breakdownKind,
    );
  } catch {
    // Historical aggregates are all-or-nothing; never show a partial chart as complete.
  }

  const transactions = transactionsResult.data ?? [];
  const transactionsIncomplete =
    transactionsResult.count !== null &&
    transactionsResult.count !== undefined &&
    transactionsResult.count > transactions.length;
  const transactionsUnavailable = Boolean(transactionsResult.error || transactionsIncomplete);

  const incomeRows = transactions.filter(t => t.kind === "income");
  const expenseRows = transactions.filter(t => t.kind === "expense");
  const actualIncome = incomeRows.reduce((sum,t) => sum + numberValue(t.amount),0);
  const actualExpense = expenseRows.reduce((sum,t) => sum + numberValue(t.amount),0);
  const transactionCount = transactionsResult.count ?? transactions.length;
  const expenseAverage = expenseRows.length ? actualExpense / expenseRows.length : 0;
  const incomeAverage = incomeRows.length ? actualIncome / incomeRows.length : 0;
  const largestExpense = expenseRows.reduce((max,t) => Math.max(max,numberValue(t.amount)),0);
  const largestIncome = incomeRows.reduce((max,t) => Math.max(max,numberValue(t.amount)),0);

  const plan = planResult.data;
  let budgetError = false;
  let plannedExpense = 0;

  if (plan) {
    let budgetQuery = supabase
      .from("category_budgets")
      .select("planned_amount,category_id")
      .eq("plan_id", plan.id);

    if (categoryId) budgetQuery = budgetQuery.eq("category_id",categoryId);
    const result = await budgetQuery;
    budgetError = Boolean(result.error);
    plannedExpense = (result.data ?? []).reduce(
      (sum,budget) => sum + numberValue(budget.planned_amount),
      0,
    );
  }

  const planError = Boolean(planResult.error || budgetError);
  const plannedIncome = numberValue(plan?.planned_income);
  const fullPlanComparable =
    !categoryId &&
    !accountId &&
    !paymentMethodId &&
    kindFilter === "all";
  const budgetComparable =
    !accountId &&
    !paymentMethodId &&
    kindFilter !== "income";

  const dataState = (
    formattedValue: string,
    note: string,
    emptyMessage?: string,
  ): FinancialDisplayState => {
    if (transactionsResult.error) return { status:"error", message:"Não foi possível carregar os lançamentos." };
    if (transactionsIncomplete) return { status:"unavailable", message:"Consulta parcial: o total do recorte não é confiável." };
    if (emptyMessage && transactionCount === 0) return { status:"empty", message:emptyMessage };
    return { status:"ready", formattedValue, referenceLabel:note };
  };

  const kpis: Array<{label:string;state:FinancialDisplayState}> =
    kindFilter === "expense"
      ? [
          { label:"Total de custos", state:dataState(formatBRL(actualExpense),label) },
          { label:"Ticket médio", state:dataState(formatBRL(expenseAverage),`${expenseRows.length} despesas`) },
          { label:"Nº de despesas", state:dataState(numberFormatter.format(expenseRows.length),label) },
          { label:"Maior despesa", state:dataState(formatBRL(largestExpense),label) },
        ]
      : kindFilter === "income"
        ? [
            { label:"Total de receitas", state:dataState(formatBRL(actualIncome),label) },
            { label:"Ticket médio", state:dataState(formatBRL(incomeAverage),`${incomeRows.length} receitas`) },
            { label:"Nº de receitas", state:dataState(numberFormatter.format(incomeRows.length),label) },
            { label:"Maior receita", state:dataState(formatBRL(largestIncome),label) },
          ]
        : [
            { label:"Despesas", state:dataState(formatBRL(actualExpense),`${label} · realizado`) },
            { label:"Receitas", state:dataState(formatBRL(actualIncome),`${label} · realizado`) },
            { label:"Resultado", state:dataState(formatBRL(actualIncome-actualExpense),`${label} · fluxo do período`) },
            { label:"Lançamentos", state:dataState(numberFormatter.format(transactionCount),filterLabel || "Todos os lançamentos") },
          ];

  const status =
    periodResult.error
      ? "unavailable"
      : periodResult.data?.status === "closed"
        ? "closed"
        : "open";

  const snapshot = snapshotResult.data?.[0];
  const debtMetrics = debtsResult.error ? null : debtPortfolioMetrics((debtsResult.data ?? []) as Debt[]);
  const maxFlow = Math.max(plannedIncome,plannedExpense,actualIncome,actualExpense,1);
  const hasActivity = transactionCount > 0 || Boolean(plan);

  const attention: {text:string;href:string}[] = [];
  if (!planError && !plan && kindFilter !== "income") {
    attention.push({
      text:`Defina o planejamento de ${label} para comparar custos realizados e orçamento.`,
      href:`/planning?month=${month}`,
    });
  }
  if (
    !planError &&
    plan &&
    budgetComparable &&
    !transactionsUnavailable &&
    actualExpense > plannedExpense
  ) {
    attention.push({
      text:`As despesas do recorte em ${label} superam o orçamento comparável.`,
      href:`/planning?month=${month}`,
    });
  }
  if (
    !periodResult.error &&
    periodResult.data &&
    periodResult.data.reconciliation_status !== "reconciled"
  ) {
    attention.push({
      text:`A conciliação de ${label} está ${periodResult.data.reconciliation_status === "incomplete" ? "incompleta" : "pendente"}.`,
      href:`/automation?month=${month}`,
    });
  }

  const categoryTotals = new Map<string,number>();
  for (const transaction of transactions) {
    if (transaction.kind !== breakdownKind) continue;
    const key = transaction.category_id ?? "__uncategorized";
    categoryTotals.set(key,(categoryTotals.get(key) ?? 0)+numberValue(transaction.amount));
  }
  const categoryBreakdown = [...categoryTotals.entries()]
    .map(([id,value]) => ({
      id,
      name:id === "__uncategorized"
        ? "Sem categoria"
        : categoryNames.get(id) ?? "Categoria indisponível",
      value,
    }))
    .sort((a,b) => b.value-a.value);
  const breakdownTotal = categoryBreakdown.reduce((sum,item) => sum+item.value,0);
  const topCategories = categoryBreakdown.slice(0,6);

  const topTransactions = transactions
    .filter(t => t.kind === breakdownKind)
    .slice()
    .sort((a,b) => numberValue(b.amount)-numberValue(a.amount))
    .slice(0,5);

  const queryError =
    transactionsUnavailable ||
    planError ||
    periodResult.error ||
    categoriesResult.error ||
    accountsResult.error ||
    paymentMethodsResult.error;

  const resetHref = `/${queryString({month})}`;
  const activeFilterCount =
    Number(Boolean(categoryId)) +
    Number(Boolean(accountId)) +
    Number(Boolean(paymentMethodId)) +
    Number(kindFilter !== "all");

  return <AppShell active="dashboard">
    <PageHeader
      title="Dashboard de custos"
      description="Analise gastos, receitas e concentração de custos com filtros aplicados ao recorte."
      periodLabel={label}
      actions={<ButtonLink
        href="/finance"
        variant={month !== currentMonthKey() || status === "closed" || status === "unavailable" ? "secondary" : "primary"}
      >
        {month !== currentMonthKey()
          ? "Abrir Finanças (mês atual)"
          : status === "closed" || status === "unavailable"
            ? "Ver lançamentos"
            : "Registrar lançamento"}
      </ButtonLink>}
    />

    <section className="ds-dashboard-filterbar" aria-labelledby="dashboard-filters-title">
      <div className="ds-filterbar-heading">
        <div>
          <h2 id="dashboard-filters-title">Filtros do dashboard</h2>
          <p>Os filtros controlam KPIs, gráficos históricos, distribuição por categoria e lançamentos.</p>
        </div>
        <Badge tone={activeFilterCount ? "accent" : "neutral"}>
          {activeFilterCount ? `${activeFilterCount} filtro${activeFilterCount>1?"s":""} ativo${activeFilterCount>1?"s":""}` : "Sem filtros adicionais"}
        </Badge>
      </div>

      <form className="ds-dashboard-filter-form" action="/" method="get">
        <label>
          <span>Mês</span>
          <input type="month" name="month" min="2000-01" max="2100-12" defaultValue={month} required />
        </label>
        <label>
          <span>Categoria</span>
          <select name="category" defaultValue={categoryId}>
            <option value="">Todas as categorias</option>
            {categories.map(category =>
              <option value={category.id} key={category.id}>
                {category.name}{category.kind === "income" ? " · receita" : " · despesa"}
              </option>
            )}
          </select>
        </label>
        <label>
          <span>Conta</span>
          <select name="account" defaultValue={accountId}>
            <option value="">Todas as contas</option>
            {accounts.map(account =>
              <option value={account.id} key={account.id}>{account.name}</option>
            )}
          </select>
        </label>
        <label>
          <span>Forma de pagamento</span>
          <select name="payment" defaultValue={paymentMethodId}>
            <option value="">Todas as formas</option>
            {paymentMethods.map(method =>
              <option value={method.id} key={method.id}>
                {paymentMethodLabel(method)}{method.is_active ? "" : " · inativa"}
              </option>
            )}
          </select>
        </label>
        <label>
          <span>Tipo</span>
          <select name="kind" defaultValue={kindFilter}>
            <option value="all">Todos os lançamentos</option>
            <option value="expense">Somente despesas</option>
            <option value="income">Somente receitas</option>
          </select>
        </label>
        <div className="ds-filter-actions">
          <Button type="submit" variant="primary">Aplicar filtros</Button>
          <ButtonLink href={resetHref} variant="ghost">Limpar</ButtonLink>
        </div>
      </form>
    </section>

    <div className="ds-context">
      <StatusBadge status={status}/>
      {month === currentMonthKey() && status !== "closed" &&
        <Badge tone="warning">Leitura parcial · mês em andamento</Badge>}
      <span>{filterLabel || "Todos os lançamentos do período"}.</span>
      <span>Resultado é fluxo do período; não representa saldo bancário.</span>
    </div>

    {status === "closed" && <Alert>Este mês está fechado e não pode ser alterado.</Alert>}
    {!queryError && !hasActivity &&
      <Alert>Nenhum lançamento ou planejamento foi encontrado para este recorte.</Alert>}

    <section className="ds-kpi-strip" aria-label="Indicadores do recorte">
      {kpis.map(kpi =>
        <MetricCard key={kpi.label} label={kpi.label} state={kpi.state} detailsHref="/finance"/>
      )}
    </section>

    <div className="ds-cost-dashboard-grid">
      <section className="ds-panel ds-cost-category-panel">
        <SectionHeader
          title={breakdownKind === "expense" ? "Custos por categoria" : "Receitas por categoria"}
          description={`${label} · ${filterLabel || "todos os lançamentos"}`}
          action={<Link href="/finance">Ver lançamentos</Link>}
        />
        {transactionsUnavailable
          ? <EmptyState title="Distribuição indisponível porque a consulta do recorte está incompleta."/>
          : topCategories.length === 0
            ? <EmptyState title={breakdownKind === "expense" ? "Nenhuma despesa neste recorte." : "Nenhuma receita neste recorte."}/>
            : <div className="ds-cost-category-list">
                {topCategories.map(item => {
                  const share = breakdownTotal > 0 ? item.value / breakdownTotal * 100 : 0;
                  return <div className="ds-cost-category-row" key={item.id}>
                    <div className="ds-cost-category-meta">
                      <strong>{item.name}</strong>
                      <span>{share.toLocaleString("pt-BR",{maximumFractionDigits:1})}% · {formatBRL(item.value)}</span>
                    </div>
                    <div className="ds-cost-category-track" aria-hidden="true">
                      <span style={{width:`${Math.max(share,share>0?1:0)}%`}}/>
                    </div>
                  </div>;
                })}
                {categoryBreakdown.length > 6 &&
                  <p className="ds-dashboard-note">Mais {categoryBreakdown.length-6} categorias fazem parte do total.</p>}
              </div>}
      </section>

      <section className="ds-panel ds-cost-ranking-panel">
        <SectionHeader
          title={breakdownKind === "expense" ? "Maiores despesas" : "Maiores receitas"}
          description={label}
        />
        {transactionsUnavailable
          ? <EmptyState title="Ranking indisponível porque a consulta está incompleta."/>
          : topTransactions.length === 0
            ? <EmptyState title="Nenhum lançamento compatível com os filtros."/>
            : <ol className="ds-cost-ranking">
                {topTransactions.map((transaction,index) =>
                  <li key={`${transaction.occurred_on}-${transaction.description}-${index}`}>
                    <span className="ds-cost-rank">{index+1}</span>
                    <div>
                      <strong>{transaction.description || categoryNames.get(transaction.category_id ?? "") || (breakdownKind === "expense" ? "Despesa" : "Receita")}</strong>
                      <small>{formatDate(transaction.occurred_on)}{transaction.category_id ? " · " + (categoryNames.get(transaction.category_id) ?? "Categoria") : ""}</small>
                    </div>
                    <strong className="ds-number">{formatBRL(transaction.amount)}</strong>
                  </li>
                )}
              </ol>}
      </section>
    </div>

    <OverviewCharts
      story={overviewStory}
      unavailable={!overviewStory}
      kindFilter={kindFilter}
      filterLabel={filterLabel || undefined}
    />

    <div className="ds-dashboard-grid">
      <section className="ds-panel wide ds-inverse">
        <SectionHeader
          title="Fluxo financeiro do recorte"
          description={`${label} · valores em reais`}
          action={<Link href="/finance">Ver Finanças</Link>}
        />
        {transactionsUnavailable
          ? <EmptyState title={transactionsIncomplete
              ? "Fluxo indisponível: a consulta não cobre todos os lançamentos do recorte."
              : "Não foi possível carregar o fluxo."}/>
          : transactionCount === 0
            ? <EmptyState title="Nenhum lançamento neste recorte."/>
            : <>
                <div className="ds-flow" aria-hidden="true">
                  {[
                    {name:"Receitas",actual:actualIncome,planned:plannedIncome},
                    {name:"Despesas",actual:actualExpense,planned:plannedExpense},
                  ].filter(row =>
                    kindFilter === "all" ||
                    (kindFilter === "income" && row.name === "Receitas") ||
                    (kindFilter === "expense" && row.name === "Despesas")
                  ).map(row =>
                    <div className="ds-flow-row" key={row.name}>
                      <strong>{row.name}</strong>
                      {fullPlanComparable && plan && !planError && <>
                        <span>Planejado · {formatBRL(row.planned)}</span>
                        <div className="ds-flow-track">
                          <span className="ds-flow-fill planned" style={{width:`${row.planned/maxFlow*100}%`}}/>
                        </div>
                      </>}
                      <span>Realizado · {formatBRL(row.actual)}</span>
                      <div className="ds-flow-track">
                        <span className="ds-flow-fill" style={{width:`${row.actual/maxFlow*100}%`}}/>
                      </div>
                    </div>
                  )}
                </div>
                {!fullPlanComparable && plan && !planError &&
                  <p className="ds-dashboard-note">O planejamento mensal não possui todas as dimensões dos filtros atuais; por isso a série planejada foi omitida deste recorte.</p>}
              </>}
      </section>

      <section className="ds-panel narrow">
        <SectionHeader title="Orçamento do mês" description={categoryId ? categoryNames.get(categoryId) ?? label : label}/>
        {planError
          ? <EmptyState title="Não foi possível carregar o orçamento."/>
          : !budgetComparable
            ? <EmptyState
                title="O orçamento não é segmentado por conta ou forma de pagamento."
                description="Remova esses filtros para comparar realizado e planejado, ou use Planejamento para analisar limites por categoria."
                action={<ButtonLink href={`/planning?month=${month}`}>Abrir Planejamento</ButtonLink>}
              />
            : !plan
              ? <EmptyState
                  title="Defina o orçamento deste mês"
                  description="Informe limites para comparar os custos realizados."
                  action={<ButtonLink href={`/planning?month=${month}`}>Planejar mês</ButtonLink>}
                />
              : <div className="ds-summary">
                  <p>{categoryId ? "Limite da categoria" : "Limite planejado"}</p>
                  <strong className="ds-number">{formatBRL(plannedExpense)}</strong>
                  <p>Despesas realizadas no mesmo recorte</p>
                  <strong className="ds-number">{transactionsUnavailable ? "Indisponível" : formatBRL(actualExpense)}</strong>
                  <Link href={`/planning?month=${month}`}>Ver orçamento por categoria</Link>
                </div>}
      </section>

      <section className="ds-panel">
        <SectionHeader title="Patrimônio e reserva" description="Referências próprias, independentes dos filtros de custos."/>
        <div className="ds-summary">
          <h3>Patrimônio registrado</h3>
          {snapshotResult.error
            ? <p>Não foi possível carregar a posição.</p>
            : snapshot
              ? <>
                  <strong className="ds-number">{formatBRL(snapshot.net_worth)}</strong>
                  <p>Posição em {formatDate(snapshot.captured_on)} · última fotografia registrada.</p>
                </>
              : <p>Sem posição registrada.</p>}
          <Link href="/net-worth">Ver patrimônio</Link>
        </div>
        <div className="ds-summary">
          <h3>Reserva de emergência</h3>
          {reserveResult.error
            ? <p>Não foi possível carregar a reserva.</p>
            : reserveResult.data
              ? <>
                  <strong className="ds-number">{formatBRL(reserveResult.data.emergency_reserve_amount)}</strong>
                  <p>Valor cadastrado atualmente.</p>
                </>
              : <p>Configure a reserva em Segurança financeira.</p>}
          <Link href="/resilience">Ver segurança financeira</Link>
        </div>
      </section>

      <section className="ds-panel">
        <SectionHeader title="Objetivos e dívidas" description={`Cadastros atuais · consulta em ${formatDate(todayInBrazil())}`}/>
        {goalsResult.error
          ? <EmptyState title="Não foi possível carregar os objetivos."/>
          : !goalsResult.data?.length
            ? <div className="ds-summary"><p>Nenhum objetivo ativo cadastrado.</p><Link href="/goals">Criar objetivo</Link></div>
            : goalsResult.data.map(goal => {
                const metrics = goalMetrics(goal,todayInBrazil());
                return <div className="ds-summary" key={goal.id}>
                  <h3>{goal.name}</h3>
                  <p className="ds-number">{formatBRL(metrics.saved)} de {formatBRL(goal.target_amount)} · {metrics.progress}%</p>
                  <p>Prazo: {formatDate(goal.target_date)} · {metrics.complete ? "Concluído" : metrics.overdue ? "Prazo vencido" : "Em andamento"}</p>
                </div>;
              })}
        <div className="ds-summary">
          <Link href="/goals">Ver todos os objetivos</Link>
          <h3>Dívidas ativas</h3>
          {debtMetrics
            ? debtMetrics.activeCount === 0
              ? <p>Nenhuma dívida ativa com saldo em aberto.</p>
              : <>
                  <p className="ds-number">Saldo atual: {formatBRL(debtMetrics.totalBalance)}</p>
                  <p className="ds-number">Pagamentos mínimos: {formatBRL(debtMetrics.minimumPayments)}</p>
                </>
            : <p>Não foi possível carregar as dívidas.</p>}
          <Link href="/debts">Ver dívidas</Link>
        </div>
      </section>

      <section className="ds-panel">
        <SectionHeader title="Atenção e revisão" description={label}/>
        {queryError && <p>A verificação está incompleta porque alguns dados não foram carregados integralmente.</p>}
        {attention.slice(0,3).map(item =>
          <div className="ds-summary" key={item.href+item.text}>
            <p>{item.text}</p><Link href={item.href}>Revisar</Link>
          </div>
        )}
        {attention.length === 0 && !queryError &&
          <p>Nenhuma pendência identificada nas verificações disponíveis para este recorte.</p>}
        <div className="ds-summary">
          <h3>Revisão do comportamento</h3>
          <p>Consulte a comparação com períodos de referência e sua cobertura.</p>
          <Link href={`/behavior?month=${month}`}>Abrir revisão</Link>
        </div>
      </section>

      <section className="ds-panel">
        <SectionHeader
          title="Últimos lançamentos do recorte"
          description={filterLabel || label}
          action={<Link href="/finance">Ver todos</Link>}
        />
        {recentResult.error
          ? <EmptyState title="Não foi possível carregar os lançamentos."/>
          : !recentResult.data?.length
            ? <EmptyState title="Nenhum lançamento encontrado com os filtros atuais."/>
            : <ul className="ds-recent">
                {recentResult.data.map(t =>
                  <li key={t.id}>
                    <div>
                      <strong>{t.description || categoryNames.get(t.category_id ?? "") || (t.kind === "income" ? "Receita" : "Despesa")}</strong>
                      <small>{formatDate(t.occurred_on)} · {t.kind === "income" ? "Receita" : "Despesa"}</small>
                    </div>
                    <strong className="ds-number">{t.kind === "income" ? "+" : "−"}{formatBRL(t.amount)}</strong>
                  </li>
                )}
              </ul>}
      </section>
    </div>
  </AppShell>;
}
