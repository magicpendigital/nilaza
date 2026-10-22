import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const repository=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const studioDirectory='packages/growth-nilaza/youtube';
const hashPattern=/^sha256:[a-f0-9]{64}$/;
const channelPattern=/^UC[A-Za-z0-9_-]{22}$/;
const safeId=/^[a-z][a-z0-9_-]{2,100}$/;
const sourcePaths=['packages/growth-core/config/growth-agent-catalog.json','packages/growth-core/config/quality-gates.json','packages/growth-core/config/agent-runner-contract.json','packages/growth-nilaza/product-truth.json','packages/growth-nilaza/brand-pack.json','packages/growth-nilaza/business-pack.json','packages/growth-nilaza/role-mapping.json','packages/content/data/brand-identity.json','docs/BRAND_GUIDELINES.md','packages/growth-runtime/runtime.mjs','packages/growth-runtime/renderer.mjs'];
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
export const hash=value=>'sha256:'+crypto.createHash('sha256').update(JSON.stringify(canonical(value??null))).digest('hex');
const rawHash=bytes=>'sha256:'+crypto.createHash('sha256').update(bytes).digest('hex');
const json=(root,relative)=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
const parseTime=value=>{
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return NaN;
  const parsed=Date.parse(value);
  if(!Number.isFinite(parsed)) return NaN;
  return new Date(parsed).toISOString()===(value.includes('.')?value:value.replace('Z','.000Z'))?parsed:NaN;
};
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const safePath=(value,prefix)=>typeof value==='string'&&value.startsWith(prefix+'/')&&!/[\\\0:]/.test(value)&&value.split('/').every(part=>part&&part!=='.'&&part!=='..');
const expiryValid=(date,now)=>validDate(date)&&Date.parse(date+'T23:59:59Z')>now;
export const sourceFingerprint=context=>hash({studio:context.config,brief:context.brief,weeklyPolicy:context.policy,adapterContract:context.adapter,roles:context.roles,sources:context.sources,metrics:context.metrics});

export function loadContext(root=repository) {
  const config=json(root,studioDirectory+'/studio.json');
  if(!Array.isArray(config.sourceBindings)||config.sourceBindings.length!==sourcePaths.length) throw new Error('SOURCE_BINDINGS_INVALID');
  const actualPaths=config.sourceBindings.map(x=>x.path);
  if(new Set(actualPaths).size!==sourcePaths.length||sourcePaths.some(x=>!actualPaths.includes(x))) throw new Error('SOURCE_BOUNDARY_INVALID');
  for(const source of config.sourceBindings) {
    if(!hashPattern.test(source.sha256)||rawHash(fs.readFileSync(path.join(root,source.path)))!==source.sha256) throw new Error('SOURCE_DRIFT:'+source.path);
  }
  const context={root,config,catalog:json(root,sourcePaths[0]),quality:json(root,sourcePaths[1]),runner:json(root,sourcePaths[2]),truth:json(root,sourcePaths[3]),brand:json(root,sourcePaths[4]),business:json(root,sourcePaths[5])};
  for(const [key,file] of Object.entries({brief:'brand-brief.json',policy:'weekly-policy.json',adapter:'adapter-contract.json',ledger:'content-ledger.json',metrics:'metric-contract.json',roles:'role-briefs.json',sources:'source-register.json'})) context[key]=json(root,studioDirectory+'/'+file);
  const result=validateStudio(context);
  if(result.errors.length) throw new Error('STUDIO_INVALID:'+result.errors.join(','));
  for(const role of context.roles.roles) if(!fs.statSync(path.join(root,studioDirectory,role.brief)).isFile()) throw new Error('ROLE_BRIEF_MISSING');
  return context;
}

