// Fixed synthetic fixture only. No cloud connections, passwords or real identities.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {NativePostgres} from './native-postgres-rehearsal.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));process.chdir(root);
assert.equal(process.argv.length,2,'Fixed synthetic rehearsal accepts no arguments');
const output='artifacts/drive-recovery-setup-2026-10-13';
const prior='artifacts/singapore-waitlist-acceptance-2026-10-11';
const vendor=JSON.parse(fs.readFileSync(output+'/vendor-tool.json'));
const baseline=JSON.parse(fs.readFileSync(prior+'/native-rehearsal.json'));
const expected=JSON.parse(fs.readFileSync(prior+'/native-restore-invariants.json'));
const source=fs.readFileSync(prior+'/native-synthetic.dump');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(baseline.status,'PASS');assert.equal(baseline.syntheticOnly,true);assert.equal(baseline.remoteSqlWrites,false);
assert.equal(sha(source),'aa9c9c5148da259c5c3f5f2904f0724860319d5db2d4f6a972cbb49a062cb578');
assert.equal(sha(source),baseline.restore.sha256);assert.equal(sha(Buffer.from(JSON.stringify(expected))),baseline.restore.invariantsSha256);
for(const bin of [vendor.age,vendor.keygen])assert.equal(sha(fs.readFileSync(bin.path)),bin.sha256,'Vendor binary drift');
const age=path.resolve(vendor.age.path),keygen=path.resolve(vendor.keygen.path);
const run=(exe,args,input)=>spawnSync(exe,args,{input,encoding:null,windowsHide:true,timeout:45000,maxBuffer:64*1024*1024});
const okay=r=>{assert.equal(r.error,undefined,'Vendor process start error');assert.equal(r.status,0,'Vendor process rejected fixture');return r.stdout;};
const snapshots=async db=>{
 const tables=(await db.query("select table_schema,table_name from information_schema.tables where table_schema in ('public','nilaza_private') and table_type='BASE TABLE' order by table_schema,table_name")).rows;
 const counts=[];for(const {table_schema:schema,table_name:table} of tables){const row=(await db.query(`select count(*)::int as n,md5(coalesce(string_agg(row_to_json(t)::text,'|' order by row_to_json(t)::text),'')) as rows_digest from "${schema}"."${table}" t`)).rows[0];counts.push({schema,table,...row});}
 const policies=(await db.query("select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname in ('public','nilaza_private') order by schemaname,tablename,policyname")).rows;
 const schema=(await db.query("select table_schema,table_name,column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema in ('public','nilaza_private') order by table_schema,table_name,ordinal_position")).rows;
 const indexes=(await db.query("select schemaname,tablename,indexname,indexdef from pg_indexes where schemaname in ('public','nilaza_private') order by schemaname,tablename,indexname")).rows;
 const tableGrants=(await db.query("select n.nspname,c.relname,c.relrowsecurity,pg_get_userbyid(c.relowner) as owner,c.relacl::text as acl from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','nilaza_private') and c.relkind in ('r','v','S','p') order by n.nspname,c.relname")).rows;
 const functions=(await db.query("select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as args,p.prosecdef,p.proconfig,p.proacl::text as acl,pg_get_userbyid(p.proowner) as owner,md5(pg_get_functiondef(p.oid)) as definition_digest from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','nilaza_private','auth') and p.prokind in ('f','p') order by n.nspname,p.proname,args")).rows;
 const defaultGrants=(await db.query("select pg_get_userbyid(d.defaclrole) as owner,coalesce(n.nspname,'*') as schema,d.defaclobjtype,d.defaclacl::text as acl from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace order by owner,schema,d.defaclobjtype")).rows;
 return {counts,policies,schema,indexes,tableGrants,functions,defaultGrants};
};
const roleQuery=(db,id,sql,params=[])=>db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:id,role:'authenticated',app_metadata:{role:'owner'}})]);return tx.query(sql,params);});
const checks=[];const pass=name=>{checks.push({name,status:'PASS'});console.log('PASS '+name);};
let first,restored,identity,otherIdentity,fresh,plaintext;
const receipt={schemaVersion:1,status:'BLOCKED',startedAt:new Date().toISOString(),syntheticOnly:true,cloudSqlWrites:false,sourceArchiveSha256:sha(source),migrationSetSha256:baseline.migrationSetSha256,toolVersion:vendor.version,checks,ownerIdentityUsed:false,ownerPassphraseUsed:false,managedRecovery:'BLOCKED'};
try{
 first=await NativePostgres.create({loadDataDir:new Blob([source]),artifactDirectory:output});
 assert.deepEqual(await snapshots(first),expected);pass('fixed canonical28 fixture provenance and restore invariants');
 const email='recovery@fixture.example',emailHash=sha(Buffer.from(email));
 const signup=locale=>first.transaction(async tx=>{await tx.exec('set local role service_role');await tx.query('select public.register_marketing_waitlist_request($1,$2,$3,$4,$5::jsonb,$6,$7)',[email,emailHash,locale,'astrology','{}','waitlist-prelaunch-2026-10-11','nilaza-web']);});
 await signup('vi');await signup('en');await first.query("update marketing_waitlist set status='unsubscribed' where email_hash=$1",[emailHash]);await first.exec("insert into marketing_suppressions(waitlist_id,reason) select id,'unsubscribe' from marketing_waitlist");await signup('vi');
 const before=await snapshots(first);fresh=Buffer.from(await (await first.dumpDataDir()).arrayBuffer());
 const generated=run(keygen,[],undefined);identity=okay(generated);const recipient=okay(run(keygen,['-y'],identity)).toString('utf8').trim();assert.match(recipient,/^age1[0-9a-z]{58}$/);
 const cipherPath=path.resolve(output+'/synthetic-canonical28.dump.age');assert.equal(fs.existsSync(cipherPath),false,'Never overwrite previous rehearsal');
 okay(run(age,['-r',recipient,'-o',cipherPath],fresh));const cipher=fs.readFileSync(cipherPath);
 receipt.backup={path:path.relative(root,cipherPath).replaceAll('\\','/'),sha256:sha(cipher),md5:crypto.createHash('md5').update(cipher).digest('hex'),encryptedBytes:cipher.length,plaintextSha256:sha(fresh),plaintextBytes:fresh.length,testIdentityRetained:false};pass('public-recipient encryption; no plaintext dump written');
 plaintext=okay(run(age,['-d','-i','-',cipherPath],identity));assert.equal(sha(plaintext),sha(fresh));pass('complete authenticated decryption reproduces snapshot before restore');
 otherIdentity=okay(run(keygen,[],undefined));const denied=run(age,['-d','-i','-',cipherPath],otherIdentity);assert.notEqual(denied.status,0);denied.stdout?.fill(0);pass('wrong identity rejected before restore');
 const scratch=path.resolve('.brand-work/drive-recovery-tools-2026-10-13/negative-fixtures');fs.mkdirSync(scratch,{recursive:true});
 for(const [name,bytes] of [['changed ciphertext',Buffer.from(cipher)],['truncated file',cipher.subarray(0,cipher.length-17)]]){
  if(name==='changed ciphertext')bytes[bytes.length-1]^=1;
  const file=path.join(scratch,name.replaceAll(' ','-')+'.age');fs.writeFileSync(file,bytes);
  const fail=run(age,['-d','-i','-',file],identity);assert.notEqual(fail.status,0);fail.stdout?.fill(0);pass(name+' rejected before database creation');
 }
 const start=performance.now();restored=await NativePostgres.create({loadDataDir:new Blob([plaintext]),artifactDirectory:output});assert.deepEqual(await snapshots(restored),before);pass('encrypted backup restores all rows/schema/indexes/grants/functions/policies');
 const users=(await restored.query('select user_id from journal_entries order by user_id')).rows;assert.equal(users.length,2);
 for(const x of users){const rows=(await roleQuery(restored,x.user_id,'select user_id from journal_entries')).rows;assert.equal(rows.length,1);assert.equal(rows[0].user_id,x.user_id);}pass('ordinary A/B isolation survives encrypted restore');
 const revoked=(await restored.query("select user_id from admin_role_assignments where status='revoked' limit 1")).rows[0];assert.ok(revoked);assert.equal((await roleQuery(restored,revoked.user_id,"select has_admin_capability('content.read') as allowed")).rows[0].allowed,false);pass('revoked staff remains denied with forged owner claim');
 const marketing=(await restored.query("select (select count(*) from marketing_waitlist)::int as contacts,(select count(*) from marketing_consent_events)::int as consents,(select count(*) from marketing_suppressions)::int as suppressions,(select status from marketing_waitlist limit 1) as contact_status")).rows[0];assert.deepEqual(marketing,{contacts:1,consents:3,suppressions:1,contact_status:'unsubscribed'});receipt.marketingCounts=marketing;pass('consent/duplicate/unsubscribe/suppression survive encrypted restore');
 assert.ok(!(await restored.query("select extname from pg_extension where extname in ('pg_cron','pg_net')")).rows.length);assert.ok((await restored.query('select status from nilaza_private.ai_budget_campaigns')).rows.every(x=>x.status==='disabled'));pass('outbound cron/net and AI campaign remain disabled');
 receipt.restore={status:'PASS',elapsedMs:Math.round(performance.now()-start),tables:before.counts.length,policies:before.policies.length,functions:before.functions.length,invariantsSha256:sha(Buffer.from(JSON.stringify(before)))};
 receipt.status='PASS';
}catch(e){receipt.status='FAIL';receipt.error={code:e.code??null,message:String(e.message).replace(/AGE-SECRET-KEY-[A-Z0-9-]+/g,'[REDACTED]').slice(0,300)};console.log('Synthetic recovery failed; see sanitized receipt');}
finally{
 for(const b of [identity,otherIdentity,fresh,plaintext])b?.fill(0);
 for(const db of [restored,first])if(db)await db.close();
 for(const db of NativePostgres.created)await db.close();
 receipt.containers=NativePostgres.created.map(x=>({...x.isolation,stopped:x.stopped}));receipt.finishedAt=new Date().toISOString();
 fs.writeFileSync(output+'/synthetic-recovery.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({status:receipt.status,checks:checks.length,artifact:output+'/synthetic-recovery.json'}));process.exitCode=receipt.status==='PASS'?0:1;
}
