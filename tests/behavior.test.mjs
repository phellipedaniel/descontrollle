import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBehaviorSignals,
  categoryMovements,
  merchantConcentration,
  spendingSummary,
} from '../src/lib/behavior.ts';

const rows = [
  { occurred_on:'2026-06-05', kind:'expense', amount:100, category_id:'food', merchant_id:'m1' },
  { occurred_on:'2026-06-20', kind:'expense', amount:100, category_id:'food', merchant_id:'m2' },
  { occurred_on:'2026-07-05', kind:'expense', amount:200, category_id:'food', merchant_id:'m1' },
  { occurred_on:'2026-07-22', kind:'expense', amount:100, category_id:'transport', merchant_id:null },
  { occurred_on:'2026-08-01', kind:'expense', amount:300, category_id:'food', merchant_id:'m1' },
  { occurred_on:'2026-08-02', kind:'expense', amount:100, category_id:'transport', merchant_id:'m1' },
  { occurred_on:'2026-08-03', kind:'expense', amount:100, category_id:null, merchant_id:null },
];

test('summary compares selected month against all baseline months', () => {
  const s = spendingSummary('2026-08',['2026-06','2026-07'],rows);
  assert.equal(s.currentTotal,500);
  assert.equal(s.baselineAverage,250);
  assert.equal(s.monthlyChangePct,100);
  assert.equal(s.currentDays,3);
  assert.equal(s.baselineAverageDays,2);
  assert.equal(s.categoryCoveragePct,80);
  assert.equal(s.merchantCoveragePct,80);
});

test('category movement divides historical category total by baseline month count', () => {
  const names = new Map([['food','Alimentação'],['transport','Transporte']]);
  const result = categoryMovements('2026-08',['2026-06','2026-07'],rows,names,20,50);
  const food = result.find(item => item.categoryId === 'food');
  assert.equal(food?.baseline,200);
  assert.equal(food?.current,300);
  assert.equal(food?.delta,100);
  assert.equal(food?.changePct,50);
  assert.equal(food?.attention,true);
});

test('merchant concentration is suppressed when coverage is below minimum', () => {
  const names = new Map([['m1','Loja A'],['m2','Loja B']]);
  const result = merchantConcentration('2026-08',rows,names,90,60);
  assert.equal(result.coveragePct,80);
  assert.equal(result.eligible,false);
  assert.equal(result.attention,false);
});

test('merchant concentration can signal only after coverage gate passes', () => {
  const names = new Map([['m1','Loja A'],['m2','Loja B']]);
  const result = merchantConcentration('2026-08',rows,names,70,60);
  assert.equal(result.eligible,true);
  assert.equal(result.top[0].sharePct,100);
  assert.equal(result.attention,true);
});

test('signals are descriptive and threshold driven', () => {
  const summary = spendingSummary('2026-08',['2026-06','2026-07'],rows);
  const movements = categoryMovements(
    '2026-08',
    ['2026-06','2026-07'],
    rows,
    new Map([['food','Alimentação'],['transport','Transporte']]),
    20,
    50,
  );
  const merchant = merchantConcentration(
    '2026-08',
    rows,
    new Map([['m1','Loja A'],['m2','Loja B']]),
    70,
    60,
  );
  const signals = buildBehaviorSignals({
    summary,
    categoryMovements:movements,
    merchant,
    monthlyChangePct:15,
    frequencyChangePct:20,
  });
  assert.ok(signals.some(signal => signal.kind === 'monthly'));
  assert.ok(signals.some(signal => signal.kind === 'frequency'));
  assert.ok(signals.some(signal => signal.kind === 'category'));
  assert.ok(signals.some(signal => signal.kind === 'merchant'));
});
