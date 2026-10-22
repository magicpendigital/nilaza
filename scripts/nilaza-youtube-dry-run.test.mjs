import test from 'node:test';
import assert from 'node:assert/strict';
import {loadContext,validateStudio,planWeek,validateCandidate,candidateHash,intentKey,sourceFingerprint,classifyReceipt,hash} from './nilaza-youtube-dry-run.mjs';
const now=new Date('2026-10-05T00:00:00Z');
const live=loadContext();
function fixture() {
  const context=structuredClone(live);
  context.config.channel.id='UC'+'N'.repeat(22);
  context.config.budget.approved=true;
  context.config.budget.perVideoCapUSD=5;
  context.config.budget.weeklyCapUSD=15;
  const assets=['video','thumbnail','audio','captions'].map(kind=>{const sha256=hash('synthetic-fixture-'+kind);return {kind,path:context.config.roots.output+'/fixture/'+kind+'.bin',sha256,rights:{tenantId:'nilaza',assetHash:sha256,permission:'owned',allowedUses:['youtube'],evidenceRef:context.config.roots.assets+'/fixture-rights.json',expiresAt:null}};});
  const candidate={tenantId:'nilaza',namespace:'nilaza.youtube',contentId:'nilaza-yt-test-only',revision:1,locale:'vi',channelId:context.config.channel.id,sourceFingerprint:sourceFingerprint(context),metadata:{title:'Synthetic fixture; not a video',description:'No actual customer, license, OAuth or approval evidence.',madeForKidsAssessment:'reviewed_not_child_directed'},assets,claimRefs:[{featureId:'nilaza_open_reflection_brand',claimId:'nilaza_space_for_reflection'}],publishAt:'2026-10-06T13:00:00Z',initialPrivacy:'private',everPublished:false,disclosure:{requiresDisclosure:false,containsSyntheticMedia:false,assessmentRef:'synthetic-fixture-assessment'},creators:[{agentId:'fixture-author',sessionId:'fixture-author-session'}],budget:{estimatedCostUSD:2,weekCommittedUSD:0,reservationAuthority:'ContentOps',reservationReference:'synthetic-reservation-not-real'}};
  bind(context,candidate);
  return {context,candidate,options:{now,ledger:[],observedChannelIds:[context.config.channel.id]}};
}
function bind(context,p) {
  p.qa={role:'independent_qa',agentId:'fixture-independent-reviewer',sessionId:'fixture-qa-session',verdict:'pass',artifactHash:candidateHash(p),sourceFingerprint:p.sourceFingerprint,reviewedAt:'2026-10-04T12:00:00Z',hardFailureCodes:[],softScores:Object.fromEntries(context.quality.softDimensions.map(x=>[x,4]))};
  p.approval={decision:'approved_execution_envelope',artifactHash:candidateHash(p),qaHash:hash(p.qa),channelId:p.channelId,publishAt:p.publishAt,budgetCapUSD:context.config.budget.perVideoCapUSD,ownerReference:'synthetic-fixture-only',expiresAt:'2026-10-08T00:00:00Z'};
}
const check=f=>validateCandidate(f.context,f.candidate,f.options);
test('real studio reuses eight roles, has no activation and no budget/channel assumptions',()=>{
  assert.deepEqual(validateStudio(live).errors,[]);assert.equal(live.roles.roles.length,8);
  assert.equal(live.config.channel.id,null);assert.equal(live.config.budget.weeklyCapUSD,null);
  const p=planWeek(live,'2026-10-05',{now});assert.equal(p.plan.length,2);
  assert.ok(p.activationBlockers.includes('CONTENTOPS_ADAPTER_NOT_BOUND'));assert.equal(p.externalExecutionAllowed,false);assert.equal(p.queueCreated,false);
});
test('weekly draft is deterministic, timezone-correct, bounded and distinguishes missing KPI',()=>{
  const a=planWeek(live,'2026-10-05',{now}),b=planWeek(live,'2026-10-05',{now});assert.deepEqual(a,b);
  assert.equal(a.plan[0].proposedPublishAt,'2026-10-08T13:00:00.000Z');assert.equal(a.liveVideoCount,null);assert.equal(a.productKpiStatus,'not_collected');assert.ok(a.plan.every(x=>x.mediaStatus==='not_created'));
});
test('missed slots do not catch up or create immediate publication',()=>{
  const p=planWeek(live,'2026-10-05',{now:new Date('2026-10-12T00:00:00Z')});assert.equal(p.plan.length,0);assert.equal(p.skipped.length,2);
  assert.throws(()=>planWeek(live,'2026-10-06',{now}),/MONDAY/);assert.throws(()=>planWeek(live,'2026-02-30',{now}),/MONDAY/);
});
test('existing editorial ledger skips the same weekly content ID',()=>{
  const c=structuredClone(live);c.ledger.items=[{contentId:'nilaza-yt-2026-10-05-short-1',state:'planned'}];assert.equal(planWeek(c,'2026-10-05',{now}).plan.length,1);
});
test('a fully synthetic envelope can pass offline lint but can never execute',()=>{
  const r=check(fixture());assert.deepEqual(r.errors,[]);assert.equal(r.lintStatus,'pass_offline_only');assert.equal(r.externalExecutionAllowed,false);assert.ok(r.activationBlockers.length);
});
test('channel mismatch is rejected before and after hypothetical upload',()=>{
  const f=fixture();f.options.observedChannelIds=['UC'+'M'.repeat(22)];assert.ok(check(f).errors.includes('OAUTH_MINE_CHANNEL_MISMATCH'));
  f.options.observedChannelIds=[f.context.config.channel.id];f.options.uploadedChannelId='UC'+'M'.repeat(22);assert.ok(check(f).errors.includes('UPLOADED_SNIPPET_CHANNEL_MISMATCH'));
});
test('cross-tenant packet and source/output/rights boundary violations block',()=>{
  const f=fixture();f.candidate.tenantId='may';f.candidate.assets[0].path='.local/may/outputs/video.mp4';f.candidate.assets[1].rights.tenantId='may';const r=check(f);assert.ok(r.errors.includes('CROSS_TENANT_PACKET'));assert.ok(r.errors.includes('ASSET_HASH_OR_TENANT_PATH_INVALID'));assert.ok(r.errors.includes('RIGHTS_UNVERIFIED_OR_CROSS_TENANT'));
});
test('path traversal and unknown or expired rights block',()=>{
  const f=fixture();f.candidate.assets[0].path=f.context.config.roots.output+'/../other/video.mp4';f.candidate.assets[1].rights.permission='unknown';f.candidate.assets[2].rights.expiresAt='2026-10-01';const r=check(f);assert.ok(r.errors.includes('ASSET_HASH_OR_TENANT_PATH_INVALID'));assert.ok(r.errors.includes('RIGHTS_UNVERIFIED_OR_CROSS_TENANT'));
});
test('internal-only feature cannot become public YouTube claim',()=>{
  const f=fixture();f.candidate.claimRefs=[{featureId:'nilaza_tarot_reflection',claimId:'nilaza_tarot_as_reflection'}];bind(f.context,f.candidate);assert.ok(check(f).errors.includes('CLAIM_SURFACE_NOT_READY'));
});
test('expired evidence and stale source fingerprint block',()=>{
  const f=fixture();f.context.truth.features[0].evidence[0].expiresAt='2026-10-01';f.candidate.sourceFingerprint=hash('old-source');assert.ok(check(f).errors.includes('CLAIM_EVIDENCE_MISSING_OR_EXPIRED'));assert.ok(check(f).errors.includes('SOURCE_FINGERPRINT_STALE'));
});
test('script title, schedule or media edits invalidate existing QA and owner approval',()=>{
  for(const edit of [p=>p.metadata.title+=' edited',p=>p.publishAt='2026-10-07T13:00:00Z',p=>p.assets[0].sha256=hash('different-video')]) {const f=fixture();edit(f.candidate);const r=check(f);assert.ok(r.errors.includes('QA_BINDING_STALE'));assert.ok(r.errors.includes('EXACT_OWNER_APPROVAL_MISSING_OR_STALE'));}
});
test('creator cannot self-review and scores do not substitute for independent QA',()=>{
  const f=fixture();f.candidate.qa.agentId=f.candidate.creators[0].agentId;assert.ok(check(f).errors.includes('INDEPENDENT_QA_REQUIRED'));
  f.candidate.qa.agentId='fixture-independent-reviewer';f.candidate.qa.softScores[f.context.quality.softDimensions[0]]=2;assert.ok(check(f).errors.includes('QA_QUALITY_GATE_FAILED'));
});
test('realistic synthetic-media assessment cannot omit disclosure',()=>{
  const f=fixture();f.candidate.disclosure.requiresDisclosure=true;f.candidate.disclosure.containsSyntheticMedia=false;assert.ok(check(f).errors.includes('DISCLOSURE_ASSESSMENT_MISSING_OR_CONTRADICTED'));
});
test('past/invalid time, non-private and previously public video block',()=>{
  const f=fixture();f.candidate.publishAt='2026-02-30T13:00:00Z';f.candidate.initialPrivacy='public';f.candidate.everPublished=true;const r=check(f);assert.ok(r.errors.includes('PAST_OR_TOO_CLOSE_SCHEDULE'));assert.ok(r.errors.includes('PRIVATE_NEVER_PUBLISHED_REQUIRED'));
});
test('duplicate intent and duplicate video fingerprint block even with a new content ID',()=>{
  const f=fixture();f.options.ledger=[{namespace:'nilaza.youtube',channelId:f.candidate.channelId,intentKey:intentKey(f.candidate),state:'unknown'}];assert.ok(check(f).errors.includes('DUPLICATE_OR_UNRESOLVED_INTENT'));
  f.options.ledger=[{namespace:'nilaza.youtube',channelId:f.candidate.channelId,contentId:'other-content',videoSha256:f.candidate.assets[0].sha256,state:'uploaded'}];assert.ok(check(f).errors.includes('DUPLICATE_OR_UNRESOLVED_INTENT'));
});
test('unknown cost, overspend and missing ContentOps reservation block',()=>{
  for(const edit of [p=>p.budget.estimatedCostUSD=null,p=>p.budget.estimatedCostUSD=6,p=>p.budget.weekCommittedUSD=14,p=>p.budget.reservationAuthority='local']) {const f=fixture();edit(f.candidate);bind(f.context,f.candidate);assert.equal(check(f).lintStatus,'blocked');}
});
test('ambiguous receipt never retries insert; wrong channel halts',()=>{
  const f=fixture();assert.equal(classifyReceipt(f.context,{state:'unknown'}).state,'reconciliation_required');assert.equal(classifyReceipt(f.context,{state:'unknown'}).retryInsertAllowed,false);
  assert.equal(classifyReceipt(f.context,{videoId:'fixture',tenantId:'nilaza',namespace:'nilaza.youtube',snippet:{channelId:'UC'+'M'.repeat(22)}}).state,'halt_channel_mismatch');
});
test('configuration tampering cannot activate a scheduler or redirect tenant paths',()=>{
  const c=structuredClone(live);c.config.enabled=true;c.config.roots.output='.local/may/outputs';const r=validateStudio(c);assert.ok(r.errors.includes('EXECUTION_BOUNDARY_CHANGED'));assert.ok(r.errors.includes('NAMESPACE_PATH_MISMATCH'));assert.equal(r.externalExecutionAllowed,false);
});

test('pending Mystic Art handle never becomes pinned channel identity or activation',()=>{
  assert.equal(live.config.channel.pendingCandidate.publicUrl,'https://www.youtube.com/@mysticartrealm');assert.equal(live.config.channel.pendingCandidate.selectionStatus,'pending_owner_decision');assert.equal(live.config.channel.pendingCandidate.channelId,null);assert.equal(live.config.channel.id,null);assert.equal(live.config.channel.url,null);assert.equal(live.config.enabled,false);assert.equal(live.config.schedulerActivation,false);assert.equal(live.policy.ownerApproved,false);
});
test('conservative pilot rejects three slots and two videos of the same format',()=>{
  const a=structuredClone(live);a.policy.maximumVideosPerWeek=3;a.policy.slots.push({dayOffset:1,hourLocal:20,format:'short'});assert.ok(validateStudio(a).errors.includes('SCHEDULE_POLICY_INVALID'));
  const b=structuredClone(live);b.policy.slots[1].format='short';assert.ok(validateStudio(b).errors.includes('SCHEDULE_POLICY_INVALID'));
});
