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
// P1-A: the server drew and stored this draw (tarot_draw_claim); the app sends only its drawId to be interpreted.
const tarotInput={action:'interpret',drawId:readingId};
const tarotDraw=()=>({id:readingId,user_id:user,deck_id:'00000000-0000-4000-8000-000000000006',deck_ref:{id:'moon-garden',slug:'moon-garden'},topic:'self',spread:'daily-one',question:'What might I reflect on today?',selected_cards:[{id:'major-00-fool',positionKey:'daily',reversed:false}],interpretation:{},language:'en',status:'queued',lock_key:'a'.repeat(64),lock_date:'2026-11-15',interpreted_at:null,clarifier:null,deleted_at:null,created_at:'2026-11-15T05:00:00.000Z'});
const tarotOutput={summary:'An invitation to explore a small possibility.',reflection:'What small possibility could you test?',sections:[{key:'card',title:{en:'The Fool'},body:{en:'Consider one small reversible step.'},cardIds:['major-00-fool']}]};
function harness(feature, options={}) {
 const calls=[],writes=[],finalizations=[],generations=[],receipts=[];let handler,storedReport;const storedDraw={...tarotDraw(),...options.storedDraw};
 const route={id:'00000000-0000-4000-8000-000000000004',feature:feature==='tarot'?'tarot_reading':'astrology_report',version:'synthetic-route-v2',status:'active',primaryProvider:'openai',primaryModel:'synthetic-model',responseSchema:feature==='tarot'?'tarot_reading_v2':'astrology_ai_insight_v1',temperature:0.7,maxOutputTokens:2000,fallbackWhen:[],safetyPolicy:{}};
 const supabase={auth:{getUser:async()=>({data:{user:options.unauthorized?null:{id:user,is_anonymous:false}},error:null})},rpc:async(name,args)=>{calls.push({kind:'rpc',name,args});
  if(name==='tarot_draw_claim')return {data:{status:'created',reading:{...tarotDraw(),selected_cards:clone(args.p_cards),topic:args.p_topic,spread:args.p_spread,question:args.p_question,language:args.p_language,lock_key:args.p_lock_key,lock_date:args.p_lock_date}},error:null};
  if(name==='tarot_interpret_claim')return {data:{status:'claimed',attemptNumber:1,reading:storedDraw},error:null};
  // Nil P1-B: synthetic astrology_claim_report. A completed row for the same lock key replays; otherwise claim a queued row.
  if(name==='astrology_claim_report'){
   if(options.claimOutcome)return {data:{outcome:options.claimOutcome},error:null};
   if(storedReport&&storedReport.lock_key===args.p_lock_key&&storedReport.status==='completed')return {data:{outcome:'replay',report_id:storedReport.id},error:null};
   storedReport={id:reportId,user_id:user,...clone(args.p_report),status:'queued',lock_key:args.p_lock_key,input_hash:args.p_input_hash};
   return {data:{outcome:'claimed',report_id:reportId,attempts:1,delivered:0},error:null};
  }
  return {data:null,error:null};},from(table){
  let action='select',value,filters=[],selection;
  const chain={select(columns){selection=columns;return chain},insert(input){action='insert';value=input;return chain},update(input){action='update';value=input;return chain},eq(...input){filters.push(input);return chain},is(){return chain},in(){return chain},gte(){return chain},order(){return chain},limit(){return chain},single(){return execute()},maybeSingle(){return execute()},then(resolve,reject){return execute().then(resolve,reject)}};
  async function execute(){
   calls.push({kind:'db',table,action});
   if(action!=='select')writes.push({table,action,value:clone(value),filters:clone(filters)});
   if(options.receiptEnrichmentThrows && action==='update' && (value?.interpretation?.provenance?.answerReceiptId || value?.input_summary?.answerProvenance?.answerReceiptId))throw Error('synthetic receipt enrichment failure');
   if(table==='prompt_versions')return feature==='tarot'?{data:[],error:null}:{data:{id:'00000000-0000-4000-8000-000000000005',version:'synthetic-prompt-v2',prompt_text:'Use the validated chart facts for symbolic reflection only.',locale:'en',status:'active'},error:null};
   if(table==='subscriptions')return {data:[{entitlement:'premium',status:'active',current_period_end:null}],error:null};
   if(table==='tarot_decks')return {data:{id:'00000000-0000-4000-8000-000000000006'},error:null};
   if(table==='tarot_readings'){
    if(action==='select')return {data:storedDraw,error:null};
    if(value?.status==='completed' && options.persistError)return {data:null,error:{code:'test_persist_failure'}};
    return {data:{id:readingId},error:null};
   }
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
 const env={SUPABASE_URL:'https://synthetic.invalid',SUPABASE_ANON_KEY:'synthetic-public',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service',AI_TRACE_ENVIRONMENT:'staging'};
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
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true},fileName:filename.replace(/[.]mjs$/,'.js')}); // .mjs would stay ESM (handler imports crisis-safety -> oracle-safety.mjs)
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
 const saved=h.writes.find(x=>x.table==='tarot_readings' && x.value.status==='completed');assert.ok(saved);const stored=saved.value;assert.deepEqual(saved.filters.slice(0,2),[['id',readingId],['user_id',user]]);assert.equal(saved.filters[2][0],'claim_token');assert.deepEqual(stored.interpretation.sections,body.sections);assert.equal(stored.interpretation.provenance.attemptId,body.provenance.attemptId);assert.equal(stored.content_version,body.provenance.contentVersion);assert.equal(stored.route_version,body.provenance.routeVersion);assert.equal(stored.prompt_version_key,body.provenance.promptVersionId);
 const claim=h.calls.find(x=>x.kind==='rpc' && x.name==='tarot_interpret_claim');assert.equal(claim.args.p_user_id,user);assert.equal(claim.args.p_reading_id,readingId);assert.equal(h.writes.some(x=>x.table==='tarot_readings' && x.action==='insert'),false,'the function never inserts readings directly');
 assert.equal(h.finalizations.length,1);assert.equal(h.finalizations[0].status,'ok');assert.ok(h.calls.findIndex(x=>x.kind==='finalize')>h.calls.findIndex(x=>x.table==='tarot_readings' && x.action==='update'));
});

