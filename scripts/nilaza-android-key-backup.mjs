import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync, execFileSync } from 'node:child_process';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = 'C:\\Users\\Admin\\AppData\\Local\\NilazaRecovery';
const work = path.join(root, 'AndroidBackups', 'eas-default-20261018');
const powershell = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const wrapper = path.join(repo, 'scripts/nilaza-android-key-owner.ps1');
const pinsFile = path.join(repo, 'artifacts/android-key-backup-2026-10-18/toolchain.json');
const age = path.join(repo, '.brand-work/drive-recovery-tools-2026-10-13/vendor/age/age.exe');
const java = 'C:\\Program Files\\Microsoft\\jdk-21.0.12.101-hotspot\\bin\\java.exe';
const javaSource = path.join(repo, 'scripts/VerifyAndroidKeystore.java');
const cliRoot = 'C:/Users/Admin/AppData/Roaming/npm/node_modules/eas-cli';
const bundleFile = path.join(work, 'nilaza-android-eas-default-20261018.age');
const downloaded = path.join(work, 'downloaded-android-backup.age');
const backupReceipt = path.join(work, 'backup.json');
const restoreReceipt = path.join(work, 'restore.json');
const downloadReceipt = path.join(work, 'download.json');
const identity = path.join(root, 'RestoreTests/drive-owner-v1-20261018/downloaded-owner-v1.age');
export const target = Object.freeze({ projectId:'8a6197d1-feaa-488b-90a3-12bb177ee005', fullName:'@magicpen/nilaza', applicationIdentifier:'app.nilaza.mobile', appCredentialsId:'103b0042-7c5c-4669-8ede-0f691d0978f6', buildCredentialsId:'5b9fb458-6fa8-47c6-8a2d-80e13fd127f7', keystoreId:'b6b83046-d427-42e5-a80a-a991d6c31147', certificateSha256:'4e459a4554c9e543a3a128622e15bbb7bd9a557dc6a1eef997b9ca8e53582536' });
const recipient = 'age1rekcyasv7rgg8k77wfuf0een6re6yy32exuzsw6qsxqhudawlycsxrhd74';
const identityHash = '4bb2563f9627d223ac9116e442a13bef5046aa4d6cbb87082a70581714d5718a';
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const hashFile = file => sha(fs.readFileSync(file));
let phase = 'VALIDATE_CONTEXT';

