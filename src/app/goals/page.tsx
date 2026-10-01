import Link from "next/link";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { currentMonthKey, formatBRL, formatDate, todayInBrazil } from "@/lib/finance";
import { goalMetrics, type Goal } from "@/lib/goals";
import { addContribution, changeGoalStatus, createGoal, removeContribution, updateGoal } from "./actions";

function GoalFields({ goal }: { goal?: Goal }) {
  return <>
    <label className="field"><span>Nome do objetivo</span><input name="name" required minLength={2} maxLength={80} defaultValue={goal?.name} placeholder="Ex.: Reserva de emergência" /></label>
    <div className="form-row">
      <label className="field"><span>Quanto quer reservar?</span><input name="target_amount" type="number" min="0.01" max="9999999999.99" step="0.01" required defaultValue={goal ? Number(goal.target_amount) : undefined} placeholder="0,00" /></label>
      <label className="field"><span>Até quando?</span><input name="target_date" type="date" min={goal ? "2000-01-01" : todayInBrazil()} max="2100-12-31" required defaultValue={goal?.target_date} /></label>
    </div>
    {!goal && <label className="field"><span>Quanto já tem reservado?</span><input name="initial_amount" type="number" min="0" max="9999999999.99" step="0.01" defaultValue="0" /><small className="muted">Valor de partida. Depois, registre os novos aportes no objetivo.</small></label>}
    <label className="field"><span>Observações (opcional)</span><textarea name="notes" maxLength={300} defaultValue={goal?.notes ?? ""} placeholder="O que esse objetivo representa para você?" /></label>
  </>;
}

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; view?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) redirect("/login");
  const [{ data: goalsData, error: goalsError }, { data: history, error: historyError }, { data: plan, error: planError }] = await Promise.all([
    supabase.from("financial_goal_progress").select("id,name,target_amount,initial_amount,saved_amount,target_date,notes,status,contribution_count").order("target_date").order("id"),
    supabase.from("goal_contributions").select("id,goal_id,amount,occurred_on,note,created_at").order("occurred_on", { ascending: false }).order("created_at", { ascending: false }).limit(30),
    supabase.from("monthly_plans").select("id,planned_income").eq("month", currentMonthKey() + "-01").maybeSingle(),
  ]);
  if (goalsError || historyError || planError) throw new Error("Não foi possível carregar os objetivos.");
  let plannedAvailable: number | null = null;
  if (plan) {
    const { data: budgets, error } = await supabase.from("category_budgets").select("planned_amount").eq("plan_id", plan.id);
    if (error) throw new Error("Não foi possível consultar o planejamento.");
    plannedAvailable = Number(plan.planned_income) - (budgets ?? []).reduce((sum, row) => sum + Number(row.planned_amount), 0);
  }
  const today = todayInBrazil();
  const goals = (goalsData ?? []) as Goal[];
  const active = goals.filter((g) => g.status === "active");
  const metrics = new Map(goals.map((g) => [g.id, goalMetrics(g, today)]));
  const total = (field: "saved" | "remaining") => active.reduce((sum, g) => sum + metrics.get(g.id)![field], 0);
  const monthly = active.reduce((sum, g) => sum + (metrics.get(g.id)!.monthly ?? 0), 0);
  const overdue = active.filter((g) => metrics.get(g.id)!.overdue).length;
  const showArchived = params.view === "archived";
  const visible = goals.filter((g) => g.status === (showArchived ? "archived" : "active"));
  const goalById = new Map(goals.map((g) => [g.id, g]));
  return <main className="app-shell">
    <Sidebar active="goals" />
    <section className="workspace">
      <header className="topbar"><div><span className="eyebrow">DESCONTROLLLE · MVP 3</span><h1>Objetivos financeiros</h1></div><div className="profile-chip"><span className="status-dot" />{auth.user.email}</div></header>
      <section className="hero-card">
        <div><span className="eyebrow">SEU PRÓXIMO PASSO</span><h2>Dê um destino ao dinheiro que você reserva.</h2><p>Defina uma meta, acompanhe seus aportes e veja quanto precisa reservar por mês até o prazo.</p></div>
        <div className="hero-status"><span>Objetivos ativos</span><strong>{active.length}</strong><span>Metas alcançadas</span><strong>{active.filter((g) => metrics.get(g.id)!.complete).length}</strong><span>Prazo vencido</span><strong>{overdue}</strong></div>
      </section>
      {params.error && <div className="alert error" role="alert">{params.error}</div>}
      {params.message && <div className="alert success" role="status">{params.message}</div>}
      <section className="metric-grid">
        <article className="metric-card green"><span>Já reservado</span><strong>{formatBRL(total("saved"))}</strong><small>nos objetivos ativos</small></article>
        <article className="metric-card purple"><span>Falta reservar</span><strong>{formatBRL(total("remaining"))}</strong><small>para alcançar suas metas</small></article>
        <article className="metric-card blue"><span>Aporte mensal necessário</span><strong>{formatBRL(monthly)}</strong><small>{overdue ? "revise também os prazos vencidos" : "inclui o mês atual e o mês do prazo"}</small></article>
        <article className="metric-card purple"><span>Sobra prevista no mês</span><strong>{plannedAvailable === null ? "Sem plano" : formatBRL(plannedAvailable)}</strong><small>receita planejada menos orçamento</small></article>
      </section>
      <section className="goals-intro-grid">
        <article className="panel finance-panel"><span className="eyebrow">NOVO OBJETIVO</span><h3>O que você quer conquistar?</h3><form className="finance-form" action={createGoal}><GoalFields /><SubmitButton>Criar objetivo</SubmitButton></form></article>
        <article className="panel roadmap-panel"><span className="eyebrow">DO PLANO À CONQUISTA</span><h3>Reserve com intenção</h3><p>Registre somente valores que você já separou. Os aportes acompanham sua reserva e não movimentam contas nem geram receitas ou despesas.</p><p>O cálculo divide o valor restante pelos meses até o prazo, incluindo o mês atual. Não considera rendimentos futuros.</p>{plannedAvailable !== null && monthly > Math.max(plannedAvailable, 0) && <div className="alert error">Os aportes mensais necessários superam a sobra prevista. Revise o orçamento, os valores ou os prazos.</div>}{overdue > 0 && <div className="alert error">Há objetivos com prazo vencido. Eles não entram na estimativa mensal até você ajustar a data.</div>}<Link className="button secondary inline-button" href={"/planning?month=" + currentMonthKey()}>Revisar planejamento</Link></article>
      </section>
      <section className="goals-section" aria-label="Seus objetivos">
        <div className="panel-title"><div><span className="eyebrow">SEUS OBJETIVOS</span><h2>{showArchived ? "Arquivados" : "Em acompanhamento"}</h2></div><Link className="button secondary" href={showArchived ? "/goals" : "/goals?view=archived"}>{showArchived ? "Ver ativos" : "Ver arquivados"}</Link></div>
        {visible.length === 0 && <div className="panel finance-panel empty-state">{showArchived ? "Nenhum objetivo arquivado." : "Você ainda não tem objetivos ativos. Comece criando sua primeira meta acima."}</div>}
        <div className="goals-grid">{visible.map((goal) => {
          const m = metrics.get(goal.id)!;
          return <article className="panel finance-panel goal-card" key={goal.id}>
            <div className="panel-title"><div><h3>{goal.name}</h3><p className="muted">Até {formatDate(goal.target_date)}</p></div><span className={"pill " + (m.overdue ? "pill-danger" : "")}>{showArchived ? "Arquivado" : m.complete ? "Meta alcançada" : m.overdue ? "Prazo vencido" : "Em andamento"}</span></div>
            <div className="goal-amount"><strong>{formatBRL(m.saved)}</strong><span>de {formatBRL(goal.target_amount)}</span></div>
            <progress className="goal-progress" value={m.progress} max={100} aria-label={"Progresso de " + goal.name} />
            <div className="goal-facts"><span>{m.progress}% reservado</span><span>Faltam {formatBRL(m.remaining)}</span></div>
            <p className="muted">Valor inicial {formatBRL(goal.initial_amount)} · {goal.contribution_count} aportes</p>
            <p className="muted">{m.complete ? "Você alcançou o valor desejado." : m.overdue ? "Ajuste o prazo para recalcular seu aporte mensal." : `${formatBRL(m.monthly)} por mês em ${m.months} ${m.months === 1 ? "mês" : "meses"}.`}</p>
            {goal.notes && <p className="goal-note">{goal.notes}</p>}
            {!showArchived && <details className="goal-details"><summary>Registrar aporte</summary><form className="finance-form" action={addContribution}>
              <input type="hidden" name="goal_id" value={goal.id} /><input type="hidden" name="id" value={randomUUID()} />
              <div className="form-row"><label className="field"><span>Valor reservado</span><input name="amount" type="number" min="0.01" max="9999999999.99" step="0.01" required /></label><label className="field"><span>Data do aporte</span><input name="occurred_on" type="date" min="2000-01-01" max={today} defaultValue={today} required /></label></div>
              <label className="field"><span>Descrição (opcional)</span><input name="note" maxLength={160} /></label><SubmitButton>Salvar aporte</SubmitButton>
            </form></details>}
            <details className="goal-details"><summary>Editar objetivo</summary><form className="finance-form" action={updateGoal}><input type="hidden" name="id" value={goal.id} /><GoalFields goal={goal} /><SubmitButton>Salvar objetivo</SubmitButton></form></details>
            <form action={changeGoalStatus} className="goal-status-form"><input type="hidden" name="id" value={goal.id} /><input type="hidden" name="status" value={showArchived ? "active" : "archived"} /><SubmitButton className="button secondary">{showArchived ? "Reativar objetivo" : "Arquivar objetivo"}</SubmitButton></form>
          </article>;
        })}</div>
      </section>
      <article className="panel finance-panel recent-panel"><div className="panel-title"><div><span className="eyebrow">HISTÓRICO DE APORTES</span><h3>Valores reservados</h3></div><span className="pill">últimos 30</span></div>
        <div className="data-list">{!history?.length && <div className="empty-state">Seus novos aportes aparecerão aqui. O valor inicial fica registrado em cada objetivo.</div>}
          {(history ?? []).map((entry) => <div className="data-row transaction-row" key={entry.id}><div><strong>{goalById.get(entry.goal_id)?.name ?? "Objetivo"}</strong><span>{formatDate(entry.occurred_on)}{entry.note ? " · " + entry.note : ""}</span></div><div className="transaction-actions"><strong className="text-positive">{formatBRL(entry.amount)}</strong>{goalById.get(entry.goal_id)?.status === "active" && <details className="goal-remove"><summary>Corrigir</summary><p>Remover este aporte do histórico e recalcular o valor reservado?</p><form action={removeContribution}><input type="hidden" name="id" value={entry.id} /><SubmitButton className="button negative">Confirmar remoção</SubmitButton></form></details>}</div></div>)}
        </div>
      </article>
    </section>
  </main>;
}