export function activationBlockers(context) {
  const c=context.config;
  const blockers=['EXTERNAL_EXECUTION_DISABLED','CONTENTOPS_ADAPTER_NOT_BOUND','VIDEO_RENDERER_NOT_IMPLEMENTED','PROVIDER_DISPATCH_NOT_CONFIGURED','LIVE_CHANNEL_DEVICE_ACCESSIBILITY_URL_CONSENT_GATES_PENDING'];
  if(!channelPattern.test(c.channel.id||'')) blockers.push('NILAZA_CHANNEL_ID_NOT_PINNED');
  if(!c.channel.url) blockers.push('NILAZA_CHANNEL_URL_MISSING');
  if(c.channel.oauthVerification!=='verified') blockers.push('OAUTH_CHANNEL_IDENTITY_UNVERIFIED');
  if(c.channel.apiProjectAudit!=='verified') blockers.push('API_PROJECT_PUBLIC_UPLOAD_CAPABILITY_UNVERIFIED');
  if(c.channel.tokenLifecycleVerification!=='verified') blockers.push('OAUTH_TOKEN_LIFECYCLE_UNVERIFIED');
  if(!c.budget.approved||!Number.isFinite(c.budget.weeklyCapUSD)||!Number.isFinite(c.budget.perVideoCapUSD)) blockers.push('API_BUDGET_NOT_APPROVED');
  if(context.policy.ownerApproved!==true) blockers.push('WEEKLY_CADENCE_NOT_OWNER_APPROVED');
  return blockers;
}

export function validateStudio(context) {
  const errors=[]; const c=context.config;
  for(const document of [c,context.brief,context.policy,context.adapter,context.ledger,context.metrics,context.roles,context.sources,context.truth,context.brand,context.business]) if(document?.tenantId!=='nilaza') errors.push('TENANT_MISMATCH');
  if(c.namespace!=='nilaza.youtube'||c.mode!=='dry_run_only'||c.enabled!==false||c.externalAuthority!=='none'||c.providerDispatch!=='disabled'||c.schedulerActivation!==false||c.killSwitch!==true) errors.push('EXECUTION_BOUNDARY_CHANGED');
  if(c.roots.output!=='.local/nilaza-youtube/outputs'||c.roots.assets!==studioDirectory+'/assets'||c.roots.editorialLedger!==studioDirectory+'/content-ledger.json'||c.roots.queueAuthority!=='contentops:nilaza.youtube') errors.push('NAMESPACE_PATH_MISMATCH');
  const ids=context.roles.roles?.map(x=>x.roleId)||[];
  if(ids.length!==8||new Set(ids).size!==8||context.catalog.agents.some(x=>!ids.includes(x.id))) errors.push('CANONICAL_ROLE_SET_MISMATCH');
  if(context.roles.roles?.some(x=>x.brief!==`roles/${x.roleId}.md`)) errors.push('ROLE_BRIEF_PATH_INVALID');
  if(context.adapter.implementationStatus!=='contract_only_consumer_acceptance_pending'||context.adapter.queueOwner!=='ContentOps'||context.ledger.authority!=='ContentOps'||context.ledger.namespace!==c.namespace||!Array.isArray(context.ledger.items)) errors.push('CONTENTOPS_BOUNDARY_INVALID');
  if(context.policy.timezone!=='Asia/Ho_Chi_Minh'||context.policy.utcOffsetMinutes!==420||context.policy.schedulerState!=='not_activated'||!Number.isSafeInteger(context.policy.minimumLeadHours)||context.policy.minimumLeadHours<24||!Number.isSafeInteger(context.policy.maximumVideosPerWeek)||context.policy.maximumVideosPerWeek<1||context.policy.maximumVideosPerWeek>2||context.policy.slots.length>context.policy.maximumVideosPerWeek||context.policy.maximumByFormat?.short!==1||context.policy.maximumByFormat?.long!==1||context.policy.slots.filter(x=>x.format==='short').length>1||context.policy.slots.filter(x=>x.format==='long').length>1) errors.push('SCHEDULE_POLICY_INVALID');
  if(context.policy.slots.some(x=>!Number.isInteger(x.dayOffset)||x.dayOffset<0||x.dayOffset>6||!Number.isInteger(x.hourLocal)||x.hourLocal<0||x.hourLocal>23||!['short','long'].includes(x.format))) errors.push('SLOT_INVALID');
  if(c.channel.id!==null&&!channelPattern.test(c.channel.id)) errors.push('CHANNEL_ID_INVALID');
  if(c.budget.currency!=='USD'||c.budget.useProductApiBudget!==false||c.budget.useOtherTenantBudget!==false||c.budget.reserveThrough!=='ContentOps') errors.push('BUDGET_ISOLATION_INVALID');
  return {status:errors.length?'blocked':'configured_dry_run_only',errors:[...new Set(errors)],externalExecutionAllowed:false};
}

