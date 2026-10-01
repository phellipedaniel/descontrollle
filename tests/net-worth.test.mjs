import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAccountBalances, moneyCents, netWorthMetrics } from '../src/lib/net-worth.ts';

test('account balances use initial balance plus income minus expenses', () => {
  const accounts = [
    { id:'a', name:'A', account_type:'checking', initial_balance:100, include_in_net_worth:true },
    { id:'b', name:'B', account_type:'cash', initial_balance:50, include_in_net_worth:false },
  ];
  const balances = calculateAccountBalances(accounts,[
    { account_id:'a', kind:'income', amount:200 },
    { account_id:'a', kind:'expense', amount:30 },
    { account_id:'b', kind:'expense', amount:100 },
  ]);
  assert.equal(balances.get('a'),270);
  assert.equal(balances.get('b'),-50);
});

test('net worth includes selected account balances, active manual assets and selected liabilities', () => {
  const metrics = netWorthMetrics(
    [
      { balance:270, include_in_net_worth:true },
      { balance:-50, include_in_net_worth:false },
    ],
    [
      { current_value:5000, status:'active' },
      { current_value:1000, status:'archived' },
    ],
    [
      { current_balance:1200, status:'active', include_in_net_worth:true },
      { current_balance:800, status:'archived', include_in_net_worth:false },
      { current_balance:0, status:'paid', include_in_net_worth:true },
    ],
  );
  assert.equal(metrics.accountsValue,270);
  assert.equal(metrics.manualAssetsValue,5000);
  assert.equal(metrics.assetsValue,5270);
  assert.equal(metrics.liabilitiesValue,1200);
  assert.equal(metrics.netWorth,4070);
});

test('archived debt can remain a liability when explicitly included', () => {
  const metrics = netWorthMetrics([],[],[
    { current_balance:800, status:'archived', include_in_net_worth:true },
  ]);
  assert.equal(metrics.liabilitiesValue,800);
  assert.equal(metrics.netWorth,-800);
});

test('money parser preserves cents and rejects excessive precision', () => {
  assert.equal(moneyCents('123,45'),12345);
  assert.equal(moneyCents('0'),0);
  assert.equal(moneyCents('1.005'),null);
});
