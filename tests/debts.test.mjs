import test from 'node:test';
import assert from 'node:assert/strict';
import { debtPortfolioMetrics, moneyCents, orderDebts, percentValue } from '../src/lib/debts.ts';

const debts = [
  { id:'a', name:'A', current_balance:5000, annual_interest_rate:12, minimum_payment:200, status:'active' },
  { id:'b', name:'B', current_balance:1000, annual_interest_rate:24, minimum_payment:100, status:'active' },
  { id:'c', name:'C', current_balance:500, annual_interest_rate:null, minimum_payment:50, status:'active' },
];

test('money and percentage parsers reject invalid values', () => {
  assert.equal(moneyCents('100,25'),10025);
  assert.equal(percentValue('12,3456'),12.3456);
  assert.equal(percentValue(''),null);
  assert.equal(moneyCents('1.005'),null);
  assert.ok(Number.isNaN(percentValue('1000')));
});

test('avalanche orders known higher rates before unknown rates', () => {
  assert.deepEqual(orderDebts(debts,'avalanche').map(d => d.id),['b','a','c']);
});

test('snowball orders smallest balances first', () => {
  assert.deepEqual(orderDebts(debts,'snowball').map(d => d.id),['c','b','a']);
});

test('portfolio metrics use active balances and known rates', () => {
  const m = debtPortfolioMetrics(debts);
  assert.equal(m.activeCount,3);
  assert.equal(m.totalBalance,6500);
  assert.equal(m.minimumPayments,350);
  assert.ok(Math.abs((m.weightedAnnualRate ?? 0) - 14) < 0.000001);
  assert.ok(Math.abs(m.estimatedMonthlyInterest - 70) < 0.000001);
});

test('archived and paid debts are excluded from active metrics', () => {
  const m = debtPortfolioMetrics([
    ...debts,
    { id:'d', name:'D', current_balance:9000, annual_interest_rate:30, minimum_payment:500, status:'archived' },
    { id:'e', name:'E', current_balance:0, annual_interest_rate:10, minimum_payment:0, status:'paid' },
  ]);
  assert.equal(m.totalBalance,6500);
  assert.equal(m.activeCount,3);
});
