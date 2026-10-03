import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, SectionHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/ui/panel";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { currentMonthKey, normalizeMonthKey, monthLabelFromKey, formatBRL, todayInBrazil } from "@/lib/finance";
import { fixedMonthTotals, minimumFixedMonth, type FixedItem, type FixedVersion, type FixedKind } from "@/lib/fixed-recurrences";
import { saveFixedRecurrence, confirmFixedRecurrence } from "./actions";
type Account = { id: string; name: string };
type Category = { id: string; name: string; kind: FixedKind };
const notices: Record<string, string> = {
  saved: "Vigência salva. Os valores são previstos; nenhum lançamento realizado foi criado.",
  confirmed: "Confirmação registrada em Finanças. Repetir a confirmação não duplica o lançamento.",
  invalid: "Confira valor, conta e vigência. Alterações só podem valer a partir do mês atual, nunca antes de outubro de 2026.",
  "save-error": "Não foi possível salvar. Confira conta, categoria e vigência; meses passados ou fechados não podem ser alterados.",
  "invalid-confirmation": "Confirme o recebimento ou pagamento e escolha uma data válida no mês atual.",
  "confirm-error": "Não foi possível confirmar. Confira a data e se o mês atual está aberto, depois tente novamente.",
};
function VersionFields({ kind, version, accounts, categories, minimum }: {
  kind: FixedKind; version?: FixedVersion; accounts: Account[]; categories: Category[]; minimum: string;
}) {
  return <>
    <label className="field"><span>Descrição</span><input name="description" maxLength={160} required defaultValue={version?.description ?? (kind === "income" ? "Salário" : "")} placeholder={kind === "expense" ? "Ex.: aluguel, internet" : undefined}/></label>
    <div className="form-row">
      <label className="field"><span>Valor mensal (R$)</span><input name="amount" type="number" min="0.01" max="9999999999.99" step="0.01" required defaultValue={version ? Number(version.amount) : undefined}/></label>
      <label className="field"><span>Aplicar a partir de</span><input name="effective_from" type="month" min={minimum} defaultValue={minimum} required/></label>
    </div>
    <label className="field"><span>{kind === "income" ? "Conta de recebimento" : "Conta de pagamento"}</span><select name="account_id" required defaultValue={version?.account_id ?? ""}><option value="" disabled>Selecione uma conta em reais</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <label className="field"><span>Categoria</span><select name="category_id" defaultValue={version?.category_id ?? ""}><option value="">Sem categoria</option>{categories.filter(c => c.kind === kind).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    {version && <label className="automation-confirm"><input name="is_active" type="checkbox" defaultChecked={version.is_active}/> Manter ativa a partir desta vigência</label>}
  </>;
}
export default async function RecurrencesPage({ searchParams }: { searchParams: Promise<{ month?: string; notice?: string }> }) {
  const params = await searchParams, current = currentMonthKey(), month = normalizeMonthKey(params.month), minimum = minimumFixedMonth(current);
  const db = await createClient();
  const { data: auth, error: authError } = await db.auth.getUser();
  if (authError || !auth.user) redirect("/login");
  const [accountResult, categoryResult, recurrenceResult, periodResult] = await Promise.all([
    db.from("accounts").select("id,name", { count: "exact" }).eq("currency", "BRL").order("name"),
    db.from("categories").select("id,name,kind", { count: "exact" }).eq("is_active", true).order("name"),
    db.rpc("fixed_recurrence_month", { p_month: month + "-01" }),
    db.from("financial_periods").select("status").eq("month", month + "-01").maybeSingle(),
  ]);
  const unavailable = Boolean(accountResult.error || categoryResult.error || recurrenceResult.error || periodResult.error
    || (accountResult.count != null && accountResult.count > (accountResult.data?.length ?? 0))
    || (categoryResult.count != null && categoryResult.count > (categoryResult.data?.length ?? 0)) || !Array.isArray(recurrenceResult.data));
  const accounts = (accountResult.data ?? []) as Account[], categories = (categoryResult.data ?? []) as Category[];
  const items = unavailable ? [] : recurrenceResult.data as FixedItem[], totals = fixedMonthTotals(items);
  const canConfirm = !unavailable && month === current && month >= minimum && periodResult.data?.status !== "closed";
  const notice = params.notice && notices[params.notice];
  return <AppShell active="recurrences">
    <PageHeader title="Receitas e custos fixos" description="Salário e compromissos mensais, previstos desde o início do mês. Só a confirmação entra como realizado." periodLabel={monthLabelFromKey(month)} actions={<ButtonLink href="/finance">Ver Finanças</ButtonLink>}/>
    <form method="get" className="month-form"><label className="field"><span>Mês de consulta</span><input type="month" name="month" defaultValue={month} required/></label><Button type="submit" variant="secondary">Consultar</Button></form>
    {notice && <Alert tone={["saved", "confirmed"].includes(params.notice!) ? "success" : "danger"}>{notice}</Alert>}
    <p>Os cadastros começam em outubro de 2026 ou no mês atual, se posterior. Uma nova vigência altera esse mês e os seguintes; os anteriores e os lançamentos já confirmados são preservados.</p>
    <p>Se o mesmo valor já foi lançado manualmente ou pela Automação, não o confirme novamente aqui. Estas previsões não são somadas aos limites do Planejamento.</p>
    {unavailable ? <Alert tone="warning">As receitas e os custos fixos estão indisponíveis. Tente novamente em instantes. Nenhuma previsão foi substituída por zero.</Alert> : <>
      <section className="ds-fixed-summary" aria-label="Previsão das recorrências do mês">
        <Panel><h2>Receitas fixas do mês</h2><strong>{formatBRL(totals.income)}</strong><p>{formatBRL(totals.pendingIncome)} aguardando recebimento</p></Panel>
        <Panel><h2>Custos fixos do mês</h2><strong>{formatBRL(totals.expense)}</strong><p>{formatBRL(totals.pendingExpense)} aguardando pagamento</p></Panel>
        <Panel><h2>Diferença entre receitas e custos fixos</h2><strong>{formatBRL(totals.balance)}</strong><p>Previsão restrita a estas recorrências; não é saldo bancário nem saldo disponível.</p></Panel>
      </section>
      {!accounts.length && <Alert tone="warning">Cadastre uma conta em reais em Finanças antes de adicionar salário ou custos fixos.</Alert>}
      <section className="ds-fixed-forms" aria-label="Cadastrar recorrências">
        {(["income", "expense"] as const).map(kind => <Panel key={kind}><h2>{kind === "income" ? "Salário e receita mensal fixa" : "Novo custo fixo"}</h2><form action={saveFixedRecurrence} className="finance-form">
          <input type="hidden" name="month" value={month}/><input type="hidden" name="kind" value={kind}/>
          <VersionFields kind={kind} accounts={accounts} categories={categories} minimum={minimum}/>
          <FormSubmitButton disabled={!accounts.length}>{kind === "income" ? "Cadastrar receita fixa" : "Cadastrar custo fixo"}</FormSubmitButton>
        </form></Panel>)}
      </section>
      <SectionHeader title="Recorrências e vigências" description="Receitas e despesas continuam previstas até você confirmar. Pausar cria uma vigência inativa, sem apagar o histórico."/>
      {!items.length && <EmptyState title="Nenhuma recorrência cadastrada" description="Cadastre seu salário e seus custos fixos nos formulários acima."/>}
      <div className="ds-fixed-items">{items.map(item => {
        const version = item.version, latest = item.history[0];
        if (!latest) return null;
        return <Panel key={item.id}><h3>{version?.description ?? latest.description}</h3><Badge tone={item.confirmation ? "success" : "neutral"}>{item.kind === "income" ? "Receita" : "Custo fixo"} · {item.confirmation ? "Confirmado" : version?.is_active ? "Previsto" : version ? "Pausado" : "Ainda não iniciado"}</Badge>
          <p>{item.confirmation ? formatBRL(item.confirmation.amount) + " · confirmado em " + item.confirmation.occurred_on.split("-").reverse().join("/") : version?.is_active ? formatBRL(version.amount) + " · previsto para o mês" : "Sem previsão ativa neste mês"}</p>
          {canConfirm && version?.is_active && !item.confirmation && <form action={confirmFixedRecurrence} className="finance-form">
            <input type="hidden" name="item_id" value={item.id}/><input type="hidden" name="month" value={month}/>
            <label className="field"><span>{item.kind === "income" ? "Data do recebimento" : "Data do pagamento"}</span><input name="occurred_on" type="date" min={month + "-01"} max={todayInBrazil()} defaultValue={todayInBrazil()} required/></label>
            <label className="automation-confirm"><input name="confirm_realized" type="checkbox" required/> {item.kind === "income" ? "Já recebi este valor e ainda não o registrei em Finanças." : "Já paguei este valor e ainda não o registrei em Finanças."}</label>
            <FormSubmitButton variant="secondary" pendingLabel="Confirmando…">{item.kind === "income" ? "Confirmar recebimento" : "Confirmar pagamento"}</FormSubmitButton>
          </form>}
          <details className="ds-disclosure"><summary>Alterar por período ou pausar</summary><form action={saveFixedRecurrence} className="finance-form"><input type="hidden" name="item_id" value={item.id}/><input type="hidden" name="kind" value={item.kind}/><input type="hidden" name="month" value={month}/><VersionFields kind={item.kind} version={latest} accounts={accounts} categories={categories} minimum={minimum}/><FormSubmitButton variant="secondary">Salvar vigência</FormSubmitButton></form></details>
          <details className="ds-disclosure"><summary>Histórico de vigências</summary><ul>{item.history.map(v => <li key={v.id}>{monthLabelFromKey(v.effective_from.slice(0, 7))} · {formatBRL(v.amount)} · {v.is_active ? "ativa" : "pausada"}</li>)}</ul></details>
          {!canConfirm && !item.confirmation && version?.is_active && <p>A confirmação fica disponível somente no mês atual, enquanto estiver aberto.</p>}
        </Panel>;
      })}</div>
    </>}
  </AppShell>;
}
