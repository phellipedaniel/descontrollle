import test from "node:test";
import assert from "node:assert/strict";
import { buildOverviewStory, loadOverviewHistory } from "../src/lib/overview-charts.ts";

const row=(id,date,amount,kind="expense",category_id="food")=>({
  id,
  occurred_on:date,
  amount,
  kind,
  category_id,
});

function client(pages) {
  const calls=[];
  return {
    calls,
    from(table) {
      const call={table,filters:[],orders:[]};
      calls.push(call);
      const q={
        select(){return q;},
        eq(...a){call.filters.push(a);return q;},
        gte(...a){call.filters.push(a);return q;},
        lt(...a){call.filters.push(a);return q;},
        order(k){call.orders.push(k);return q;},
        range(a,b){call.range=[a,b];return q;},
        then(done){return Promise.resolve(pages[calls.length-1]).then(done);},
      };
      return q;
    },
  };
}

test("dashboard history applies category, account, payment and type filters at source", async()=>{
  const c=client([{data:[row("1","2026-01-01",10)],count:1,error:null}]);
  await loadOverviewHistory(c,"owner",2026,{
    categoryId:"cat",
    accountId:"acc",
    paymentMethodId:"pay",
    kind:"expense",
  });
  assert.deepEqual(c.calls[0].filters,[
    ["user_id","owner"],
    ["occurred_on","2025-01-01"],
    ["occurred_on","2027-01-01"],
    ["category_id","cat"],
    ["account_id","acc"],
    ["payment_method_id","pay"],
    ["kind","expense"],
  ]);
});

test("category breakdown can switch to income without changing expense default",()=>{
  const rows=[
    row("a","2025-01-10",100,"income","salary"),
    row("b","2026-01-10",150,"income","salary"),
    row("c","2025-01-12",40,"expense","food"),
    row("d","2026-01-12",50,"expense","food"),
  ];
  const categories=[
    {id:"salary",name:"Salário"},
    {id:"food",name:"Alimentação"},
  ];
  const expenseStory=buildOverviewStory(rows,categories,"2026-02","2026-10-02");
  const incomeStory=buildOverviewStory(rows,categories,"2026-02","2026-10-02","income");
  assert.equal(expenseStory.categories[0].name,"Alimentação");
  assert.equal(incomeStory.categories[0].name,"Salário");
  assert.equal(incomeStory.breakdownKind,"income");
});
