import test from "node:test";
import assert from "node:assert/strict";
import {buildOverviewStory,loadOverviewHistory,changeLabel} from "../src/lib/overview-charts.ts";
const row=(id,date,amount,kind="expense",category_id="food")=>({id,occurred_on:date,amount,kind,category_id});
test("annual comparison aligns recorded months and excludes current, future and missing periods",()=>{
 const data=[row("a","2025-01-10",100),row("b","2025-02-10",900),row("c","2026-01-10",150),row("d","2026-03-10",200),row("e","2025-03-10",100),row("f","2026-03-30",800)];
 const s=buildOverviewStory(data,[{id:"food",name:"Alimentação"}],"2026-03","2026-03-15");
 assert.deepEqual(s.comparable,[1]);assert.equal(s.currentTotal.expense,150);assert.equal(s.previousTotal.expense,100);
 assert.equal(s.current[1].entries,0);assert.equal(s.current[2].expense,200);assert.equal(s.partial,true);
 assert.equal(s.categories[0].current,150);
});
test("observed zero, no history, prior-only categories and calendar year transitions stay distinct",()=>{
 const s=buildOverviewStory([row("a","2025-12-01",20),row("b","2026-12-01",30,"income",null)],[{id:"food",name:"Alimentação"}],"2026-12","2027-01-02");
 assert.deepEqual(s.comparable,[12]);assert.equal(s.current[11].expense,0);assert.equal(s.current[11].entries,1);
 assert.equal(s.categories[0].current,0);assert.equal(s.categories[0].previous,20);
 assert.deepEqual(buildOverviewStory([],[],"2026-01","2026-10-02").comparable,[]);
 assert.match(changeLabel(20,0),/Sem base percentual/);assert.match(changeLabel(50,100),/50% abaixo/);
});
test("future selected years do not fabricate observations and invalid source values fail",()=>{
 const s=buildOverviewStory([row("a","2027-01-01",5)],[],"2027-01","2026-10-02");
 assert.equal(s.current[0].entries,0);
 assert.throws(()=>buildOverviewStory([row("x","2026-01-01","bad")],[],"2026-01","2026-10-02"));
 assert.throws(()=>buildOverviewStory([row("x","invalid",10)],[],"2026-01","2026-10-02"));
});
function client(pages) { const calls=[];return {calls,from(table){const call={table,filters:[],orders:[]};calls.push(call);const q={select(){return q;},eq(...a){call.filters.push(a);return q;},gte(...a){call.filters.push(a);return q;},lt(...a){call.filters.push(a);return q;},order(k){call.orders.push(k);return q;},range(a,b){call.range=[a,b];return q;},then(done){return Promise.resolve(pages[calls.length-1]).then(done);}};return q;}}; }
test("history pages beyond provider limits with explicit authenticated scope and stable ordering",async()=>{
 const rows=Array.from({length:501},(_,i)=>row(String(i),"2026-01-01",1));
 const c=client([{data:rows.slice(0,500),count:501,error:null},{data:rows.slice(500),count:501,error:null}]);
 assert.equal((await loadOverviewHistory(c,"owner",2026)).length,501);
 assert.deepEqual(c.calls[0].filters,[["user_id","owner"],["occurred_on","2025-01-01"],["occurred_on","2027-01-01"]]);
 assert.deepEqual(c.calls[0].orders,["occurred_on","id"]);assert.deepEqual(c.calls[1].range,[500,999]);
});
test("missing pages, duplicate ids, provider errors and changing counts never return a partial story",async()=>{
 const data=[row("a","2026-01-01",1)];
 for(const pages of [
 [{data,count:2,error:null},{data:[],count:2,error:null}],
 [{data,count:2,error:null},{data,count:2,error:null}],
 [{data,count:2,error:null},{data:[],count:3,error:null}],
 [{data:null,count:null,error:"failed"}],
 [{data:[],count:50001,error:null}],
 ]) await assert.rejects(loadOverviewHistory(client(pages),"owner",2026));
 await assert.rejects(loadOverviewHistory(client([]),"",2026));
});
