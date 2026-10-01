import test from 'node:test';
import assert from 'node:assert/strict';
import { goalMetrics, moneyCents, validGoalDate } from '../src/lib/goals.ts';

test('money rejects invalid precision, negatives and non-decimal notation', () => {
  assert.equal(moneyCents('117,05'), 11705);
  assert.equal(moneyCents('0.01'), 1);
  assert.equal(moneyCents('9999999999.99'), 999999999999);
  for (const value of ['', '-1', '1e3', 'Infinity', '1.005', '10000000000']) assert.equal(moneyCents(value), null);
});
test('dates reject rollover and accept leap days', () => {
  assert.equal(validGoalDate('2028-02-29'), true);
  for (const value of ['2026-02-29', '2026-04-31', '2026-13-01', 'bad', '2101-01-01']) assert.equal(validGoalDate(value), false);
});
test('monthly need includes current and target months and rounds cents upwards', () => {
  const m = goalMetrics({ target_amount: '1000', saved_amount: '100', target_date: '2027-01-15' }, '2026-11-20');
  assert.equal(m.months, 3);
  assert.equal(m.monthly, 300);
  assert.equal(m.progress, 10);
  const cents = goalMetrics({ target_amount: '100.00', saved_amount: '0', target_date: '2026-12-31' }, '2026-10-01');
  assert.equal(cents.monthly, 33.34);
});
test('today and expired deadlines are treated differently', () => {
  assert.equal(goalMetrics({ target_amount: 100, saved_amount: 20, target_date: '2026-10-01' }, '2026-10-01').monthly, 80);
  const overdue = goalMetrics({ target_amount: 100, saved_amount: 20, target_date: '2026-09-30' }, '2026-10-01');
  assert.equal(overdue.overdue, true);
  assert.equal(overdue.monthly, null);
});
test('completed and overfunded goals never require negative contributions', () => {
  const m = goalMetrics({ target_amount: 100, saved_amount: 150, target_date: '2026-01-01' }, '2026-10-01');
  assert.equal(m.complete, true);
  assert.equal(m.remaining, 0);
  assert.equal(m.monthly, 0);
  assert.equal(m.overdue, false);
  assert.equal(m.progress, 100);
});
