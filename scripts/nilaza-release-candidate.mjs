import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Preparation inventory only. Never read Git object contents: historical browser
// profiles and generated exports can be tracked even when they are now ignored.
export const TARGET = Object.freeze({id:'nilaza-singapore-prelaunch-qa',kind:'staging',organizationId:'drxbmvimiekeoeesgssp',projectRef:'etfajmrwyywokgafzxsb'});
export const ROOTS = [
  'AGENTS.md','DESIGN.md','README.md','package.json','package-lock.json','deno.lock','tsconfig.json','.gitignore','.easignore',
  '.github/workflows','apps/mobile/src','apps/mobile/assets','apps/mobile/android',
  ...['App.tsx','app.json','package.json','index.js','metro.config.js','babel.config.js','tsconfig.json','eas.json','.easignore','jest.config.js','jest.setup.js','jest.bridge-setup.js'].map(p=>`apps/mobile/${p}`),
  'apps/admin','apps/web/src','apps/web/public',
  ...['package.json','astro.config.mjs','tsconfig.json'].map(p=>`apps/web/${p}`),
  'packages','scripts','skills','docs','assets','supabase/functions','supabase/migrations','supabase/templates','supabase/tests','supabase/config.toml','supabase/migration-ledger.json','supabase/seed.sql','supabase/seed.generated.sql'
];
export const POLICY = ['docs/release/release-profile.json','docs/release/RELEASE_RUNBOOK.md','supabase/migration-ledger.json'];
const deniedPart = /^(?:\.env(?:\..*)?|\.git|node_modules|\.codex.*|\.agents|\.expo|\.astro|\.ci.*|\.gradle.*|\.cxx|\.android.*|\.playwright.*|\.cache|\.brand-work|\.wrangler.*|__pycache__|web-qa-vite-cache|build|dist(?:[-.].*)?|coverage|output|scratch|test-results|credentials?|secrets?|tmp|temporarily)$/i;
const deniedFile = /(?:\.(?:age|pem|p12|pfx|keystore|jks|db|sqlite(?:3)?|log|zip|7z|tar|gz|bak|partial)|local\.properties|credentials\.json)$/i;
const allowedExtension = /\.(?:md|json|mjs|cjs|js|jsx|ts|tsx|mts|cts|html|css|astro|yaml|yml|txt|toml|sql|py|ps1|java|gradle|kt|kts|properties|pro|xml|bat|sh|png|jpg|jpeg|webp|svg|ttf|otf|woff2?|jar|lock)$/i;
const allowedNames = new Set(['.gitignore','.easignore','.vercelignore','.assetsignore','_headers','CODEOWNERS','gradlew']);
const allowedDataPaths = new Set(['packages/astrology-core/fixtures/tai-utc.dat','packages/content/generated/public-help-corpus/corpus.jsonl']);
const handoff = 'docs/release/ANDROID_CANDIDATE_AND_CREDENTIALS_2026-10-18.vi.md';
// Exact reviewed bytes contain a deliberately public Langfuse-shaped fixture.
// Any edit invalidates this exception; test files are not generally exempt.
const syntheticFixtureHashes = new Map([
  ['scripts/nilaza-backend-key-backup.test.mjs','8f25531e6cbf47501b0688279f113240a9084282d93e1951dd4406cdfc573e9f']
]);
export const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export function safePath(root, relative, {missing=false}={}) {
  if(typeof relative!=='string'||!relative||/[\x00-\x1f\x7f\\:]/.test(relative)||path.isAbsolute(relative)||relative.split('/').some(p=>!p||p==='.'||p==='..')) throw Error('UNSAFE_PATH');
  const base=fs.realpathSync(root); let cursor=base;
  for(const part of relative.split('/')) {
    cursor=path.join(cursor,part);
    let stat;
    try { stat=fs.lstatSync(cursor); } catch(error) { if(error.code!=='ENOENT') throw error; }
    if(stat) {
      if(stat.isSymbolicLink()) throw Error('REPARSE_PATH');
      const actual=fs.realpathSync(cursor);
      if(actual!==base&&!actual.startsWith(base+path.sep)) throw Error('PATH_OUTSIDE_ROOT');
    } else if(!missing) throw Error('MISSING_PATH');
  }
  return cursor;
}
export function excluded(relative) {
  return relative===handoff||relative.split('/').some(p=>deniedPart.test(p))||deniedFile.test(relative)||/\.(?:preedit|before|old|orig)(?:\.|$)/i.test(relative);
}
function filesUnder(root, relative, out) {
  if(excluded(relative)) return;
  const full=safePath(root,relative); const stat=fs.lstatSync(full);
  if(stat.isDirectory()) {
    for(const name of fs.readdirSync(full).sort()) filesUnder(root,`${relative}/${name}`,out);
  } else if(stat.isFile()) {
    if(allowedExtension.test(relative)||allowedNames.has(path.posix.basename(relative))||allowedDataPaths.has(relative)) out.add(relative);
    else throw Error(`UNREVIEWED_FILE_TYPE:${relative}`);
  } else throw Error('UNSUPPORTED_FILE_TYPE');
}
function git(root,args) { return execFileSync('git',['--no-optional-locks',...args],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']}).trim(); }
function inspectSecret(relative,bytes) {
  if(/\.(?:png|jpg|jpeg|webp|ttf|otf|woff2?|jar)$/i.test(relative)) return;
  if(syntheticFixtureHashes.get(relative)===digest(bytes)) return;
  const text=bytes.toString('utf8');
  if(/(?:sk-(?:proj-)?[A-Za-z0-9_-]{32,}|sb_secret_[A-Za-z0-9_-]{32,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(text)) throw Error(`SUSPECT_SECRET_IN_SOURCE:${relative}`);
}
export function inventory(root,{roots=ROOTS,policy=POLICY}={}) {
  const entries=new Set(); const missingRoots=[];
  for(const relative of roots) {
    if(!fs.existsSync(path.join(root,relative))) {missingRoots.push(relative);continue;}
    filesUnder(root,relative,entries);
  }
  const files=[...entries].sort().map(relative=>{
    const bytes=fs.readFileSync(safePath(root,relative)); inspectSecret(relative,bytes);
    return {path:relative,sha256:digest(bytes),bytes:bytes.length};
  });
  const pins=policy.map(relative=>({path:relative,sha256:digest(fs.readFileSync(safePath(root,relative)))}));
  const trackedDirty=git(root,['status','--porcelain=v1','--untracked-files=no']).length>0;
  return {schemaVersion:1,kind:'nilaza-source-candidate-inventory',target:TARGET,inputDigestSha256:digest(JSON.stringify(files)),files,policy:pins,
    source:{commit:git(root,['rev-parse','HEAD']),branch:git(root,['branch','--show-current']),trackedDirty},missingRoots,
    exclusions:['Tracked browser/session profiles and all historical Git objects','Environment files, private keys, local.properties, dependency/build/export caches','Source archives and handoff report (avoids circular evidence)'],
    releaseAuthorized:false,cloudMutation:false,status:'PREPARATION_ONLY',nativeSigning:'BLOCKED_RELEASE_USES_DEBUG_SIGNING',remoteCI:'NOT_RUN_FOR_THIS_CANDIDATE'};
}
export function verifyInventory(root,record,{roots=ROOTS,policy=POLICY}={}) {
  if(record.schemaVersion!==1||record.kind!=='nilaza-source-candidate-inventory'||JSON.stringify(record.target)!==JSON.stringify(TARGET)||record.releaseAuthorized!==false||record.cloudMutation!==false) throw Error('INVENTORY_CONTRACT');
  const current=inventory(root,{roots,policy});
  if(current.inputDigestSha256!==record.inputDigestSha256||JSON.stringify(current.files)!==JSON.stringify(record.files)||JSON.stringify(current.policy)!==JSON.stringify(record.policy)||JSON.stringify(current.source)!==JSON.stringify(record.source)||JSON.stringify(current.missingRoots)!==JSON.stringify(record.missingRoots)) throw Error('SOURCE_DRIFT');
  return current;
}
function writeNew(root,relative,bytes) {
  const full=safePath(root,relative,{missing:true});
  fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,bytes,{flag:'wx'});
}
export function materialize(root,record,destination,{roots=ROOTS,policy=POLICY}={}) {
  if(!destination.startsWith('.cache/release-preparation-2026-10-18/')) throw Error('DESTINATION_SCOPE');
  verifyInventory(root,record,{roots,policy});
  const dest=safePath(root,destination,{missing:true});
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.mkdirSync(dest,{recursive:false});
  for(const file of record.files) {
    const bytes=fs.readFileSync(safePath(root,file.path));
    if(bytes.length!==file.bytes||digest(bytes)!==file.sha256) throw Error('SOURCE_DRIFT_DURING_COPY');
    writeNew(dest,file.path,bytes);
  }
  verifyInventory(root,record,{roots,policy});
  for(const file of record.files) if(digest(fs.readFileSync(safePath(dest,file.path)))!==file.sha256) throw Error('COPY_PARITY');
  return {status:'ALLOWLISTED_COPY_VERIFIED',files:record.files.length,bytes:record.files.reduce((n,f)=>n+f.bytes,0),inputDigestSha256:record.inputDigestSha256,destination,sourceCommit:record.source.commit,releaseAuthorized:false};
}
function main() {
  const [action,output,destination]=process.argv.slice(2);const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
  if(process.argv.slice(2).length>3||(destination&&action!=='copy')) throw Error('UNEXPECTED_ARGUMENTS');
  if(action==='prepare'&&output?.startsWith('artifacts/release-preparation-2026-10-18/')) {
    const first=inventory(root);verifyInventory(root,first);writeNew(root,output,JSON.stringify(first,null,2)+'\n');
    console.log(JSON.stringify({status:first.status,files:first.files.length,bytes:first.files.reduce((n,f)=>n+f.bytes,0),inputDigestSha256:first.inputDigestSha256,output,releaseAuthorized:false}));
  } else if(['verify','copy'].includes(action)&&output?.startsWith('artifacts/release-preparation-2026-10-18/')) {
    const record=JSON.parse(fs.readFileSync(safePath(root,output),'utf8'));
    if(action==='verify') {verifyInventory(root,record);console.log('PASS: current allowlisted source matches preparation inventory; release remains gated.');}
    else console.log(JSON.stringify(materialize(root,record,destination||'.cache/release-preparation-2026-10-18/candidate')));
  } else throw Error('ONLY_PREPARE_VERIFY_COPY_ALLOWED');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {try{main();}catch(error){console.error(error.message);process.exitCode=1;}}
