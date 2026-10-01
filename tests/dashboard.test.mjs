import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureClient } from './dashboard-fixtures.mjs';
import { renderToStaticMarkup } from 'react-dom/server';
const {default: Dashboard} = await import('../src/app/page.tsx');
async function render(data = {}, errors = {}, month = '2026-09') {
 globalThis.dashboardFixture = fixtureClient(data,errors);
 const html = renderToStaticMarkup(await Dashboard({searchParams:Promise.resolve({month})}));
 return {html,calls:globalThis.dashboardFixture.calls};
}
test('empty month preserves zero actuals and unavailable plan, without a fabricated forecast', async () => {
 const {html} = await render();
 assert.match(html,/Sem planejamento/);
 assert.match(html,/Nenhum lançamento registrado/);
 assert.match(html,/Nenhum objetivo ativo/);
 assert.match(html,/Nenhuma dívida ativa/);
 assert.doesNotMatch(html,/MVP|Configurações/);
 assert.equal((html.match(/<main /g)||[]).length,1);
 assert.match(html,/Pular para o conteúdo/);
});
test('selected month scopes all monthly queries and links', async () => {
 const {html,calls} = await render({}, {}, '2026-12');
 for (const call of calls.filter(c => c.table === 'transactions')) {
  assert.deepEqual(call.filters,[['gte','occurred_on','2026-12-01'],['lt','occurred_on','2027-01-01']]);
 }
 assert.deepEqual(calls.find(c=>c.table==='monthly_plans').filters,[['eq','month','2026-12-01']]);
 assert.match(html,/dezembro de 2026/);
 assert.match(html,/planning\?month=2026-12/);
});
test('closed month shows immutable context and no register action', async () => {
 const {html} = await render({financial_periods:{status:'closed',reconciliation_status:'reconciled'}});
 assert.match(html,/Mês fechado/);
 assert.match(html,/não pode ser alterado/);
 assert.doesNotMatch(html,/Registrar lançamento/);
});
test('a failed budget never produces a ready planned balance or planned chart series', async () => {
 const {html} = await render({monthly_plans:{id:'p',planned_income:'1200'},transactions:[{kind:'income',amount:'100'}]}, {category_budgets:'failed'});
 assert.match(html,/Não foi possível carregar o planejamento/);
 assert.match(html,/Comparação planejada indisponível/);
 assert.doesNotMatch(html,/>Planejado<|Previsto pelo plano/);
 assert.match(html,/100,00/);
});
test('independent module failures remain distinct from confirmed empty lists', async () => {
 const {html} = await render({}, {transactions:'failed',debts:'failed',financial_goal_progress:'failed',net_worth_snapshots:'failed'});
 assert.match(html,/Não foi possível carregar os lançamentos/);
 assert.match(html,/Não foi possível carregar as dívidas/);
 assert.match(html,/Não foi possível carregar os objetivos/);
 assert.match(html,/Não foi possível carregar a posição/);
 assert.doesNotMatch(html,/Nenhuma dívida ativa|Nenhum objetivo ativo|Nenhum lançamento registrado/);
});
test('overspending preserves negative balance and exact values and caps query display counts', async () => {
 const {html,calls} = await render({monthly_plans:{id:'p',planned_income:'100'},category_budgets:[{planned_amount:'50'}],transactions:[{kind:'income',amount:'100'},{kind:'expense',amount:'200'}]});
 assert.match(html,/-R\$[^<]*100,00/);
 assert.match(html,/superam o limite planejado/);
 assert.match(html,/<caption>Valores exatos/);
 assert.equal(calls.find(c=>c.table==='financial_goal_progress').limit,3);
 assert.equal(calls.filter(c=>c.table==='transactions').find(c=>c.limit).limit,5);
});
test('truncated transaction sources never render a partial monthly total as complete', async () => {
 const {html} = await render({transactions:[{kind:'income',amount:'100'}],__counts:{transactions:1200}});
 assert.match(html,/Consulta parcial: total do mês indisponível/);
 assert.match(html,/a consulta não cobre todos os lançamentos/);
 assert.match(html,/verificação de pendências está incompleta/);
 assert.doesNotMatch(html,/<caption>Valores exatos/);
});
