import { redirect } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
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
    { data: transactionsData, error: transactionsDataError },
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
      .select("kind, amount, category_id")
      .gte("occurred_on", start)
      .lt("occurred_on", end),
  ]);

  if (planDataError || categoriesDataError || transactionsDataError) {
    throw new Error("Não foi possível carregar os dados financeiros.");
  }

  const plan = (planData ?? null) as MonthlyPlan | null;
  const categories = (categoriesData ?? []) as Category[];
  const transactions = transactionsData ?? [];

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
  const email = userData.user.email ?? "Minha conta";

  const cards = [
    {
      label: "Saldo previsto",
      value: formatBRL(plannedBalance),
      note: plannedIncome || plannedExpense ? "receita − orçamento" : "defina o plano do mês",
      tone: "purple",
    },
    {
      label: "Saldo realizado",
      value: formatBRL(actualBalance),
      note: monthLabelFromKey(month),
      tone: "blue",
    },
    {
      label: "Receita",
      value: formatBRL(actualIncome),
      note: "planejado " + formatBRL(plannedIncome),
      tone: "green",
    },
    {
      label: "Despesas",
      value: formatBRL(actualExpense),
      note: "orçamento " + formatBRL(plannedExpense),
      tone: "red",
    },
  ];

  return (
    <main className="app-shell">
      <Sidebar active="planning" />

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">DESCONTROLLLE · MVP 2</span>
            <h1>Planejamento mensal</h1>
          </div>
          <div className="profile-chip"><span className="status-dot" />{email}</div>
        </header>

        <section className="planning-toolbar">
          <Link className="month-arrow" href={"/planning?month=" + shiftMonthKey(month, -1)} aria-label="Mês anterior">‹</Link>
          <form className="month-form" method="get">
            <label>
              <span className="eyebrow">MÊS DO PLANO</span>
              <input type="month" name="month" defaultValue={month} />
            </label>
            <button className="button secondary" type="submit">Abrir mês</button>
          </form>
          <Link className="month-arrow" href={"/planning?month=" + shiftMonthKey(month, 1)} aria-label="Próximo mês">›</Link>
        </section>

        <section className="hero-card planning-hero">
          <div>
            <span className="eyebrow">PLANO × REALIDADE</span>
            <h2>{monthLabelFromKey(month)}</h2>
            <p>Defina quanto espera receber e quanto pode gastar por categoria. O descontrollle confronta o plano com os lançamentos reais do diagnóstico financeiro.</p>
          </div>
          <div className="hero-status">
            <span>Despesas orçadas</span><strong>{formatBRL(plannedExpense)}</strong>
            <span>Despesas realizadas</span><strong>{formatBRL(actualExpense)}</strong>
            <span>Diferença disponível</span><strong>{formatBRL(expenseVariance)}</strong>
          </div>
        </section>

        {params.error && <div className="alert error">{params.error}</div>}
        {params.message && <div className="alert success">{params.message}</div>}

        <section className="metric-grid">
          {cards.map((card) => (
            <article className={"metric-card " + card.tone} key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.note}</small>
            </article>
          ))}
        </section>

        <section className="planning-grid">
          <article className="panel finance-panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">PREMISSAS DO MÊS</span>
                <h3>Receita planejada</h3>
              </div>
              <span className="pill">{plan ? "plano salvo" : "novo plano"}</span>
            </div>

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
              <button className="button primary" type="submit">Salvar plano do mês</button>
            </form>
          </article>

          <article className="panel finance-panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">EXECUÇÃO</span>
                <h3>Uso do orçamento</h3>
              </div>
              <span className={"pill " + (planCoverage > 100 ? "pill-danger" : "")}>{planCoverage}%</span>
            </div>

            <div className="budget-overview">
              <div className="budget-overview-line">
                <span>Orçado</span><strong>{formatBRL(plannedExpense)}</strong>
              </div>
              <div className="budget-progress">
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
            </div>
          </article>
        </section>

        <article className="panel budget-panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">LIMITES POR CATEGORIA</span>
              <h3>Orçamento de despesas</h3>
            </div>
            <span className="pill">{categories.length} categorias</span>
          </div>

          {categories.length === 0 ? (
            <div className="empty-state planning-empty">
              Crie categorias de despesa no Diagnóstico Financeiro antes de distribuir o orçamento.
              <Link className="button secondary inline-button" href="/finance">Ir para diagnóstico</Link>
            </div>
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
                        Realizado {formatBRL(actual)} · {planned > 0 ? usage + "% do limite" : "sem limite definido"}
                      </span>
                    </div>

                    <div className="budget-mini-progress">
                      <span
                        className={usage > 100 ? "over" : ""}
                        style={{ width: Math.min(usage, 100) + "%" }}
                      />
                    </div>

                    <div className="budget-remaining">
                      <span>{remaining >= 0 ? "Disponível" : "Excedido"}</span>
                      <strong className={remaining < 0 ? "text-danger" : ""}>{formatBRL(Math.abs(remaining))}</strong>
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
                      <button className="button secondary" type="submit">Salvar</button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <section className="planning-summary">
          <article className="panel finance-panel">
            <span className="eyebrow">PLANEJADO</span>
            <h3>Resultado esperado</h3>
            <div className="summary-equation">
              <span>{formatBRL(plannedIncome)}</span>
              <b>−</b>
              <span>{formatBRL(plannedExpense)}</span>
              <b>=</b>
              <strong>{formatBRL(plannedBalance)}</strong>
            </div>
            <small>Receita planejada − orçamento de despesas.</small>
          </article>

          <article className="panel finance-panel">
            <span className="eyebrow">REALIZADO</span>
            <h3>Resultado até agora</h3>
            <div className="summary-equation">
              <span>{formatBRL(actualIncome)}</span>
              <b>−</b>
              <span>{formatBRL(actualExpense)}</span>
              <b>=</b>
              <strong>{formatBRL(actualBalance)}</strong>
            </div>
            <small>Receitas lançadas − despesas lançadas no diagnóstico.</small>
          </article>
        </section>
      </section>
    </main>
  );
}
