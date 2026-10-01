import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, SectionHeader } from "@/components/layout/page-header";
import { MetricCard, type FinancialDisplayState } from "@/components/dashboard/metric-card";
import { ButtonLink, Button } from "@/components/ui/button";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { currentMonthKey, normalizeMonthKey, monthRangeFromKey, monthLabelFromKey, formatBRL, formatDate, numberValue, todayInBrazil } from "@/lib/finance";
import { goalMetrics } from "@/lib/goals";
import { debtPortfolioMetrics, type Debt } from "@/lib/debts";
import { createClient } from "@/lib/supabase/server";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const month = normalizeMonthKey((await searchParams).month);
  const { start, end } = monthRangeFromKey(month);
  const label = monthLabelFromKey(month);
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) redirect("/login");
  const [transactionsResult, planResult, periodResult, snapshotResult, reserveResult, goalsResult, debtsResult, recentResult] = await Promise.all([
    supabase.from("transactions").select("kind,amount", { count: "exact" }).gte("occurred_on", start).lt("occurred_on", end),
    supabase.from("monthly_plans").select("id,planned_income").eq("month", start).maybeSingle(),
    supabase.from("financial_periods").select("status,reconciliation_status").eq("month", start).maybeSingle(),
    supabase.from("net_worth_snapshots").select("captured_on,net_worth").order("captured_on", { ascending: false }).order("created_at", { ascending: false }).limit(1),
    supabase.from("resilience_profiles").select("emergency_reserve_amount").maybeSingle(),
    supabase.from("financial_goal_progress").select("id,name,target_amount,saved_amount,target_date,status").eq("status", "active").order("target_date").order("id").limit(3),
    supabase.from("debts").select("id,name,current_balance,minimum_payment,annual_interest_rate,status").eq("status", "active"),
    supabase.from("transactions").select("id,kind,amount,description,occurred_on").gte("occurred_on", start).lt("occurred_on", end).order("occurred_on", { ascending: false }).order("created_at", { ascending: false }).order("id").limit(5),
  ]);
  const transactions = transactionsResult.data ?? [];
  const transactionsIncomplete = transactionsResult.count !== null && transactionsResult.count !== undefined && transactionsResult.count > transactions.length;
  const transactionsUnavailable = Boolean(transactionsResult.error || transactionsIncomplete);
  const actualIncome = transactions.filter(t => t.kind === "income").reduce((sum, t) => sum + numberValue(t.amount), 0);
  const actualExpense = transactions.filter(t => t.kind === "expense").reduce((sum, t) => sum + numberValue(t.amount), 0);
  const plan = planResult.data;
  const budgets = plan ? await supabase.from("category_budgets").select("planned_amount").eq("plan_id", plan.id) : null;
  const planError = Boolean(planResult.error || budgets?.error);
  const plannedIncome = numberValue(plan?.planned_income);
  const plannedExpense = (budgets?.data ?? []).reduce((sum, b) => sum + numberValue(b.planned_amount), 0);
  const actualState = (value: number, note: string): FinancialDisplayState => transactionsResult.error ? { status: "error", message: "Não foi possível carregar os lançamentos." } : transactionsIncomplete ? { status: "unavailable", message: "Consulta parcial: total do mês indisponível. Consulte o histórico em Finanças." } : { status: "ready", formattedValue: formatBRL(value), referenceLabel: note };
  const plannedState: FinancialDisplayState = planError ? { status: "error", message: "Não foi possível carregar o planejamento." } : !plan ? { status: "unavailable", message: "Sem planejamento" } : { status: "ready", formattedValue: formatBRL(plannedIncome - plannedExpense), referenceLabel: `Previsto pelo plano de ${label}` };
  const status = periodResult.error ? "unavailable" : periodResult.data?.status === "closed" ? "closed" : "open";
  const snapshot = snapshotResult.data?.[0];
  const debtMetrics = debtsResult.error ? null : debtPortfolioMetrics((debtsResult.data ?? []) as Debt[]);
  const max = Math.max(plannedIncome, plannedExpense, actualIncome, actualExpense, 1);
  const hasActivity = transactions.length > 0 || Boolean(plan);
  const attention: { text: string; href: string }[] = [];
  if (!planError && !plan) attention.push({ text: `Defina o planejamento de ${label} para comparar receitas e despesas.`, href: `/planning?month=${month}` });
  if (!planError && plan && !transactionsUnavailable && actualExpense > plannedExpense) attention.push({ text: `As despesas registradas em ${label} superam o limite planejado.`, href: `/planning?month=${month}` });
  if (!periodResult.error && periodResult.data && periodResult.data.reconciliation_status !== "reconciled") attention.push({ text: `A conciliação de ${label} está ${periodResult.data.reconciliation_status === "incomplete" ? "incompleta" : "pendente"}.`, href: `/automation?month=${month}` });
  const queryError = transactionsUnavailable || planError || periodResult.error;
  return <AppShell active="dashboard">
    <PageHeader title="Visão geral" description="Acompanhe o fluxo do mês e suas prioridades financeiras." periodLabel={label} actions={<>
      <form className="ds-month-form" action="/"><label htmlFor="dashboard-month">Mês<input id="dashboard-month" type="month" name="month" min="2000-01" max="2100-12" defaultValue={month} required /></label><Button type="submit" variant="secondary">Consultar</Button></form>
      <ButtonLink href="/finance" variant={month !== currentMonthKey() || status === "closed" || status === "unavailable" ? "secondary" : "primary"}>{month !== currentMonthKey() ? "Abrir Finanças (mês atual)" : status === "closed" || status === "unavailable" ? "Ver lançamentos" : "Registrar lançamento"}</ButtonLink>
    </>} />
    <div className="ds-context"><StatusBadge status={status}/>{month === currentMonthKey() && status !== "closed" && <Badge tone="warning">Leitura parcial · mês em andamento</Badge>}<span>Fluxo do período; saldo realizado não é saldo bancário.</span>{month !== currentMonthKey() && <span>Finanças abre o mês atual e mantém o histórico de lançamentos.</span>}</div>
    {status === "closed" && <Alert>Este mês está fechado e não pode ser alterado.</Alert>}
    {!queryError && !hasActivity && <Alert>Comece registrando um lançamento em Finanças ou definindo o planejamento deste mês.</Alert>}
    <section className="ds-kpi-strip" aria-label="Resumo financeiro">
      <MetricCard label="Saldo realizado" state={actualState(actualIncome - actualExpense, label)} detailsHref="/finance"/>
      <MetricCard label="Receitas" state={actualState(actualIncome, `${label} · realizado`)} detailsHref="/finance"/>
      <MetricCard label="Despesas" state={actualState(actualExpense, `${label} · realizado`)} detailsHref="/finance"/>
      <MetricCard label="Saldo previsto" state={plannedState} detailsHref={`/planning?month=${month}`}/>
    </section>
    <div className="ds-dashboard-grid">
      <section className="ds-panel wide ds-inverse"><SectionHeader title="Fluxo financeiro" description={`${label} · valores em reais`} action={<Link href="/finance">Ver Finanças</Link>}/>
        {transactionsUnavailable ? <EmptyState title={transactionsIncomplete ? "Fluxo indisponível: a consulta não cobre todos os lançamentos do mês." : "Não foi possível carregar o fluxo."}/> : !hasActivity ? <EmptyState title="Nenhum lançamento ou plano neste mês."/> : <>
          <div className="ds-flow" aria-hidden="true">{[{ name: "Receitas", actual: actualIncome, planned: plannedIncome }, { name: "Despesas", actual: actualExpense, planned: plannedExpense }].map(row => <div className="ds-flow-row" key={row.name}><strong>{row.name}</strong>{plan && !planError && <><span>Planejado · {formatBRL(row.planned)}</span><div className="ds-flow-track"><span className="ds-flow-fill planned" style={{ width: `${row.planned / max * 100}%` }}/></div></>}<span>Realizado · {formatBRL(row.actual)}</span><div className="ds-flow-track"><span className="ds-flow-fill" style={{ width: `${row.actual / max * 100}%` }}/></div></div>)}</div>
          <div className="ds-table-region" role="region" aria-label="Valores do fluxo" tabIndex={0}><table className="ds-table"><caption>Valores exatos · {label}</caption><thead><tr><th scope="col">Fluxo</th>{plan && !planError && <th scope="col" className="number">Planejado</th>}<th scope="col" className="number">Realizado</th></tr></thead><tbody><tr><th scope="row">Receitas</th>{plan && !planError && <td className="number">{formatBRL(plannedIncome)}</td>}<td className="number">{formatBRL(actualIncome)}</td></tr><tr><th scope="row">Despesas</th>{plan && !planError && <td className="number">{formatBRL(plannedExpense)}</td>}<td className="number">{formatBRL(actualExpense)}</td></tr></tbody></table></div>
        </>}
        {planError && <EmptyState title="Comparação planejada indisponível."/>}
      </section>
      <section className="ds-panel narrow"><SectionHeader title="Orçamento do mês" description={label}/>{planError ? <EmptyState title="Não foi possível carregar o orçamento."/> : !plan ? <EmptyState title="Defina o orçamento deste mês" description="Informe receitas e limites para comparar o mês." action={<ButtonLink href={`/planning?month=${month}`}>Planejar mês</ButtonLink>}/> : <div className="ds-summary"><p>Limite planejado</p><strong className="ds-number">{formatBRL(plannedExpense)}</strong><p>Despesas realizadas</p><strong className="ds-number">{transactionsUnavailable ? "Indisponível" : formatBRL(actualExpense)}</strong><p>{plannedExpense === 0 ? "O plano não tem limite de despesas definido." : "Compare os limites por categoria no Planejamento."}</p><Link href={`/planning?month=${month}`}>Ver orçamento por categoria</Link></div>}</section>
      <section className="ds-panel"><SectionHeader title="Patrimônio e reserva" description="Referências próprias, independentes do mês de fluxo."/>
        <div className="ds-summary"><h3>Patrimônio registrado</h3>{snapshotResult.error ? <p>Não foi possível carregar a posição.</p> : snapshot ? <><strong className="ds-number">{formatBRL(snapshot.net_worth)}</strong><p>Posição em {formatDate(snapshot.captured_on)} · última fotografia registrada, pode estar desatualizada.</p></> : <p>Sem posição registrada. Cadastre ativos e passivos e registre uma fotografia no módulo.</p>}<Link href="/net-worth">Ver patrimônio</Link></div>
        <div className="ds-summary"><h3>Reserva de emergência</h3>{reserveResult.error ? <p>Não foi possível carregar a reserva.</p> : reserveResult.data ? <><strong className="ds-number">{formatBRL(reserveResult.data.emergency_reserve_amount)}</strong><p>Valor cadastrado atualmente. A cobertura depende do baseline de despesas essenciais no módulo.</p></> : <p>Configure a reserva e as despesas essenciais em Segurança financeira.</p>}<Link href="/resilience">Ver segurança financeira</Link></div>
      </section>
      <section className="ds-panel"><SectionHeader title="Objetivos e dívidas" description={`Cadastros atuais · consulta em ${formatDate(todayInBrazil())}`}/>
        {goalsResult.error ? <EmptyState title="Não foi possível carregar os objetivos."/> : !goalsResult.data?.length ? <div className="ds-summary"><p>Nenhum objetivo ativo cadastrado.</p><Link href="/goals">Criar objetivo</Link></div> : goalsResult.data.map(goal => { const metrics = goalMetrics(goal, todayInBrazil()); return <div className="ds-summary" key={goal.id}><h3>{goal.name}</h3><p className="ds-number">{formatBRL(metrics.saved)} de {formatBRL(goal.target_amount)} · {metrics.progress}%</p><p>Prazo: {formatDate(goal.target_date)} · {metrics.complete ? "Concluído" : metrics.overdue ? "Prazo vencido" : "Em andamento"}</p></div>; })}
        <div className="ds-summary"><Link href="/goals">Ver todos os objetivos</Link><h3>Dívidas ativas</h3>{debtMetrics ? debtMetrics.activeCount === 0 ? <p>Nenhuma dívida ativa com saldo em aberto.</p> : <><p className="ds-number">Saldo atual: {formatBRL(debtMetrics.totalBalance)}</p><p className="ds-number">Pagamentos mínimos mensais cadastrados: {formatBRL(debtMetrics.minimumPayments)}</p></> : <p>Não foi possível carregar as dívidas.</p>}<Link href="/debts">Ver dívidas</Link></div>
      </section>
      <section className="ds-panel"><SectionHeader title="Atenção e revisão" description={label}/>{queryError && <p>A verificação de pendências está incompleta porque alguns dados não foram carregados integralmente.</p>}{attention.slice(0,3).map(item => <div className="ds-summary" key={item.href + item.text}><p>{item.text}</p><Link href={item.href}>Revisar</Link></div>)}{attention.length === 0 && !queryError && <p>Nenhuma pendência identificada nas verificações de plano, limite de despesas e conciliação deste mês.</p>}<div className="ds-summary"><h3>Revisão do comportamento</h3><p>Consulte a comparação com períodos de referência e sua cobertura no módulo.</p><Link href={`/behavior?month=${month}`}>Abrir revisão</Link></div></section>
      <section className="ds-panel"><SectionHeader title="Últimos lançamentos" description={label} action={<Link href="/finance">Ver todos</Link>}/>{recentResult.error ? <EmptyState title="Não foi possível carregar os lançamentos."/> : !recentResult.data?.length ? <EmptyState title="Nenhum lançamento registrado neste mês."/> : <ul className="ds-recent">{recentResult.data.map(t => <li key={t.id}><div><strong>{t.description || (t.kind === "income" ? "Receita" : "Despesa")}</strong><small>{formatDate(t.occurred_on)} · {t.kind === "income" ? "Receita" : "Despesa"}</small></div><strong className="ds-number">{t.kind === "income" ? "+" : "−"}{formatBRL(t.amount)}</strong></li>)}</ul>}</section>
    </div>
  </AppShell>;
}
