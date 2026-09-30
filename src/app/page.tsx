import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import {
  currentMonthLabel,
  currentMonthRange,
  formatBRL,
  numberValue,
} from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";

export default async function Dashboard() {
  const supabase = await createClient();
  const { start, end } = currentMonthRange();

  const [
    { data: userData },
    { data: accountsData },
    { data: transactionsData },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("accounts").select("id"),
    supabase
      .from("transactions")
      .select("kind, amount")
      .gte("occurred_on", start)
      .lt("occurred_on", end),
  ]);

  const accounts = accountsData ?? [];
  const transactions = transactionsData ?? [];
  const incomeTransactions = transactions.filter((transaction) => transaction.kind === "income");
  const expenseTransactions = transactions.filter((transaction) => transaction.kind === "expense");
  const income = incomeTransactions.reduce((sum, transaction) => sum + numberValue(transaction.amount), 0);
  const expense = expenseTransactions.reduce((sum, transaction) => sum + numberValue(transaction.amount), 0);
  const balance = income - expense;
  const scale = Math.max(income, expense, 1);
  const incomeWidth = Math.round((income / scale) * 100);
  const expenseWidth = Math.round((expense / scale) * 100);
  const email = userData.user?.email ?? "usuário";

  const cards = [
    { label: "Saldo do mês", value: formatBRL(balance), note: currentMonthLabel(), tone: "purple" },
    { label: "Receitas", value: formatBRL(income), note: incomeTransactions.length + " lançamentos", tone: "green" },
    { label: "Despesas", value: formatBRL(expense), note: expenseTransactions.length + " lançamentos", tone: "red" },
    { label: "Contas", value: String(accounts.length), note: accounts.length ? "estrutura cadastrada" : "cadastre a primeira conta", tone: "blue" },
  ];

  return (
    <main className="app-shell">
      <Sidebar active="dashboard" />

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">DESCONTROLLLE · MVP 1</span>
            <h1>Visão geral</h1>
          </div>
          <div className="profile-chip"><span className="status-dot" />{email}</div>
        </header>

        <section className="hero-card">
          <div>
            <span className="eyebrow">DIAGNÓSTICO ATIVO</span>
            <h2>O presente financeiro agora alimenta o seu planejamento.</h2>
            <p>Registre contas, receitas, despesas e categorias. Esta fotografia mensal será a base para comparar o planejado com o realizado no próximo MVP.</p>
            <div className="hero-actions">
              <Link className="button primary inline-button" href="/finance">Registrar movimentação</Link>
            </div>
          </div>
          <div className="hero-status">
            <span>Supabase Auth</span><strong>ativo</strong>
            <span>Diagnóstico financeiro</span><strong>ativo</strong>
            <span>Planejamento mensal</span><strong>próximo MVP</strong>
          </div>
        </section>

        <section className="metric-grid">
          {cards.map((card) => (
            <article className={"metric-card " + card.tone} key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.note}</small>
            </article>
          ))}
        </section>

        <section className="dashboard-grid">
          <article className="panel chart-panel">
            <div className="panel-title">
              <div><span className="eyebrow">REALIZADO</span><h3>Fluxo do mês</h3></div>
              <span className="pill">{currentMonthLabel()}</span>
            </div>

            {transactions.length === 0 ? (
              <div className="empty-chart" aria-label="Sem movimentações no mês">
                <div className="grid-lines" />
                <div className="chart-message">
                  <strong>Sem dados neste mês</strong>
                  <span>Registre a primeira movimentação no Diagnóstico Financeiro.</span>
                </div>
              </div>
            ) : (
              <div className="flow-bars">
                <div className="flow-row">
                  <div className="flow-meta"><span>Receitas</span><strong>{formatBRL(income)}</strong></div>
                  <div className="flow-track"><span className="flow-fill income" style={{ width: incomeWidth + "%" }} /></div>
                </div>
                <div className="flow-row">
                  <div className="flow-meta"><span>Despesas</span><strong>{formatBRL(expense)}</strong></div>
                  <div className="flow-track"><span className="flow-fill expense" style={{ width: expenseWidth + "%" }} /></div>
                </div>
                <div className="flow-balance">
                  <span>Resultado do mês</span>
                  <strong>{formatBRL(balance)}</strong>
                </div>
              </div>
            )}
          </article>

          <article className="panel roadmap-panel">
            <span className="eyebrow">PRÓXIMO PASSO</span>
            <h3>MVP 2 · Planejamento Mensal</h3>
            <p>Orçamento projetado, limites por categoria e comparação planejado × realizado.</p>
            <div className="progress"><span style={{ width: "20%" }} /></div>
            <small>MVP 1 fornece os dados reais que alimentarão o planejamento.</small>
          </article>
        </section>
      </section>
    </main>
  );
}
