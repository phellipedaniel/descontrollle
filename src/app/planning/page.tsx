import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink, Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader, SectionHeader } from "@/components/layout/page-header";
import {
  formatBRL,
  monthLabelFromKey,
  monthRangeFromKey,
  normalizeMonthKey,
  numberValue,
  shiftMonthKey,
  type Category,
  type CategoryBudget,
  type MonthlyPlan,
} from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";
import { saveCategoryBudget, saveMonthlyPlan } from "./actions";

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const month = normalizeMonthKey(params.month);
  const { start, end } = monthRangeFromKey(month);
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) redirect("/login");

  const [
    { data: planData, error: planDataError },
    { data: categoriesData, error: categoriesDataError },
    { data: transactionsData, error: transactionsDataError, count: transactionsCount },
  ] = await Promise.all([
    supabase
      .from("monthly_plans")
      .select("id, month, planned_income, notes, created_at, updated_at")
      .eq("month", start)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, name, kind, created_at")
      .eq("kind", "expense")
      .order("name"),
    supabase
      .from("transactions")
      .select("kind, amount, category_id", { count: "exact" })
      .gte("occurred_on", start)
      .lt("occurred_on", end),
  ]);

  if (planDataError || categoriesDataError || transactionsDataError) {
    throw new Error("Não foi possível carregar os dados financeiros.");
  }

  const plan = (planData ?? null) as MonthlyPlan | null;
  const categories = (categoriesData ?? []) as Category[];
  const transactions = transactionsData ?? [];
  const transactionsIncomplete = transactionsCount != null && transactionsCount > transactions.length;

  let budgets: CategoryBudget[] = [];
  if (plan?.id) {
    const { data, error } = await supabase
      .from("category_budgets")
      .select("id, plan_id, category_id, planned_amount, created_at, updated_at")
      .eq("plan_id", plan.id);

    if (error) throw new Error("Não foi possível carregar o orçamento.");
    budgets = (data ?? []) as CategoryBudget[];
  }

  const budgetByCategory = new Map(
    budgets.map((budget) => [budget.category_id, numberValue(budget.planned_amount)]),
  );

  const actualExpenseByCategory = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.kind !== "expense" || !transaction.category_id) continue;
    actualExpenseByCategory.set(
      transaction.category_id,
      (actualExpenseByCategory.get(transaction.category_id) ?? 0) + numberValue(transaction.amount),
    );
  }

  const plannedIncome = numberValue(plan?.planned_income);
  const plannedExpense = budgets.reduce(
    (sum, budget) => sum + numberValue(budget.planned_amount),
    0,
  );
  const actualIncome = transactions
    .filter((transaction) => transaction.kind === "income")
    .reduce((sum, transaction) => sum + numberValue(transaction.amount), 0);
  const actualExpense = transactions
    .filter((transaction) => transaction.kind === "expense")
    .reduce((sum, transaction) => sum + numberValue(transaction.amount), 0);

  const plannedBalance = plannedIncome - plannedExpense;
  const actualBalance = actualIncome - actualExpense;
  const expenseVariance = plannedExpense - actualExpense;
  const planCoverage = plannedExpense > 0 ? Math.round((actualExpense / plannedExpense) * 100) : 0;


  const cards = [
    {
      label: "Saldo previsto",
      value: formatBRL(plannedBalance),
      note: "receita − orçamento",
      unavailable: !plan,

    },
    {
      label: "Saldo realizado",
      value: formatBRL(actualBalance),
      note: monthLabelFromKey(month),

    },
    {
      label: "Receita",
      value: formatBRL(actualIncome),
      note: plan ? "planejado " + formatBRL(plannedIncome) : "Sem receita planejada",

    },
    {
      label: "Despesas",
      value: formatBRL(actualExpense),
      note: plan ? "orçamento " + formatBRL(plannedExpense) : "Sem orçamento definido",

    },
  ];

  return (
    <AppShell active="planning">
        <PageHeader title="Planejamento mensal" description="Defina receitas e limites por categoria e compare com o realizado." periodLabel={monthLabelFromKey(month)} actions={
          <div className="ds-month-navigation">
            <Link className="ds-button ghost md" href={"/planning?month=" + shiftMonthKey(month, -1)} aria-label="Mês anterior">Anterior</Link>
            <form className="ds-month-form" method="get"><label>Mês<input type="month" name="month" defaultValue={month} required /></label><Button type="submit" variant="secondary">Consultar</Button></form>
            <Link className="ds-button ghost md" href={"/planning?month=" + shiftMonthKey(month, 1)} aria-label="Próximo mês">Próximo</Link>
          </div>} />
        <div className="ds-context"><Badge>{plan ? "Plano salvo" : "Sem planejamento"}</Badge><span>Receitas e despesas realizadas usam os lançamentos de {monthLabelFromKey(month)}.</span></div>
        {params.error && <Alert tone="danger">{params.error}</Alert>}
        {params.message && <Alert tone="success">{params.message}</Alert>}

        <section className="ds-kpi-strip" aria-label="Resumo do planejamento">
          {cards.map(card => <MetricCard key={card.label} label={card.label} state={transactionsIncomplete && !card.unavailable && card.label !== "Saldo previsto" ? { status: "unavailable", message: "Total indisponível: consulta parcial." } : card.unavailable ? { status: "unavailable", message: "Sem planejamento" } : { status: "ready", formattedValue: card.value, referenceLabel: card.note }} />)}
        </section>
        <section className="planning-grid">
          <Panel className="finance-panel">
            <SectionHeader title="Receita planejada" action={<Badge>{plan ? "Plano salvo" : "Novo plano"}</Badge>} />

            <form className="finance-form" action={saveMonthlyPlan}>
              <input type="hidden" name="month" value={month} />
              <label className="field">
                <span>Quanto você espera receber no mês?</span>
                <input
                  name="planned_income"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={plannedIncome || ""}
                  placeholder="0,00"
                />
              </label>
              <label className="field">
                <span>Observações do plano</span>
                <textarea
                  name="notes"
                  maxLength={300}
                  defaultValue={plan?.notes ?? ""}
                  placeholder="Ex.: mês com IPVA, viagem, bônus ou outra premissa relevante."
                />
              </label>
              <FormSubmitButton variant="primary">Salvar plano do mês</FormSubmitButton>
            </form>
          </Panel>

          <Panel className="finance-panel">
            <SectionHeader title="Uso do orçamento" action={!transactionsIncomplete && plannedExpense > 0 ? <Badge tone={planCoverage > 100 ? "danger" : "neutral"}>{planCoverage}%</Badge> : undefined} />

            {transactionsIncomplete || !plan || plannedExpense === 0 ? <EmptyState title={transactionsIncomplete ? "Uso indisponível: consulta parcial" : !plan ? "Sem planejamento" : "Sem orçamento definido"} description={transactionsIncomplete ? "Não é possível comparar todos os lançamentos retornados." : "Defina limites por categoria para acompanhar o uso do orçamento."} /> : <div className="budget-overview">
              <div className="budget-overview-line">
                <span>Orçado</span><strong>{formatBRL(plannedExpense)}</strong>
              </div>
              <div className="budget-progress" aria-hidden="true">
                <span
                  className={planCoverage > 100 ? "over" : ""}
                  style={{ width: Math.min(planCoverage, 100) + "%" }}
                />
              </div>
              <div className="budget-overview-line">
                <span>Realizado</span><strong>{formatBRL(actualExpense)}</strong>
              </div>
              <div className="budget-overview-line">
                <span>{expenseVariance >= 0 ? "Ainda disponível" : "Acima do orçamento"}</span>
                <strong className={expenseVariance < 0 ? "text-danger" : "text-positive"}>
                  {formatBRL(Math.abs(expenseVariance))}
                </strong>
              </div>
            </div>}
          </Panel>
        </section>

        <Panel className="budget-panel">
          <SectionHeader title="Orçamento de despesas" action={<Badge>{categories.length} categorias</Badge>} />

          {categories.length === 0 ? (
            <EmptyState title="Nenhuma categoria de despesa." description="Crie categorias em Finanças antes de distribuir o orçamento." action={<ButtonLink href="/finance">Abrir Finanças</ButtonLink>} />
          ) : (
            <div className="budget-list">
              {categories.map((category) => {
                const planned = budgetByCategory.get(category.id) ?? 0;
                const actual = actualExpenseByCategory.get(category.id) ?? 0;
                const remaining = planned - actual;
                const usage = planned > 0 ? Math.round((actual / planned) * 100) : 0;

                return (
                  <div className="budget-row" key={category.id}>
                    <div className="budget-category">
                      <strong>{category.name}</strong>
                      <span>
                        {transactionsIncomplete ? "Realizado indisponível" : `Realizado ${formatBRL(actual)} · ${planned > 0 ? usage + "% do limite" : "sem limite definido"}`}
                      </span>
                    </div>

                    <div className="budget-mini-progress" aria-hidden="true" hidden={transactionsIncomplete}>
                      <span
                        className={usage > 100 ? "over" : ""}
                        style={{ width: Math.min(usage, 100) + "%" }}
                      />
                    </div>

                    <div className="budget-remaining">
                      <span>{transactionsIncomplete ? "Consulta parcial" : planned > 0 ? remaining >= 0 ? "Disponível" : "Excedido" : "Sem limite"}</span>
                      {planned > 0 && !transactionsIncomplete && <strong className={remaining < 0 ? "text-danger" : ""}>{formatBRL(Math.abs(remaining))}</strong>}
                    </div>

                    <form className="budget-form" action={saveCategoryBudget}>
                      <input type="hidden" name="month" value={month} />
                      <input type="hidden" name="category_id" value={category.id} />
                      <label className="field">
                        <span>Limite</span>
                        <input
                          name="planned_amount"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={planned || ""}
                          placeholder="0,00"
                        />
                      </label>
                      <FormSubmitButton variant="secondary">Salvar</FormSubmitButton>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <section className="planning-summary">
          <Panel className="finance-panel">
            <SectionHeader title="Resultado esperado" />
            {!plan ? <EmptyState title="Sem planejamento" description="Salve o plano para visualizar o resultado esperado." /> : <>
            <div className="summary-equation">
              <span>{formatBRL(plannedIncome)}</span>
              <b>−</b>
              <span>{formatBRL(plannedExpense)}</span>
              <b>=</b>
              <strong>{formatBRL(plannedBalance)}</strong>
            </div>
            <small>Receita planejada − orçamento de despesas.</small>
            </>}
          </Panel>

          <Panel className="finance-panel">
            <SectionHeader title="Resultado até agora" />
            {transactionsIncomplete ? <EmptyState title="Total indisponível: consulta parcial." /> : <>
            <div className="summary-equation">
              <span>{formatBRL(actualIncome)}</span>
              <b>−</b>
              <span>{formatBRL(actualExpense)}</span>
              <b>=</b>
              <strong>{formatBRL(actualBalance)}</strong>
            </div>
            <small>Receitas lançadas − despesas lançadas no diagnóstico.</small>
            </>}
          </Panel>
        </section>
      </AppShell>
  );
}
