import { PGlite } from '../output/mvp-20261002/quota-runtime/node_modules/@electric-sql/pglite/dist/index.js';
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';

test('feedback receipt, auth, privacy, triage and retention SQL executes with real PostgreSQL semantics', async () => {
  const lock=JSON.parse(fs.readFileSync('output/mvp-20261002/quota-runtime/package-lock.json','utf8'));
  assert.equal(lock.packages['node_modules/@electric-sql/pglite'].version,'0.5.8');
  assert.equal(lock.packages['node_modules/@electric-sql/pglite'].integrity,'sha512-n9tsbUOhwx2epK1V0ZG9Ar4SHWUju04dhmzZXiSBXwBoleOvIfals33NAaWgagQVAL4Rbvx/Ptsu3P+pA09f6Q==');
  const db=await PGlite.create();
  const a=crypto.randomUUID(),b=crypto.randomUUID(),reviewer=crypto.randomUUID(),editor=crypto.randomUUID(),anonymous=crypto.randomUUID();
  const cases=[];
  const check=async(name,fn)=>{await fn();cases.push(name);};
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema nilaza_private; grant usage on schema auth,nilaza_private to authenticated;
      create table auth.users(id uuid primary key,is_anonymous boolean not null default false);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table public.admin_role_assignments(user_id uuid,role text,status text);
      create function nilaza_private.has_capability(text) returns boolean language sql stable security definer as $$
        select exists(select 1 from public.admin_role_assignments where user_id=auth.uid() and role in ('owner','admin','safety_reviewer') and status='active')$$;
      create table public.admin_audit_logs(id uuid default gen_random_uuid(),admin_user_id uuid,action text,target_table text,target_id uuid,metadata jsonb);`);
    await db.query('insert into auth.users(id) values($1),($2),($3),($4),($5)',[a,b,reviewer,editor,anonymous]);
    await db.query('update auth.users set is_anonymous=true where id=$1',[anonymous]);
    await db.query("insert into admin_role_assignments values($1,'safety_reviewer','active'),($2,'editor','active')",[reviewer,editor]);
    const migration='supabase/migrations/20261014080754_ai_feedback_receipts_v1.sql';
    await db.exec(fs.readFileSync(migration,'utf8'));
    const as=async(role,user,sql,args=[])=>db.transaction(async tx=>{
      await tx.exec('set local role '+role);
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user??'']);
      return (await tx.query(sql,args)).rows;
    });
    const rpc=async(role,user,name,args=[]) => (await as(role,user,`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as result`,args))[0].result;
    const metadata={feature:'tarot_reading',locale:'vi',interactionId:'interaction-1',attemptId:'attempt-1',clientRequestId:'request-1',sourceKind:'ai',validationStatus:'validated',persistenceStatus:'stored',promptVersionId:'local:tarot_reading_system@2026-10-14:vi',routeVersion:'route-v2',traceId:'trace-unverified',promptAssemblyVersion:'v1'};
    let receipt;
    await check('service-only immutable receipts; no direct client forgery or raw payload',async()=>{
      receipt=await rpc('service_role',null,'record_ai_answer_receipt',[a,metadata,['card-1','overall']]);
      assert.match(receipt.receiptId,/^[0-9a-f-]{36}$/);
      assert.deepEqual(await rpc('service_role',null,'record_ai_answer_receipt',[a,metadata,['card-1','overall']]),receipt);
      await assert.rejects(rpc('service_role',null,'record_ai_answer_receipt',[a,{...metadata,routeVersion:'changed'},['card-1','overall']]),/answer_receipt_conflict/);
      await assert.rejects(rpc('service_role',null,'record_ai_answer_receipt',[a,{...metadata,attemptId:'attempt-raw',note:'private'},[]]),/invalid_answer_receipt/);
      for(const role of ['anon','authenticated']) {
        await assert.rejects(rpc(role,a,'record_ai_answer_receipt',[a,metadata,[]]),/permission denied/);
        await assert.rejects(as(role,a,'select * from nilaza_private.ai_answer_receipts'),/permission denied/);
      }
      await assert.rejects(as('service_role',null,"update nilaza_private.ai_answer_receipts set metadata='{}'"),/permission denied/);
    });
    const payload=(extra={})=>({schemaVersion:'ai-feedback-v1',clientFeedbackId:crypto.randomUUID(),feature:'tarot_reading',localAnswerId:'request-1',category:'too_generic',language:'vi',...extra});
    let submitted,ack;
    await check('receipt ownership, category/section and payload allowlist; identical retry returns original receipt',async()=>{
      submitted=payload({answerReceiptId:receipt.receiptId,sectionId:'card-1',sourceKind:'mock'});
      ack=await rpc('authenticated',a,'submit_ai_feedback',[submitted]);
      assert.equal(ack.correlationStatus,'verified_server');
      assert.deepEqual(await rpc('authenticated',a,'submit_ai_feedback',[submitted]),ack);
      await assert.rejects(rpc('authenticated',a,'submit_ai_feedback',[{...submitted,category:'technical'}]),/feedback_conflict/);
      await assert.rejects(rpc('authenticated',b,'submit_ai_feedback',[payload({answerReceiptId:receipt.receiptId})]),/answer_receipt_unavailable/);
      await assert.rejects(rpc('authenticated',a,'submit_ai_feedback',[payload({answerReceiptId:receipt.receiptId,feature:'astrology_insight'})]),/answer_receipt_unavailable/);
      await assert.rejects(rpc('authenticated',a,'submit_ai_feedback',[payload({answerReceiptId:receipt.receiptId,localAnswerId:'other-answer'})]),/answer_receipt_unavailable/);
      await assert.rejects(rpc('authenticated',a,'submit_ai_feedback',[payload({answerReceiptId:receipt.receiptId,language:'en'})]),/answer_receipt_unavailable/);
      await assert.rejects(rpc('authenticated',a,'submit_ai_feedback',[payload({answerReceiptId:receipt.receiptId,sectionId:'invented'})]),/invalid_feedback/);
      for(const extra of [{note:'private'},{sectionId:'raw user words'},{sourceKind:null},{category:null},{clientFeedbackId:'not-a-uuid'}])
        await assert.rejects(rpc('authenticated',a,'submit_ai_feedback',[payload(extra)]),/invalid_feedback/);
      await assert.rejects(rpc('authenticated',anonymous,'submit_ai_feedback',[payload()]),/authentication_required/);
      await assert.rejects(rpc('authenticated',null,'submit_ai_feedback',[payload()]),/authentication_required/);
      await assert.rejects(rpc('anon',null,'submit_ai_feedback',[payload()]),/permission denied/);
    });
    await check('unverified legacy feedback never receives invented server metadata',async()=>{
      const item=await rpc('authenticated',b,'submit_ai_feedback',[payload({sourceKind:'ai'})]);
      assert.equal(item.correlationStatus,'unverified_client');
      const inbox=await rpc('authenticated',reviewer,'get_ai_feedback_inbox',[100,null,null]);
      const verified=inbox.find(x=>x.feedbackId===ack.feedbackId);
      assert.equal(verified.serverReceipt.metadata.sourceKind,'ai');
      assert.equal(verified.submitted.sourceKind,'mock');
      assert.equal(verified.traceOrigin,'unverified');
      assert.ok(!JSON.stringify(inbox).includes(a));
      assert.equal(inbox.find(x=>x.feedbackId===item.feedbackId).serverReceipt,null);
    });
    await check('review permission, optimistic revision, audit-only metadata and revocation',async()=>{
      await assert.rejects(rpc('authenticated',editor,'get_ai_feedback_inbox'),/Not authorized/);
      await assert.rejects(rpc('authenticated',b,'review_ai_feedback',[ack.feedbackId,1,'resolved']),/Not authorized/);
      const review=await rpc('authenticated',reviewer,'review_ai_feedback',[ack.feedbackId,1,'investigating']);
      assert.equal(review.revision,2);
      await assert.rejects(rpc('authenticated',reviewer,'review_ai_feedback',[ack.feedbackId,1,'resolved']),/feedback_review_conflict/);
      const audit=(await db.query('select metadata from admin_audit_logs')).rows;
      assert.deepEqual(audit.map(x=>x.metadata),[{status:'investigating',revision:2}]);
      await db.query("update admin_role_assignments set status='revoked' where user_id=$1",[reviewer]);
      await assert.rejects(rpc('authenticated',reviewer,'get_ai_feedback_inbox'),/Not authorized/);
      await db.query("update admin_role_assignments set status='active' where user_id=$1",[reviewer]);
    });
    await check('20/hour cap is serially idempotent; duplicate bypasses cap without adding rows',async()=>{
      for(let i=1;i<20;i++)await rpc('authenticated',a,'submit_ai_feedback',[payload()]);
      await assert.rejects(rpc('authenticated',a,'submit_ai_feedback',[payload()]),/feedback_rate_limited/);
      assert.deepEqual(await rpc('authenticated',a,'submit_ai_feedback',[submitted]),ack);
    });
    await check('own export/delete cannot access another owner; expired reads and actual purge',async()=>{
      const exported=await rpc('authenticated',b,'export_own_ai_feedback');
      assert.equal(exported.length,1);
      assert.equal(await rpc('authenticated',b,'delete_own_ai_feedback',[ack.feedbackId]),0);
      assert.equal(await rpc('authenticated',b,'delete_own_ai_feedback',[exported[0].feedbackId]),1);
      assert.equal((await rpc('authenticated',b,'export_own_ai_feedback')).length,0);
      await db.query("update nilaza_private.ai_feedback set expires_at=now()-interval '1 minute' where id=$1",[ack.feedbackId]);
      await db.query("update nilaza_private.ai_answer_receipts set expires_at=now()-interval '1 minute' where id=$1",[receipt.receiptId]);
      assert.equal((await rpc('authenticated',a,'export_own_ai_feedback')).length,19);
      assert.ok(!(await rpc('authenticated',reviewer,'get_ai_feedback_inbox')).some(x=>x.feedbackId===ack.feedbackId));
      await assert.rejects(rpc('authenticated',a,'prune_ai_feedback_data'),/permission denied/);
      const purged=await rpc('service_role',null,'prune_ai_feedback_data');
      assert.deepEqual(purged,{feedbackDeleted:1,receiptsDeleted:1});
      await rpc('service_role',null,'record_ai_answer_receipt',[a,{...metadata,attemptId:'delete-all-a'},[]]);
      await rpc('service_role',null,'record_ai_answer_receipt',[b,{...metadata,attemptId:'delete-all-b'},[]]);
      assert.equal(await rpc('authenticated',a,'delete_own_ai_feedback',[null]),19);
      assert.equal((await db.query('select count(*)::int n from nilaza_private.ai_answer_receipts where user_id=$1',[a])).rows[0].n,0);
      assert.equal((await db.query('select count(*)::int n from nilaza_private.ai_answer_receipts where user_id=$1',[b])).rows[0].n,1);
    });
    await check('account delete cascades receipts and feedback; no client direct feedback table access',async()=>{
      const r=await rpc('service_role',null,'record_ai_answer_receipt',[b,{...metadata,attemptId:'attempt-2'},[]]);
      await rpc('authenticated',b,'submit_ai_feedback',[payload({answerReceiptId:r.receiptId})]);
      await db.query('delete from auth.users where id=$1',[b]);
      assert.equal((await db.query('select count(*)::int n from nilaza_private.ai_feedback where user_id=$1',[b])).rows[0].n,0);
      assert.equal((await db.query('select count(*)::int n from nilaza_private.ai_answer_receipts where user_id=$1',[b])).rows[0].n,0);
      await assert.rejects(as('authenticated',a,'select * from nilaza_private.ai_feedback'),/permission denied/);
      const rows=(await db.query("select relrowsecurity,relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='nilaza_private' and c.relkind='r'")).rows;
      assert.ok(rows.every(x=>x.relrowsecurity&&x.relforcerowsecurity));
    });
    fs.mkdirSync('artifacts/ai-operations-2026-10-14',{recursive:true});
    fs.writeFileSync('artifacts/ai-operations-2026-10-14/feedback-sql-results.json',JSON.stringify({status:'pass',migration,cases,engine:(await db.query('select version() as value')).rows[0].value,limitations:['Synthetic auth schema and single PGlite connection; not deployed Supabase JWT or multi-process concurrency evidence.','Purge function executes locally; remote scheduling remains unverified and no raw capture enabled.']},null,2)+'\n');
  } finally { await db.close(); }
});
