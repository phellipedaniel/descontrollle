import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureClient } from './dashboard-fixtures.mjs';
import { renderToStaticMarkup } from 'react-dom/server';
const { default: Finance } = await import('../src/app/finance/page.tsx');
const { default: Planning } = await import('../src/app/planning/page.tsx');
async function render(Page, data = {}, errors = {}, params = {}) {
  globalThis.dashboardFixture = fixtureClient(data, errors);
  return { html: renderToStaticMarkup(await Page({ searchParams: Promise.resolve(params) })), calls: globalThis.dashboardFixture.calls };
}
const accounts = [{ id: 'a', name: 'Principal', account_type: 'checking', initial_balance: '0' }];
const expense = { id: 'expense', account_id: 'a', kind: 'expense', amount: '123.45', occurred_on: '2026-09-23', description: 'Mercado' };
test('finance starts with operational forms and gives explicit table context and delete confirmation', async () => {
  const { html, calls } = await render(Finance, { accounts, transactions: [expense] });
  assert.match(html, /Últimas 20 movimentações · todos os períodos/);
  assert.match(html, /<th scope="row"><strong>Mercado/);
  assert.match(html, /123,45/);
  assert.match(html, /Confirmar exclusão/);
  assert.ok(html.indexOf('Registrar receita') < html.indexOf('Contas e categorias'));
  assert.ok(calls.some(c => c.rpc === 'sync_recurring_month'));
});
test('closed finance preserves disabled entry and never offers deletion or recurring synchronization', async () => {
  const { html, calls } = await render(Finance, { accounts, transactions: [expense], financial_periods: { status: 'closed' } });
  assert.match(html, /Mês fechado/);
  assert.match(html, /disabled=""[^>]*>Registrar despesa/);
  assert.doesNotMatch(html, /Confirmar exclusão/);
  assert.ok(!calls.some(c => c.rpc));
});
test('recurring entries identify source and never offer manual deletion', async () => {
  const { html } = await render(Finance, { accounts, transactions: [{ ...expense, source_type: 'recurring' }] });
  assert.match(html, /Automática/);
  assert.match(html, /Gerenciada na Automação/);
  assert.doesNotMatch(html, /Confirmar exclusão/);
});
test('finance truncated totals are unavailable while recent entries remain visible', async () => {
  const { html } = await render(Finance, { accounts, transactions: [expense], __counts: { transactions: 1200 } });
  assert.match(html, /Total indisponível: consulta parcial/);
  assert.match(html, /Mercado/);
  assert.equal((html.match(/<strong class="ds-number">/g) ?? []).length, 1, 'only the independently available account count remains a ready metric');
});
test('planning without a plan never presents a zero forecast or invented usage', async () => {
  const { html } = await render(Planning, {}, {}, { month: '2026-09' });
  assert.match(html, /Sem planejamento/);
  assert.doesNotMatch(html, /0%|Ainda disponível|receita − orçamento/);
  assert.match(html, /Nenhuma categoria de despesa/);
});
test('planning retains over-budget amounts, clamps only decoration and scopes month queries', async () => {
  const { html, calls } = await render(Planning, { monthly_plans: { id: 'p', planned_income: '500' }, category_budgets: [{ category_id: 'c', planned_amount: '100' }], categories: [{ id: 'c', name: 'Mercado', kind: 'expense' }], transactions: [{ ...expense, amount: '150', category_id: 'c' }] }, {}, { month: '2026-09' });
  assert.match(html, /150%/);
  assert.match(html, /Acima do orçamento/);
  assert.match(html, /50,00/);
  assert.match(html, /width:100%/);
  assert.deepEqual(calls.find(c => c.table === 'transactions').filters, [['gte', 'occurred_on', '2026-09-01'], ['lt', 'occurred_on', '2026-10-01']]);
});
test('planning partial sources suppress realized totals and category comparisons', async () => {
  const { html } = await render(Planning, { monthly_plans: { id: 'p', planned_income: '500' }, categories: [{ id: 'c', name: 'Mercado', kind: 'expense' }], transactions: [expense], __counts: { transactions: 1200 } });
  assert.match(html, /Uso indisponível: consulta parcial/);
  assert.match(html, /Realizado indisponível/);
  assert.doesNotMatch(html, /Acima do orçamento|Ainda disponível|123,45/);
});
test('query failures never become confirmed empty states', async () => {
  await assert.rejects(render(Planning, {}, { transactions: 'failed' }), /Não foi possível carregar/);
  await assert.rejects(render(Finance, {}, { sync_recurring_month: 'failed' }), /Não foi possível sincronizar/);
});
