import test from 'node:test';
import assert from 'node:assert/strict';
import {
  latestVersionForMonth,
  moneyCents,
  paymentMethodLabel,
  scheduledDateForMonth,
} from '../src/lib/automation.ts';

const versions=[
  {id:'v1',recurring_expense_id:'r',effective_from:'2026-10-01',description:'Internet',amount:100,day_of_month:31,account_id:'a',category_id:null,merchant_id:null,payment_method_id:null,is_active:true,created_at:'2026-09-01T00:00:00Z'},
  {id:'v2',recurring_expense_id:'r',effective_from:'2026-12-01',description:'Internet',amount:120,day_of_month:10,account_id:'a',category_id:null,merchant_id:null,payment_method_id:null,is_active:true,created_at:'2026-11-01T00:00:00Z'},
];

test('latest version respects effective month',()=>{
  assert.equal(latestVersionForMonth(versions,'2026-11')?.id,'v1');
  assert.equal(latestVersionForMonth(versions,'2026-12')?.id,'v2');
  assert.equal(latestVersionForMonth(versions,'2026-09'),null);
});

test('day 31 is clamped to month end',()=>{
  assert.equal(scheduledDateForMonth('2026-02',31),'2026-02-28');
  assert.equal(scheduledDateForMonth('2028-02',31),'2028-02-29');
  assert.equal(scheduledDateForMonth('2026-04',31),'2026-04-30');
});

test('payment method label includes optional card brand only for cards',()=>{
  assert.equal(paymentMethodLabel({kind:'credit_card',name:'Nubank',card_brand:'Mastercard'}),'Nubank · Cartão de crédito · Mastercard');
  assert.equal(paymentMethodLabel({kind:'pix',name:'Pix Inter',card_brand:'Visa'}),'Pix Inter · Pix');
});

test('money parser is cent-safe',()=>{
  assert.equal(moneyCents('199,90'),19990);
  assert.equal(moneyCents('1.005'),null);
});
