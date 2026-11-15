import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { JSDOM } from 'jsdom';
const feedbackId='00000000-0000-4000-8000-000000000001';
const row={feedbackId,status:'open',revision:1,receivedAt:'2026-10-16T00:00:00Z',correlationStatus:'verified_server',submitted:{feature:'tarot_reading',category:'too_generic',language:'vi',sectionId:'summary'},serverReceipt:{receiptId:feedbackId,metadata:{feature:'tarot_reading',traceId:'trace-1',promptVersionId:'local:tarot@v2:vi',rawQuestion:'PRIVATE'}}};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function harness(rpc=async()=>[row], allowed=true) {
 const dom=new JSDOM('<main id="inbox"></main>',{url:'http://localhost/ai-studio.html#feedback',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,c=w.document.querySelector('main'),calls=[],traces=[];
 w.ENV={SUPABASE_URL:'https://synthetic.invalid',SUPABASE_ANON_KEY:'public-test'};
 w.NilazaAdminTransportTarget='https://synthetic.invalid';
 w.NilazaAdminSession={userId:'admin-a',capabilities:allowed?['safety.review']:[]};
 w.NilazaRequireCapability=async()=>w.NilazaAdminSession?.capabilities.includes('safety.review');
 w.NilazaAdminRpc=async(...args)=>{calls.push(args);return rpc(...args);};
 w.eval(fs.readFileSync('apps/admin/feedback-inbox.js','utf8'));
 w.NilazaFeedbackInbox.mount(c,(...args)=>traces.push(args));
 return {dom,w,c,calls,traces,async load(){c.querySelector('#feedback-load').click();await tick();}};
}
test('feedback inbox requires safety.review, renders safe receipt metadata and links legacy trace explicitly',async()=>{
 const denied=harness(undefined,false); assert.match(denied.c.textContent,/safety.review/);assert.equal(denied.calls.length,0);denied.dom.window.close();
 const h=harness();await h.load();assert.equal(h.calls[0][2],'safety.review');assert.match(h.c.textContent,/Biên nhận máy chủ đã xác minh/);assert.doesNotMatch(h.c.textContent,/PRIVATE/);
 h.c.querySelector('[data-feedback-trace]').click();assert.deepEqual(h.traces,[['trace-1','tarot_reading']]);assert.match(h.c.textContent,/origin: unverified/);h.dom.window.close();
});
test('triage uses revision CAS and validates acknowledgement before showing success',async()=>{
 const h=harness(async name=>name==='get_ai_feedback_inbox'?[row]:{feedbackId,status:'resolved',revision:2});await h.load();
 h.c.querySelector('select[id^="feedback-next-"]').value='resolved';h.c.querySelector('[data-feedback-review]').click();await tick();
 assert.equal(h.calls[1][1].expected_revision,1);assert.match(h.c.textContent,/Đã lưu trạng thái/);assert.match(h.c.textContent,/revision\) 2/);h.dom.window.close();
 const bad=harness(async name=>name==='get_ai_feedback_inbox'?[row]:{feedbackId,status:'resolved',revision:99});await bad.load();bad.c.querySelector('[data-feedback-review]').click();await tick();assert.match(bad.c.textContent,/Tải lại trước khi thử/);bad.dom.window.close();
});
test('late inbox responses cannot cross account, route or transport boundary',async()=>{
 for(const change of [h=>{h.w.NilazaAdminSession.userId='admin-b';h.w.NilazaFeedbackInbox.clear();},h=>{h.w.location.hash='#other';h.w.dispatchEvent(new h.w.Event('hashchange'));},h=>{h.w.ENV.SUPABASE_URL='https://other.invalid';}]){
  let finish;const h=harness(()=>new Promise(resolve=>{finish=resolve;}));await h.load();change(h);finish([row]);await tick();assert.doesNotMatch(h.c.textContent,/trace-1/);h.dom.window.close();
 }
});
test('empty and failed loads are actionable without pretending feedback was received',async()=>{
 const h=harness(async()=>[]);await h.load();assert.match(h.c.textContent,/Không có phản hồi khớp bộ lọc/);h.dom.window.close();
 const failed=harness(async()=>{throw Error('PRIVATE');});await failed.load();assert.match(failed.c.textContent,/Không tải được/);assert.doesNotMatch(failed.c.textContent,/PRIVATE/);assert.equal(failed.c.querySelector('#feedback-load').disabled,false);failed.dom.window.close();
});
