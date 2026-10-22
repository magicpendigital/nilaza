import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '../output/mvp-20261002/quota-runtime/node_modules/@electric-sql/pglite/dist/index.js';
import { MODEL_ROUTE_PUBLISH_CONTRACT, modelRouteRpcPayload, publishModelRoute } from '../supabase/functions/admin-model-router-config/contract.ts';

const migration = 'supabase/migrations/20261014074711_model_route_publish_contract_v2.sql';
const lock = JSON.parse(fs.readFileSync('output/mvp-20261002/quota-runtime/package-lock.json', 'utf8'));
assert.equal(lock.packages['node_modules/@electric-sql/pglite'].version, '0.5.8');
assert.equal(lock.packages['node_modules/@electric-sql/pglite'].integrity, 'sha512-n9tsbUOhwx2epK1V0ZG9Ar4SHWUju04dhmzZXiSBXwBoleOvIfals33NAaWgagQVAL4Rbvx/Ptsu3P+pA09f6Q==');
const admin = randomUUID(), viewer = randomUUID();
const request = (overrides={}) => ({ contractVersion: MODEL_ROUTE_PUBLISH_CONTRACT, publishRequestId: randomUUID(), expectedActiveId: null,
  feature: 'tarot_reading', version: `qa-${randomUUID()}`, status: 'active', primary: {provider:'openai', model:'synthetic-model'},
  fallback: null, temperature: 0, maxTokens: 1300, responseSchema:'tarot_reading_v2', fallbackWhen:[], safetyPolicy:{allowRaw:false}, ...overrides });

async function fixture(run) {
 const db = await PGlite.create();
 try {
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema nilaza_private;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function public.is_admin() returns boolean language sql stable as $$ select auth.uid() = '${admin}'::uuid $$;
    create function nilaza_private.has_capability(capability text) returns boolean language sql stable as $$ select auth.uid() = '${admin}'::uuid $$;
    create table public.admin_audit_logs(id uuid default gen_random_uuid(),admin_user_id uuid,action text,target_table text,target_id uuid,metadata jsonb);
    grant usage on schema nilaza_private, auth to authenticated;
    grant execute on function auth.uid() to authenticated;
    insert into auth.users values('${admin}'),('${viewer}');`);
  await db.exec(fs.readFileSync('supabase/migrations/20260630000000_model_route_versions.sql','utf8'));
  await db.exec(migration && fs.readFileSync(migration,'utf8'));
  const rpc = (actor=admin) => ({rpc: async(name, args)=> {
    assert.equal(name,'publish_model_route_config');
    return db.transaction(async tx => {
      await tx.exec('set local role authenticated');
      await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[actor]);
      const result = await tx.query('select public.publish_model_route_config($1::jsonb) result',[args.config_input]);
      return {data:result.rows[0].result,error:null};
    });
  }});
  await run({db,rpc});
 } finally { await db.close(); }
}

test('exact Edge adapter publishes nested primary/fallback to SQL and preserves disabled policies', async()=>fixture(async({db,rpc})=>{
 const input=request(); const {data:first}=await publishModelRoute(rpc(),input);
 assert.equal(first.config.primary_model,input.primary.model); assert.equal(first.config.fallback_provider,null);
 assert.deepEqual(first.config.fallback_when,[]); assert.equal(Number(first.config.temperature),0);
 assert.deepEqual(first.config.safety_policy,{allowRaw:false});
 const {data:replay}=await publishModelRoute(rpc(),input); assert.equal(replay.id,first.id); assert.equal(replay.replayed,true);
 assert.equal((await db.query('select count(*)::int n from public.admin_audit_logs')).rows[0].n,1);
 await assert.rejects(publishModelRoute(rpc(),{...input,primary:{provider:'gemini',model:'changed'}}),e=>e.code==='23505');
 await assert.rejects(publishModelRoute(rpc(),request()),e=>e.code==='40001');
 const {data:second}=await publishModelRoute(rpc(),request({expectedActiveId:first.id,fallback:{provider:'gemini',model:'backup'}}));
 assert.equal(second.config.supersedes_version_id,first.id);
 assert.equal((await db.query("select count(*)::int n from model_route_versions where status='active'")).rows[0].n,1);
 const {data:oldReplay}=await publishModelRoute(rpc(),input); assert.equal(oldReplay.config.status,'archived');
 // Restoring a known-good configuration creates a new audited revision; never mutates old content.
 const {data:restored}=await publishModelRoute(rpc(),request({...input,version:'restored-v3',publishRequestId:randomUUID(),expectedActiveId:second.id}));
 assert.notEqual(restored.id,first.id);assert.equal(restored.config.fallback_provider,null);
 assert.equal(restored.config.supersedes_version_id,second.id);
 assert.equal((await db.query('select count(*)::int n from public.admin_audit_logs')).rows[0].n,3);
}));

test('SQL enforces authorization, conflict, atomic rollback and rejects old flat RPC calls',async()=>fixture(async({db,rpc})=>{
 await assert.rejects(publishModelRoute(rpc(viewer),request()),e=>e.code==='42501');
 const input=request(); const {data:first}=await publishModelRoute(rpc(),input);
 await assert.rejects(publishModelRoute(rpc(),request({expectedActiveId:first.id,version:input.version})),e=>e.code==='23505');
 assert.equal((await db.query('select status from model_route_versions where id=$1',[first.id])).rows[0].status,'active');
 await assert.rejects(rpc().rpc('publish_model_route_config',{config_input:{feature:'tarot_reading',primary_provider:'openai',primary_model:'old'}}),e=>e.code==='22023');
 await assert.rejects(rpc().rpc('publish_model_route_config',{config_input:{...modelRouteRpcPayload(request({expectedActiveId:first.id})),fallback:{provider:'openai'}}}),e=>e.code==='22023');
 const {data:draft}=await publishModelRoute(rpc(),request({expectedActiveId:first.id,status:'draft'}));
 assert.equal(draft.config.published_at,null);
 assert.equal((await db.query('select status from model_route_versions where id=$1',[first.id])).rows[0].status,'active');
 await assert.rejects(db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.exec("update model_route_versions set primary_model='bypass'")}),e=>e.code==='42501');
 assert.equal((await db.query("select has_function_privilege('anon','public.publish_model_route_config(jsonb)','execute') allowed")).rows[0].allowed,false);
}));

test('Edge input validation rejects absent revisions, unsupported pair, token coercion and legacy envelope',()=>{
 for(const input of [request({expectedActiveId:undefined}),request({publishRequestId:null}),request({fallback:undefined}),request({maxTokens:'800'}),request({feature:'face_reading'}),request({fallbackWhen:['bogus']}),request({contractVersion:'old'})]) assert.throws(()=>modelRouteRpcPayload(input));
});
