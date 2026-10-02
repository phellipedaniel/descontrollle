import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import './dashboard-fixtures.mjs';
registerHooks({
 resolve(specifier,context,next){
  if(specifier==='@supabase/ssr')return {url:'fixture:proxy-ssr',shortCircuit:true};
  if(specifier==='next/server')return next('next/server.js',context);
  return next(specifier,context);
 },
 load(url,context,next){
  if(url==='fixture:proxy-ssr')return {format:'module',source:'export function createServerClient(url,key,options){globalThis.proxyOptions=options;return {auth:{async getUser(){options.cookies.setAll([{name:"synthetic-session",value:"refreshed",options:{path:"/",secure:true,sameSite:"lax"}}],{});return globalThis.proxyUser;}}};}',shortCircuit:true};
  return next(url,context);
 }
});
const {NextRequest}=await import('next/server.js');
const {updateSession}=await import('../src/lib/supabase/proxy.ts');
process.env.NEXT_PUBLIC_SUPABASE_URL='https://synthetic.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='synthetic-public-key';
test('proxy carries refreshed cookies and removes query contents on both redirects',async()=>{
 for(const [path,user,destination]of [['/finance?private=example',null,'/login'],['/login?private=example',{id:'a'},'/']]){
  globalThis.proxyUser={data:{user},error:null};
  const response=await updateSession(new NextRequest('https://app.test'+path));
  assert.equal(response.headers.get('location'),'https://app.test'+destination);
  assert.equal(response.cookies.get('synthetic-session').value,'refreshed');
  assert.match(response.headers.get('cache-control'),/no-store/);
  assert.match(response.headers.get('content-security-policy'),/nonce-/);
 }
});
test('proxy forwards refreshed request cookies and generates fresh CSP nonces',async()=>{
 globalThis.proxyUser={data:{user:{id:'a'}},error:null};
 const a=await updateSession(new NextRequest('https://app.test/finance'));
 const b=await updateSession(new NextRequest('https://app.test/finance'));
 assert.match(a.headers.get('x-middleware-request-cookie'),/synthetic-session=refreshed/);
 assert.notEqual(a.headers.get('content-security-policy'),b.headers.get('content-security-policy'));
 assert.ok(a.headers.get('x-middleware-request-content-security-policy'));
});
