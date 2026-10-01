import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { currentMonthKey, formatBRL } from "@/lib/finance";
import {
  monthName,
  provisionMonthly,
  provisionProgress,
  resilienceMetrics,
  type AnnualProvision,
  type BaselineMode,
  type ResilienceProfile,
} from "@/lib/resilience";
import {
  changeProvisionStatus,
  createProvision,
  saveEssentialCategories,
  saveResilienceProfile,
  updateProvision,
} from "./actions";

type ExpenseCategory = { id: string; name: string };
type ClosedPeriod = { month: string };

const modeLabels: Record<BaselineMode, string> = {
  manual: "Valor manual",
  current_plan: "Planejamento do mês",
  trailing_3_closed: "Média de 3 meses fechados",
};

export default async function ResiliencePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; view?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) redirect("/login");

  const currentMonthStart = currentMonthKey() + "-01";
  const [
    { data: profileData, error: profileError },
    { data: categoriesData, error: categoriesError },
    { data: essentialData, error: essentialError },
    { data: provisionsData, error: provisionsError },
    { data: planData, error: planError },
    { data: closedPeriodsData, error: periodsError },
  ] = await Promise.all([
    supabase
      .from("resilience_profiles")
      .select("user_id,protection_months,baseline_mode,manual_essential_monthly,emergency_reserve_amount,notes")
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id,name")
      .eq("kind", "expense")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("resilience_essential_categories")
      .select("category_id"),
    supabase
      .from("annual_provisions")
      .select("id,name,annual_amount,reserved_amount,due_month,notes,status")
      .order("status")
      .order("name"),
    supabase
      .from("monthly_plans")
      .select("id")
      .eq("month", currentMonthStart)
      .maybeSingle(),
    supabase
      .from("financial_periods")
      .select("month")
      .eq("status", "closed")
      .eq("reconciliation_status", "reconciled")
      .lt("month", currentMonthStart)
      .order("month", { ascending: false })
      .limit(3),
  ]);

  if (profileError || categoriesError || essentialError || provisionsError || planError || periodsError) {
    throw new Error("Não foi possível carregar a segurança financeira.");
  }

  const profile = (profileData ?? null) as ResilienceProfile | null;
  const categories = (categoriesData ?? []) as ExpenseCategory[];
  const essentialIds = (essentialData ?? []).map((row) => row.category_id);
  const essentialSet = new Set(essentialIds);
  const provisions = (provisionsData ?? []) as AnnualProvision[];
  const closedPeriods = (closedPeriodsData ?? []) as ClosedPeriod[];

  let plannedEssential = 0;
  if (planData?.id && essentialIds.length) {
    const { data, error } = await supabase
      .from("category_budgets")
      .select("planned_amount")
      .eq("plan_id", planData.id)
      .in("category_id", essentialIds);
    if (error) throw new Error("Não foi possível calcular o gasto essencial planejado.");
    plannedEssential = (data ?? []).reduce((sum, row) => sum + Number(row.planned_amount), 0);
  }

  let historicalEssential = 0;
  if (essentialIds.length && closedPeriods.length) {
    const periodKeys = new Set(closedPeriods.map((period) => period.month.slice(0, 7)));
    const earliest = closedPeriods[closedPeriods.length - 1].month;
    const { data, error } = await supabase
      .from("transactions")
      .select("amount,occurred_on,category_id")
      .eq("kind", "expense")
      .gte("occurred_on", earliest)
      .lt("occurred_on", currentMonthStart)
      .in("category_id", essentialIds);
    if (error) throw new Error("Não foi possível calcular o histórico essencial.");

    const totals = new Map([...periodKeys].map((key) => [key, 0]));
    for (const transaction of data ?? []) {
      const key = transaction.occurred_on.slice(0, 7);
      if (periodKeys.has(key)) {
        totals.set(key, (totals.get(key) ?? 0) + Number(transaction.amount));
      }
    }
    historicalEssential = [...totals.values()].reduce((sum, value) => sum + value, 0) / closedPeriods.length;
  }

  const mode = (profile?.baseline_mode ?? "manual") as BaselineMode;
  const manualEssential = Number(profile?.manual_essential_monthly ?? 0);
  const baseline =
    mode === "current_plan"
      ? plannedEssential
      : mode === "trailing_3_closed"
        ? historicalEssential
        : manualEssential;

  const reserve = Number(profile?.emergency_reserve_amount ?? 0);
  const months = Number(profile?.protection_months ?? 6);
  const metrics = resilienceMetrics(baseline, reserve, months);

  const activeProvisions = provisions.filter((provision) => provision.status === "active");
  const showArchived = params.view === "archived";
  const visibleProvisions = provisions.filter((provision) => provision.status === (showArchived ? "archived" : "active"));
  const annualProvisionTotal = activeProvisions.reduce((sum, provision) => sum + Number(provision.annual_amount), 0);
  const monthlyProvisionTotal = activeProvisions.reduce((sum, provision) => sum + provisionMonthly(Number(provision.annual_amount)), 0);
  const reservedProvisionTotal = activeProvisions.reduce((sum, provision) => sum + Number(provision.reserved_amount), 0);

  const baselineNote =
    mode === "manual"
      ? "valor informado por você"
      : mode === "current_plan"
        ? planData
          ? "orçamento das categorias essenciais no mês atual"
          : "não há planejamento para o mês atual"
        : closedPeriods.length
          ? "média de " + closedPeriods.length + " meses fechados e reconciliados"
          : "ainda não há meses fechados e reconciliados";

  return (
    <main className="app-shell">
      <Sidebar active="resilience" />
      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">DESCONTROLLLE · MVP 4</span>
            <h1>Segurança financeira</h1>
          </div>
          <div className="profile-chip"><span className="status-dot" />{auth.user.email}</div>
        </header>

        <section className="hero-card">
          <div>
            <span className="eyebrow">RESILIÊNCIA FINANCEIRA</span>
            <h2>Proteja o plano contra o que você não consegue prever.</h2>
            <p>A reserva de emergência cobre imprevistos. Gastos previsíveis ficam em provisões separadas, para que férias, impostos ou manutenção não consumam sua proteção.</p>
          </div>
          <div className="hero-status">
            <span>Categorias essenciais</span><strong>{essentialIds.length}</strong>
            <span>Fonte do baseline</span><strong>{modeLabels[mode]}</strong>
            <span>Provisões ativas</span><strong>{activeProvisions.length}</strong>
          </div>
        </section>

        {params.error && <div className="alert error" role="alert">{params.error}</div>}
        {params.message && <div className="alert success">{params.message}</div>}

        <section className="metric-grid">
          <article className="metric-card purple">
            <span>Gasto essencial mensal</span>
            <strong>{formatBRL(metrics.monthly)}</strong>
            <small>{baselineNote}</small>
          </article>
          <article className="metric-card blue">
            <span>Reserva-alvo</span>
            <strong>{formatBRL(metrics.target)}</strong>
            <small>{metrics.months} meses de proteção</small>
          </article>
          <article className="metric-card green">
            <span>Reserva declarada</span>
            <strong>{formatBRL(metrics.reserve)}</strong>
            <small>{metrics.gap > 0 ? "faltam " + formatBRL(metrics.gap) : "alvo coberto"}</small>
          </article>
          <article className="metric-card red">
            <span>Cobertura atual</span>
            <strong>{metrics.coverage === null ? "—" : metrics.coverage.toFixed(1) + " meses"}</strong>
            <small>{metrics.monthly > 0 ? metrics.progress.toFixed(0) + "% da reserva-alvo" : "defina o gasto essencial"}</small>
          </article>
        </section>

        <section className="resilience-grid">
          <article className="panel finance-panel">
            <div className="panel-title">
              <div><span className="eyebrow">RESERVA DE EMERGÊNCIA</span><h3>Parâmetros de proteção</h3></div>
              <span className="pill">{profile ? "configurado" : "configurar"}</span>
            </div>

            <form className="finance-form" action={saveResilienceProfile}>
              <div className="form-row">
                <label className="field">
                  <span>Meses de proteção</span>
                  <input name="protection_months" type="number" min="1" max="24" step="1" defaultValue={months} required />
                </label>
                <label className="field">
                  <span>Fonte do gasto essencial</span>
                  <select name="baseline_mode" defaultValue={mode}>
                    <option value="manual">Valor manual</option>
                    <option value="current_plan">Planejamento do mês</option>
                    <option value="trailing_3_closed">3 meses fechados</option>
                  </select>
                </label>
              </div>

              <label className="field">
                <span>Gasto essencial mensal manual</span>
                <input name="manual_essential_monthly" type="number" min="0" max="9999999999.99" step="0.01" defaultValue={profile?.manual_essential_monthly ?? ""} placeholder="0,00" />
                <small className="muted">Usado somente quando a fonte selecionada for “Valor manual”.</small>
              </label>

              <label className="field">
                <span>Quanto já existe na reserva de emergência?</span>
                <input name="emergency_reserve_amount" type="number" min="0" max="9999999999.99" step="0.01" defaultValue={reserve} required />
              </label>

              <label className="field">
                <span>Observações</span>
                <textarea name="notes" maxLength={300} defaultValue={profile?.notes ?? ""} placeholder="Ex.: manter a reserva em liquidez imediata." />
              </label>

              <SubmitButton>Salvar proteção</SubmitButton>
            </form>
          </article>

          <article className="panel finance-panel">
            <div className="panel-title">
              <div><span className="eyebrow">DESPESAS ESSENCIAIS</span><h3>O que precisa continuar sendo pago?</h3></div>
              <span className="pill">{essentialIds.length} selecionadas</span>
            </div>

            <p className="resilience-help">Marque somente despesas que você considera essenciais durante uma emergência. O histórico não decide isso por você.</p>

            <form className="essential-form" action={saveEssentialCategories}>
              <div className="essential-list">
                {categories.length === 0 && <div className="empty-state">Crie categorias de despesa no diagnóstico financeiro.</div>}
                {categories.map((category) => (
                  <label className="essential-option" key={category.id}>
                    <input type="checkbox" name="category_ids" value={category.id} defaultChecked={essentialSet.has(category.id)} />
                    <span>{category.name}</span>
                  </label>
                ))}
              </div>
              <SubmitButton className="button secondary">Salvar categorias essenciais</SubmitButton>
            </form>

            <div className="baseline-breakdown">
              <div><span>Plano atual</span><strong>{formatBRL(plannedEssential)}</strong></div>
              <div><span>Média histórica confiável</span><strong>{formatBRL(historicalEssential)}</strong></div>
            </div>
          </article>
        </section>

        <section className="resilience-explainer">
          <article className="panel resilience-rule emergency-rule">
            <span className="eyebrow">EMERGÊNCIA</span>
            <h3>Imprevisto</h3>
            <p>Perda de renda ou uma necessidade inesperada. É para isso que existe a reserva de emergência.</p>
          </article>
          <article className="panel resilience-rule predictable-rule">
            <span className="eyebrow">PROVISÃO</span>
            <h3>Gasto previsível</h3>
            <p>Um custo que você sabe que chegará. Ele recebe uma provisão própria e não deve consumir a reserva.</p>
          </article>
        </section>

        <section className="goals-section">
          <div className="section-heading-row">
            <div>
              <span className="eyebrow">PROVISÕES ANUAIS</span>
              <h2>Prepare gastos previsíveis</h2>
            </div>
            <div className="view-switch">
              <a className={!showArchived ? "active" : ""} href="/resilience">Ativas</a>
              <a className={showArchived ? "active" : ""} href="/resilience?view=archived">Arquivadas</a>
            </div>
          </div>

          {!showArchived && (
            <section className="resilience-grid provision-create-grid">
              <article className="panel finance-panel">
                <div className="panel-title">
                  <div><span className="eyebrow">NOVA PROVISÃO</span><h3>Transforme surpresa em planejamento</h3></div>
                </div>
                <form className="finance-form" action={createProvision}>
                  <label className="field"><span>Nome</span><input name="name" required minLength={2} maxLength={80} placeholder="Ex.: IPVA, matrícula, manutenção" /></label>
                  <div className="form-row">
                    <label className="field"><span>Custo anual esperado</span><input name="annual_amount" type="number" min="0.01" max="9999999999.99" step="0.01" required placeholder="0,00" /></label>
                    <label className="field"><span>Quanto já está provisionado?</span><input name="reserved_amount" type="number" min="0" max="9999999999.99" step="0.01" defaultValue="0" /></label>
                  </div>
                  <label className="field">
                    <span>Mês previsto (opcional)</span>
                    <select name="due_month" defaultValue="">
                      <option value="">Sem mês definido</option>
                      {Array.from({ length: 12 }, (_, index) => <option value={index + 1} key={index + 1}>{monthName(index + 1)}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>Observações</span><textarea name="notes" maxLength={300} placeholder="O que está incluído nessa provisão?" /></label>
                  <SubmitButton>Criar provisão</SubmitButton>
                </form>
              </article>

              <article className="panel provision-summary">
                <span className="eyebrow">CUSTOS PREVISÍVEIS</span>
                <h3>Quanto separar por mês</h3>
                <strong>{formatBRL(monthlyProvisionTotal)}</strong>
                <p>Base mensal para as provisões ativas, calculada como custo anual ÷ 12 e arredondada para cima em centavos.</p>
                <div className="baseline-breakdown">
                  <div><span>Custo anual</span><strong>{formatBRL(annualProvisionTotal)}</strong></div>
                  <div><span>Já provisionado</span><strong>{formatBRL(reservedProvisionTotal)}</strong></div>
                </div>
              </article>
            </section>
          )}

          <div className="provision-grid">
            {visibleProvisions.length === 0 && <div className="panel empty-state">Nenhuma provisão {showArchived ? "arquivada" : "ativa"}.</div>}
            {visibleProvisions.map((provision) => {
              const annual = Number(provision.annual_amount);
              const reserved = Number(provision.reserved_amount);
              const progress = provisionProgress(annual, reserved);
              return (
                <article className="panel provision-card" key={provision.id}>
                  <div className="panel-title">
                    <div><span className="eyebrow">PROVISÃO</span><h3>{provision.name}</h3></div>
                    <span className="pill">{monthName(provision.due_month)}</span>
                  </div>
                  <div className="provision-amount"><strong>{formatBRL(annual)}</strong><span>por ano</span></div>
                  <div className="provision-monthly">Separar <strong>{formatBRL(provisionMonthly(annual))}</strong> por mês</div>
                  <progress className="goal-progress" max="100" value={progress} />
                  <div className="goal-facts"><span>{formatBRL(reserved)} já provisionado</span><span>{progress.toFixed(0)}%</span></div>
                  {provision.notes && <p className="goal-note">{provision.notes}</p>}

                  <details className="goal-details">
                    <summary>Editar provisão</summary>
                    <form className="finance-form" action={updateProvision}>
                      <input type="hidden" name="id" value={provision.id} />
                      <label className="field"><span>Nome</span><input name="name" defaultValue={provision.name} required minLength={2} maxLength={80} /></label>
                      <div className="form-row">
                        <label className="field"><span>Custo anual</span><input name="annual_amount" type="number" min="0.01" max="9999999999.99" step="0.01" defaultValue={annual} required /></label>
                        <label className="field"><span>Já provisionado</span><input name="reserved_amount" type="number" min="0" max="9999999999.99" step="0.01" defaultValue={reserved} /></label>
                      </div>
                      <label className="field">
                        <span>Mês previsto</span>
                        <select name="due_month" defaultValue={provision.due_month ?? ""}>
                          <option value="">Sem mês definido</option>
                          {Array.from({ length: 12 }, (_, index) => <option value={index + 1} key={index + 1}>{monthName(index + 1)}</option>)}
                        </select>
                      </label>
                      <label className="field"><span>Observações</span><textarea name="notes" maxLength={300} defaultValue={provision.notes ?? ""} /></label>
                      <SubmitButton className="button secondary">Salvar alterações</SubmitButton>
                    </form>
                  </details>

                  <form className="goal-status-form" action={changeProvisionStatus}>
                    <input type="hidden" name="id" value={provision.id} />
                    <input type="hidden" name="status" value={provision.status === "active" ? "archived" : "active"} />
                    <SubmitButton className="button secondary">{provision.status === "active" ? "Arquivar provisão" : "Reativar provisão"}</SubmitButton>
                  </form>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
