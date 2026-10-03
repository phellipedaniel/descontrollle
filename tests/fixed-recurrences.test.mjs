import test from 'node:test';
import assert from 'node:assert/strict';
import { fixedMonthTotals, minimumFixedMonth } from '../src/lib/fixed-recurrences.ts';
const item = (kind, amount, extra={}) => ({id:'a',kind,version:{amount,is_active:true},confirmation:null,...extra});
test('fixed recurrence start never predates October 2026 or the current month',()=>{
 assert.equal(minimumFixedMonth('2026-09'),'2026-10');
 assert.equal(minimumFixedMonth('2026-10'),'2026-10');
 assert.equal(minimumFixedMonth('2026-11'),'2026-11');
});
test('month forecasts use cents and keep pending amounts separate from actuals',()=>{
 const r=fixedMonthTotals([item('income','5000.10'),item('expense','1000.05'),item('expense','0.10'),item('expense','0.20')]);
 assert.deepEqual(r,{income:5000.10,expense:1000.35,balance:3999.75,pendingIncome:5000.10,pendingExpense:1000.35});
});
test('confirmation is counted once and keeps its amount after version change or pause',()=>{
 const r=fixedMonthTotals([item('expense','200',{confirmation:{amount:'100'}}),item('income','2000',{version:{amount:2000,is_active:false},confirmation:{amount:'1500'}})]);
 assert.deepEqual(r,{income:1500,expense:100,balance:1400,pendingIncome:0,pendingExpense:0});
});
test('not-yet-started and paused forecasts are absent; empty totals are zero',()=>{
 assert.deepEqual(fixedMonthTotals([item('income','300',{version:null}),item('expense','100',{version:{amount:100,is_active:false}})]),fixedMonthTotals([]));
});
test('invalid amounts are rejected rather than presented as zero',()=>{
 assert.throws(()=>fixedMonthTotals([item('income','invalid')]));
});
