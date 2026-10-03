import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { fixtureClient } from './dashboard-fixtures.mjs';
import { renderToStaticMarkup } from 'react-dom/server';
import { currentMonthKey } from '../src/lib/finance.ts';
registerHooks({
 resolve(specifier,context,next) {
  if(specifier==='./actions' && /\/recurrences\/page\.tsx$/.test(context.parentURL??'')) return {url:'fixture:fixed-actions',shortCircuit:true};
  return next(specifier,context);
 },
 load(url,context,next) {
  if(url==='fixture:fixed-actions') return {format:'module',source:'export async function saveFixedRecurrence() {} export async function confirmFixedRecurrence() {}',shortCircuit:true};
  return next(url,context);
 }
});
const {default: Page}=await import('../src/app/recurrences/page.tsx');
async function render({items=[],month=currentMonthKey(),closed=false,error=null,notice}={}) {
 globalThis.dashboardFixture=fixtureClient({accounts:[{id:'a',name:'Conta em reais'}],categories:[],financial_periods:{status:closed?'closed':'open'}});
 globalThis.dashboardFixture.rpc=async()=>({data:error?null:items,error});
 return renderToStaticMarkup(await Page({searchParams:Promise.resolve({month,notice})}));
}
const version={id:'v',item_id:'i',effective_from:currentMonthKey()+'-01',description:'Salário de teste',amount:5000,account_id:'a',category_id:null,is_active:true};
const income={id:'i',kind:'income',version,history:[version],confirmation:null};
test('salary and fixed-cost forms have effective-month and separate account controls',async()=>{
 const html=await render();
 assert.match(html,/Salário e receita mensal fixa/);assert.match(html,/Novo custo fixo/);
 assert.equal((html.match(/name="effective_from"/g)??[]).length,2);
 assert.match(html,/Conta de recebimento/);assert.match(html,/Conta de pagamento/);
 assert.match(html,/Nenhuma recorrência cadastrada/);
 assert.doesNotMatch(html,/Confirmar recebimento/);
});
test('pending salary requires receipt checkbox and current actual date',async()=>{
 const html=await render({items:[income]});
 assert.match(html,/Confirmar recebimento/);assert.match(html,/name="confirm_realized"/);
 assert.match(html,/name="occurred_on"/);assert.match(html,/Previsto/);
});
test('confirmed occurrence hides confirmation and retains history',async()=>{
 const html=await render({items:[{...income,confirmation:{transaction_id:'t',amount:5000,occurred_on:currentMonthKey()+'-01'}}]});
 assert.doesNotMatch(html,/Confirmar recebimento/);assert.match(html,/Confirmado/);assert.match(html,/Histórico de vigências/);
});
test('closed and historical views cannot confirm',async()=>{
 for(const options of [{closed:true},{month:'2026-09'}]) assert.doesNotMatch(await render({...options,items:[income]}),/Confirmar recebimento/);
});
test('unavailable source never shows zero totals or enabled create forms; unknown notices are ignored',async()=>{
 const html=await render({error:{message:'private internals'},notice:'<script>bad</script>'});
 assert.match(html,/indisponíveis/);assert.doesNotMatch(html,/R\$|Cadastrar receita fixa|private internals|<script>bad/);
});
