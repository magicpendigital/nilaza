import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import Ajv from 'ajv';
import { webcrypto } from 'node:crypto';

// Execute the real endpoint and local dependencies. Only server, database and
// provider boundaries are synthetic. Unknown external dependencies fail closed.
const root=process.cwd();
const user='00000000-0000-4000-8000-000000000001';
const readingId='00000000-0000-4000-8000-000000000002';
const reportId='00000000-0000-4000-8000-000000000003';
const fixture=name=>JSON.parse(fs.readFileSync(path.join(root,'packages/agent-config/astrology-ai-insight/fixtures',name+'.json'),'utf8'));
const clone=x=>JSON.parse(JSON.stringify(x));
const astrologyInvocation=()=>{const input=fixture("valid-invocation"), context=fixture("valid-request");for(const key of ["chart","selectedFactIds","facts","caveats"])input[key]=context[key];return input;};
const correlation={interactionId:'interaction_synthetic',attemptId:'attempt_synthetic',clientRequestId:'request_synthetic'};
const tarotInput={language:'en',deck:{id:'moon-garden',slug:'moon-garden'},spread:'daily-one',topic:'self',question:'What might I reflect on today?',selectedCards:[{id:'major-00-fool',reversed:false}]};
const tarotOutput={summary:'An invitation to explore a small possibility.',reflection:'What small possibility could you test?',sections:[{key:'card',title:{en:'The Fool'},body:{en:'Consider one small reversible step.'},cardIds:['major-00-fool']}]};
function harness(feature, options={}) {
 const calls=[],writes=[],finalizations=[],generations=[],receipts=[];let handler,storedReport;
 const route={id:'00000000-0000-4000-8000-000000000004',feature:feature==='tarot'?'tarot_reading':'astrology_report',version:'synthetic-route-v2',status:'active',primaryProvider:'openai',primaryModel:'synthetic-model',responseSchema:feature==='tarot'?'tarot_reading_v2':'astrology_ai_insight_v1',temperature:0.7,maxOutputTokens:2000,fallbackWhen:[],safetyPolicy:{}};
 const supabase={auth:{getUser:async()=>({data:{user:options.unauthorized?null:{id:user,is_anonymous:false}},error:null})},rpc:async(name,args)=>{calls.push({kind:'rpc',name,args});return {data:null,error:null};},from(table){
  let action='select',value,filters=[],selection;
  const chain={select(columns){selection=columns;return chain},insert(input){action='insert';value=input;return chain},update(input){action='update';value=input;return chain},eq(...input){filters.push(input);return chain},is(){return chain},in(){return chain},gte(){return chain},order(){return chain},limit(){return chain},single(){return execute()},maybeSingle(){return execute()},then(resolve,reject){return execute().then(resolve,reject)}};
  async function execute(){
   calls.push({kind:'db',table,action});
   if(action!=='select')writes.push({table,action,value:clone(value),filters:clone(filters)});
   if(options.receiptEnrichmentThrows && action==='update' && (value?.interpretation?.provenance?.answerReceiptId || value?.input_summary?.answerProvenance?.answerReceiptId))throw Error('synthetic receipt enrichment failure');
   if(table==='prompt_versions')return feature==='tarot'?{data:[],error:null}:{data:{id:'00000000-0000-4000-8000-000000000005',version:'synthetic-prompt-v2',prompt_text:'Use the validated chart facts for symbolic reflection only.',locale:'en',status:'active'},error:null};
   if(table==='subscriptions')return {data:[{entitlement:'premium',status:'active',current_period_end:null}],error:null};
   if(table==='tarot_decks')return {data:{id:'00000000-0000-4000-8000-000000000006'},error:null};
   if(table==='tarot_readings')return options.persistError?{data:null,error:{code:'test_persist_failure'}}:{data:{id:readingId},error:null};
   if(table==='usage_events'){if(action==='select')return {data:[],count:0,error:null};if(options.usageThrows)throw Error('synthetic usage transport failure');return {data:null,error:null};}
   if(table==='astrology_reports'){
    if(action==='insert'){storedReport={id:reportId,user_id:user,...clone(value)};return {data:storedReport,error:null};}
    if(action==='select')return {data:options.notOwned?{...storedReport,user_id:'different-user'}:storedReport,error:null};
    if(value?.status==='completed' && options.persistError)return {data:null,error:{code:'test_persist_failure'}};
    storedReport={...storedReport,...clone(value)};return {data:null,error:null};
   }
   return {data:null,error:null};
  }
  return chain;
 }};
 const generated={text:JSON.stringify(feature==='tarot'?tarotOutput:fixture('valid-response')),provider:'openai',model:'synthetic-model',routeVersionId:route.id,routeVersion:route.version,requestId:'provider_synthetic',traceId:'trace_synthetic',moderationStatus:'passed',attempts:[],usage:{},latencyMs:1,fallbackUsed:false,...options.generation};
 if(feature==='astrology' && !options.generation?.text){const response=fixture('valid-response');generated.text=JSON.stringify(Object.fromEntries(['headline','synthesis','evidenceFactIds','patterns','tensions','focusSections','reflectionQuestions','suggestedFollowUps'].map(key=>[key,response[key]])));}
 const router={readActiveModelRoute:async()=>route,generateWithModelRoute:async input=>{generations.push(input);calls.push({kind:'provider'});return {...generated,finalizeTrace:async value=>{calls.push({kind:'finalize'});finalizations.push(clone(value));}}}};
 const env={SUPABASE_URL:'https://synthetic.invalid',SUPABASE_ANON_KEY:'synthetic-public',AI_TRACE_ENVIRONMENT:'staging'};
 const cache=new Map();
 function load(filename){
  filename=path.resolve(filename);if(cache.has(filename))return cache.get(filename).exports;
  if(filename.endsWith('.json'))return JSON.parse(fs.readFileSync(filename,'utf8'));
  if(filename.endsWith(path.join('_shared','model-router.ts')))return router;
  if(filename.endsWith(path.join('_shared','answer-receipt.ts')))return {writeAnswerReceipt:async input=>{
   receipts.push(clone(input));calls.push({kind:'receipt'});
   return options.receiptUnavailable ? null : {receiptId:'00000000-0000-4000-8000-000000000009',createdAt:'2026-10-14T00:00:00.000Z'};
  }};
  const module={exports:{}};cache.set(filename,module);
  const source=fs.readFileSync(filename,'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true},fileName:filename});
  const requireLocal=id=>{
   if(id==='https://deno.land/std@0.168.0/http/server.ts')return {serve:callback=>{handler=callback}};
   if(id==='https://esm.sh/@supabase/supabase-js@2.7.1')return {createClient:()=>supabase};
   if(id==='https://esm.sh/ajv@8.17.1')return Ajv;
   if(!id.startsWith('.'))throw Error('Unapproved test dependency: '+id);
   return load(path.resolve(path.dirname(filename),id));
  };
  const context={module,exports:module.exports,require:requireLocal,Request,Response,Headers,URL,TextEncoder,TextDecoder,AbortController,ReadableStream,Uint8Array,ArrayBuffer,DataView,performance,crypto:webcrypto,console,atob,btoa,setTimeout,clearTimeout,Deno:{env:{get:key=>env[key]}}};
  vm.runInNewContext(compiled.outputText,context,{filename,timeout:10000});return module.exports;
 }
 load(path.join(root,'supabase/functions',feature==='tarot'?'ai-tarot-reading':'ai-astrology-insight','index.ts'));
 assert.equal(typeof handler,'function');
 return {calls,writes,finalizations,generations,receipts,load,async request(overrides={}){
  const input=overrides.input??(feature==='tarot'?clone(tarotInput):astrologyInvocation());
  const ids={...correlation,...(feature==='astrology'?{clientRequestId:input.requestId}:{}),...overrides.correlation};
  const req=new Request('https://synthetic.invalid/functions/v1/ai-'+feature,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer synthetic-token','x-nilaza-interaction-id':ids.interactionId,'x-nilaza-attempt-id':ids.attemptId,'x-nilaza-client-request-id':ids.clientRequestId,...overrides.headers},body:JSON.stringify(input)});
  const response=await handler(req);return {status:response.status,body:await response.json()};
 }};
}

test('Tarot real endpoint authenticates, validates, preserves local prompt provenance, persists then finalizes',async()=>{
 const h=harness('tarot');const {status,body}=await h.request();assert.equal(status,200);assert.equal(body.moderationStatus,'passed');assert.equal(body.provenance.attemptId,correlation.attemptId);assert.equal(body.provenance.remoteId,readingId);assert.equal(body.provenance.persistenceStatus,'stored');assert.match(body.provenance.promptVersionId,/^local:/);
 const provenance=h.load(path.join(root,'packages/ai-contracts/answer-provenance.ts'));assert.ok(provenance.parseAnswerProvenance(body.provenance,{correlation}),'real locally resolved prompt must be accepted by the client contract');
 const stored=h.writes.find(x=>x.table==='tarot_readings').value;assert.equal(stored.user_id,user);assert.deepEqual(stored.interpretation.sections,body.sections);assert.equal(stored.interpretation.provenance.attemptId,body.provenance.attemptId);
 assert.equal(h.finalizations.length,1);assert.equal(h.finalizations[0].status,'ok');assert.ok(h.calls.findIndex(x=>x.kind==='finalize')>h.calls.findIndex(x=>x.table==='tarot_readings' && x.action==='insert'));
});

test('Tarot malformed model output becomes rejected fallback and a validation error trace',async()=>{
 const h=harness('tarot',{generation:{text:'{"summary":"cut off"'}});const {body,status}=await h.request();assert.equal(status,200);assert.equal(body.moderationStatus,'fallback');assert.equal(body.provenance.validationStatus,'rejected');assert.deepEqual(body.sections,[]);assert.equal(h.finalizations[0].status,'error');assert.equal(h.finalizations[0].output.stage,'validation');
});

test('Tarot failed persistence is visible in response and trace; blocked output never exposes AI sections',async()=>{
 const failed=harness('tarot',{persistError:true});const result=await failed.request();assert.equal(result.body.provenance.persistenceStatus,'failed');assert.equal(result.body.remoteId,undefined);assert.equal(failed.finalizations[0].output.stage,'persist');assert.equal(failed.finalizations[0].status,'error');
 const blocked=harness('tarot',{generation:{moderationStatus:'blocked'}});const b=await blocked.request();assert.equal(b.body.provenance.sourceKind,'blocked');assert.deepEqual(b.body.sections,[]);assert.equal(blocked.finalizations[0].status,'blocked');
});

test('Tarot unauthorized and malformed correlation stop before provider calls',async()=>{
 const denied=harness('tarot',{unauthorized:true});assert.equal((await denied.request()).status,401);assert.equal(denied.generations.length,0);
 const bad=harness('tarot');assert.equal((await bad.request({correlation:{attemptId:'bad identifier'}})).status,400);assert.equal(bad.generations.length,0);
});

test('Astrology real endpoint validates owned facts, persists complete output and returns correlated provenance',async()=>{
 const h=harness('astrology');const {status,body}=await h.request();assert.equal(status,200,JSON.stringify(body));assert.equal(body.provenance.remoteId,reportId);assert.equal(body.provenance.clientRequestId,body.report.requestId);assert.equal(body.provenance.persistenceStatus,'stored');
 const stored=h.writes.find(x=>x.table==='astrology_reports' && x.value.status==='completed');assert.ok(stored);assert.deepEqual(stored.value.interpretation,body.report);assert.deepEqual(stored.filters,[['id',reportId],['user_id',user]]);assert.equal(h.finalizations[0].status,'ok');
 assert.ok(h.calls.findIndex(x=>x.kind==='finalize')>h.calls.findIndex(x=>x.table==='astrology_reports' && x.action==='update'));
});

test('Astrology invalid evidence is rejected before successful persistence; failed save finalizes error',async()=>{
 const output=fixture('valid-response');output.patterns[0].evidenceFactIds=['placement.invented'];
 const bad=harness('astrology',{generation:{text:JSON.stringify(Object.fromEntries(['headline','synthesis','evidenceFactIds','patterns','tensions','focusSections','reflectionQuestions','suggestedFollowUps'].map(key=>[key,output[key]])))}});const r=await bad.request();assert.equal(r.status,502);assert.equal(bad.finalizations[0].output.stage,'validation');assert.equal(bad.writes.some(x=>x.table==='astrology_reports' && x.value.status==='completed'),false);
 const failed=harness('astrology',{persistError:true});const f=await failed.request();assert.equal(f.status,503);assert.equal(failed.finalizations[0].status,'error');assert.equal(failed.finalizations[0].output.stage,'persist');
});

test('Astrology authentication and request correlation fail before provider or report creation',async()=>{
 const denied=harness('astrology',{unauthorized:true});assert.equal((await denied.request()).status,401);assert.equal(denied.generations.length,0);assert.equal(denied.writes.length,0);
 const bad=harness('astrology');assert.equal((await bad.request({correlation:{clientRequestId:'different_request'}})).status,400);assert.equal(bad.generations.length,0);assert.equal(bad.writes.length,0);
});

test('Tarot uses canonical card facts instead of user-provided meanings at the actual provider boundary',async()=>{
 const input=clone(tarotInput);input.selectedCards[0].name={en:'Injected card'};input.selectedCards[0].uprightMeaning={en:'Injected command'};input.selectedCards[0].positionKey='spoof';
 const h=harness('tarot');assert.equal((await h.request({input})).status,200);const context=JSON.parse(h.generations[0].messages[0].content);assert.equal(context.selectedCards[0].name.en,'The Fool');assert.notEqual(context.selectedCards[0].uprightMeaning.en,'Injected command');assert.equal(context.selectedCards[0].positionKey,'daily');
});

for(const feature of ['tarot','astrology']) test(`${feature} receipt carries server-observed owner, versions and exact section IDs after finalization`,async()=>{
 const h=harness(feature);const {status,body}=await h.request();assert.equal(status,200);assert.equal(h.receipts.length,1);
 const receipt=h.receipts[0];assert.equal(receipt.userId,user);assert.equal(body.provenance.answerReceiptId,'00000000-0000-4000-8000-000000000009');
 for(const key of ['interactionId','attemptId','clientRequestId','feature','sourceKind','validationStatus','persistenceStatus','remoteId','traceId','providerRequestId','promptVersionId','promptVersion','promptAssemblyVersion','routeVersionId','routeVersion','contentVersion','calculationVersion','chartContractVersion','reportRevision'])assert.deepEqual(receipt[key],body.provenance[key],key);
 const expected=feature==='tarot'?['summary','reflection',...body.sections.map(s=>s.key)]:['summary',...body.report.patterns.map(s=>`patterns:${s.id}`),...body.report.tensions.map(s=>`tensions:${s.id}`),...body.report.focusSections.map(s=>`focusSections:${s.id}`),...body.report.reflectionQuestions.map((_,index)=>`reflection:${index}`)];assert.deepEqual(receipt.sectionIds,expected);
 assert.ok(h.calls.findIndex(x=>x.kind==='receipt')>h.calls.findIndex(x=>x.kind==='finalize'));
 assert.equal('question' in receipt,false);assert.equal('summary' in receipt,false);assert.equal('facts' in receipt,false);
 const linked=h.writes.find(x=>x.action==='update'&&(x.value.interpretation?.provenance?.answerReceiptId||x.value.input_summary?.answerProvenance?.answerReceiptId));
 assert.ok(linked,'server reading retains receipt link for later reopen');
 assert.deepEqual(linked.filters,[['id',feature==='tarot'?readingId:reportId],['user_id',user]]);
});

for(const feature of ['tarot','astrology']) test(`${feature} receipt enrichment failure preserves completed answer`,async()=>{
 const h=harness(feature,{receiptEnrichmentThrows:true});const {status,body}=await h.request();assert.equal(status,200);assert.equal(body.provenance.sourceKind,'ai');assert.ok(body.provenance.answerReceiptId);assert.equal(body.provenance.persistenceStatus,'stored');
});

for(const feature of ['tarot','astrology']) test(`${feature} unavailable receipt keeps valid answer without inventing verified receipt`,async()=>{
 const h=harness(feature,{receiptUnavailable:true});const {status,body}=await h.request();assert.equal(status,200);assert.equal(body.provenance.sourceKind,'ai');assert.equal(body.provenance.answerReceiptId,undefined);assert.equal(h.receipts.length,1);assert.equal(h.finalizations[0].status,'ok');
});

for(const feature of ['tarot','astrology']) test(`${feature} complete JSON with provider length termination is still rejected`,async()=>{
 const h=harness(feature,{generation:{finishReason:'length'}});const {status,body}=await h.request();
 if(feature==='tarot'){assert.equal(status,200);assert.equal(body.moderationStatus,'fallback');assert.equal(body.provenance.validationStatus,'rejected');assert.deepEqual(body.sections,[]);}else{assert.equal(status,502);assert.equal(body.error.code,'invalid_model_response');assert.equal(h.receipts.length,0);}
 assert.equal(h.finalizations[0].status,'error');
});

test('Tarot telemetry transport failure after saved answer is best effort and preserves successful response',async()=>{
 const h=harness('tarot',{usageThrows:true});const {status,body}=await h.request();assert.equal(status,200);assert.equal(body.moderationStatus,'passed');assert.equal(body.provenance.persistenceStatus,'stored');assert.deepEqual(body.sections,tarotOutput.sections);assert.equal(h.finalizations[0].status,'ok');assert.equal(h.finalizations[0].output.usageRecorded,false);assert.equal(h.receipts.length,1);
});

test('Astrology persists answer provenance alongside, outside the strict interpretation contract',async()=>{
 const h=harness('astrology');const {status,body}=await h.request();assert.equal(status,200);
 const saved=h.writes.find(x=>x.table==='astrology_reports' && x.value.status==='completed').value;
 assert.equal('provenance' in saved.interpretation,false);assert.equal('answerProvenance' in saved.interpretation,false);
 const provenance=saved.input_summary.answerProvenance;assert.ok(provenance);for(const key of ['interactionId','attemptId','clientRequestId','routeVersionId','routeVersion','promptVersionId','promptVersion','promptAssemblyVersion','remoteId','calculationVersion','chartContractVersion','reportRevision'])assert.equal(provenance[key],body.provenance[key]);
 assert.equal(provenance.answerReceiptId,undefined,'receipt is produced after report persistence; linked receipt remains a separate authoritative record');
});
