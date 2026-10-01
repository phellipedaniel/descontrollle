import { redirect } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import {
  currentMonthKey,
  currentMonthLabel,
  currentMonthRange,
  formatBRL,
  numberValue,
} from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) redirect("/login");
  const { start, end } = currentMonthRange();

  const [
    { data: accountsData, error: accountsDataError },
    { data: transactionsData, error: transactionsDataError },
    { data: planData, error: planDataError },
  ] = await Promise.all([
    supabase.from("accounts").select("id"),
    supabase.from("transactions").select("kind,amount").gte("occurred_on",start).lt("occurred_on",end),
    supabase.from("monthly_plans").select("id,planned_income").eq("month",start).maybeSingle(),
  ]);

  if (accountsDataError || transactionsDataError || planDataError) {
    throw new Error("Não foi possível carregar os dados financeiros.");
  }

  const accounts = accountsData ?? [];
  const transactions = transactionsData ?? [];
  const incomeTransactions = transactions.filter((transaction) => transaction.kind === "income");
  const expenseTransactions = transactions.filter((transaction) => transaction.kind === "expense");
  const actualIncome = incomeTransactions.reduce((sum,transaction) => sum + numberValue(transaction.amount),0);
  const actualExpense = expenseTransactions.reduce((sum,transaction) => sum + numberValue(transaction.amount),0);
  const actualBalance = actualIncome - actualExpense;

  let plannedExpense = 0;
  if (planData?.id) {
    const { data: budgetsData, error: budgetsError } = await supabase
      .from("category_budgets")
      .select("planned_amount")
      .eq("plan_id",planData.id);
    if (budgetsError) throw new Error("Não foi possível carregar o orçamento.");
    plannedExpense = (budgetsData ?? []).reduce((sum,budget) => sum + numberValue(budget.planned_amount),0);
  }

  const plannedIncome = numberValue(planData?.planned_income);
  const plannedBalance = plannedIncome - plannedExpense;
  const hasPlan = Boolean(planData);
  const email = userData.user.email ?? "Minha conta";

  const cards = [
    { label:"Saldo previsto", value:formatBRL(plannedBalance), note:hasPlan ? "plano de " + currentMonthLabel() : "planeje este mês", tone:"purple" },
    { label:"Saldo realizado", value:formatBRL(actualBalance), note:currentMonthLabel(), tone:"blue" },
    { label:"Receitas", value:formatBRL(actualIncome), note:hasPlan ? "previsto " + formatBRL(plannedIncome) : incomeTransactions.length + " lançamentos", tone:"green" },
    { label:"Despesas", value:formatBRL(actualExpense), note:hasPlan ? "limite " + formatBRL(plannedExpense) : expenseTransactions.length + " lançamentos", tone:"red" },
  ];

  const maxComparison = Math.max(plannedIncome,actualIncome,plannedExpense,actualExpense,1);
  const percent = (value:number) => Math.round((value / maxComparison) * 100);

  return (
    <main className="app-shell">
      <Sidebar active="dashboard" />
      <section className="workspace">
        <header className="topbar">
          <div><span className="eyebrow">DESCONTROLLLE · MVP 9</span><h1>Visão geral</h1></div>
          <div className="profile-chip"><span className="status-dot" />{email}</div>
        </header>

        <section className="hero-card">
          <div>
            <span className="eyebrow">PLANEJAR · EXECUTAR · REVISAR</span>
            <h2>O descontrollle agora também executa rotinas repetitivas sem reescrever o passado.</h2>
            <p>Recorrências, formas de pagamento e fechamento mensal entram no mesmo fluxo, com sincronização idempotente e meses fechados imutáveis.</p>
            <div className="hero-actions">
              <Link className="button primary inline-button" href={"/planning?month=" + currentMonthKey()}>Planejar este mês</Link>
              <Link className="button secondary inline-button" href="/automation">Abrir automações</Link>
            </div>
          </div>
          <div className="hero-status">
            <span>Diagnóstico financeiro</span><strong>ativo</strong>
            <span>Planejamento mensal</span><strong>ativo</strong>
            <span>Objetivos financeiros</span><strong>ativo</strong>
            <span>Segurança financeira</span><strong>ativo</strong>
            <span>Gestão de dívidas</span><strong>ativo</strong>
            <span>Patrimônio líquido</span><strong>ativo</strong>
            <span>Motor de planejamento</span><strong>ativo</strong>
            <span>Comportamento financeiro</span><strong>ativo</strong>\n            <span>Automação</span><strong>ativo</strong>
          </div>
        </section>

        <section className="metric-grid">
          {cards.map((card) => (
            <article className={"metric-card " + card.tone} key={card.label}>
              <span>{card.label}</span><strong>{card.value}</strong><small>{card.note}</small>
            </article>
          ))}
        </section>

        <section className="dashboard-grid">
          <article className="panel chart-panel">
            <div className="panel-title">
              <div><span className="eyebrow">PLANEJADO × REALIZADO</span><h3>Fluxo do mês</h3></div>
              <span className="pill">{currentMonthLabel()}</span>
            </div>
            {!hasPlan && transactions.length === 0 ? (
              <div className="empty-chart"><div className="grid-lines" /><div className="chart-message"><strong>O mês ainda está vazio</strong><span>Crie um plano ou registre uma movimentação para iniciar a comparação.</span></div></div>
            ) : (
              <div className="comparison-chart">
                <div className="comparison-group">
                  <div className="comparison-heading"><span>Receitas</span><strong>{formatBRL(actualIncome)} realizado</strong></div>
                  <div className="comparison-track"><span className="comparison-plan income" style={{width:percent(plannedIncome) + "%"}} /></div>
                  <div className="comparison-track"><span className="comparison-actual income" style={{width:percent(actualIncome) + "%"}} /></div>
                  <div className="comparison-legend"><span>Planejado {formatBRL(plannedIncome)}</span><span>Realizado {formatBRL(actualIncome)}</span></div>
                </div>
                <div className="comparison-group">
                  <div className="comparison-heading"><span>Despesas</span><strong>{formatBRL(actualExpense)} realizado</strong></div>
                  <div className="comparison-track"><span className="comparison-plan expense" style={{width:percent(plannedExpense) + "%"}} /></div>
                  <div className="comparison-track"><span className="comparison-actual expense" style={{width:percent(actualExpense) + "%"}} /></div>
                  <div className="comparison-legend"><span>Planejado {formatBRL(plannedExpense)}</span><span>Realizado {formatBRL(actualExpense)}</span></div>
                </div>
                <div className="comparison-result">
                  <div><span>Saldo previsto</span><strong>{formatBRL(plannedBalance)}</strong></div>
                  <div><span>Saldo realizado</span><strong>{formatBRL(actualBalance)}</strong></div>
                </div>
              </div>
            )}
          </article>

          <article className="panel roadmap-panel">
            <span className="eyebrow">COMPORTAMENTO FINANCEIRO</span>
            <h3>MVP 8 · Revisão</h3>
            <p>Compare o mês com baselines confiáveis, veja mudanças por categoria e registre a ação que faz sentido para você.</p>
            <Link className="button primary inline-button" href="/behavior">Abrir revisão</Link>
          </article>
        </section>
      </section>
    </main>
  );
}
