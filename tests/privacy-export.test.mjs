import test from 'node:test';
import assert from 'node:assert/strict';
import { exportAccountData, exportSources } from '../src/lib/privacy-export.ts';
function client(data={}, mutate=()=>{}) {
 const calls=[];
 return {calls,from(table) {
  const call={table,orders:[],filters:[],range:null};calls.push(call);
  const chain={
   select(columns,options) {call.columns=columns;call.options=options;return chain;},
   eq(...args) {call.filters.push(args);return chain;},
   order(key) {call.orders.push(key);return chain;},
   range(from,to) {call.range=[from,to];return chain;},
   then(done) {const all=data[table]??[];const result={data:all.slice(call.range[0],call.range[1]+1),count:all.length,error:null};mutate(result,call);return Promise.resolve(result).then(done);},
  };return chain;
 }};
}
test('export paginates beyond provider defaults, scopes every table and includes closed periods', async()=>{
 const transactions=Array.from({length:1201},(_,i)=>({id:String(i),user_id:'a',description:'Synthetic'}));
 const c=client({transactions,financial_periods:[{id:'p',user_id:'a',status:'closed'}]});
 const result=await exportAccountData(c,'a');
 assert.equal(result.tables.transactions.length,1201);assert.equal(result.counts.transactions,1201);
 assert.equal(result.tables.financial_periods[0].status,'closed');
 assert.equal(Object.keys(result.tables).length,28);
 for(const table of ["fixed_recurring_items","fixed_recurring_versions","fixed_recurring_confirmations"]) assert.ok(Object.hasOwn(result.tables,table));
 for(const call of c.calls){assert.deepEqual(call.filters,[['user_id','a']]);assert.deepEqual(call.options,{count:'exact'});}
 assert.deepEqual(c.calls.filter(x=>x.table==='transactions').map(x=>x.range),[[0,499],[500,999],[1000,1499]]);
 assert.deepEqual(c.calls.find(x=>x.table==='resilience_essential_categories').orders,['user_id','category_id']);
 assert.ok(result.excluded.length>0);
});
test('export refuses errors, truncation, duplicate rows, count changes and cross-owner rows',async()=>{
 await assert.rejects(exportAccountData(client({},r=>{r.error={message:'private failure'};}),'a'),/Incomplete/);
 await assert.rejects(exportAccountData(client({},r=>{r.count=null;}),'a'),/Incomplete/);
 await assert.rejects(exportAccountData(client({},r=>{r.count=3;}),'a'),/Incomplete/);
 await assert.rejects(exportAccountData(client({accounts:[{id:'b',user_id:'b'}]}),'a'),/ownership/);
 await assert.rejects(exportAccountData(client({accounts:[{id:'a',user_id:'a'},{id:'a',user_id:'a'}]}),'a'),/changed/);
 const many=Array.from({length:501},(_,i)=>({id:String(i),user_id:'a'}));
 await assert.rejects(exportAccountData(client({accounts:many},(r,c)=>{if(c.range[0])r.count=500;}),'a'),/changed/);
 await assert.rejects(exportAccountData(client({},r=>{r.count=50001;}),'a'),/assistance/);
});
test('export requires identity and exports explicitly confirmed empty sources',async()=>{
 await assert.rejects(exportAccountData(client(),''),/Authenticated/);
 const r=await exportAccountData(client(),'a');
 for(const [table] of exportSources) assert.deepEqual(r.tables[table],[]);
});
