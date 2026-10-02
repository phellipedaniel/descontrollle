import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureClient } from './dashboard-fixtures.mjs';
import { renderToStaticMarkup } from 'react-dom/server';
const {default: Dashboard} = await import('../src/app/page.tsx');

async function render(data = {}, errors = {}, params = {month:'2026-09'}) {
  globalThis.dashboardFixture = fixtureClient(data,errors);
  const html = renderToStaticMarkup(
    await Dashboard({searchParams:Promise.resolve(params)}),
  );
  return {html,calls:globalThis.dashboardFixture.calls};
}

test('empty month is a cost dashboard with filters and no fabricated values', async () => {
  const {html} = await render();
  assert.match(html,/Dashboard de custos/);
  assert.match(html,/Filtros do dashboard/);
  assert.match(html,/Todas as categorias/);
  assert.match(html,/Todas as contas/);
  assert.match(html,/Todas as formas/);
  assert.match(html,/Nenhuma despesa neste recorte/);
  assert.match(html,/Nenhum objetivo ativo/);
  assert.match(html,/Nenhuma dívida ativa/);
  assert.doesNotMatch(html,/MVP|Configurações/);
  assert.equal((html.match(/<main /g)||[]).length,1);
  assert.match(html,/Pular para o conteúdo/);
});

test('selected month scopes monthly operational queries and links', async () => {
  const {html,calls} = await render({}, {}, {month:'2026-12'});
  const monthlyTransactionCalls = calls.filter(
    c => c.table === 'transactions' && c.filters.some(f => f[0] === 'gte' && f[2] === '2026-12-01'),
  );
  assert.ok(monthlyTransactionCalls.length >= 2);
  for (const call of monthlyTransactionCalls) {
    assert.deepEqual(call.filters,[
      ['gte','occurred_on','2026-12-01'],
      ['lt','occurred_on','2027-01-01'],
    ]);
  }
  assert.deepEqual(
    calls.find(c=>c.table==='monthly_plans').filters,
    [['eq','month','2026-12-01']],
  );
  assert.match(html,/dezembro de 2026/);
  assert.match(html,/planning\?month=2026-12/);
});

test('dashboard filters are applied to current month transaction queries', async () => {
  const category='11111111-1111-4111-8111-111111111111';
  const account='22222222-2222-4222-8222-222222222222';
  const payment='33333333-3333-4333-8333-333333333333';
  const data={
    categories:[{id:category,name:'Mercado',kind:'expense'}],
    accounts:[{id:account,name:'Conta principal'}],
    payment_methods:[{id:payment,kind:'pix',name:'Pix principal',card_brand:null,is_active:true,created_at:'',updated_at:''}],
    transactions:[{kind:'expense',amount:'80',category_id:category,account_id:account,payment_method_id:payment,description:'Compra'}],
  };
  const {html,calls}=await render(data,{},{
    month:'2026-09',
    category,
    account,
    payment,
    kind:'expense',
  });
  const currentCalls=calls.filter(c=>c.table==='transactions' && c.filters.some(f=>f[0]==='gte' && f[2]==='2026-09-01'));
  assert.ok(currentCalls.length>=2);
  for(const call of currentCalls) {
    assert.ok(call.filters.some(f=>f[0]==='eq' && f[1]==='category_id' && f[2]===category));
    assert.ok(call.filters.some(f=>f[0]==='eq' && f[1]==='account_id' && f[2]===account));
    assert.ok(call.filters.some(f=>f[0]==='eq' && f[1]==='payment_method_id' && f[2]===payment));
    assert.ok(call.filters.some(f=>f[0]==='eq' && f[1]==='kind' && f[2]==='expense'));
  }
  assert.match(html,/Total de custos/);
  assert.match(html,/Ticket médio/);
  assert.match(html,/Custos por categoria/);
  assert.match(html,/Mercado/);
});

test('closed month shows immutable context and no register action', async () => {
  const {html} = await render({
    financial_periods:{status:'closed',reconciliation_status:'reconciled'},
  });
  assert.match(html,/Mês fechado/);
  assert.match(html,/não pode ser alterado/);
  assert.doesNotMatch(html,/Registrar lançamento/);
});

test('failed budget never produces a planned comparison', async () => {
  const {html} = await render(
    {
      monthly_plans:{id:'p',planned_income:'1200'},
      transactions:[{kind:'income',amount:'100'}],
    },
    {category_budgets:'failed'},
  );
  assert.match(html,/Não foi possível carregar o orçamento/);
  assert.doesNotMatch(html,/>Planejado ·/);
  assert.match(html,/100,00/);
});

test('independent module failures remain distinct from confirmed empty lists', async () => {
  const {html} = await render(
    {},
    {
      transactions:'failed',
      debts:'failed',
      financial_goal_progress:'failed',
      net_worth_snapshots:'failed',
    },
  );
  assert.match(html,/Não foi possível carregar os lançamentos/);
  assert.match(html,/Não foi possível carregar as dívidas/);
  assert.match(html,/Não foi possível carregar os objetivos/);
  assert.match(html,/Não foi possível carregar a posição/);
  assert.doesNotMatch(html,/Nenhuma dívida ativa|Nenhum objetivo ativo/);
});

test('overspending preserves negative result and exposes comparable budget warning', async () => {
  const {html,calls} = await render({
    monthly_plans:{id:'p',planned_income:'100'},
    category_budgets:[{planned_amount:'50'}],
    transactions:[
      {kind:'income',amount:'100'},
      {kind:'expense',amount:'200'},
    ],
  });
  assert.match(html,/-R\$[^<]*100,00/);
  assert.match(html,/superam o orçamento comparável/);
  assert.match(html,/Fluxo financeiro do recorte/);
  assert.equal(calls.find(c=>c.table==='financial_goal_progress').limit,3);
  assert.equal(
    calls.filter(c=>c.table==='transactions').find(c=>c.limit).limit,
    5,
  );
});

test('account/payment filters do not fabricate a segmented monthly budget', async () => {
  const account='22222222-2222-4222-8222-222222222222';
  const {html}=await render(
    {
      monthly_plans:{id:'p',planned_income:'1000'},
      category_budgets:[{planned_amount:'500'}],
      accounts:[{id:account,name:'Conta principal'}],
      transactions:[{kind:'expense',amount:'100',account_id:account}],
    },
    {},
    {month:'2026-09',account},
  );
  assert.match(html,/O orçamento não é segmentado por conta ou forma de pagamento/);
  assert.match(html,/série planejada foi omitida deste recorte/);
});

test('truncated transaction sources never render a partial monthly total as complete', async () => {
  const {html} = await render(
    {transactions:[{kind:'income',amount:'100'}],__counts:{transactions:1200}},
  );
  assert.match(html,/Consulta parcial: o total do recorte não é confiável/);
  assert.match(html,/consulta do recorte está incompleta/);
  assert.match(html,/verificação está incompleta/);
  assert.doesNotMatch(html,/Resultado[^]*100,00/);
});
