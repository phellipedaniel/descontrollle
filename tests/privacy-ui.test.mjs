import test from 'node:test';
import assert from 'node:assert/strict';
import './dashboard-fixtures.mjs';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){if(specifier==='./actions' && /\/app\/login\/page\.tsx$/.test(context.parentURL ?? ''))return {url:new URL('./actions.ts',context.parentURL).href,shortCircuit:true};return next(specifier,context);}});
import { renderToStaticMarkup } from 'react-dom/server';
const {default: Privacy}=await import('../src/app/privacy/page.tsx');
const {GET}=await import('../src/app/privacy/export/route.ts');
const {default: Login}=await import('../src/app/login/page.tsx');
const {login}=await import('../src/app/login/actions.ts');
function exportClient(user) {
 return {auth:{async getUser(){return {data:{user},error:null};}},from(){const chain={select(){return chain;},eq(){return chain;},order(){return chain;},range(){return chain;},then(done){return Promise.resolve({data:[],count:0,error:null}).then(done);}};return chain;}};
}
test('privacy offers download only for a verified user and explains private-source scope',async()=>{
 globalThis.dashboardFixture=exportClient(null);
 const anonymous=renderToStaticMarkup(await Privacy());
 assert.match(anonymous,/Entrar para baixar dados/);assert.doesNotMatch(anonymous,/href="\/privacy\/export"/);
 globalThis.dashboardFixture=exportClient({id:'a'});
 const owner=renderToStaticMarkup(await Privacy());
 assert.match(owner,/Baixar dados da conta/);assert.match(owner,/Fontes privadas da importação/);
});
test('export denies anonymous and cross-site requests and sets private attachment headers',async()=>{
 globalThis.dashboardFixture=exportClient(null);
 let response=await GET(new Request('https://app.test/privacy/export'));assert.equal(response.status,401);
 globalThis.dashboardFixture=exportClient({id:'a',email:'synthetic@example.test',created_at:'2026-10-02'});
 response=await GET(new Request('https://app.test/privacy/export',{headers:{'sec-fetch-site':'cross-site'}}));assert.equal(response.status,403);
 response=await GET(new Request('https://app.test/privacy/export',{headers:{'sec-fetch-site':'same-origin'}}));
 assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 assert.match(response.headers.get('content-disposition'),/attachment/);
 const payload=await response.json();assert.equal(payload.account.id,'a');assert.equal(Object.keys(payload.tables).length,25);
});
test('export endpoint never discloses provider failures or returns a partial file',async()=>{
 globalThis.dashboardFixture=exportClient({id:'a'});
 globalThis.dashboardFixture.from=()=>{throw new Error('private database details');};
 const response=await GET(new Request('https://app.test/privacy/export'));
 assert.equal(response.status,503);assert.equal(response.headers.get('content-disposition'),null);
 assert.doesNotMatch(await response.text(),/private database details/);
});
test('login removes registration and ignores injected query messages',async()=>{
 const html=renderToStaticMarkup(await Login({searchParams:Promise.resolve({error:'Provider details',message:'Fake success'})}));
 assert.doesNotMatch(html,/Criar conta|Provider details|Fake success/);assert.match(html,/Privacidade e dados/);
});
test('login redirects with stable code instead of provider error content',async()=>{
 globalThis.dashboardFixture={auth:{async signInWithPassword(){return {error:{message:'private provider details'}};}}};
 const data=new FormData();data.set('email','synthetic@example.test');data.set('password','synthetic-password');
 await assert.rejects(login(data),error=>error.message==='redirect:/login?error=credenciais');
});
