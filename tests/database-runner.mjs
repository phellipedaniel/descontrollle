import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
const db = new PGlite();
try {
 await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth;
  create table auth.users(id uuid primary key);
  create table auth.sessions(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema auth to anon,authenticated,service_role;
  grant execute on function auth.uid() to anon,authenticated,service_role;
 `);
 const migrations=readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort();
 for(const name of migrations) {
  try {await db.exec(readFileSync('supabase/migrations/'+name,'utf8'));}
  catch(error) {throw new Error('Migration '+name+': '+error.message);}
 }
 console.log('Applied '+migrations.length+' migrations to temporary local Postgres');
 for(const name of readdirSync('supabase/tests').filter(x=>x.endsWith('.sql')).sort()) {
  try {await db.exec(readFileSync('supabase/tests/'+name,'utf8'));console.log('PASS '+name);}
  catch(error) {throw new Error('SQL test '+name+': '+error.message);}
 }
 const {rows}=await db.query('select count(*)::int as count from auth.users');
 if(rows[0].count!==0) throw new Error('Synthetic users did not roll back');
 console.log('All database tests passed; synthetic data rolled back. No production connection.');
} finally { await db.close(); }
