import { PGlite } from '../output/mvp-20261002/quota-runtime/node_modules/@electric-sql/pglite/dist/index.js';
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const migration='supabase/migrations/20261002000000_ai_usage_reservation.sql';
const policy=JSON.parse(fs.readFileSync('packages/agent-config/ai-usage-policy.json','utf8'));
const lock=JSON.parse(fs.readFileSync('output/mvp-20261002/quota-runtime/package-lock.json','utf8'));
assert.equal(lock.packages['node_modules/@electric-sql/pglite'].version,'0.5.8');
assert.equal(lock.packages['node_modules/@electric-sql/pglite'].integrity,'sha512-n9tsbUOhwx2epK1V0ZG9Ar4SHWUju04dhmzZXiSBXwBoleOvIfals33NAaWgagQVAL4Rbvx/Ptsu3P+pA09f6Q==');
const db=await PGlite.create();
const cases=[];
const a=crypto.randomUUID(),b=crypto.randomUUID(),admin=crypto.randomUUID();
try {
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema nilaza_private;
 create table auth.users(id uuid primary key);
 create table public.admin_role_assignments(user_id uuid,role text,status text);
 create table public.tarot_readings(id uuid primary key,user_id uuid,status text);
 create table public.chat_messages(id uuid primary key,user_id uuid,role text);
 create table public.usage_events(id uuid primary key,user_id uuid,feature text);`);
 await db.query('insert into auth.users values ($1),($2),($3)',[a,b,admin]);
 await db.query("insert into admin_role_assignments values ($1,'admin','active')",[admin]);
 await db.exec(fs.readFileSync(migration,'utf8'));
 const rpc=async(name,args)=>db.transaction(async tx=>{
  await tx.exec('set local role service_role');
  return (await tx.query(`select public.nilaza_ai_usage_${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as result`,args)).rows[0].result;
 });
 const spec=(overrides={})=>({id:crypto.randomUUID(),user:a,feature:'persona_chat',audience:'pilot',digest:'a'.repeat(64),lease:crypto.randomUUID(),bounds:[1000],campaign:'qa-g1',policy:policy.version,cards:null,...overrides});
 const reserve=s=>rpc('reserve',[s.id,s.user,s.feature,s.audience,s.digest,s.lease,s.bounds,s.campaign,s.policy,s.cards]);
 const claim=(s,n=1,lease=s.lease)=>rpc('claim',[s.id,lease,n]);
 const receipt=(s,n,cost,success)=>rpc('receipt',[s.id,s.lease,n,cost,success]);
 const finish=(s,success=false,id=null)=>rpc('finish',[s.id,s.lease,success,id]);
 const activate=async(id='qa-g1',daily=5000000,total=50000000,evalCap=10000000)=>{
  if(id!=='qa-g1') await db.query(`insert into nilaza_private.ai_budget_campaigns
   (id,policy_version,daily_cap_micro,total_cap_micro,eval_cap_micro,chat_daily,tarot_daily)
   values($1,$2,$3,$4,$5,5,1)`,[id,policy.version,daily,total,evalCap]);
  await db.query(`with t as(select clock_timestamp()-interval '1 minute' as start)
   update nilaza_private.ai_budget_campaigns set status='active',starts_at=t.start,ends_at=t.start+interval '14 days' from t where id=$1`,[id]);
 };
 const test=async(name,run)=>{await run();cases.push({name,status:'pass'});process.stdout.write('PASS '+name+'\n');};
 await test('approved policy seed disabled without activation date',async()=>{
  const c=(await db.query('select * from nilaza_private.ai_budget_campaigns')).rows[0];
  assert.equal(c.status,'disabled');assert.equal(c.starts_at,null);assert.equal(c.ends_at,null);
  assert.equal(Number(c.daily_cap_micro),policy.qaBudget.dailyMicroUSD);
  assert.equal(Number(c.total_cap_micro),policy.qaBudget.campaignMicroUSD);
  assert.equal(Number(c.eval_cap_micro),policy.qaBudget.evaluationMicroUSDWithinCampaign);
  assert.equal(c.chat_daily,policy.freeDaily.chatOracleShared);assert.equal(c.tarot_daily,policy.freeDaily.tarotOneCard);
  assert.equal((await reserve(spec())).code,'campaign_inactive'); await activate();
 });
 await test('five shared reservations; sixth blocked; serial duplicate replay never new hold',async()=>{
  const first=spec();assert.equal((await reserve(first)).status,'created');
  for(let i=0;i<20;i++)assert.equal((await reserve({...first,lease:crypto.randomUUID()})).status,'busy');
  for(let i=0;i<4;i++)assert.equal((await reserve(spec({feature:i%2?'persona_chat':'oracle_router'}))).status,'created');
  assert.equal((await reserve(spec())).code,'daily_quota_exhausted');
  const q=(await db.query("select * from nilaza_private.ai_quota_days where user_id=$1 and quota_group='chat_oracle'",[a])).rows[0];
  assert.equal(q.reserved_count,5);
  assert.equal((await reserve({...first,user:b})).code,'request_conflict');
  assert.equal((await reserve({...first,policy:null})).code,'invalid_spec');
  assert.equal((await claim(first,1,crypto.randomUUID())).ok,false);
  assert.equal((await finish(first)).ok,true);assert.equal((await finish(first)).ok,true);
  assert.equal((await reserve(first)).status,'failed');
  assert.equal((await reserve(spec())).status,'created');
 });
 await test('one-card Tarot quota; multi-card cannot use free policy',async()=>{
  assert.equal((await reserve(spec({feature:'tarot_reading',cards:3}))).code,'invalid_spec');
  const s=spec({feature:'tarot_reading',cards:1});assert.equal((await reserve(s)).status,'created');
  assert.equal((await reserve(spec({feature:'tarot_reading',cards:1}))).code,'daily_quota_exhausted');
  await finish(s);
 });
 await test('unknown primary and known fallback; owned persistence; idempotent settlement and replay',async()=>{
  const s=spec({user:b,bounds:[1000,2000]});assert.equal((await reserve(s)).status,'created');
  assert.equal((await claim(s)).ok,true);assert.equal((await claim(s)).ok,false);
  assert.equal((await claim(s,2)).ok,false);
  assert.equal((await receipt(s,1,-1,false)).ok,false);
  assert.equal((await receipt(s,1,null,false)).ok,true);assert.equal((await receipt(s,1,null,false)).ok,true);
  assert.equal((await receipt(s,1,0,false)).ok,false);
  assert.equal((await claim(s,2)).ok,true);await receipt(s,2,300,true);
  const wrong=crypto.randomUUID(),right=crypto.randomUUID();
  await db.query("insert into chat_messages values($1,$2,'guide'),($3,$4,'guide')",[wrong,a,right,b]);
  assert.equal((await finish(s,true,wrong)).ok,false);
  const f=await finish(s,true,right);assert.equal(f.status,'completed_pending_cost');assert.equal(f.heldMicro,1000);assert.equal(f.knownMicro,300);
  assert.equal((await finish(s,true,right)).ok,true);assert.equal((await finish(s,false)).ok,false);
  assert.deepEqual(await reserve(s),{status:'replay',resultId:right});assert.equal((await claim(s,2)).ok,false);
  const q=(await db.query("select * from nilaza_private.ai_quota_days where user_id=$1 and quota_group='chat_oracle'",[b])).rows[0];
  assert.equal(q.used_count,1);assert.equal(q.reserved_count,0);
 });
 await test('known failure refunds user turn; unknown failure retains money',async()=>{
  for(const cost of [200,null]){
   const s=spec({user:b});await reserve(s);await claim(s);await receipt(s,1,cost,false);
   const f=await finish(s);assert.equal(f.heldMicro,cost===null?1000:0);assert.equal(f.knownMicro,cost===null?0:200);
   assert.equal(f.status,cost===null?'failed_pending_cost':'failed');
  }
  const q=(await db.query("select * from nilaza_private.ai_quota_days where user_id=$1 and quota_group='chat_oracle'",[b])).rows[0];
  assert.equal(q.used_count,1);assert.equal(q.reserved_count,0);
 });
 await test('evaluation requires current role; role revocation stops dispatch',async()=>{
  assert.equal((await reserve(spec({user:b,audience:'evaluation'}))).code,'evaluation_forbidden');
  const s=spec({user:admin,audience:'evaluation'});assert.equal((await reserve(s)).status,'created');
  await db.query("update admin_role_assignments set status='revoked' where user_id=$1",[admin]);
  assert.equal((await claim(s)).ok,false);await finish(s);
  await db.query("update admin_role_assignments set status='active' where user_id=$1",[admin]);
 });
 for(const [name,daily,total,evalCap] of [['daily',1000,100000,100000],['campaign',100000,1000,100000],['evaluation',100000,100000,1000]]){
  await test(name+' budget includes outstanding holds',async()=>{
   await activate(name,daily,total,evalCap);
   const s=spec({user:admin,audience:'evaluation',campaign:name});assert.equal((await reserve(s)).status,'created');
   assert.equal((await reserve(spec({user:admin,audience:'evaluation',campaign:name}))).code,'qa_budget_exhausted');
   await claim(s);await receipt(s,1,null,false);await finish(s);
   assert.equal((await reserve(spec({user:admin,audience:'evaluation',campaign:name}))).code,'qa_budget_exhausted');
  });
 }
 await test('UTC+7 boundary and old-day reservation cannot dispatch',async()=>{
  const rows=(await db.query("select (t at time zone 'Asia/Ho_Chi_Minh')::date::text as day from unnest(array['2026-10-01 16:59:59+00'::timestamptz,'2026-10-01 17:00:00+00'::timestamptz]) t")).rows;
  assert.deepEqual(rows.map(r=>r.day),['2026-10-01','2026-10-02']);
  const s=spec({user:b});await reserve(s);
  // Fixture simulates a server-owned reservation from yesterday; no API accepts client time.
  await db.query("update nilaza_private.ai_usage_operations set usage_day=usage_day-1 where id=$1",[s.id]);
  assert.equal((await claim(s)).ok,false);
  await db.query("update nilaza_private.ai_usage_operations set usage_day=usage_day+1 where id=$1",[s.id]);await finish(s);
 });
 await test('customer execution and meter reads denied; forced RLS; invoker RPCs',async()=>{
  for(const role of ['anon','authenticated'])for(const sql of ["select * from nilaza_private.ai_usage_operations","select public.nilaza_ai_usage_claim(null,null,1)"]){
   await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role '+role);await tx.query(sql);}),/permission denied/);
  }
  const tables=(await db.query("select relrowsecurity,relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='nilaza_private' and c.relkind='r'")).rows;
  assert.equal(tables.length,5);assert.ok(tables.every(t=>t.relrowsecurity&&t.relforcerowsecurity));
  const funcs=(await db.query("select prosecdef,proconfig from pg_proc where proname like 'nilaza_ai_usage_%'")).rows;
  assert.equal(funcs.length,4);assert.ok(funcs.every(f=>!f.prosecdef&&f.proconfig.includes('search_path=""')));
 });
 await test('account deletion anonymizes operation; holds survive; no new dispatch',async()=>{
  const u=crypto.randomUUID();await db.query('insert into auth.users values($1)',[u]);
  const s=spec({user:u});await reserve(s);await claim(s);await receipt(s,1,null,false);
  await db.query('delete from auth.users where id=$1',[u]);
  assert.equal((await claim(s,2)).ok,false);assert.equal((await finish(s)).heldMicro,1000);
  assert.equal((await db.query('select user_id from nilaza_private.ai_usage_operations where id=$1',[s.id])).rows[0].user_id,null);
 });
 await test('actual excess recorded, campaign paused, no next dispatch',async()=>{
  await activate('overrun');const s=spec({user:admin,audience:'evaluation',campaign:'overrun',bounds:[1000,1000]});
  await reserve(s);await claim(s);assert.equal((await receipt(s,1,1500,false)).ok,true);
  assert.equal((await receipt(s,1,1500,false)).ok,true);assert.equal((await claim(s,2)).ok,false);
  const c=(await db.query("select * from nilaza_private.ai_budget_campaigns where id='overrun'")).rows[0];
  assert.equal(c.status,'paused');assert.equal(Number(c.overrun_micro),500);
  const f=await finish(s);assert.equal(f.knownMicro,1000);assert.equal(f.reportedKnownMicro,1500);assert.equal(f.overrunMicro,500);
  const d=(await db.query("select overrun_micro from nilaza_private.ai_budget_days where campaign_id='overrun'")).rows[0];assert.equal(Number(d.overrun_micro),500);
  assert.equal(Number((await db.query('select reported_micro from nilaza_private.ai_usage_attempts where operation_id=$1',[s.id])).rows[0].reported_micro),1500);
 });
 const report={status:'pass',executedAt:new Date().toISOString(),engine:(await db.query('select version() as version')).rows[0].version,
  runtime:'@electric-sql/pglite 0.5.8',migration,rawSha256:crypto.createHash('sha256').update(fs.readFileSync(migration)).digest('hex'),cases,
  limitations:['Single exclusive connection: serial idempotency/SQL/role fixtures, not distributed concurrency proof.','Synthetic auth and result tables; not full canonical migration replay or Supabase JWT/gateway proof.','Unapplied and disabled; current provider endpoints not wired.']};
 fs.writeFileSync('output/mvp-20261002/ai-usage-sql-results.json',JSON.stringify(report,null,2)+'\n');
 console.log(`${cases.length} PostgreSQL SQL cases passed.`);
} finally {await db.close();}