function claimErrors(context,refs,surface,now) {
  const errors=[];
  if(!Array.isArray(refs)||!refs.length) return ['CLAIM_REFERENCE_MISSING'];
  for(const ref of refs) {
    if(!ref||typeof ref!=='object') {errors.push('CLAIM_REFERENCE_INVALID');continue;}
    const feature=context.truth.features.find(x=>x.id===ref.featureId);
    const claim=feature?.claims.find(x=>x.id===ref.claimId);
    if(!claim||!claim.allowedSurfaces.includes(surface)) {errors.push('CLAIM_SURFACE_NOT_READY');continue;}
    if(!expiryValid(claim.expiresAt,now)) errors.push('CLAIM_EXPIRED');
    if(!claim.evidenceRefs?.length) errors.push('CLAIM_EVIDENCE_MISSING');
    for(const id of claim.evidenceRefs||[]) {
      const evidence=feature.evidence?.find(x=>x.id===id);
      if(!evidence?.reference||!expiryValid(evidence.expiresAt,now)) errors.push('CLAIM_EVIDENCE_MISSING_OR_EXPIRED');
    }
  }
  return errors;
}

export function planWeek(context,week,{now=new Date()}={}) {
  const time=now.getTime();
  if(!validDate(week)||new Date(week+'T00:00:00Z').getUTCDay()!==1||!Number.isFinite(time)) throw new Error('MONDAY_WEEK_AND_VALID_CLOCK_REQUIRED');
  const {config,policy,brief,ledger}=context;
  const plan=[],skipped=[];
  for(const [index,slot] of policy.slots.entries()) {
    const publishAt=new Date(Date.parse(week+'T00:00:00Z')+slot.dayOffset*86400000+slot.hourLocal*3600000-policy.utcOffsetMinutes*60000).toISOString();
    const contentId=`nilaza-yt-${week}-${slot.format}-${index+1}`;
    if(Date.parse(publishAt)<time+policy.minimumLeadHours*3600000) {skipped.push({contentId,publishAt,reason:'MISSED_OR_TOO_CLOSE_SLOT_NO_CATCH_UP'});continue;}
    if(ledger.items.some(x=>x.contentId===contentId&&x.state!=='cancelled')) {skipped.push({contentId,reason:'ALREADY_IN_CONTENTOPS_EDITORIAL_LEDGER'});continue;}
    const topic=brief.editorialTemplates[index%brief.editorialTemplates.length];
    const errors=claimErrors(context,topic.claimRefs,'public_organic_candidate',time);
    if(errors.length) {skipped.push({contentId,reason:'PRODUCT_TRUTH_BLOCKED',errors});continue;}
    plan.push({tenantId:'nilaza',namespace:config.namespace,contentId,revision:1,state:'planning_draft',format:slot.format,primaryLocale:'vi',secondaryTreatment:'en_subtitles_and_review_copy_not_automatic_duplicate_upload',topic:topic.title,audienceHypothesis:topic.audienceHypothesis,evidenceStatus:'editorial_hypothesis_not_customer_research',claimRefs:topic.claimRefs,proposedPublishAt:publishAt,timezone:policy.timezone,channelId:config.channel.id,sourceFingerprint:sourceFingerprint(context),productionOwner:'content_studio',qaOwner:'independent_qa',mediaStatus:'not_created',qaStatus:'not_run',ownerDecision:'not_submitted',estimatedCostUSD:null,idempotencyScope:{namespace:config.namespace,contentId,locale:'vi',channelId:config.channel.id},activation:'blocked'});
  }
  return {status:'draft_weekly_plan',tenantId:'nilaza',week,timezone:policy.timezone,cadenceEvidence:'proposal_not_active_schedule',sourceFingerprint:sourceFingerprint(context),plan,skipped,externalExecutionAllowed:false,activationBlockers:activationBlockers(context),queueCreated:false,providerCalls:0,schedulerActivated:false,publishedVideos:0,productKpiStatus:'not_collected',liveVideoCount:null};
}

export function candidateHash(candidate) {
  const fields=['tenantId','namespace','contentId','revision','locale','channelId','metadata','assets','claimRefs','sourceFingerprint','publishAt','initialPrivacy','everPublished','disclosure','budget','creators'];
  return hash({hashDomain:'nilaza-youtube-candidate-v1',...Object.fromEntries(fields.map(k=>[k,candidate[k]??null]))});
}
export function intentKey(candidate) {
  return hash({namespace:candidate.namespace,channelId:candidate.channelId,contentId:candidate.contentId,locale:candidate.locale});
}

