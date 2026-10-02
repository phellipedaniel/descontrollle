import test from 'node:test';
import assert from 'node:assert/strict';
import { safeAuthRedirect, loginErrorMessage, isPublicPath, authCookieOptions } from '../src/lib/auth-security.ts';
import { contentSecurityPolicy } from '../src/lib/content-security.ts';

test('auth returns only internal paths and rejects external and ambiguous destinations', () => {
 const base='https://descontrollle.vercel.app/auth/callback';
 for(const path of ['https://evil.invalid','//evil.invalid','/\\\\evil.invalid','/%2f%2fevil.invalid','/%255c%255cevil.invalid','/\n/evil.invalid','javascript:alert(1)',' /finance','/%zz','/%252f%252fevil.invalid']) {
  assert.equal(safeAuthRedirect(path,base).href,'https://descontrollle.vercel.app/',path);
 }
 assert.equal(safeAuthRedirect('/finance?month=2026-09',base).href,'https://descontrollle.vercel.app/finance?month=2026-09');
 assert.equal(safeAuthRedirect(null,base).pathname,'/');
});
test('login never displays arbitrary URL content or provider errors', () => {
 assert.equal(loginErrorMessage(),null);
 assert.equal(loginErrorMessage('credenciais'),'E-mail ou senha inválidos.');
 assert.equal(loginErrorMessage('database error: private details'),'Não foi possível concluir a solicitação.');
 for(const code of ['constructor','__proto__','toString']) assert.equal(loginErrorMessage(code),'Não foi possível concluir a solicitação.');
});
test('public routes are exact and production auth cookies require HTTPS', () => {
 for(const path of ['/login','/privacy','/auth/callback']) assert.ok(isPublicPath(path));
 for(const path of ['/login-anything','/auth/admin','/privacy/export','/finance']) assert.ok(!isPublicPath(path));
 assert.deepEqual(authCookieOptions(true),{path:'/',sameSite:'lax',secure:true});
 assert.equal(authCookieOptions(false).secure,false);
});
test('production CSP permits nonce scripts and intended provider without unsafe scripts', () => {
 const csp=contentSecurityPolicy('YWJj','https://project.supabase.co',false);
 assert.match(csp,/nonce-YWJj/); assert.match(csp,/strict-dynamic/);
 assert.doesNotMatch(csp,/unsafe-eval|script-src[^;]*unsafe-inline/);
 assert.match(csp,/connect-src 'self' https:\/\/project.supabase.co wss:\/\/project.supabase.co/);
 assert.match(csp,/frame-ancestors 'none'/);
 assert.throws(()=>contentSecurityPolicy("bad'nonce",'https://project.supabase.co',false));
 assert.throws(()=>contentSecurityPolicy('YWJj','http://project.supabase.co',false));
 assert.match(contentSecurityPolicy('YWJj','http://localhost:54321',true),/unsafe-eval/);
});
