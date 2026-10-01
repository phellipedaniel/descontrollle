import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { loadBindings, transformSync } from 'next/dist/build/swc/index.js';
await loadBindings();
const root = resolve('src');
registerHooks({
 resolve(specifier, context, next) {
  if (specifier === './actions' && /\/app\/(finance|planning)\/page\.tsx$/.test(context.parentURL ?? '')) return { url: 'fixture:module-actions', shortCircuit: true };
  if (specifier === '@/lib/supabase/server') return { url: 'fixture:supabase', shortCircuit: true };
  if (specifier === '@/app/login/actions') return { url: 'fixture:actions', shortCircuit: true };
  if (specifier === 'next/link') return { url: 'fixture:link', shortCircuit: true };
  if (specifier === 'next/navigation') return { url: 'fixture:navigation', shortCircuit: true };
  if (specifier.startsWith('@/')) {
   const p = resolve(root, specifier.slice(2));
   const extension = ['.tsx', '.ts'].find(ext => existsSync(p + ext));
   return { url: pathToFileURL(p + extension).href, shortCircuit: true };
  }
  return next(specifier, context.parentURL?.startsWith("fixture:") ? {...context,parentURL:import.meta.url} : context);
 },
 load(url, context, next) {
  const mocks = {
   'fixture:module-actions': 'export async function createAccount() {} export async function createCategory() {} export async function createTransaction() {} export async function deleteTransaction() {} export async function saveMonthlyPlan() {} export async function saveCategoryBudget() {}',
   'fixture:supabase': 'export async function createClient() { return globalThis.dashboardFixture; }',
   'fixture:actions': 'export async function logout() {}',
   'fixture:navigation': 'export function redirect(url) { throw new Error("redirect:" + url); }',
   'fixture:link': 'import {createElement} from "react"; export default function Link(props) { return createElement("a",props); }',
  };
  if (mocks[url]) return { format:'module', source:mocks[url], shortCircuit:true };
  if (/\.tsx?$/.test(url) && url.startsWith(pathToFileURL(root).href)) {
   const code = transformSync(readFileSync(fileURLToPath(url),'utf8'), { filename: fileURLToPath(url), jsc: { parser: {syntax:'typescript',tsx:url.endsWith('.tsx')}, transform:{react:{runtime:'automatic'}} }, module:{type:'es6'} }).code;
   return { format:'module',source:code,shortCircuit:true };
  }
  return next(url, context);
 }
});
export function fixtureClient(data = {}, errors = {}) {
 const calls = [];
 return {
  calls,
  async rpc(name, args) {calls.push({rpc:name,args});return {data:null,error:errors[name]??null};},
  auth: { async getUser() { return {data:{user:{email:'fixture@example.test'}},error:null}; } },
  from(table) {
   const call = {table, filters:[], order:[], limit:null, select:null}; calls.push(call);
   const chain = {
    select(value) {call.select=value; return chain;},
    eq(...args) {call.filters.push(['eq',...args]); return chain;},
    gte(...args) {call.filters.push(['gte',...args]); return chain;},
    lt(...args) {call.filters.push(['lt',...args]); return chain;},
    order(...args) {call.order.push(args); return chain;},
    limit(value) {call.limit=value; return chain;},
    maybeSingle() {return chain;},
    then(done) { let rows = data[table] ?? (['monthly_plans','financial_periods','resilience_profiles'].includes(table) ? null : []); if (table === "transactions" && Array.isArray(rows)) rows = rows.map((row,i) => ({id:String(i),occurred_on:"2026-09-01",...row})); if (Array.isArray(rows) && call.limit) rows=rows.slice(0,call.limit); return Promise.resolve({data: errors[table] ? null : rows, error:errors[table] ?? null, count:data.__counts?.[table] ?? null}).then(done); },
   };
   return chain;
  }
 };
}
