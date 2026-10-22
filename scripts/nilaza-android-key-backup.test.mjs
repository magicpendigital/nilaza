import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { target, selectKeystore, validateSecret, frameSecret, publicMetadata } from './nilaza-android-key-backup.mjs';

const fake={id:target.keystoreId,type:'JKS',sha256CertificateFingerprint:target.certificateSha256,keystore:Buffer.alloc(80,42).toString('base64'),keystorePassword:'PUBLIC-FAKE-STORE-PASSWORD',keyAlias:'PUBLIC-FAKE-ALIAS',keyPassword:'PUBLIC-FAKE-KEY-PASSWORD'};
const fixture=()=>({id:target.projectId,fullName:target.fullName,androidAppCredentials:[{id:target.appCredentialsId,applicationIdentifier:target.applicationIdentifier,isLegacy:false,androidAppBuildCredentialsList:[{id:target.buildCredentialsId,isDefault:true,isLegacy:false,androidKeystore:{...fake}}]}]});
test('only exact existing default credential is selected',()=>{
  assert.equal(selectKeystore(fixture()).id,target.keystoreId);
  const wrongProject=fixture();wrongProject.id='other';assert.throws(()=>selectKeystore(wrongProject));
  const ambiguity=fixture();ambiguity.androidAppCredentials.push(ambiguity.androidAppCredentials[0]);assert.throws(()=>selectKeystore(ambiguity));
  for(const field of ['id','type','sha256CertificateFingerprint']){const a=fixture();a.androidAppCredentials[0].androidAppBuildCredentialsList[0].androidKeystore[field]='changed';assert.throws(()=>selectKeystore(a));}
  const changedDefault=fixture();changedDefault.androidAppCredentials[0].androidAppBuildCredentialsList[0].isDefault=false;assert.throws(()=>selectKeystore(changedDefault));
});
test('secret encoding is strict and framed without argv or filesystem',()=>{
  assert.equal(validateSecret(fake).length,80);
  assert.throws(()=>validateSecret({...fake,keystore:'not-base64!!'}));
  assert.throws(()=>validateSecret({...fake,keyPassword:''}));
  assert.throws(()=>validateSecret({...fake,keyAlias:'x'.repeat(4097)}));
  const frame=frameSecret(fake);let offset=0;const fields=[];
  while(offset<frame.length){const n=frame.readInt32BE(offset);offset+=4;fields.push(frame.subarray(offset,offset+n));offset+=n;}
  assert.equal(fields.length,4);assert.equal(fields[0].length,80);assert.equal(fields[1].toString(),fake.keystorePassword);assert.equal(fields[2].toString(),fake.keyAlias);assert.equal(fields[3].toString(),fake.keyPassword);
  frame.fill(0);
  const omitted=frameSecret({...fake,keyPassword:null});let i=0;const values=[];while(i<omitted.length){const n=omitted.readInt32BE(i);i+=4;values.push(omitted.subarray(i,i+n).toString());i+=n;}assert.equal(values[3],fake.keystorePassword);omitted.fill(0);
});
test('public receipt contains no secret fields or fixture values',()=>{
  const m=publicMetadata(fake,{status:'KEYSTORE_SIGN_VERIFY_PASS',certificateSha256:target.certificateSha256,algorithm:'SHA256withRSA'},'a'.repeat(64),1234);
  const serialized=JSON.stringify(m);
  for(const key of ['keystore','keystorePassword','keyAlias','keyPassword'])assert.ok(!serialized.includes(fake[key]));
  assert.equal(m.playRegistration,'NOT_YET_UPLOADED_OWNER_ATTESTED');assert.equal(m.managedRecovery,'BLOCKED');
  assert.throws(()=>publicMetadata(fake,{status:'KEYSTORE_VERIFICATION_FAILED'},'a'.repeat(64),1234));
});
test('Java verifier refuses invalid keystore without echoing secret fixture',()=>{
  const input=frameSecret(fake);
  try{const p=spawnSync('C:/Program Files/Microsoft/jdk-21.0.12.101-hotspot/bin/java.exe',['scripts/VerifyAndroidKeystore.java',target.certificateSha256],{input,encoding:'utf8',timeout:45000,windowsHide:true});assert.equal(p.status,1);assert.deepEqual(JSON.parse(p.stdout),{status:'KEYSTORE_VERIFICATION_FAILED'});assert.ok(!p.stderr.includes('PUBLIC-FAKE'));}finally{input.fill(0);}
});