// Offline lint of a future ContentOps envelope. Never authenticates, uploads or grants execution.
export function validateCandidate(context,p,{now=new Date(),ledger=context.ledger.items,observedChannelIds=[],uploadedChannelId=null}={}) {
  const errors=[];const t=now.getTime(),c=context.config;
  if(!p||typeof p!=='object'||Array.isArray(p)||!Number.isFinite(t)) return {lintStatus:'blocked',errors:['MALFORMED_PACKET_OR_CLOCK'],externalExecutionAllowed:false};
  if(p.tenantId!=='nilaza'||p.namespace!==c.namespace) errors.push('CROSS_TENANT_PACKET');
  if(!safeId.test(p.contentId||'')||!Number.isSafeInteger(p.revision)||p.revision<1||!['vi','en'].includes(p.locale)) errors.push('CONTENT_ID_VERSION_LOCALE_INVALID');
  if(!channelPattern.test(c.channel.id||'')||p.channelId!==c.channel.id) errors.push('CHANNEL_NOT_PINNED_OR_MISMATCH');
  if(observedChannelIds.length!==1||observedChannelIds[0]!==c.channel.id) errors.push('OAUTH_MINE_CHANNEL_MISMATCH');
  if(uploadedChannelId!==null&&uploadedChannelId!==c.channel.id) errors.push('UPLOADED_SNIPPET_CHANNEL_MISMATCH');
  if(p.sourceFingerprint!==sourceFingerprint(context)) errors.push('SOURCE_FINGERPRINT_STALE');
  const schedule=parseTime(p.publishAt);
  if(!Number.isFinite(schedule)||schedule<t+context.policy.minimumLeadHours*3600000) errors.push('PAST_OR_TOO_CLOSE_SCHEDULE');
  if(p.initialPrivacy!=='private'||p.everPublished!==false) errors.push('PRIVATE_NEVER_PUBLISHED_REQUIRED');
  errors.push(...claimErrors(context,p.claimRefs,'public_organic_candidate',t));
  const assets=Array.isArray(p.assets)?p.assets:[];
  const kinds=['video','thumbnail','audio','captions'];
  if(assets.length!==4||kinds.some(kind=>assets.filter(a=>a?.kind===kind).length!==1)) errors.push('FINAL_MEDIA_PACKAGE_INCOMPLETE');
  for(const asset of assets) {
    if(!asset||typeof asset!=='object') {errors.push('MALFORMED_ASSET');continue;}
    if(!hashPattern.test(asset.sha256||'')||!safePath(asset.path,c.roots.output)) errors.push('ASSET_HASH_OR_TENANT_PATH_INVALID');
    const rights=asset.rights;
    if(!rights||rights.tenantId!=='nilaza'||rights.assetHash!==asset.sha256||!['owned','licensed','public_domain'].includes(rights.permission)||!Array.isArray(rights.allowedUses)||!rights.allowedUses.includes('youtube')||!safePath(rights.evidenceRef,c.roots.assets)||(rights.expiresAt!==null&&!expiryValid(rights.expiresAt,t))) errors.push('RIGHTS_UNVERIFIED_OR_CROSS_TENANT');
  }
  if(!p.metadata||typeof p.metadata.title!=='string'||!p.metadata.title.trim()||typeof p.metadata.description!=='string'||!p.metadata.description.trim()||p.metadata.madeForKidsAssessment!=='reviewed_not_child_directed') errors.push('METADATA_OR_AUDIENCE_REVIEW_MISSING');
  if(typeof p.disclosure?.containsSyntheticMedia!=='boolean'||typeof p.disclosure?.requiresDisclosure!=='boolean'||!p.disclosure?.assessmentRef||p.disclosure.requiresDisclosure&&p.disclosure.containsSyntheticMedia!==true) errors.push('DISCLOSURE_ASSESSMENT_MISSING_OR_CONTRADICTED');
  if(!Array.isArray(p.creators)||!p.creators.length||p.creators.some(x=>!x.agentId||!x.sessionId)) errors.push('CREATOR_PROVENANCE_MISSING');
  const artHash=candidateHash(p),qa=p.qa;
  const authors=Array.isArray(p.creators)?p.creators:[];
  if(!qa||qa.verdict!=='pass'||qa.role!=='independent_qa'||!qa.agentId||!qa.sessionId||authors.some(x=>x.agentId===qa.agentId||x.sessionId===qa.sessionId)) errors.push('INDEPENDENT_QA_REQUIRED');
  if(qa?.artifactHash!==artHash||qa?.sourceFingerprint!==p.sourceFingerprint||!Number.isFinite(parseTime(qa?.reviewedAt))||parseTime(qa?.reviewedAt)>t) errors.push('QA_BINDING_STALE');
  const dimensions=context.quality.softDimensions,scores=qa?.softScores||{},values=dimensions.map(d=>scores[d]);
  const gate=context.quality.internalLibraryThreshold;
  if(!Array.isArray(qa?.hardFailureCodes)||qa.hardFailureCodes.length||Object.keys(scores).length!==dimensions.length||values.some(v=>!Number.isInteger(v)||v<gate.minimumDimensionScore||v>4)||values.reduce((a,b)=>a+(Number.isFinite(b)?b:0),0)/dimensions.length<gate.minimumMeanScore) errors.push('QA_QUALITY_GATE_FAILED');
  const approval=p.approval;
  if(!approval||approval.decision!=='approved_execution_envelope'||approval.artifactHash!==artHash||approval.qaHash!==hash(qa)||approval.channelId!==p.channelId||approval.publishAt!==p.publishAt||approval.budgetCapUSD!==c.budget.perVideoCapUSD||!approval.ownerReference||!Number.isFinite(parseTime(approval.expiresAt))||parseTime(approval.expiresAt)<=Math.max(t,schedule)) errors.push('EXACT_OWNER_APPROVAL_MISSING_OR_STALE');
  const b=p.budget;
  if(!c.budget.approved||!Number.isFinite(c.budget.perVideoCapUSD)||!Number.isFinite(c.budget.weeklyCapUSD)||!b||!Number.isFinite(b.estimatedCostUSD)||b.estimatedCostUSD<0||!Number.isFinite(b.weekCommittedUSD)||b.weekCommittedUSD<0) errors.push('COST_OR_BUDGET_UNKNOWN');
  else if(b.estimatedCostUSD>c.budget.perVideoCapUSD||b.weekCommittedUSD+b.estimatedCostUSD>c.budget.weeklyCapUSD) errors.push('BUDGET_EXCEEDED');
  if(b?.reservationAuthority!=='ContentOps'||!b?.reservationReference) errors.push('CONTENTOPS_BUDGET_RESERVATION_REQUIRED');
  const key=intentKey(p),media=assets.find(x=>x?.kind==='video')?.sha256;
  if(!Array.isArray(ledger)||ledger.some(x=>!x||typeof x!=='object')) errors.push('AUTHORITATIVE_LEDGER_MISSING');
  else if(ledger.some(x=>x.namespace===c.namespace&&x.channelId===p.channelId&&x.state!=='cancelled'&&(x.intentKey===key||x.contentId===p.contentId&&x.locale===p.locale||media&&x.videoSha256===media))) errors.push('DUPLICATE_OR_UNRESOLVED_INTENT');
  if(p.executionResultState==='unknown'||p.executionResultState==='reconciliation_required') errors.push('UNKNOWN_UPLOAD_REQUIRES_RECONCILIATION');
  return {lintStatus:errors.length?'blocked':'pass_offline_only',errors:[...new Set(errors)],candidateHash:artHash,idempotencyKey:key,externalExecutionAllowed:false,activationBlockers:activationBlockers(context),evidenceBoundary:'Supplied metadata lint only; rights/OAuth/approval and atomic reservation still require authenticated ContentOps verification.'};
}

export function classifyReceipt(context,receipt) {
  if(receipt?.state==='unknown'||typeof receipt?.videoId!=='string'||!receipt.videoId) return {state:'reconciliation_required',retryInsertAllowed:false,externalExecutionAllowed:false};
  if(!channelPattern.test(context.config.channel.id||'')||receipt.tenantId!=='nilaza'||receipt.namespace!==context.config.namespace||receipt.snippet?.channelId!==context.config.channel.id) return {state:'halt_channel_mismatch',retryInsertAllowed:false,externalExecutionAllowed:false};
  return {state:'adapter_reported_result_live_verification_pending',retryInsertAllowed:false,externalExecutionAllowed:false};
}

function main() {
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--week') throw new Error('USAGE: node scripts/nilaza-youtube-dry-run.mjs --week YYYY-MM-DD');
  console.log(JSON.stringify(planWeek(loadContext(),args[1]),null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {main();} catch(error) {console.error(JSON.stringify({status:'blocked',code:error.message,externalExecutionAllowed:false}));process.exitCode=1;}
}
