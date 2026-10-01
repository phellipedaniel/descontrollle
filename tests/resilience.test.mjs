import test from 'node:test';
import assert from 'node:assert/strict';
import { moneyCents, provisionMonthly, provisionProgress, resilienceMetrics } from '../src/lib/resilience.ts';

test('money parser accepts cents and rejects invalid precision', () => {
  assert.equal(moneyCents('117,05'), 11705);
  assert.equal(moneyCents('0'), 0);
  for (const value of ['-1', '1.005', '1e3', 'Infinity', '10000000000']) assert.equal(moneyCents(value), null);
});

test('reserve target uses essential monthly expense times protection months', () => {
  const metrics = resilienceMetrics(2500.55, 5000, 6);
  assert.equal(metrics.target, 15003.30);
  assert.equal(metrics.gap, 10003.30);
  assert.ok(Math.abs((metrics.coverage ?? 0) - (5000 / 2500.55)) < 0.000001);
});

test('coverage is unavailable when essential baseline is zero', () => {
  const metrics = resilienceMetrics(0, 1000, 6);
  assert.equal(metrics.target, 0);
  assert.equal(metrics.coverage, null);
  assert.equal(metrics.progress, 0);
});

test('reserve progress caps at 100 percent when overfunded', () => {
  const metrics = resilienceMetrics(1000, 8000, 6);
  assert.equal(metrics.target, 6000);
  assert.equal(metrics.gap, 0);
  assert.equal(metrics.progress, 100);
});

test('annual provision rounds monthly amount upwards in cents', () => {
  assert.equal(provisionMonthly(100), 8.34);
  assert.equal(provisionMonthly(1200), 100);
  assert.equal(provisionMonthly(0), 0);
});

test('provision progress never exceeds 100 percent', () => {
  assert.equal(provisionProgress(1000, 250), 25);
  assert.equal(provisionProgress(1000, 1200), 100);
});
