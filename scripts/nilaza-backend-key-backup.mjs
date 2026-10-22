import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {parseEnv} from 'node:util';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync,execFileSync} from 'node:child_process';
import {recoverFromHistory} from './nilaza-backend-key-history.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const refs=['etfajmrwyywokgafzxsb','akgrokwnkfqnfjqrildi'];
export const recipient='age1rekcyasv7rgg8k77wfuf0een6re6yy32exuzsw6qsxqhudawlycsxrhd74';
const root='C:/Users/Admin/AppData/Local/NilazaRecovery';
const work=path.join(root,'BackendBackups/nilaza-20261018');
const bundleFile=path.join(work,'nilaza-backend-api-20261018.age');
const downloaded=path.join(work,'downloaded-backend-api.age');
const identity=path.join(root,'RestoreTests/drive-owner-v1-20261018/downloaded-owner-v1.age');
const identityHash='4bb2563f9627d223ac9116e442a13bef5046aa4d6cbb87082a70581714d5718a';
const pinsFile=path.join(repo,'artifacts/backend-api-key-backup-2026-10-18/toolchain.json');
const wrapper=path.join(repo,'scripts/nilaza-backend-key-owner.ps1');
const age=path.join(repo,'.brand-work/drive-recovery-tools-2026-10-13/vendor/age/age.exe');
const ps='C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
const req=createRequire(path.join(repo,'node_modules/supabase/package.json'));
const cli=path.join(path.dirname(req.resolve('@supabase/cli-windows-x64/package.json')),'bin/supabase.exe');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const hashFile=f=>hash(fs.readFileSync(f));
const localPaths=['.env.local','supabase/.env.local','apps/admin/.env.local','apps/mobile/.env.local'];
const names=new Set('SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_PUBLISHABLE_KEY SUPABASE_SERVICE_ROLE_KEY SUPABASE_SECRET_KEY SUPABASE_DB_URL DATABASE_URL OPENAI_API_KEY OPENROUTER_API_KEY GEMINI_API_KEY ANTHROPIC_API_KEY LANGFUSE_PUBLIC_KEY LANGFUSE_SECRET_KEY LANGFUSE_BASE_URL LANGFUSE_OTLP_ENDPOINT LANGFUSE_UI_BASE_URL AI_TRACE_QA_ENCRYPTION_KEY TURNSTILE_SECRET_KEY NILAZA_E2E_EMAIL NILAZA_E2E_PASSWORD SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_PASSWORD SUPABASE_AUTH_SMTP_HOST SUPABASE_AUTH_SMTP_PORT SUPABASE_AUTH_SMTP_USER SUPABASE_AUTH_SMTP_PASS EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_ANON_KEY EXPO_PUBLIC_NILAZA_API_URL NILAZA_QA_SUPABASE_URL NILAZA_QA_SUPABASE_PUBLISHABLE_KEY'.split(' '));
let phase='CONTEXT';
function validValue(v){return typeof v==='string'&&Buffer.byteLength(v)>0&&Buffer.byteLength(v)<=16384&&!/^(?:your[-_ ]|replace[-_ ]|<|CHANGEME|TODO)/i.test(v);}
export function selectLocal(env){
  const entries=[];let excludedCount=0;
  for(const [name,value]of Object.entries(env)){
    if(!names.has(name)){excludedCount++;continue;}
    if(validValue(value))entries.push({name,value});
  }
  return {entries,excludedCount};
}
function jwtCheck(value,ref,role){
  if(!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value))throw Error('KEY_FORMAT');
  const payload=JSON.parse(Buffer.from(value.split('.')[1],'base64url'));
  if(payload.ref!==ref||payload.role!==role)throw Error('KEY_TARGET');
}
export function validateApiKeys(rows,ref){
  if(!refs.includes(ref)||!Array.isArray(rows)||rows.length>50)throw Error('KEY_LIST');
  const entries=[];
  for(const r of rows){
    if(r.disabled===true||r.revoked===true||r.invalidated_at)continue;
    const value=r.api_key??r.value;
    if(!validValue(value))throw Error('KEY_VALUE');
    let name;
    if(['anon','service_role'].includes(r.name)){
      jwtCheck(value,ref,r.name);name=r.name==='anon'?'SUPABASE_ANON_KEY':'SUPABASE_SERVICE_ROLE_KEY';
    }else if(['publishable','secret'].includes(r.type)){
      if(!(new RegExp('^sb_'+r.type+'_[A-Za-z0-9_-]{12,}$')).test(value))throw Error('KEY_FORMAT');
      name=r.type==='secret'?'SUPABASE_SECRET_KEY':'SUPABASE_PUBLISHABLE_KEY';
    }else throw Error('KEY_TYPE');
    entries.push({name,value});
  }
  if(!entries.length)throw Error('NO_KEYS');
  return entries;
}
export function compareDigest(digest,value){return typeof digest==='string'&&/^[a-f0-9]{64}$/i.test(digest)&&typeof value==='string'&&hash(Buffer.from(value))===digest.toLowerCase();}
export function recoverEdgeSecret(row,candidates){
  if(!names.has(row.name))throw Error('SECRET_NAME');
  const digest=row.digest??(/^[a-f0-9]{64}$/i.test(row.value??'')?row.value:null);
  if(row.digest!==undefined||digest!==null){
    if(typeof digest!=='string'||!/^[a-f0-9]{64}$/i.test(digest))return {entry:null,status:'UNSUPPORTED_DIGEST_ORIGINAL_REQUIRED'};
    const matched=candidates.find(e=>e.name===row.name&&compareDigest(digest,e.value));
    return {entry:matched?{name:matched.name,value:matched.value}:null,status:matched?'RECOVERED_VALUE_MATCHES_CLOUD_DIGEST':'DIGEST_ONLY_ORIGINAL_REQUIRED'};
  }
  if(!validValue(row.value))throw Error('SECRET_FORMAT');
  return {entry:{name:row.name,value:row.value},status:'CAPTURED_EXPORTABLE_VALUE'};
}
export function publicCoverage(sources){return sources.map(s=>({id:s.id,projectRef:s.projectRef,kind:s.kind,names:s.entries.map(e=>e.name)}));}
export function validateBundle(b){
  if(b?.schemaVersion!==1||b.kind!=='nilaza-backend-api-backup'||b.recipient!==recipient||!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(b.nonce)||!/^[a-f0-9-]+$/i.test(b.nonce)||!Array.isArray(b.sources)||b.sources.length<1||b.sources.length>16)throw Error('BUNDLE');
  const ids=new Set();
  for(const s of b.sources){
    if(!/^[a-z0-9-]{1,80}$/.test(s.id)||ids.has(s.id)||!['local-env','project-api','edge-secrets'].includes(s.kind)||(!refs.includes(s.projectRef)&&!(s.projectRef===null&&s.kind==='local-env'))||!Array.isArray(s.entries)||s.entries.length>100)throw Error('SOURCE');
    ids.add(s.id);
    for(const e of s.entries)if(!names.has(e.name)||!validValue(e.value)||Object.keys(e).some(k=>!['name','value'].includes(k)))throw Error('ENTRY');
    if(s.kind==='project-api')for(const e of s.entries){
      if(e.name==='SUPABASE_ANON_KEY'||e.name==='SUPABASE_SERVICE_ROLE_KEY')jwtCheck(e.value,s.projectRef,e.name==='SUPABASE_ANON_KEY'?'anon':'service_role');
      else if(e.name==='SUPABASE_SECRET_KEY'){if(!/^sb_secret_[A-Za-z0-9_-]{12,}$/.test(e.value))throw Error('API_ENTRY');}
      else if(e.name==='SUPABASE_PUBLISHABLE_KEY'){if(!/^sb_publishable_[A-Za-z0-9_-]{12,}$/.test(e.value))throw Error('API_ENTRY');}
      else throw Error('API_ENTRY');
    }
  }
  return b;
}
function checkContext(){
  const pins=JSON.parse(fs.readFileSync(pinsFile,'utf8'));
  if(pins.cliVersion!=='2.108.0'||req('./package.json').version!==pins.cliVersion)throw Error('CLI_CHANGED');
  for(const p of pins.files)if(hashFile(p.path)!==p.sha256)throw Error('TOOL_CHANGED');
  execFileSync(ps,['-NoProfile','-NonInteractive','-File',wrapper,'-Action','Check'],{stdio:['ignore','pipe','pipe'],windowsHide:true,timeout:30000});
  return hash(Buffer.from(JSON.stringify(pins)));
}
function readLocal(){
  const sources=[];let excludedCount=0;
  for(const [i,p]of localPaths.entries()){
    const file=path.join(repo,p);if(!fs.existsSync(file))continue;
    if(fs.lstatSync(file).isSymbolicLink()||fs.realpathSync.native(file).toLowerCase()!==path.resolve(file).toLowerCase()||fs.statSync(file).size>65536)throw Error('LOCAL_SOURCE');
    const bytes=fs.readFileSync(file);
    try{
      const selected=selectLocal(parseEnv(bytes.toString('utf8')));excludedCount+=selected.excludedCount;
      const refSet=new Set();
      for(const e of selected.entries){
        if(/(?:SUPABASE_URL|NILAZA_API_URL)$/.test(e.name)){
          const u=new URL(e.value);const ref=u.hostname.split('.')[0];
          if(u.protocol!=='https:'||!refs.includes(ref)||u.hostname!==ref+'.supabase.co'||u.username||u.password)throw Error('LOCAL_TARGET');refSet.add(ref);
        }
        if(['SUPABASE_ANON_KEY','EXPO_PUBLIC_SUPABASE_ANON_KEY','NILAZA_QA_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY'].includes(e.name)&&!e.value.startsWith('sb_publishable_')){
          const role=e.name==='SUPABASE_SERVICE_ROLE_KEY'?'service_role':'anon';
          const claims=JSON.parse(Buffer.from(e.value.split('.')[1]??'','base64url'));
          if(!refs.includes(claims.ref))throw Error('LOCAL_KEY_TARGET');jwtCheck(e.value,claims.ref,role);refSet.add(claims.ref);
        }
        if(['DATABASE_URL','SUPABASE_DB_URL'].includes(e.name)){
          const u=new URL(e.value);const matches=refs.filter(r=>u.hostname.split('.').includes(r)||u.username==='postgres.'+r);
          if(!['postgres:','postgresql:'].includes(u.protocol)||matches.length!==1)throw Error('LOCAL_DB_TARGET');refSet.add(matches[0]);
        }
      }
      if(refSet.size>1)throw Error('MIXED_LOCAL_TARGET');
      if(selected.entries.length)sources.push({id:'local-'+i,kind:'local-env',projectRef:[...refSet][0]??null,path:p,entries:selected.entries});
    }finally{bytes.fill(0);}
  }
  return {sources,excludedCount};
}
function rowsFrom(value){if(Array.isArray(value))return value;for(const k of ['data','api_keys','secrets','result'])if(Array.isArray(value?.[k]))return value[k];throw Error('CLI_SHAPE');}
function runCli(args){
  const env={...process.env};delete env.SUPABASE_CLI_BINARY_OVERRIDE;
  const r=spawnSync(cli,[...args,'--output','json','--log-level','none'],{stdio:['ignore','pipe','pipe'],env,windowsHide:true,timeout:45000,maxBuffer:1048576});
  try{if(r.error||r.status!==0)throw Error('CLI_READ_UNAVAILABLE');return rowsFrom(JSON.parse(r.stdout.toString('utf8')));}finally{r.stdout?.fill(0);r.stderr?.fill(0);}
}
async function collect(){
  const {sources,excludedCount}=readLocal();const coverage=[];const historyTargets=[];
  const localEntries=sources.flatMap(s=>s.entries);
  for(const ref of refs){
    try{const entries=validateApiKeys(runCli(['projects','api-keys','--project-ref',ref,'--reveal']),ref);sources.push({id:'api-'+ref,kind:'project-api',projectRef:ref,entries});coverage.push({projectRef:ref,category:'project-api',status:'CAPTURED',count:entries.length});}
    catch{coverage.push({projectRef:ref,category:'project-api',status:'UNAVAILABLE_AUTH_NETWORK_OR_FORMAT'});}
    try{
      const rows=runCli(['secrets','list','--project-ref',ref]);if(rows.length>200)throw Error('SECRETS_SIZE');
      const entries=[];let excluded=0;
      const candidates=[...localEntries,...sources.filter(s=>s.kind==='project-api'&&s.projectRef===ref).flatMap(s=>s.entries),{name:'SUPABASE_URL',value:'https://'+ref+'.supabase.co'}];
      for(const row of rows){
        if(!names.has(row.name)){excluded++;continue;}
        const recovered=recoverEdgeSecret(row,candidates);
        if(recovered.entry)entries.push(recovered.entry);
        coverage.push({projectRef:ref,category:'edge-secret',name:row.name,status:recovered.status});
        if(!recovered.entry){const digest=row.digest??row.value;if(/^[a-f0-9]{64}$/i.test(digest??''))historyTargets.push({projectRef:ref,name:row.name,digest});}
      }
      if(entries.length)sources.push({id:'edge-'+ref,kind:'edge-secrets',projectRef:ref,entries});
      coverage.push({projectRef:ref,category:'edge-inventory',status:'READ',allowlistedCount:rows.length-excluded,excludedCount:excluded});
    }catch{coverage.push({projectRef:ref,category:'edge-inventory',status:'UNAVAILABLE_AUTH_NETWORK_OR_FORMAT'});}
  }
  const history=await recoverFromHistory(historyTargets);
  const recoveredProvenance=[];
  for(const ref of refs){
    const entries=[];
    for(const m of history.matches.filter(m=>m.projectRef===ref)){
      // A historical foreign-project JWT is not rebound to this Nilaza target.
      if(['SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'].includes(m.name)){
        try{jwtCheck(m.value,ref,m.name==='SUPABASE_ANON_KEY'?'anon':'service_role');}catch{
          const c=coverage.find(c=>c.projectRef===ref&&c.name===m.name);if(c)c.status='HISTORY_MATCH_WRONG_PROJECT_REJECTED';continue;
        }
      }
      entries.push({name:m.name,value:m.value});recoveredProvenance.push({projectRef:ref,name:m.name,threadId:m.threadId});
      const c=coverage.find(c=>c.projectRef===ref&&c.name===m.name);if(c)c.status='HISTORY_VALUE_MATCHES_CLOUD_DIGEST';
    }
    if(entries.length)sources.push({id:'history-'+ref,kind:'edge-secrets',projectRef:ref,entries});
  }
  return {sources,coverage,excludedLocalVariableCount:excludedCount,history:{scannedFiles:history.scannedFiles,candidateCount:history.candidateCount,scannedBytes:history.scannedBytes??0,eligibleFiles:history.eligibleFiles??0,missingFiles:history.missingFiles??0,limited:history.limited??false,recoveredProvenance}};
}
function writeNew(file,obj){fs.writeFileSync(file,JSON.stringify(obj,null,2)+'\n',{flag:'wx'});}
async function encrypt(payload,file){
  const fd=fs.openSync(file,'wx');
  try{await new Promise((resolve,reject)=>{
    const c=spawn(age,['--encrypt','--recipient',recipient],{stdio:['pipe',fd,'pipe'],windowsHide:true});
    const timer=setTimeout(()=>{c.kill();reject(Error('ENCRYPT_TIMEOUT'));},45000);
    c.stderr.resume();c.stdin.on('error',()=>{});c.on('error',()=>{clearTimeout(timer);reject(Error('ENCRYPT'));});
    c.on('close',code=>{clearTimeout(timer);code===0?resolve():reject(Error('ENCRYPT'));});c.stdin.end(payload);
  });fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
}
async function decrypt(){return await new Promise((resolve,reject)=>{
  const parts=[];let size=0;const c=spawn(age,['--decrypt','--identity',identity,downloaded],{stdio:['inherit','pipe','inherit'],windowsHide:false});
  c.on('error',()=>reject(Error('DECRYPT')));c.stdout.on('data',b=>{size+=b.length;parts.push(b);if(size>2097152)c.kill();});
  c.on('close',code=>{if(code!==0||size>2097152){parts.forEach(b=>b.fill(0));reject(Error('DECRYPT'));return;}const b=Buffer.concat(parts);parts.forEach(x=>x.fill(0));resolve(b);});
});}
function readBackup(){const m=JSON.parse(fs.readFileSync(path.join(work,'backup.json'),'utf8'));if(m.status!=='BACKEND_API_ENCRYPTED'||m.ciphertextSha256!==hashFile(bundleFile)||m.ciphertextBytes!==fs.statSync(bundleFile).size||m.recipient!==recipient)throw Error('RECEIPT');return m;}
async function main(action){
  if(!['probe','backup','restore','inspect'].includes(action))throw Error('ACTION');
  if(action==='restore'&&(!process.stdin.isTTY||!process.stdout.isTTY||!process.stderr.isTTY))throw Error('PRIVATE_CONSOLE_REQUIRED');
  const toolchainSha256=checkContext();
  if(action==='inspect'){
    const m=readBackup();const file=path.join(work,'restore.json');
    if(fs.existsSync(file)){const r=JSON.parse(fs.readFileSync(file,'utf8'));if(r.status!=='BACKEND_API_DRIVE_RESTORE_VERIFIED'||r.ciphertextSha256!==m.ciphertextSha256||r.payloadSha256!==m.payloadSha256||r.backupToolchainSha256!==m.toolchainSha256||r.toolchainSha256!==toolchainSha256||hashFile(downloaded)!==m.ciphertextSha256)throw Error('RESTORE_RECEIPT');console.log(JSON.stringify(r));}
    else console.log(JSON.stringify(m));return;
  }
  if(action==='probe'||action==='backup'){
    if(action==='backup')for(const f of [bundleFile,bundleFile+'.partial',path.join(work,'backup.json')])if(fs.existsSync(f))throw Error('PRIOR_BACKUP_PRESERVED');
    phase='COLLECT_EXISTING_VALUES';const collected=await collect();
    if(action==='backup'&&collected.coverage.some(c=>c.status==='UNAVAILABLE_AUTH_NETWORK_OR_FORMAT')){phase='CLOUD_READ_INCOMPLETE';throw Error('CLOUD_READ_INCOMPLETE');}
    const summary={sources:publicCoverage(collected.sources),cloudCoverage:collected.coverage,excludedLocalVariableCount:collected.excludedLocalVariableCount,history:collected.history};
    if(action==='probe'){console.log(JSON.stringify({status:'BACKEND_API_PROBE',...summary,secretValuesPrinted:false}));return;}
    const b=validateBundle({schemaVersion:1,kind:'nilaza-backend-api-backup',recipient,nonce:crypto.randomUUID(),createdAt:new Date().toISOString(),sources:collected.sources});
    const payload=Buffer.from(JSON.stringify(b));const payloadSha256=hash(payload);
    phase='ENCRYPT_EXISTING_VALUES';try{await encrypt(payload,bundleFile+'.partial');}finally{payload.fill(0);}
    const header=fs.readFileSync(bundleFile+'.partial').subarray(0,256).toString('ascii');if(!header.startsWith('age-encryption.org/v1')||!header.includes('-> X25519 '))throw Error('CIPHERTEXT');
    fs.renameSync(bundleFile+'.partial',bundleFile);
    const m={schemaVersion:1,status:'BACKEND_API_ENCRYPTED',createdAt:new Date().toISOString(),recipient,ciphertextSha256:hashFile(bundleFile),ciphertextBytes:fs.statSync(bundleFile).size,payloadSha256,toolchainSha256,...summary,plaintextStored:false,passwordCaptured:false,providerValidity:'NOT_TESTED',completeBackendCoverage:'NOT_ESTABLISHED',restoreFromDrive:'PENDING',offMachineRecoveryVerified:false,managedRecovery:'BLOCKED'};
    for(const s of b.sources)for(const e of s.entries)e.value=null;
    writeNew(path.join(work,'backup.json'),m);console.log(JSON.stringify(m));return;
  }
  phase='VERIFY_DOWNLOAD';const m=readBackup();const d=JSON.parse(fs.readFileSync(path.join(work,'download.json'),'utf8'));
  if(d.status!=='BACKEND_API_DOWNLOAD_VERIFIED'||d.sha256!==m.ciphertextSha256||hashFile(downloaded)!==m.ciphertextSha256||hashFile(identity)!==identityHash||fs.existsSync(path.join(work,'restore.json')))throw Error('DOWNLOAD');
  phase='OWNER_DECRYPT';const bytes=await decrypt();let b;
  try{
    if(hash(bytes)!==m.payloadSha256)throw Error('PAYLOAD_HASH');b=validateBundle(JSON.parse(bytes.toString('utf8')));
    if(JSON.stringify(publicCoverage(b.sources))!==JSON.stringify(m.sources))throw Error('COVERAGE');
    const r={schemaVersion:1,status:'BACKEND_API_DRIVE_RESTORE_VERIFIED',verifiedAt:new Date().toISOString(),recipient,ciphertextSha256:m.ciphertextSha256,payloadSha256:m.payloadSha256,backupToolchainSha256:m.toolchainSha256,toolchainSha256,sources:m.sources,downloadedCiphertextUsed:true,plaintextStored:false,passwordCaptured:false,providerValidity:'NOT_TESTED',completeBackendCoverage:'NOT_ESTABLISHED',testScope:'Same Windows machine; downloaded encrypted bundle and downloaded encrypted recovery identity; no live restore',offMachineRecoveryVerified:false,managedRecovery:'BLOCKED'};
    writeNew(path.join(work,'restore.json'),r);console.log(JSON.stringify(r));
  }finally{bytes.fill(0);if(b)for(const s of b.sources)for(const e of s.entries)e.value=null;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv[2]).catch(e=>{const safe=new Set(['HISTORY_PATH','HISTORY_LIMIT','CANDIDATE_LIMIT','LOCAL_SOURCE','LOCAL_TARGET','LOCAL_KEY_TARGET','LOCAL_DB_TARGET','MIXED_LOCAL_TARGET','KEY_TARGET','CLOUD_READ_INCOMPLETE','TOOL_CHANGED','PRIOR_BACKUP_PRESERVED']);console.log(JSON.stringify({status:'BACKEND_API_STEP_NOT_COMPLETED',phase,reason:safe.has(e.message)?e.message:'FIXED_FAILURE'}));process.exitCode=1;});
