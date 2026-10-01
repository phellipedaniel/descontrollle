import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProjection,
  historicalAverage,
  moneyCents,
  shiftProjectionMonth,
} from '../src/lib/planning-engine.ts';

test('historical average requires data in every selected month', () => {
  const rows = [
    { occurred_on:'2026-06-15', kind:'expense', amount:100 },
    { occurred_on:'2026-07-15', kind:'expense', amount:200 },
    { occurred_on:'2026-08-15', kind:'expense', amount:300 },
  ];
  const complete = historicalAverage(['2026-06','2026-07','2026-08'],rows,'expense');
  assert.equal(complete.value,200);
  assert.equal(complete.complete,true);

  const missingIncome = historicalAverage(['2026-06','2026-07','2026-08'],rows,'income');
  assert.equal(missingIncome.value,null);
  assert.equal(missingIncome.complete,false);
  assert.equal(missingIncome.monthsWithData,0);
});

test('explicit monthly plan overrides fallback', () => {
  const result = buildProjection({
    startMonth:'2026-10',
    horizonMonths:3,
    plannedFallback:{income:5000,expense:3000},
    probableBaseline:{income:4500,expense:3200},
    explicitPlans:{'2026-11':{income:7000,expense:4000}},
    goals:[],
    includeGoals:true,
    monthlyProvision:0,
    includeProvisions:true,
    debtMinimums:0,
    includeDebtMinimums:true,
    debtExtra:0,
    includeDebtExtra:true,
    reserveGap:0,
    reserveMonthlyAllocation:0,
  });
  assert.equal(result.rows[0].plannedMargin,2000);
  assert.equal(result.rows[1].explicitPlan,true);
  assert.equal(result.rows[1].plannedMargin,3000);
});

test('goal allocation stops at target and never exceeds remaining amount', () => {
  const result = buildProjection({
    startMonth:'2026-10',
    horizonMonths:6,
    plannedFallback:{income:5000,expense:3000},
    probableBaseline:{income:5000,expense:3000},
    explicitPlans:{},
    goals:[{
      id:'g1',name:'Goal',target_amount:1000,saved_amount:100,target_date:'2026-12-15',status:'active',
    }],
    includeGoals:true,
    monthlyProvision:0,
    includeProvisions:false,
    debtMinimums:0,
    includeDebtMinimums:false,
    debtExtra:0,
    includeDebtExtra:false,
    reserveGap:0,
    reserveMonthlyAllocation:0,
  });
  assert.deepEqual(result.rows.slice(0,4).map(row => row.goalAllocation),[300,300,300,0]);
});

test('reserve contribution stops once gap is filled', () => {
  const result = buildProjection({
    startMonth:'2026-10',
    horizonMonths:4,
    plannedFallback:{income:1000,expense:0},
    probableBaseline:{income:1000,expense:0},
    explicitPlans:{},
    goals:[],
    includeGoals:false,
    monthlyProvision:0,
    includeProvisions:false,
    debtMinimums:0,
    includeDebtMinimums:false,
    debtExtra:0,
    includeDebtExtra:false,
    reserveGap:250,
    reserveMonthlyAllocation:100,
  });
  assert.deepEqual(result.rows.map(row => row.reserveAllocation),[100,100,50,0]);
  assert.equal(result.endingReserveGap,0);
});

test('missing planned baseline propagates as incomplete cumulative margin', () => {
  const result = buildProjection({
    startMonth:'2026-10',
    horizonMonths:3,
    plannedFallback:{income:null,expense:100},
    probableBaseline:{income:null,expense:100},
    explicitPlans:{},
    goals:[],
    includeGoals:false,
    monthlyProvision:0,
    includeProvisions:false,
    debtMinimums:0,
    includeDebtMinimums:false,
    debtExtra:0,
    includeDebtExtra:false,
    reserveGap:0,
    reserveMonthlyAllocation:0,
  });
  assert.equal(result.rows[0].plannedMargin,null);
  assert.equal(result.rows[2].plannedCumulative,null);
  assert.equal(result.rows[0].probableMargin,null);
});

test('month shifting crosses year boundary', () => {
  assert.equal(shiftProjectionMonth('2026-12',1),'2027-01');
});

test('money parser keeps cents strict', () => {
  assert.equal(moneyCents('123,45'),12345);
  assert.equal(moneyCents('1.005'),null);
});
