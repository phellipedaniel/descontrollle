import { redirect } from "next/navigation";
import { TransactionTable } from "@/components/finance/transaction-table";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader, SectionHeader } from "@/components/layout/page-header";
import { paymentMethodLabel, type PaymentMethod } from "@/lib/automation";
import {
  accountTypeLabel,
  currentMonthLabel,
  currentMonthRange,
  formatBRL,
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
    { data: monthTransactionsData, error: monthTransactionsDataError, count: monthTransactionsCount },
    { data: recentTransactionsData, error: recentTransactionsDataError },
    { data: merchantsData, error: merchantsDataError },
    { data: paymentMethodsData, error: paymentMethodsDataError },
  ] = await Promise.all([
    supabase.from("accounts").select("id, name, account_type, initial_balance, currency, created_at").order("created_at"),
    supabase.from("categories").select("id, name, kind, created_at").order("kind").order("name"),
    supabase.from("transactions").select("kind, amount", { count: "exact" }).gte("occurred_on", start).lt("occurred_on", end),
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
  const monthIncomplete = monthTransactionsCount != null && monthTransactionsCount > monthTransactions.length;
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


  const summaryCards = [
    { label: "Saldo do mês", value: formatBRL(balance), note: currentMonthLabel() },
    { label: "Receitas do mês", value: formatBRL(income), note: monthTransactions.filter((item) => item.kind === "income").length + " lançamentos" },
    { label: "Despesas do mês", value: formatBRL(expense), note: monthTransactions.filter((item) => item.kind === "expense").length + " lançamentos" },
    { label: "Contas cadastradas", value: String(accounts.length), note: categories.length + " categorias" },
  ];

  return (
    <AppShell active="finance">
        <PageHeader title="Finanças" description="Registre receitas e despesas e acompanhe o fluxo do mês." periodLabel={currentMonthLabel()} actions={<ButtonLink href="/automation">Central de Automação</ButtonLink>} />
        <div className="ds-context"><Badge tone={currentClosed ? "info" : "neutral"}>{currentClosed ? "Mês fechado" : "Mês aberto"}</Badge><span>Os indicadores usam o mês atual. O histórico abaixo inclui todos os períodos.</span></div>
        {params.error && <Alert tone="danger">{params.error}</Alert>}
        {params.message && <Alert tone="success">{params.message}</Alert>}
        {currentClosed && <Alert tone="warning">O mês atual está fechado. Novos lançamentos, exclusões e sincronizações desse período estão bloqueados.</Alert>}
        {monthIncomplete && <Alert tone="warning">Consulta parcial: os totais do mês estão indisponíveis.</Alert>}

        <section className="ds-kpi-strip" aria-label="Resumo financeiro">
          {summaryCards.map((card, index) => <MetricCard key={card.label} label={card.label} state={monthIncomplete && index < 3 ? { status: "unavailable", message: "Total indisponível: consulta parcial." } : { status: "ready", formattedValue: card.value, referenceLabel: card.note }} />)}
        </section>
        {!accounts.length && <Alert>Cadastre uma conta em “Contas e categorias” para registrar receitas e despesas.</Alert>}
        <section className="entry-grid">
          <Panel className="finance-panel entry-panel income-panel">
            <SectionHeader title="Registrar receita" />
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
              <FormSubmitButton variant="primary" disabled={!accounts.length || currentClosed}>Registrar receita</FormSubmitButton>
            </form>
          </Panel>

          <Panel className="finance-panel entry-panel expense-panel">
            <SectionHeader title="Registrar despesa" />
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
              <FormSubmitButton variant="primary" disabled={!accounts.length || currentClosed}>Registrar despesa</FormSubmitButton>
            </form>
          </Panel>
        </section>

        <Panel className="finance-panel recent-panel">
          <SectionHeader title="Movimentações recentes" description="Valores exatos e identificação da origem dos lançamentos." />
          <TransactionTable transactions={recentTransactions} accountNames={accountNames} categoryNames={categoryNames} merchantNames={merchantNames} paymentMethods={paymentMethodMap} canDelete={!currentClosed} deleteAction={deleteTransaction} />
        </Panel>
        <details className="ds-disclosure" open={!accounts.length}><summary>Contas e categorias</summary>        <section className="setup-grid">
          <Panel className="finance-panel">
            <SectionHeader title="Nova conta" />
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
              <FormSubmitButton variant="primary">Adicionar conta</FormSubmitButton>
            </form>
          </Panel>

          <Panel className="finance-panel">
            <SectionHeader title="Nova categoria" action={<Badge>{categories.length} criadas</Badge>} />
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
              <FormSubmitButton variant="secondary">Adicionar categoria</FormSubmitButton>
            </form>
          </Panel>
        </section>

        <section className="catalog-grid">
          <Panel className="finance-panel">
            <SectionHeader title="Contas cadastradas" action={<Badge>{accounts.length}</Badge>} />
            <div className="data-list">
              {accounts.length === 0 && <EmptyState title="Nenhuma conta cadastrada." />}
              {accounts.map((account) => (
                <div className="data-row" key={account.id}>
                  <div><strong>{account.name}</strong><span>{accountTypeLabel(account.account_type)}</span></div>
                  <strong>{formatBRL(account.initial_balance)}</strong>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="finance-panel">
            <SectionHeader title="Categorias cadastradas" action={<Badge>{categories.length}</Badge>} />
            <div className="tag-grid">
              {categories.length === 0 && <EmptyState title="Crie categorias para organizar os lançamentos." />}
              {categories.map((category) => (
                <Badge key={category.id}>
                  {category.name} · {category.kind === "income" ? "Receita" : "Despesa"}
                </Badge>
              ))}
            </div>
          </Panel>
        </section>

</details>
      </AppShell>
  );
}
