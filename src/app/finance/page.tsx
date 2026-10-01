import { redirect } from "next/navigation";\nimport Link from "next/link";
import { Sidebar } from "@/components/sidebar";\nimport { paymentMethodLabel, type PaymentMethod } from "@/lib/automation";
import {
  accountTypeLabel,
  currentMonthLabel,
  currentMonthRange,
  formatBRL,
  formatDate,
  numberValue,
  todayInBrazil,
  type Category,
  type FinancialAccount,
  type FinancialTransaction,
} from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";
import {
  createAccount,
  createCategory,
  createTransaction,
  deleteTransaction,
} from "./actions";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) redirect("/login");
  const { start, end } = currentMonthRange();

  const { data: currentPeriod, error: currentPeriodError } = await supabase
    .from("financial_periods")
    .select("status")
    .eq("month", start)
    .maybeSingle();

  if (currentPeriodError) throw new Error("Não foi possível verificar o fechamento do mês.");

  const currentClosed = currentPeriod?.status === "closed";
  if (!currentClosed) {
    const { error: syncError } = await supabase.rpc("sync_recurring_month", { p_month: start });
    if (syncError) throw new Error("Não foi possível sincronizar os gastos recorrentes do mês.");
  }

  const [
    { data: accountsData, error: accountsDataError },
    { data: categoriesData, error: categoriesDataError },
    { data: monthTransactionsData, error: monthTransactionsDataError },
    { data: recentTransactionsData, error: recentTransactionsDataError },
    { data: merchantsData, error: merchantsDataError },
    { data: paymentMethodsData, error: paymentMethodsDataError },
  ] = await Promise.all([
    supabase.from("accounts").select("id, name, account_type, initial_balance, currency, created_at").order("created_at"),
    supabase.from("categories").select("id, name, kind, created_at").order("kind").order("name"),
    supabase.from("transactions").select("kind, amount").gte("occurred_on", start).lt("occurred_on", end),
    supabase
      .from("transactions")
      .select("id, account_id, category_id, merchant_id, payment_method_id, source_type, recurring_expense_id, recurring_period, kind, amount, occurred_on, description, created_at")
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("merchants").select("id,name").eq("is_active",true).order("name"),
    supabase.from("payment_methods").select("id,kind,name,card_brand,is_active,created_at,updated_at").eq("is_active",true).order("name"),
  ]);

  if (accountsDataError || categoriesDataError || monthTransactionsDataError || recentTransactionsDataError || merchantsDataError || paymentMethodsDataError) {
    throw new Error("Não foi possível carregar os dados financeiros.");
  }

  const accounts = (accountsData ?? []) as FinancialAccount[];
  const categories = (categoriesData ?? []) as Category[];
  const monthTransactions = monthTransactionsData ?? [];
  const recentTransactions = (recentTransactionsData ?? []) as FinancialTransaction[];
  const merchants = (merchantsData ?? []) as Array<{id:string;name:string}>;
  const paymentMethods = (paymentMethodsData ?? []) as PaymentMethod[];

  const incomeCategories = categories.filter((category) => category.kind === "income");
  const expenseCategories = categories.filter((category) => category.kind === "expense");
  const income = monthTransactions
    .filter((transaction) => transaction.kind === "income")
    .reduce((sum, transaction) => sum + numberValue(transaction.amount), 0);
  const expense = monthTransactions
    .filter((transaction) => transaction.kind === "expense")
    .reduce((sum, transaction) => sum + numberValue(transaction.amount), 0);
  const balance = income - expense;

  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const merchantNames = new Map(merchants.map((merchant) => [merchant.id, merchant.name]));
  const paymentMethodMap = new Map(paymentMethods.map((method) => [method.id, method]));
  const email = userData.user.email ?? "Minha conta";

  const summaryCards = [
    { label: "Saldo do mês", value: formatBRL(balance), note: currentMonthLabel(), tone: "purple" },
    { label: "Receitas do mês", value: formatBRL(income), note: monthTransactions.filter((item) => item.kind === "income").length + " lançamentos", tone: "green" },
    { label: "Despesas do mês", value: formatBRL(expense), note: monthTransactions.filter((item) => item.kind === "expense").length + " lançamentos", tone: "red" },
    { label: "Contas cadastradas", value: String(accounts.length), note: categories.length + " categorias", tone: "blue" },
  ];

  return (
    <main className="app-shell">
      <Sidebar active="finance" />

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">DESCONTROLLLE · MVP 9</span>
            <h1>Diagnóstico financeiro</h1>
          </div>
          <div className="profile-chip"><span className="status-dot" />{email}</div>
        </header>

        <section className="hero-card">
          <div>
            <span className="eyebrow">DADOS FINANCEIROS</span>
            <h2>Registre o presente e deixe o repetitivo para a automação.</h2>
            <p>Lançamentos manuais convivem com recorrências automáticas, formas de pagamento e a trava definitiva dos meses fechados.</p>
          </div>
          <div className="hero-actions">
            <Link className="button secondary inline-button" href="/automation">Central de Automação</Link>
          </div>
          <div className="hero-status">
            <span>Mês atual</span><strong>{currentMonthLabel()}</strong>
            <span>Contas</span><strong>{accounts.length}</strong>
            <span>Categorias</span><strong>{categories.length}</strong>
          </div>
        </section>

        {params.error && <div className="alert error">{params.error}</div>}
        {params.message && <div className="alert success">{params.message}</div>}
        {currentClosed && <div className="alert forecast-warning">O mês atual está fechado. Novos lançamentos, exclusões e sincronizações desse período estão bloqueados.</div>}

        <section className="metric-grid">
          {summaryCards.map((card) => (
            <article className={"metric-card " + card.tone} key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.note}</small>
            </article>
          ))}
        </section>

        <section className="setup-grid">
          <article className="panel finance-panel">
            <div className="panel-title">
              <div><span className="eyebrow">ESTRUTURA</span><h3>Nova conta</h3></div>
              <span className="pill">1 de {Math.max(accounts.length + 1, 1)}</span>
            </div>
            <form className="finance-form" action={createAccount}>
              <label className="field">
                <span>Nome da conta</span>
                <input name="name" required minLength={2} maxLength={80} placeholder="Ex.: Conta principal" />
              </label>
              <div className="form-row">
                <label className="field">
                  <span>Tipo</span>
                  <select name="account_type" defaultValue="checking">
                    <option value="checking">Conta corrente</option>
                    <option value="savings">Poupança</option>
                    <option value="cash">Dinheiro</option>
                    <option value="investment">Investimentos</option>
                    <option value="other">Outra</option>
                  </select>
                </label>
                <label className="field">
                  <span>Saldo inicial</span>
                  <input name="initial_balance" type="number" step="0.01" defaultValue="0" />
                </label>
              </div>
              <button className="button primary" type="submit">Adicionar conta</button>
            </form>
          </article>

          <article className="panel finance-panel">
            <div className="panel-title">
              <div><span className="eyebrow">ORGANIZAÇÃO</span><h3>Nova categoria</h3></div>
              <span className="pill">{categories.length} criadas</span>
            </div>
            <form className="finance-form" action={createCategory}>
              <label className="field">
                <span>Nome</span>
                <input name="name" required minLength={2} maxLength={80} placeholder="Ex.: Mercado" />
              </label>
              <label className="field">
                <span>Tipo</span>
                <select name="kind" defaultValue="expense">
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
              </label>
              <button className="button secondary" type="submit">Adicionar categoria</button>
            </form>
          </article>
        </section>

        <section className="entry-grid">
          <article className="panel finance-panel entry-panel income-panel">
            <div><span className="eyebrow">ENTRADA</span><h3>Registrar receita</h3></div>
            <form className="finance-form" action={createTransaction}>
              <input type="hidden" name="kind" value="income" />
              <div className="form-row">
                <label className="field">
                  <span>Valor</span>
                  <input name="amount" type="number" min="0.01" step="0.01" required placeholder="0,00" />
                </label>
                <label className="field">
                  <span>Data</span>
                  <input name="occurred_on" type="date" required defaultValue={todayInBrazil()} />
                </label>
              </div>
              <label className="field">
                <span>Conta</span>
                <select name="account_id" required defaultValue="">
                  <option value="" disabled>{accounts.length ? "Selecione uma conta" : "Cadastre uma conta primeiro"}</option>
                  {accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Categoria</span>
                <select name="category_id" defaultValue="">
                  <option value="">Sem categoria</option>
                  {incomeCategories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Descrição</span>
                <input name="description" maxLength={160} placeholder="Ex.: Salário" />
              </label>
              <button className="button positive" type="submit" disabled={!accounts.length || currentClosed}>Registrar receita</button>
            </form>
          </article>

          <article className="panel finance-panel entry-panel expense-panel">
            <div><span className="eyebrow">SAÍDA</span><h3>Registrar despesa</h3></div>
            <form className="finance-form" action={createTransaction}>
              <input type="hidden" name="kind" value="expense" />
              <div className="form-row">
                <label className="field">
                  <span>Valor</span>
                  <input name="amount" type="number" min="0.01" step="0.01" required placeholder="0,00" />
                </label>
                <label className="field">
                  <span>Data</span>
                  <input name="occurred_on" type="date" required defaultValue={todayInBrazil()} />
                </label>
              </div>
              <label className="field">
                <span>Conta</span>
                <select name="account_id" required defaultValue="">
                  <option value="" disabled>{accounts.length ? "Selecione uma conta" : "Cadastre uma conta primeiro"}</option>
                  {accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Categoria</span>
                <select name="category_id" defaultValue="">
                  <option value="">Sem categoria</option>
                  {expenseCategories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
                </select>
              </label>
              <div className="form-row">
                <label className="field">
                  <span>Estabelecimento</span>
                  <select name="merchant_id" defaultValue="">
                    <option value="">Não informar</option>
                    {merchants.map((merchant) => <option value={merchant.id} key={merchant.id}>{merchant.name}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Forma de pagamento</span>
                  <select name="payment_method_id" defaultValue="">
                    <option value="">Não informar</option>
                    {paymentMethods.map((method) => <option value={method.id} key={method.id}>{paymentMethodLabel(method)}</option>)}
                  </select>
                </label>
              </div>
              <label className="field">
                <span>Descrição</span>
                <input name="description" maxLength={160} placeholder="Ex.: Supermercado" />
              </label>
              <button className="button negative" type="submit" disabled={!accounts.length || currentClosed}>Registrar despesa</button>
            </form>
          </article>
        </section>

        <section className="catalog-grid">
          <article className="panel finance-panel">
            <div className="panel-title"><div><span className="eyebrow">CONTAS</span><h3>Estrutura financeira</h3></div><span className="pill">{accounts.length}</span></div>
            <div className="data-list">
              {accounts.length === 0 && <div className="empty-state">Nenhuma conta cadastrada.</div>}
              {accounts.map((account) => (
                <div className="data-row" key={account.id}>
                  <div><strong>{account.name}</strong><span>{accountTypeLabel(account.account_type)}</span></div>
                  <strong>{formatBRL(account.initial_balance)}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="panel finance-panel">
            <div className="panel-title"><div><span className="eyebrow">CATEGORIAS</span><h3>Classificação</h3></div><span className="pill">{categories.length}</span></div>
            <div className="tag-grid">
              {categories.length === 0 && <div className="empty-state">Crie categorias para organizar os lançamentos.</div>}
              {categories.map((category) => (
                <span className={"tag " + category.kind} key={category.id}>
                  {category.kind === "income" ? "+" : "−"} {category.name}
                </span>
              ))}
            </div>
          </article>
        </section>

        <article className="panel finance-panel recent-panel">
          <div className="panel-title">
            <div><span className="eyebrow">HISTÓRICO</span><h3>Movimentações recentes</h3></div>
            <span className="pill">últimas 20</span>
          </div>
          <div className="data-list transaction-list">
            {recentTransactions.length === 0 && <div className="empty-state">Nenhuma movimentação registrada.</div>}
            {recentTransactions.map((transaction) => {
              const categoryName = transaction.category_id ? categoryNames.get(transaction.category_id) : undefined;
              const merchantName = transaction.merchant_id ? merchantNames.get(transaction.merchant_id) : undefined;
              const method = transaction.payment_method_id ? paymentMethodMap.get(transaction.payment_method_id) : undefined;
              const automatic = transaction.source_type === "recurring";
              return (
                <div className="data-row transaction-row" key={transaction.id}>
                  <div className="data-row-main">
                    <strong>{transaction.description || categoryName || (transaction.kind === "income" ? "Receita" : "Despesa")}</strong>
                    <span>{formatDate(transaction.occurred_on)} · {accountNames.get(transaction.account_id) ?? "Conta"}{categoryName ? " · " + categoryName : ""}{merchantName ? " · " + merchantName : ""}{method ? " · " + paymentMethodLabel(method) : ""}</span>
                  </div>
                  <div className="transaction-actions">
                    {automatic && <span className="pill automation-pill">automática</span>}
                    <strong className={"amount " + transaction.kind}>
                      {transaction.kind === "income" ? "+" : "−"} {formatBRL(transaction.amount)}
                    </strong>
                    {!automatic && !currentClosed && (
                      <form action={deleteTransaction}>
                        <input type="hidden" name="id" value={transaction.id} />
                        <button className="icon-button danger" type="submit" aria-label="Excluir movimentação">×</button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </main>
  );
}