export function selectKeystore(app) {
  if (app?.id !== target.projectId || app.fullName !== target.fullName) throw Error('PROJECT_MISMATCH');
  if (app.androidAppCredentials?.length !== 1) throw Error('AMBIGUOUS_APP_CREDENTIALS');
  const c = app.androidAppCredentials[0];
  if (c.id !== target.appCredentialsId || c.applicationIdentifier !== target.applicationIdentifier || c.isLegacy !== false || c.androidAppBuildCredentialsList?.length !== 1) throw Error('CREDENTIAL_MAPPING_CHANGED');
  const b = c.androidAppBuildCredentialsList[0];
  const k = b.androidKeystore;
  if (b.id !== target.buildCredentialsId || b.isDefault !== true || b.isLegacy !== false || k?.id !== target.keystoreId || k.type !== 'JKS' || k.sha256CertificateFingerprint?.replaceAll(':','').toLowerCase() !== target.certificateSha256) throw Error('KEY_CHANGED');
  return k;
}
export function validateSecret(k) {
  for (const field of ['keystorePassword','keyAlias']) {
    if (typeof k[field] !== 'string' || Buffer.byteLength(k[field]) < 1 || Buffer.byteLength(k[field]) > 4096) throw Error('INVALID_KEY_FIELD');
  }
  // EAS permits an omitted key password; in that case test the store password against the key.
  if(k.keyPassword != null && (typeof k.keyPassword !== 'string' || Buffer.byteLength(k.keyPassword)<1 || Buffer.byteLength(k.keyPassword)>4096))throw Error('INVALID_KEY_FIELD');
  if (typeof k.keystore !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(k.keystore) || k.keystore.length > 1400000) throw Error('INVALID_KEYSTORE');
  const bytes = Buffer.from(k.keystore, 'base64');
  if (bytes.length < 64 || bytes.length > 1048576 || bytes.toString('base64') !== k.keystore) throw Error('INVALID_KEYSTORE');
  return bytes;
}
export function frameSecret(k) {
  const fields = [validateSecret(k), Buffer.from(k.keystorePassword,'utf8'), Buffer.from(k.keyAlias,'utf8'), Buffer.from(k.keyPassword ?? k.keystorePassword,'utf8')];
  try {
    const pieces=[];
    for(const b of fields){const size=Buffer.alloc(4);size.writeInt32BE(b.length);pieces.push(size,b);}
    return Buffer.concat(pieces);
  } finally { fields.forEach(b=>b.fill(0)); }
}
export function publicMetadata(k, verification, ciphertextSha256, ciphertextBytes) {
  if (verification.status !== 'KEYSTORE_SIGN_VERIFY_PASS' || verification.certificateSha256 !== target.certificateSha256) throw Error('VERIFICATION_MISMATCH');
  const bytes=validateSecret(k);
  try { return {schemaVersion:1,status:'ANDROID_CREDENTIAL_ENCRYPTED_SIGN_VERIFIED',createdAt:new Date().toISOString(),...target,recipient,keystoreSha256:sha(bytes),ciphertextSha256,ciphertextBytes,signVerify:'PASS',signatureAlgorithm:verification.algorithm,playRegistration:'NOT_YET_UPLOADED_OWNER_ATTESTED',plaintextStored:false,passwordCaptured:false,restoreFromDrive:'PENDING',offMachineRecoveryVerified:false,managedRecovery:'BLOCKED'}; }
  finally { bytes.fill(0); }
}
function checkContext() {
  const pins=JSON.parse(fs.readFileSync(pinsFile,'utf8'));
  for(const p of pins.files) if(hashFile(p.path)!==p.sha256) throw Error('TOOL_CHANGED');
  execFileSync(powershell,['-NoProfile','-NonInteractive','-File',wrapper,'-Action','Check'],{stdio:['ignore','pipe','pipe'],windowsHide:true,timeout:30000});
  return sha(Buffer.from(JSON.stringify(pins)));
}
function writeNew(file,obj){fs.writeFileSync(file,JSON.stringify(obj,null,2)+'\n',{flag:'wx'});}
function readBackup() {
  const m=JSON.parse(fs.readFileSync(backupReceipt,'utf8'));
  for(const [key,value] of Object.entries(target)) if(m[key]!==value) throw Error('RECEIPT_TARGET_MISMATCH');
  if(m.status!=='ANDROID_CREDENTIAL_ENCRYPTED_SIGN_VERIFIED'||hashFile(bundleFile)!==m.ciphertextSha256||fs.statSync(bundleFile).size!==m.ciphertextBytes)throw Error('BACKUP_MISMATCH');
  return m;
}
function verifyKey(k){
  const input=frameSecret(k);
  try {
    const r=spawnSync(java,[javaSource,target.certificateSha256],{input,stdio:['pipe','pipe','pipe'],windowsHide:true,timeout:45000,maxBuffer:65536});
    if(r.error||r.status!==0)throw Error('KEYSTORE_VERIFICATION_FAILED');
    const result=JSON.parse(r.stdout.toString('utf8'));
    if(result.status!=='KEYSTORE_SIGN_VERIFY_PASS'||result.certificateSha256!==target.certificateSha256)throw Error('CERTIFICATE_MISMATCH');
    return result;
  }finally{input.fill(0);}
}
async function exportExisting(){
  const req=createRequire(path.join(cliRoot,'package.json'));
  if(req('./package.json').version!=='23.2.0')throw Error('CLI_CHANGED');
  const Session=req('./build/user/SessionManager').default;
  const {getExpoApiBaseUrl}=req('./build/api');
  if(getExpoApiBaseUrl()!=='https://api.expo.dev')throw Error('ENDPOINT_MISMATCH');
  const s=new Session({setActor(){}});
  const auth={accessToken:s.getAccessToken(),sessionSecret:s.getSessionSecret()};
  if(!auth.accessToken&&!auth.sessionSecret)throw Error('OWNER_LOGIN_REQUIRED');
  const client=req('./build/commandUtils/context/contextUtils/createGraphqlClient').createGraphqlClient(auth);
  // Read only, no mutation. Never use broad credential fragments containing unrelated FCM/service accounts.
  const query=`query NilazaAndroidBackup { app { byId(appId:"${target.projectId}") { id fullName androidAppCredentials(filter:{applicationIdentifier:"${target.applicationIdentifier}"}) { id applicationIdentifier isLegacy androidAppBuildCredentialsList { id isDefault isLegacy androidKeystore { id type sha256CertificateFingerprint keystore keystorePassword keyAlias keyPassword } } } } } }`;
  const result=await client.query(query,{}, {requestPolicy:'network-only',noRetry:true}).toPromise();
  if(result.error)throw Error('EAS_READ_FAILED');
  return selectKeystore(result.data?.app?.byId);
}
async function encrypt(bytes,output){
  const fd=fs.openSync(output,'wx');
  try {
    await new Promise((resolve,reject)=>{
      const child=spawn(age,['--encrypt','--recipient',recipient],{stdio:['pipe',fd,'pipe'],windowsHide:true});
      const timer=setTimeout(()=>{child.kill();reject(Error('ENCRYPT_TIMEOUT'));},45000);
      child.stderr.resume();child.on('error',()=>{clearTimeout(timer);reject(Error('ENCRYPT_FAILED'));});
      child.stdin.on('error',()=>{});
      child.on('close',code=>{clearTimeout(timer);code===0?resolve():reject(Error('ENCRYPT_FAILED'));});
      child.stdin.end(bytes);
    });
    fs.fsyncSync(fd);
  }finally{fs.closeSync(fd);}
}
async function decrypt(){
  return await new Promise((resolve,reject)=>{
    const pieces=[];let size=0;
    const child=spawn(age,['--decrypt','--identity',identity,downloaded],{stdio:['inherit','pipe','inherit'],windowsHide:false});
    child.on('error',()=>reject(Error('DECRYPT_FAILED')));
    child.stdout.on('data',b=>{size+=b.length;if(size>2097152){child.kill();}pieces.push(b);});
    child.on('close',code=>{if(code!==0||size>2097152){pieces.forEach(b=>b.fill(0));reject(Error('DECRYPT_FAILED'));return;}const bytes=Buffer.concat(pieces);pieces.forEach(b=>b.fill(0));resolve(bytes);});
  });
}
async function main(action){
  if(!['backup','restore','inspect'].includes(action))throw Error('ACTION_REFUSED');
  if(action==='restore'&&(!process.stdin.isTTY||!process.stdout.isTTY||!process.stderr.isTTY))throw Error('PRIVATE_CONSOLE_REQUIRED');
  const toolchainSha256=checkContext();
  if(action==='inspect'){
    const m=readBackup();
    const restored=fs.existsSync(restoreReceipt)?JSON.parse(fs.readFileSync(restoreReceipt,'utf8')):null;
    if(restored&&(restored.status!=='ANDROID_DRIVE_RESTORE_SIGN_VERIFIED'||restored.ciphertextSha256!==m.ciphertextSha256||hashFile(downloaded)!==m.ciphertextSha256||restored.certificateSha256!==target.certificateSha256||restored.toolchainSha256!==toolchainSha256))throw Error('RESTORE_RECEIPT_MISMATCH');
    console.log(JSON.stringify(restored??m));return;
  }
  if(action==='backup'){
    phase='EXPORT_EXISTING_KEY';
    const partial=bundleFile+'.partial';
    for(const f of [partial,bundleFile,backupReceipt])if(fs.existsSync(f))throw Error('PRIOR_BACKUP_PRESERVED');
    const k=await exportExisting();
    phase='VERIFY_KEYSTORE_SIGNING';
    const verified=verifyKey(k);
    const payload=Buffer.from(JSON.stringify({schemaVersion:1,kind:'nilaza-android-credential-backup',...target,keystore:{format:'JKS',base64:k.keystore,storePassword:k.keystorePassword,keyAlias:k.keyAlias,keyPassword:k.keyPassword}}));
    phase='ENCRYPT_BACKUP';
    try{await encrypt(payload,partial);}finally{payload.fill(0);}
    const header=fs.readFileSync(partial).subarray(0,256).toString('ascii');
    if(!header.startsWith('age-encryption.org/v1')||!header.includes('-> X25519 '))throw Error('CIPHERTEXT_HEADER_INVALID');
    if(fs.existsSync(bundleFile))throw Error('OUTPUT_COLLISION');
    fs.renameSync(partial,bundleFile);
    const m={...publicMetadata(k,verified,hashFile(bundleFile),fs.statSync(bundleFile).size),toolchainSha256};
    for(const key of ['keystore','keystorePassword','keyAlias','keyPassword'])k[key]=null;
    writeNew(backupReceipt,m);console.log(JSON.stringify(m));return;
  }
  phase='VERIFY_DOWNLOAD';
  const m=readBackup();
  const d=JSON.parse(fs.readFileSync(downloadReceipt,'utf8'));
  if(d.status!=='ANDROID_DOWNLOAD_VERIFIED'||d.sha256!==m.ciphertextSha256||hashFile(downloaded)!==m.ciphertextSha256||hashFile(identity)!==identityHash||fs.existsSync(restoreReceipt))throw Error('RESTORE_INPUT_MISMATCH');
  phase='OWNER_DECRYPT';
  const bytes=await decrypt();let k;
  try{
    const b=JSON.parse(bytes.toString('utf8'));
    if(b.schemaVersion!==1||b.kind!=='nilaza-android-credential-backup'||b.keystore?.format!=='JKS')throw Error('BUNDLE_INVALID');
    for(const [key,value]of Object.entries(target))if(b[key]!==value)throw Error('BUNDLE_TARGET_MISMATCH');
    k={keystore:b.keystore.base64,keystorePassword:b.keystore.storePassword,keyAlias:b.keystore.keyAlias,keyPassword:b.keystore.keyPassword};
    phase='RESTORED_SIGN_VERIFY';
    const validated=verifyKey(k);const store=validateSecret(k);
    try{if(sha(store)!==m.keystoreSha256)throw Error('RESTORED_KEY_MISMATCH');}finally{store.fill(0);}
    const result={schemaVersion:1,status:'ANDROID_DRIVE_RESTORE_SIGN_VERIFIED',verifiedAt:new Date().toISOString(),...target,ciphertextSha256:m.ciphertextSha256,keystoreSha256:m.keystoreSha256,signatureAlgorithm:validated.algorithm,toolchainSha256,downloadedCiphertextUsed:true,plaintextStored:false,passwordCaptured:false,testScope:'Same Windows machine; downloaded encrypted Android package and downloaded encrypted recovery identity',playRegistration:'NOT_YET_UPLOADED_OWNER_ATTESTED',offMachineRecoveryVerified:false,managedRecovery:'BLOCKED'};
    writeNew(restoreReceipt,result);console.log(JSON.stringify(result));
  }finally{bytes.fill(0);if(k)for(const key of Object.keys(k))k[key]=null;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main(process.argv[2]).catch(()=>{console.log(JSON.stringify({status:'ANDROID_BACKUP_STEP_NOT_COMPLETED',phase}));process.exitCode=1;});
}
