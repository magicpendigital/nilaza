import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {prepareJob,acceptAuthorPacket,renderJob,submitQa,inspectJob,reconcileJob,recordOwnerReview} from '../packages/growth-runtime/runtime.mjs';
import {renderCreative} from '../packages/growth-runtime/renderer.mjs';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const defaultStore=path.join(repoRoot,'.local/growth-runtime/store');
const allowed=new Set(['job','brief','key','source','store','packet','agent','session','root-thread','bundle-hash','input-hash','decision','reason']);
function parse(argv) {
  const [action,...args]=argv;
  if(!['prepare','import-author','render','submit-qa','inspect','reconcile','owner-review','help'].includes(action)) throw new Error('ACTION_NOT_SUPPORTED');
  const options={};
  for(let i=0;i<args.length;i+=2) {
    const flag=args[i];
    if(!flag?.startsWith('--') || !allowed.has(flag.slice(2)) || !args[i+1] || args[i+1].startsWith('--') || Object.hasOwn(options,flag.slice(2))) throw new Error('INVALID_ARGUMENTS');
    options[flag.slice(2)]=args[i+1];
  }
  return {action,options};
}
function readPacket(filename) {
  if(!filename) throw new Error('PACKET_FILE_REQUIRED');
  const absolute=path.resolve(filename), stat=fs.lstatSync(absolute);
  if(!stat.isFile() || stat.isSymbolicLink() || stat.size>262144) throw new Error('PACKET_FILE_REJECTED');
  return JSON.parse(fs.readFileSync(absolute,'utf8'));
}
function intake(options,role,sourceMode) {
  if(!options.agent || !options.session || !options['root-thread']) throw new Error('LOCAL_SESSION_ATTESTATION_REQUIRED');
  return {identityKind:'operator_attested_local_session_provenance',intakeMode:'owner_cli_attestation',sourceMode,role,agentId:options.agent,sessionId:options.session,rootThreadId:options['root-thread'],attestedBy:'root_operator',attestedAt:new Date().toISOString()};
}
const help=`Nilaza internal Growth runner — local CLI only
prepare       --job ID --brief B01_open_question --key KEY [--source actual_ai_session_handback|fixture]
import-author --job ID --packet FILE --agent ID --session REF --root-thread REF
render        --job ID
submit-qa     --job ID --packet FILE --agent ID --session REF --root-thread REF --bundle-hash HASH --input-hash HASH
inspect       --job ID
reconcile     --job ID
owner-review  --job ID --decision pending|accepted_internal|revise --reason TEXT --agent OWNER --session REF --root-thread REF
All commands may specify --store DIRECTORY. No publish/send/deploy/budget action exists.
Session provenance is explicitly operator-attested. Fixture output never becomes an actual AI-session run.
Unattended model dispatch requires a separately owner-configured adapter; this CLI creates no credentials or provider calls.`;

try {
  const {action,options}=parse(process.argv.slice(2));
  if(action==='help') { console.log(help); }
  else {
    if(!options.job) throw new Error('JOB_ID_REQUIRED');
    const common={repoRoot,storeRoot:path.resolve(options.store || defaultStore),jobId:options.job};
    let result;
    if(action==='prepare') result=await prepareJob({...common,briefId:options.brief || 'B01_open_question',idempotencyKey:options.key || options.job,sourceMode:options.source || 'actual_ai_session_handback'});
    if(action==='import-author') {
      const before=await inspectJob(common);
      const mode=before.sourceMode || before.job?.sourceMode;
      result=await acceptAuthorPacket({...common,packet:readPacket(options.packet),trustedIntake:intake(options,'content_studio',mode)});
    }
    if(action==='render') result=await renderJob({...common,renderer:renderCreative});
    if(action==='submit-qa') {
      const before=await inspectJob(common);
      const mode=before.sourceMode || before.job?.sourceMode;
      result=await submitQa({...common,verdict:readPacket(options.packet),trustedIntake:intake(options,'independent_qa',mode),creativeBundleHash:options['bundle-hash'],inputFingerprint:options['input-hash']});
    }
    if(action==='inspect') result=await inspectJob(common);
    if(action==='reconcile') result=await reconcileJob(common);
    if(action==='owner-review') {
      const before=await inspectJob(common);
      const mode=before.sourceMode || before.job?.sourceMode;
      result=await recordOwnerReview({...common,decision:options.decision,reason:options.reason,trustedIntake:intake(options,'owner',mode)});
    }
    console.log(JSON.stringify(result,null,2));
  }
} catch(error) {
  const code=typeof error.code==='string' && /^[A-Z0-9_]{3,80}$/.test(error.code)?error.code:(/^[A-Z0-9_]{3,80}$/.test(error.message || '')?error.message:'LOCAL_RUNNER_FAILED');
  console.error(JSON.stringify({status:'blocked',code,externalActions:'none'}));
  process.exitCode=1;
}
