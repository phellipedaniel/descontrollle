import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatDate, todayInBrazil } from "@/lib/finance";
import {
  debtPortfolioMetrics,
  debtTypeLabel,
  orderDebts,
  type Debt,
  type DebtPayment,
  type DebtStrategy,
} from "@/lib/debts";
import {
  changeDebtStatus,
  createDebt,
  recordDebtPayment,
  saveDebtStrategy,
  updateDebt,
} from "./actions";

const strategyLabel: Record<DebtStrategy,string> = {
  avalanche: "Avalanche",
  snowball: "Bola de neve",
};

function rateLabel(value: number | string | null) {
  if (value === null) return "taxa não informada";
  return Number(value).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:4}) + "% a.a.";
}

export default async function DebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; view?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) redirect("/login");

  const [
    { data: debtsData, error: debtsError },
    { data: paymentsData, error: paymentsError },
    { data: profileData, error: profileError },
  ] = await Promise.all([
    supabase
      .from("debts")
      .select("id,name,creditor,debt_type,current_balance,annual_interest_rate,minimum_payment,due_day,notes,status,created_at")
      .order("status")
      .order("created_at"),
    supabase
      .from("debt_payments")
      .select("id,debt_id,amount,resulting_balance,occurred_on,note,created_at")
      .order("occurred_on",{ascending:false})
      .order("created_at",{ascending:false})
      .limit(30),
    supabase
      .from("debt_strategy_profiles")
      .select("strategy,extra_monthly_payment,notes")
      .maybeSingle(),
  ]);

  if (debtsError || paymentsError || profileError) throw new Error("Não foi possível carregar as dívidas.");

  const debts = (debtsData ?? []) as Debt[];
  const payments = (paymentsData ?? []) as DebtPayment[];
  const strategy = ((profileData?.strategy ?? "avalanche") as DebtStrategy);
  const extraMonthly = Number(profileData?.extra_monthly_payment ?? 0);
  const metrics = debtPortfolioMetrics(debts);
  const avalanche = orderDebts(debts,"avalanche");
  const snowball = orderDebts(debts,"snowball");
  const selectedOrder = strategy === "avalanche" ? avalanche : snowball;
  const showHistory = params.view === "history";
  const visible = showHistory
    ? debts.filter((debt) => debt.status !== "active")
    : debts.filter((debt) => debt.status === "active");
  const debtById = new Map(debts.map((debt) => [debt.id,debt]));

  return (
    <AppShell active="debts">
        <PageHeader title="Dívidas" actions={<div className="profile-chip"><span className="status-dot" />{auth.user.email}</div>} />

        <section className="hero-card">
          <div>
            <span className="eyebrow">MAPA DE DÍVIDAS</span>
            <h2>Veja o saldo, o custo e a ordem de ataque sem esconder as premissas.</h2>
            <p>Avalanche prioriza a maior taxa informada. Bola de neve prioriza o menor saldo. O app mostra as duas ordens e você escolhe qual estratégia acompanhar.</p>
          </div>
          <div className="hero-status">
            <span>Dívidas ativas</span><strong>{metrics.activeCount}</strong>
            <span>Estratégia escolhida</span><strong>{strategyLabel[strategy]}</strong>
            <span>Pagamento extra</span><strong>{formatBRL(extraMonthly)}/mês</strong>
          </div>
        </section>

        {params.error && <div className="alert error" role="alert">{params.error}</div>}
        {params.message && <div className="alert success">{params.message}</div>}

        <section className="metric-grid">
          <article className="metric-card red"><span>Saldo total</span><strong>{formatBRL(metrics.totalBalance)}</strong><small>{metrics.activeCount} dívidas ativas</small></article>
          <article className="metric-card purple"><span>Pagamentos mínimos</span><strong>{formatBRL(metrics.minimumPayments)}</strong><small>compromisso mensal informado</small></article>
          <article className="metric-card blue"><span>Taxa média ponderada</span><strong>{metrics.weightedAnnualRate === null ? "—" : metrics.weightedAnnualRate.toFixed(2) + "% a.a."}</strong><small>somente dívidas com taxa informada</small></article>
          <article className="metric-card green"><span>Juros mensais estimados</span><strong>{formatBRL(metrics.estimatedMonthlyInterest)}</strong><small>aproximação simples com taxas informadas</small></article>
        </section>

        <section className="debt-top-grid">
          <article className="panel finance-panel">
            <div className="panel-title"><div><span className="eyebrow">ESTRATÉGIA</span><h3>Como ordenar a quitação</h3></div><span className="pill">{strategyLabel[strategy]}</span></div>
            <form className="finance-form" action={saveDebtStrategy}>
              <label className="field">
                <span>Estratégia acompanhada</span>
                <select name="strategy" defaultValue={strategy}>
                  <option value="avalanche">Avalanche — maior taxa primeiro</option>
                  <option value="snowball">Bola de neve — menor saldo primeiro</option>
                </select>
              </label>
              <label className="field"><span>Valor extra mensal além dos mínimos</span><input name="extra_monthly_payment" type="number" min="0" max="9999999999.99" step="0.01" defaultValue={extraMonthly} /></label>
              <label className="field"><span>Observações</span><textarea name="notes" maxLength={300} defaultValue={profileData?.notes ?? ""} placeholder="Ex.: manter os mínimos de todas e concentrar o extra na prioridade atual." /></label>
              <SubmitButton>Salvar estratégia</SubmitButton>
            </form>
          </article>

          <article className="panel finance-panel">
            <div className="panel-title"><div><span className="eyebrow">PRIORIDADE ATUAL</span><h3>{selectedOrder[0]?.name ?? "Nenhuma dívida ativa"}</h3></div><span className="pill">{strategyLabel[strategy]}</span></div>
            {selectedOrder[0] ? (
              <div className="debt-focus">
                <strong>{formatBRL(selectedOrder[0].current_balance)}</strong>
                <span>{rateLabel(selectedOrder[0].annual_interest_rate)}</span>
                <p>Manter os pagamentos mínimos registrados e direcionar o extra de {formatBRL(extraMonthly)} para esta prioridade é a regra configurada no app. O saldo continua sendo informado por você após cada pagamento.</p>
              </div>
            ) : <div className="empty-state">Cadastre uma dívida ativa para montar a ordem.</div>}
          </article>
        </section>

        <section className="debt-strategy-grid">
          <article className={"panel debt-order-panel " + (strategy === "avalanche" ? "selected" : "")}>
            <span className="eyebrow">AVALANCHE</span>
            <h3>Maior taxa primeiro</h3>
            <p>Ordena pelas taxas anuais informadas, da maior para a menor. Dívidas sem taxa ficam depois das que possuem taxa.</p>
            <ol className="debt-order-list">
              {avalanche.map((debt,index) => <li key={debt.id}><span>{index+1}. {debt.name}</span><strong>{rateLabel(debt.annual_interest_rate)} · {formatBRL(debt.current_balance)}</strong></li>)}
            </ol>
          </article>
          <article className={"panel debt-order-panel " + (strategy === "snowball" ? "selected" : "")}>
            <span className="eyebrow">BOLA DE NEVE</span>
            <h3>Menor saldo primeiro</h3>
            <p>Ordena pelo saldo atual, do menor para o maior. Em empate, usa a maior taxa informada.</p>
            <ol className="debt-order-list">
              {snowball.map((debt,index) => <li key={debt.id}><span>{index+1}. {debt.name}</span><strong>{formatBRL(debt.current_balance)} · {rateLabel(debt.annual_interest_rate)}</strong></li>)}
            </ol>
          </article>
        </section>

        <section className="goals-section">
          <div className="section-heading-row">
            <div><span className="eyebrow">CARTEIRA DE DÍVIDAS</span><h2>Cadastre e acompanhe os saldos</h2></div>
            <div className="view-switch">
              <a className={!showHistory ? "active" : ""} href="/debts">Ativas</a>
              <a className={showHistory ? "active" : ""} href="/debts?view=history">Quitadas/arquivadas</a>
            </div>
          </div>

          {!showHistory && (
            <article className="panel finance-panel debt-create">
              <div className="panel-title"><div><span className="eyebrow">NOVA DÍVIDA</span><h3>Registrar saldo atual</h3></div></div>
              <form className="finance-form" action={createDebt}>
                <div className="form-row">
                  <label className="field"><span>Nome da dívida</span><input name="name" required minLength={2} maxLength={80} placeholder="Ex.: Cartão Nubank" /></label>
                  <label className="field"><span>Credor (opcional)</span><input name="creditor" maxLength={100} placeholder="Ex.: Nubank" /></label>
                </div>
                <div className="form-row">
                  <label className="field">
                    <span>Tipo</span>
                    <select name="debt_type" defaultValue="credit_card">
                      <option value="credit_card">Cartão de crédito</option>
                      <option value="personal_loan">Empréstimo pessoal</option>
                      <option value="financing">Financiamento</option>
                      <option value="overdraft">Cheque especial</option>
                      <option value="installment">Parcelamento</option>
                      <option value="other">Outra dívida</option>
                    </select>
                  </label>
                  <label className="field"><span>Saldo atual</span><input name="current_balance" type="number" min="0.01" max="9999999999.99" step="0.01" required placeholder="0,00" /></label>
                </div>
                <div className="form-row">
                  <label className="field"><span>Taxa anual % (opcional)</span><input name="annual_interest_rate" type="number" min="0" max="999.9999" step="0.0001" placeholder="0" /></label>
                  <label className="field"><span>Pagamento mínimo mensal</span><input name="minimum_payment" type="number" min="0" max="9999999999.99" step="0.01" defaultValue="0" /></label>
                </div>
                <label className="field"><span>Dia do vencimento (opcional)</span><input name="due_day" type="number" min="1" max="31" step="1" /></label>
                <label className="field"><span>Observações</span><textarea name="notes" maxLength={300} placeholder="Informações úteis sobre contrato, negociação ou vencimento." /></label>
                <SubmitButton>Cadastrar dívida</SubmitButton>
              </form>
            </article>
          )}

          <div className="debt-grid">
            {visible.length === 0 && <div className="panel empty-state">Nenhuma dívida {showHistory ? "quitada ou arquivada" : "ativa"}.</div>}
            {visible.map((debt) => (
              <article className="panel debt-card" key={debt.id}>
                <div className="panel-title">
                  <div><span className="eyebrow">{debtTypeLabel(debt.debt_type)}</span><h3>{debt.name}</h3></div>
                  <span className={"pill " + (debt.status === "paid" ? "debt-paid" : "")}>{debt.status === "active" ? "ativa" : debt.status === "paid" ? "quitada" : "arquivada"}</span>
                </div>
                <div className="debt-balance"><strong>{formatBRL(debt.current_balance)}</strong><span>saldo informado</span></div>
                <div className="debt-facts">
                  <span>{rateLabel(debt.annual_interest_rate)}</span>
                  <span>Mínimo {formatBRL(debt.minimum_payment)}</span>
                  <span>{debt.due_day ? "Vence dia " + debt.due_day : "Sem vencimento informado"}</span>
                  {debt.creditor && <span>Credor: {debt.creditor}</span>}
                </div>
                {debt.notes && <p className="goal-note">{debt.notes}</p>}

                {debt.status === "active" && (
                  <details className="goal-details">
                    <summary>Registrar pagamento</summary>
                    <form className="finance-form" action={recordDebtPayment}>
                      <input type="hidden" name="debt_id" value={debt.id} />
                      <div className="form-row">
                        <label className="field"><span>Valor pago</span><input name="amount" type="number" min="0.01" max="9999999999.99" step="0.01" required /></label>
                        <label className="field"><span>Novo saldo após o pagamento</span><input name="resulting_balance" type="number" min="0" max={Number(debt.current_balance)} step="0.01" required /></label>
                      </div>
                      <label className="field"><span>Data</span><input name="occurred_on" type="date" max={todayInBrazil()} defaultValue={todayInBrazil()} required /></label>
                      <label className="field"><span>Observação</span><input name="note" maxLength={160} placeholder="Ex.: parcela de outubro" /></label>
                      <SubmitButton>Registrar pagamento</SubmitButton>
                    </form>
                  </details>
                )}

                <details className="goal-details">
                  <summary>Editar dados</summary>
                  <form className="finance-form" action={updateDebt}>
                    <input type="hidden" name="id" value={debt.id} />
                    <div className="form-row">
                      <label className="field"><span>Nome</span><input name="name" defaultValue={debt.name} required minLength={2} maxLength={80} /></label>
                      <label className="field"><span>Credor</span><input name="creditor" defaultValue={debt.creditor ?? ""} maxLength={100} /></label>
                    </div>
                    <label className="field">
                      <span>Tipo</span>
                      <select name="debt_type" defaultValue={debt.debt_type}>
                        <option value="credit_card">Cartão de crédito</option><option value="personal_loan">Empréstimo pessoal</option><option value="financing">Financiamento</option><option value="overdraft">Cheque especial</option><option value="installment">Parcelamento</option><option value="other">Outra dívida</option>
                      </select>
                    </label>
                    <div className="form-row">
                      <label className="field"><span>Taxa anual %</span><input name="annual_interest_rate" type="number" min="0" max="999.9999" step="0.0001" defaultValue={debt.annual_interest_rate ?? ""} /></label>
                      <label className="field"><span>Pagamento mínimo</span><input name="minimum_payment" type="number" min="0" max="9999999999.99" step="0.01" defaultValue={Number(debt.minimum_payment)} /></label>
                    </div>
                    <label className="field"><span>Dia do vencimento</span><input name="due_day" type="number" min="1" max="31" defaultValue={debt.due_day ?? ""} /></label>
                    <label className="field"><span>Observações</span><textarea name="notes" maxLength={300} defaultValue={debt.notes ?? ""} /></label>
                    <SubmitButton className="button secondary">Salvar dados</SubmitButton>
                  </form>
                </details>

                {debt.status !== "paid" && (
                  <form className="goal-status-form" action={changeDebtStatus}>
                    <input type="hidden" name="id" value={debt.id} />
                    <input type="hidden" name="status" value={debt.status === "active" ? "archived" : "active"} />
                    <SubmitButton className="button secondary">{debt.status === "active" ? "Arquivar dívida" : "Reativar dívida"}</SubmitButton>
                  </form>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="goals-section">
          <span className="eyebrow">HISTÓRICO</span>
          <h2>Pagamentos recentes</h2>
          <article className="panel">
            <div className="data-list">
              {payments.length === 0 && <div className="empty-state">Nenhum pagamento de dívida registrado.</div>}
              {payments.map((payment) => {
                const debt = debtById.get(payment.debt_id);
                return (
                  <div className="data-row" key={payment.id}>
                    <div>
                      <strong>{debt?.name ?? "Dívida"}</strong>
                      <span>{formatDate(payment.occurred_on)}{payment.note ? " · " + payment.note : ""}</span>
                    </div>
                    <div className="debt-payment-values">
                      <strong>{formatBRL(payment.amount)} pago</strong>
                      <span>saldo {formatBRL(payment.resulting_balance)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </section>
      </AppShell>
  );
}
