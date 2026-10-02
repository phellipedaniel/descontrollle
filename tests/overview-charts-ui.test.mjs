import {createElement} from "react";import test from "node:test";import assert from "node:assert/strict";import "./dashboard-fixtures.mjs";import {renderToStaticMarkup} from "react-dom/server";
const {OverviewCharts}=await import("../src/components/dashboard/overview-charts.tsx");
const {buildOverviewStory}=await import("../src/lib/overview-charts.ts");
test("chart UI includes equivalent data tables, named controls and distinct shapes",()=>{
 const s=buildOverviewStory([{id:"a",kind:"expense",amount:10,occurred_on:"2025-01-01",category_id:null},{id:"b",kind:"expense",amount:20,occurred_on:"2026-01-01",category_id:null},{id:"c",kind:"expense",amount:10,occurred_on:"2025-02-01",category_id:null},{id:"d",kind:"expense",amount:20,occurred_on:"2026-02-01",category_id:null}],[],"2026-02","2026-10-02");
 const html=renderToStaticMarkup(createElement(OverviewCharts,{story:s,unavailable:false}));
 assert.match(html,/role="img"/);assert.match(html,/aria-pressed="true"/);assert.match(html,/stroke-dasharray="6 5"/);assert.match(html,/Ver valores em tabela/);assert.match(html,/Sem dados/);assert.match(html,/Sem categoria/);assert.match(html,/Meses em comum: Jan/);assert.match(html,/tabindex="0"/);
});
test("unavailable chart sources never show percent deltas or invented values",()=>{
 const html=renderToStaticMarkup(createElement(OverviewCharts,{story:null,unavailable:true}));assert.match(html,/Totais parciais não são exibidos/);assert.doesNotMatch(html,/<svg|R\$/);
});
