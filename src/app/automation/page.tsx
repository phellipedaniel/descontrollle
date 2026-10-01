import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { SubmitButton } from "@/components/submit-button";
import {
  latestVersionForMonth,
  paymentMethodKindLabel,
  paymentMethodLabel,
  type PaymentMethod,
  type RecurringVersion,
} from "@/lib/automation";
import {
  currentMonthKey,
  formatBRL,
  monthLabelFromKey,
  monthRangeFromKey,
  normalizeMonthKey,
  shiftMonthKey,
} from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";
import {
  closeFinancialPeriod,
  createPaymentMethod,
  createRecurringExpense,
  syncRecurringMonth,
  updatePaymentMethod,
  versionRecurringExpense,
} from "./actions";

type AccountRow={id:string;name:string;account_type:string};
type CategoryRow={id:string;name:string;is_active:boolean};
type MerchantRow={id:string;name:string;is_active:boolean};
type PeriodRow={
  month:string;
  status:"open"|"closed";
  reconciliation_status:"reconciled"|"unreconciled"|"incomplete";
  closed_at:string|null;
  notes:string|null;
};
type RecurringRoot={id:string;created_at:string};

function maxMonth(a:string,b:string){return a>=b?a:b;}

export default async function AutomationPage({
  searchParams,
}:{
  searchParams:Promise<{month?:string;error?:string;message?:string}>
}) {
  const params=await searchParams;
  const supabase=await createClient();
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth.user) redirect("/login");

  const currentMonth=currentMonthKey();
  const selectedMonth=params.month?normalizeMonthKey(params.month):currentMonth;
  const {start:selectedStart,end:selectedEnd}=monthRangeFromKey(selectedMonth);

  const [
    {data:accountsData,error:accountsError},
    {data:categoriesData,error:categoriesError},
    {data:merchantsData,error:merchantsError},
    {data:methodsData,error:methodsError},
    {data:rootsData,error:rootsError},
    {data:versionsData,error:versionsError},
    {data:periodsData,error:periodsError},
    {data:generatedData,error:generatedError},
  ]=await Promise.all([
    supabase.from("accounts").select("id,name,account_type").order("name"),
    supabase.from("categories").select("id,name,is_active").eq("kind","expense").order("name"),
    supabase.from("merchants").select("id,name,is_active").order("name"),
    supabase.from("payment_methods").select("id,kind,name,card_brand,is_active,created_at,updated_at").order("is_active",{ascending:false}).order("name"),
    supabase.from("recurring_expenses").select("id,created_at").order("created_at"),
    supabase.from("recurring_expense_versions").select("id,recurring_expense_id,effective_from,description,amount,day_of_month,account_id,category_id,merchant_id,payment_method_id,is_active,created_at").order("effective_from",{ascending:false}).order("created_at",{ascending:false}),
    supabase.from("financial_periods").select("month,status,reconciliation_status,closed_at,notes").order("month",{ascending:false}).limit(60),
    supabase.from("transactions").select("id").eq("source_type","recurring").gte("occurred_on",selectedStart).lt("occurred_on",selectedEnd),
  ]);

  if(accountsError||categoriesError||merchantsError||methodsError||rootsError||versionsError||periodsError||generatedError){
    throw new Error("Não foi possível carregar a Central de Automação.");
  }

  const accounts=(accountsData??[]) as AccountRow[];
  const categories=(categoriesData??[]) as CategoryRow[];
  const merchants=(merchantsData??[]) as MerchantRow[];
  const methods=(methodsData??[]) as PaymentMethod[];
  const roots=(rootsData??[]) as RecurringRoot[];
  const versions=(versionsData??[]) as RecurringVersion[];
  const periods=(periodsData??[]) as PeriodRow[];

  const accountNames=new Map(accounts.map(item=>[item.id,item.name]));
  const categoryNames=new Map(categories.map(item=>[item.id,item.name]));
  const merchantNames=new Map(merchants.map(item=>[item.id,item.name]));
  const methodMap=new Map(methods.map(item=>[item.id,item]));

  const versionsByRoot=new Map<string,RecurringVersion[]>();
  for(const version of versions){
    const list=versionsByRoot.get(version.recurring_expense_id)??[];
    list.push(version);
    versionsByRoot.set(version.recurring_expense_id,list);
  }

  const selectedPeriod=periods.find(period=>period.month.slice(0,7)===selectedMonth)??null;
  const lastClosed=periods.find(period=>period.status==="closed")?.month.slice(0,7)??null;
  const minimumEffectiveMonth=lastClosed?shiftMonthKey(lastClosed,1):currentMonth;
  const defaultEffectiveMonth=maxMonth(currentMonth,minimumEffectiveMonth);
  const isClosed=selectedPeriod?.status==="closed";

  const currentInSelected=roots
    .map(root=>({root,version:latestVersionForMonth(versionsByRoot.get(root.id)??[],selectedMonth)}))
    .filter(item=>item.version);

  const activeInSelected=currentInSelected.filter(item=>item.version?.is_active).length;
  const generatedCount=(generatedData??[]).length;

  return (
    <AppShell active="automation">
        <PageHeader title="Central de Automação" actions={<div className="profile-chip"><span className="status-dot" />{auth.user.email}</div>} />

        <section className="planning-toolbar">
          <Link className="month-arrow" href={"/automation?month="+shiftMonthKey(selectedMonth,-1)} aria-label="Mês anterior">‹</Link>
          <form className="month-form" method="get">
            <label><span className="eyebrow">MÊS OPERACIONAL</span><input type="month" name="month" defaultValue={selectedMonth} /></label>
            <button className="button secondary" type="submit">Abrir</button>
          </form>
          <Link className="month-arrow" href={"/automation?month="+shiftMonthKey(selectedMonth,1)} aria-label="Próximo mês">›</Link>
        </section>

        <section className="hero-card">
          <div>
            <span className="eyebrow">AUTOMAÇÃO COM TRAVAS</span>
            <h2>Recorrências entram sozinhas no mês aberto; o passado fechado não se move.</h2>
            <p>Formas de pagamento identificam Pix e cartões. Recorrências são versionadas por mês de vigência e a sincronização é idempotente: repetir a rotina não duplica lançamentos.</p>
          </div>
          <div className="hero-status">
            <span>Mês</span><strong>{monthLabelFromKey(selectedMonth)}</strong>
            <span>Recorrências ativas</span><strong>{activeInSelected}</strong>
            <span>Lançamentos gerados</span><strong>{generatedCount}</strong>
            <span>Status</span><strong>{isClosed?"fechado":"aberto"}</strong>
          </div>
        </section>

        {params.error&&<div className="alert error" role="alert">{params.error}</div>}
        {params.message&&<div className="alert success">{params.message}</div>}
        {isClosed&&<div className="alert forecast-warning">Este período está fechado. Sincronização, lançamentos e alterações com efeito neste mês estão bloqueados.</div>}
        {!accounts.length&&<div className="alert error">Cadastre ao menos uma conta em Finanças antes de criar gastos recorrentes.</div>}

        <section className="metric-grid">
          <article className="metric-card purple"><span>Formas de pagamento</span><strong>{methods.filter(item=>item.is_active).length}</strong><small>{methods.length} cadastradas</small></article>
          <article className="metric-card blue"><span>Recorrências</span><strong>{roots.length}</strong><small>{activeInSelected} ativas no mês</small></article>
          <article className="metric-card green"><span>Gerados no mês</span><strong>{generatedCount}</strong><small>source_type recurring</small></article>
          <article className="metric-card red"><span>Último mês fechado</span><strong>{lastClosed?monthLabelFromKey(lastClosed):"nenhum"}</strong><small>versões anteriores ficam imutáveis</small></article>
        </section>

        <section className="automation-grid">
          <article className="panel finance-panel">
            <div className="panel-title"><div><span className="eyebrow">FORMAS DE PAGAMENTO</span><h3>Novo cartão, Pix ou outro meio</h3></div><span className="pill">{methods.length}</span></div>
            <form className="finance-form" action={createPaymentMethod}>
              <input type="hidden" name="month" value={selectedMonth}/>
              <label className="field"><span>Nome</span><input name="name" maxLength={100} required placeholder="Ex.: Nubank, Pix Inter, Dinheiro"/></label>
              <div className="form-row">
                <label className="field">
                  <span>Tipo</span>
                  <select name="kind" defaultValue="credit_card">
                    <option value="credit_card">Cartão de crédito</option>
                    <option value="debit_card">Cartão de débito</option>
                    <option value="pix">Pix</option>
                    <option value="cash">Dinheiro</option>
                    <option value="bank_transfer">Transferência</option>
                    <option value="other">Outro</option>
                  </select>
                </label>
                <label className="field"><span>Bandeira (opcional)</span><input name="card_brand" maxLength={60} placeholder="Ex.: Visa, Mastercard"/></label>
              </div>
              <SubmitButton>Cadastrar forma de pagamento</SubmitButton>
            </form>
          </article>

          <article className="panel finance-panel">
            <div className="panel-title"><div><span className="eyebrow">SINCRONIZAÇÃO</span><h3>{monthLabelFromKey(selectedMonth)}</h3></div><span className={"pill "+(isClosed?"debt-paid":"")}>{isClosed?"travado":"editável"}</span></div>
            <div className="automation-status">
              <div><span>Recorrências esperadas</span><strong>{activeInSelected}</strong></div>
              <div><span>Lançamentos automáticos</span><strong>{generatedCount}</strong></div>
              <div><span>Conciliação</span><strong>{selectedPeriod?.reconciliation_status??"não definida"}</strong></div>
            </div>
            {!isClosed&&(
              <form action={syncRecurringMonth} className="automation-action-form">
                <input type="hidden" name="month" value={selectedMonth}/>
                <p>Sincronizar cria, atualiza ou remove apenas lançamentos automáticos deste mês. Lançamentos manuais não são alterados.</p>
                <SubmitButton className="button secondary">Sincronizar recorrências</SubmitButton>
              </form>
            )}
          </article>
        </section>

        <section className="automation-grid">
          <article className="panel finance-panel">
            <div className="panel-title"><div><span className="eyebrow">NOVA RECORRÊNCIA</span><h3>Criar gasto recorrente</h3></div><span className="pill">versionado</span></div>
            <form className="finance-form" action={createRecurringExpense}>
              <input type="hidden" name="month" value={selectedMonth}/>
              <label className="field"><span>Descrição</span><input name="description" maxLength={160} required placeholder="Ex.: Internet"/></label>
              <div className="form-row">
                <label className="field"><span>Valor</span><input name="amount" type="number" min="0.01" max="9999999999.99" step="0.01" required/></label>
                <label className="field"><span>Dia do mês</span><input name="day_of_month" type="number" min="1" max="31" defaultValue="10" required/></label>
              </div>
              <div className="form-row">
                <label className="field"><span>Vale a partir de</span><input name="effective_from" type="month" min={minimumEffectiveMonth} defaultValue={defaultEffectiveMonth} required/></label>
                <label className="field"><span>Conta de origem</span><select name="account_id" required defaultValue=""><option value="" disabled>Selecione</option>{accounts.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              </div>
              <div className="form-row">
                <label className="field"><span>Categoria</span><select name="category_id" defaultValue=""><option value="">Sem categoria</option>{categories.filter(item=>item.is_active).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label className="field"><span>Forma de pagamento</span><select name="payment_method_id" defaultValue=""><option value="">Não informar</option>{methods.filter(item=>item.is_active).map(item=><option key={item.id} value={item.id}>{paymentMethodLabel(item)}</option>)}</select></label>
              </div>
              <label className="field"><span>Estabelecimento (opcional)</span><select name="merchant_id" defaultValue=""><option value="">Não informar</option>{merchants.filter(item=>item.is_active).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <SubmitButton disabled={!accounts.length}>Criar recorrência</SubmitButton>
            </form>
          </article>

          <article className="panel finance-panel">
            <div className="panel-title"><div><span className="eyebrow">FECHAMENTO</span><h3>Congelar balanço do mês</h3></div><span className="pill">{isClosed?"fechado":"aberto"}</span></div>
            {isClosed?(
              <div className="closed-period-card">
                <strong>Fechado {selectedPeriod?.closed_at?"em "+new Date(selectedPeriod.closed_at).toLocaleString("pt-BR"):""}</strong>
                <span>Conciliação: {selectedPeriod?.reconciliation_status}</span>
                {selectedPeriod?.notes&&<p>{selectedPeriod.notes}</p>}
                <p>Não existe ação de reabrir neste MVP. O objetivo é preservar o balanço histórico.</p>
              </div>
            ):(
              <form className="finance-form" action={closeFinancialPeriod}>
                <input type="hidden" name="month" value={selectedMonth}/>
                <label className="field"><span>Estado da conciliação</span><select name="reconciliation_status" defaultValue="reconciled"><option value="reconciled">Reconciliado</option><option value="unreconciled">Não reconciliado</option><option value="incomplete">Incompleto</option></select></label>
                <label className="field"><span>Observações</span><textarea name="notes" maxLength={500} placeholder="Opcional: explique pendências ou particularidades do mês."/></label>
                <label className="automation-confirm"><input type="checkbox" name="confirm_close"/> Entendo que, depois do fechamento, os lançamentos e o planejamento desse mês não poderão ser alterados.</label>
                <SubmitButton className="button negative">Sincronizar e fechar mês</SubmitButton>
              </form>
            )}
          </article>
        </section>

        <section className="goals-section">
          <div className="section-heading-row"><div><span className="eyebrow">RECORRÊNCIAS</span><h2>Configurações por vigência</h2></div><span className="pill">{roots.length}</span></div>
          <div className="recurring-grid">
            {!roots.length&&<div className="panel empty-state">Nenhum gasto recorrente cadastrado.</div>}
            {roots.map(root=>{
              const history=versionsByRoot.get(root.id)??[];
              const selectedVersion=latestVersionForMonth(history,selectedMonth);
              const latest=history[0]??null;
              if(!latest) return null;
              return (
                <article className="panel recurring-card" key={root.id}>
                  <div className="panel-title">
                    <div><span className="eyebrow">{latest.is_active?"ATIVA":"ENCERRADA"}</span><h3>{latest.description}</h3></div>
                    <span className="pill">dia {latest.day_of_month}</span>
                  </div>
                  <div className="recurring-value"><strong>{formatBRL(latest.amount)}</strong><span>vigência {monthLabelFromKey(latest.effective_from.slice(0,7))}</span></div>
                  <div className="recurring-facts">
                    <span>{accountNames.get(latest.account_id)??"Conta"}</span>
                    <span>{latest.category_id?categoryNames.get(latest.category_id)??"Categoria":"Sem categoria"}</span>
                    <span>{latest.payment_method_id&&methodMap.get(latest.payment_method_id)?paymentMethodLabel(methodMap.get(latest.payment_method_id)!):"Sem forma de pagamento"}</span>
                    {latest.merchant_id&&<span>{merchantNames.get(latest.merchant_id)??"Estabelecimento"}</span>}
                  </div>
                  <p className="goal-note">No mês selecionado: {selectedVersion ? (selectedVersion.is_active ? formatBRL(selectedVersion.amount)+" · ativa" : "encerrada") : "ainda não iniciada"}.</p>

                  <details className="goal-details">
                    <summary>Alterar somente para frente</summary>
                    <form className="finance-form" action={versionRecurringExpense}>
                      <input type="hidden" name="month" value={selectedMonth}/>
                      <input type="hidden" name="recurring_expense_id" value={root.id}/>
                      <label className="field"><span>Descrição</span><input name="description" defaultValue={latest.description} maxLength={160} required/></label>
                      <div className="form-row">
                        <label className="field"><span>Valor</span><input name="amount" type="number" min="0.01" max="9999999999.99" step="0.01" defaultValue={Number(latest.amount)} required/></label>
                        <label className="field"><span>Dia</span><input name="day_of_month" type="number" min="1" max="31" defaultValue={latest.day_of_month} required/></label>
                      </div>
                      <div className="form-row">
                        <label className="field"><span>Aplicar a partir de</span><input name="effective_from" type="month" min={minimumEffectiveMonth} defaultValue={defaultEffectiveMonth} required/></label>
                        <label className="field"><span>Conta</span><select name="account_id" defaultValue={latest.account_id} required>{accounts.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                      </div>
                      <div className="form-row">
                        <label className="field"><span>Categoria</span><select name="category_id" defaultValue={latest.category_id??""}><option value="">Sem categoria</option>{categories.filter(item=>item.is_active).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                        <label className="field"><span>Forma de pagamento</span><select name="payment_method_id" defaultValue={latest.payment_method_id??""}><option value="">Não informar</option>{methods.map(item=><option key={item.id} value={item.id}>{paymentMethodLabel(item)}{item.is_active?"":" · inativa"}</option>)}</select></label>
                      </div>
                      <label className="field"><span>Estabelecimento</span><select name="merchant_id" defaultValue={latest.merchant_id??""}><option value="">Não informar</option>{merchants.map(item=><option key={item.id} value={item.id}>{item.name}{item.is_active?"":" · inativo"}</option>)}</select></label>
                      <label className="automation-confirm"><input type="checkbox" name="is_active" defaultChecked={latest.is_active}/> Continuar ativa a partir desse mês</label>
                      <SubmitButton className="button secondary">Salvar nova vigência</SubmitButton>
                    </form>
                  </details>

                  <details className="goal-details">
                    <summary>Histórico de versões</summary>
                    <div className="version-history">
                      {history.slice(0,8).map(version=>(
                        <div key={version.id}><span>{monthLabelFromKey(version.effective_from.slice(0,7))} · {version.is_active?"ativa":"encerrada"}</span><strong>{formatBRL(version.amount)} · dia {version.day_of_month}</strong></div>
                      ))}
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        </section>

        <section className="goals-section">
          <div className="section-heading-row"><div><span className="eyebrow">FORMAS DE PAGAMENTO</span><h2>Cartões, Pix e outros meios</h2></div><span className="pill">{methods.length}</span></div>
          <div className="payment-method-grid">
            {methods.map(method=>(
              <article className="panel payment-method-card" key={method.id}>
                <div className="panel-title"><div><span className="eyebrow">{paymentMethodKindLabel(method.kind)}</span><h3>{method.name}</h3></div><span className={"pill "+(method.is_active?"":"muted")}>{method.is_active?"ativa":"inativa"}</span></div>
                {method.card_brand&&<p className="goal-note">Bandeira: {method.card_brand}</p>}
                <details className="goal-details">
                  <summary>Editar</summary>
                  <form className="finance-form" action={updatePaymentMethod}>
                    <input type="hidden" name="month" value={selectedMonth}/>
                    <input type="hidden" name="id" value={method.id}/>
                    <label className="field"><span>Nome</span><input name="name" defaultValue={method.name} maxLength={100} required/></label>
                    <label className="field"><span>Tipo</span><select name="kind" defaultValue={method.kind}><option value="credit_card">Cartão de crédito</option><option value="debit_card">Cartão de débito</option><option value="pix">Pix</option><option value="cash">Dinheiro</option><option value="bank_transfer">Transferência</option><option value="other">Outro</option></select></label>
                    <label className="field"><span>Bandeira</span><input name="card_brand" defaultValue={method.card_brand??""} maxLength={60}/></label>
                    <label className="automation-confirm"><input type="checkbox" name="is_active" defaultChecked={method.is_active}/> Disponível para novos lançamentos</label>
                    <SubmitButton className="button secondary">Salvar forma de pagamento</SubmitButton>
                  </form>
                </details>
              </article>
            ))}
          </div>
        </section>
      </AppShell>
  );
}