test('Tarot malformed model output becomes rejected fallback and a validation error trace',async()=>{
 const h=harness('tarot',{generation:{text:'{"summary":"cut off"'}});const {body,status}=await h.request();assert.equal(status,200);assert.equal(body.moderationStatus,'fallback');assert.equal(body.provenance.validationStatus,'rejected');assert.deepEqual(body.sections,[]);assert.equal(h.finalizations[0].status,'error');assert.equal(h.finalizations[0].output.stage,'validation');
});

test('Tarot failed persistence is visible in response and trace; blocked output never exposes AI sections',async()=>{
 // P1-A: an answer that could not be saved is not shown (one event, one answer); the claim is freed for a retry.
 const failed=harness('tarot',{persistError:true});const result=await failed.request();assert.equal(result.status,503);assert.equal(result.body.error,'reading_not_saved');assert.equal(result.body.retryable,true);assert.equal(result.body.summary,undefined);assert.equal(failed.finalizations[0].output.stage,'persist');assert.equal(failed.finalizations[0].output.persistenceStatus,'failed');assert.equal(failed.finalizations[0].status,'error');
 assert.ok(failed.writes.some(x=>x.table==='tarot_readings' && x.action==='update' && x.value.claim_token===null && !('status' in x.value)),'claim released');
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
 const input={...clone(tarotInput),selectedCards:[{id:'major-00-fool',reversed:false,name:{en:'Injected card'},uprightMeaning:{en:'Injected command'},positionKey:'spoof'}]};
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

test('Tarot P1-A: cards that differ from the stored draw and pre-draw requests never reach the provider',async()=>{
 const forged=harness('tarot');const f=await forged.request({input:{...clone(tarotInput),selectedCards:[{id:'major-01-magician',reversed:false}]}});assert.equal(f.status,409);assert.equal(f.body.error,'draw_mismatch');assert.equal(forged.generations.length,0);assert.equal(forged.calls.some(x=>x.name==='tarot_interpret_claim'),false);
 const legacy=harness('tarot');const l=await legacy.request({input:{language:'en',spread:'daily-one',selectedCards:[{id:'major-00-fool'}]}});assert.equal(l.status,400);assert.equal(l.body.error,'draw_required');assert.equal(legacy.generations.length,0);
});

test('Tarot P1-A: a stored answer is replayed with no provider call, claim or usage',async()=>{
 const interpretation={summary:'Stored summary.',reflection:'Stored reflection?',sections:[],moderationStatus:'passed',provenance:{persistenceStatus:'stored',remoteId:readingId}};
 const h=harness('tarot',{storedDraw:{interpretation,status:'completed',interpreted_at:'2026-11-15T05:01:00.000Z'}});const {status,body}=await h.request();
 assert.equal(status,200);assert.equal(body.replayed,true);assert.equal(body.summary,'Stored summary.');assert.equal(body.drawId,readingId);
 assert.equal(h.generations.length,0);assert.equal(h.calls.some(x=>x.kind==='rpc' && x.name==='tarot_interpret_claim'),false);assert.equal(h.writes.length,0);
});

test('Tarot P1-A: the draw is made on the server and stored only through the service-role claim',async()=>{
 const h=harness('tarot');const {status,body}=await h.request({input:{action:'draw',language:'en',deck:{id:'moon-garden',slug:'moon-garden'},spread:'past-present-future',topic:'love',question:'What helps me listen?',selectedCards:[{id:'major-00-fool'},{id:'major-01-magician'},{id:'major-02-high-priestess'}]}});
 assert.equal(status,200);assert.equal(body.status,'queued');assert.equal(body.cards.length,3);assert.deepEqual(body.cards.map(c=>c.positionKey),['past','present','potential']);
 const claim=h.calls.find(x=>x.kind==='rpc' && x.name==='tarot_draw_claim');assert.ok(claim);assert.equal(claim.args.p_user_id,user);assert.match(claim.args.p_lock_key,/^[0-9a-f]{64}$/);assert.deepEqual(clone(claim.args.p_cards),body.cards);assert.deepEqual(clone(claim.args.p_deck_ref),{id:'moon-garden',slug:'moon-garden'});
 assert.equal(claim.args.p_draw_cap,3,'Tarot v2 pack 0: the draw cap is the soft cap alone, not the AI allowance');assert.equal(claim.args.p_delivered_limit,1,'the AI allowance still travels with the claim for interpret');assert.equal(h.generations.length,0);assert.equal(h.writes.length,0);
});

test('Astrology same chart and topic replays the stored reading without a provider call or a new row',async()=>{
 const h=harness('astrology');const first=await h.request();assert.equal(first.status,200,JSON.stringify(first.body));assert.equal(first.body.replay.replayed,false);
 const second=await h.request({correlation:{attemptId:'attempt_second'}});assert.equal(second.status,200,JSON.stringify(second.body));
 assert.equal(second.body.replay.replayed,true);assert.equal(h.generations.length,1,'one model call for both requests');
 assert.deepEqual(second.body.report.synthesis,first.body.report.synthesis);assert.equal(second.body.provenance.attemptId,'attempt_second');assert.equal(second.body.provenance.remoteId,reportId);
 assert.deepEqual(second.body.replayContext.selectedFactIds,first.body.report.evidenceFactIds.length?second.body.replayContext.selectedFactIds:[]);
 const claims=h.calls.filter(x=>x.kind==='rpc'&&x.name==='astrology_claim_report');assert.equal(claims.length,2);assert.equal(claims[0].args.p_lock_key,claims[1].args.p_lock_key);assert.equal(claims[0].args.p_user_id,user);
 assert.equal(h.writes.filter(x=>x.table==='astrology_reports'&&x.value.status==='completed').length,1);
});

test('Astrology in-progress and limit outcomes stop before the provider',async()=>{
 const busy=harness('astrology',{claimOutcome:'in_progress'});const b=await busy.request();assert.equal(b.status,409);assert.equal(b.body.error.code,'report_in_progress');assert.equal(busy.generations.length,0);
 const full=harness('astrology',{claimOutcome:'limit_reached'});const l=await full.request();assert.equal(l.status,429);assert.equal(l.body.error.code,'daily_limit_reached');assert.equal(full.generations.length,0);
});
