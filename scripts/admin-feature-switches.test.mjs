import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { JSDOM } from 'jsdom';
const rows=[{feature:'ai_council',enabled:true,reason:null,updatedAt:'2026-10-31T00:00:00Z'},{feature:'persona_chat',enabled:false,reason:'Chi phí tăng',updatedAt:'2026-10-31T01:00:00Z'},{feature:'unknown_feature',enabled:true}];
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function harness(rpc=async()=>rows, capabilities=['ai.read','ai.manage']) {
 const dom=new JSDOM('<main id="switches"></main>',{url:'http://localhost/ai-studio.html#switches',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,c=w.document.querySelector('main'),calls=[];
 w.ENV={SUPABASE_URL:'https://synthetic.invalid',SUPABASE_ANON_KEY:'public-test'};
 w.NilazaAdminTransportTarget='https://synthetic.invalid';
 w.NilazaAdminSession={userId:'admin-a',capabilities};
 w.NilazaRequireCapability=async capability=>w.NilazaAdminSession?.capabilities.includes(capability);
 w.NilazaAdminRpc=async(...args)=>{calls.push(args);return rpc(...args);};
 w.eval(fs.readFileSync('apps/admin/feature-switches.js','utf8'));
 w.NilazaFeatureSwitches.mount(c);
 return {dom,w,c,calls,async load(){c.querySelector('#switches-load').click();await tick();}};
}
test('switches need ai.read to view and ai.manage to change; unknown features are dropped',async()=>{
 const denied=harness(undefined,[]);assert.match(denied.c.textContent,/ai.read/);assert.equal(denied.calls.length,0);denied.dom.window.close();
 const viewer=harness(undefined,['ai.read']);await viewer.load();assert.equal(viewer.calls[0][0],'get_ai_feature_switches');assert.equal(viewer.calls[0][2],'ai.read');
 assert.match(viewer.c.textContent,/Đang tắt/);assert.match(viewer.c.textContent,/Chi phí tăng/);assert.doesNotMatch(viewer.c.textContent,/unknown_feature/);
 assert.equal(viewer.c.querySelector('[data-switch-edit]'),null);viewer.dom.window.close();
});
test('turning a feature off needs a reason and checks the acknowledgement',async()=>{
 const h=harness(async name=>name==='get_ai_feature_switches'?rows.map(row=>({...row})):{feature:'ai_council',enabled:false,reason:'Lỗi model',updatedAt:'2026-10-31T02:00:00Z'});await h.load();
 h.c.querySelector('[data-switch-edit="ai_council"]').click();
 h.c.querySelector('#switch-reason').value='ab';h.c.querySelector('[data-switch-form]').dispatchEvent(new h.w.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.equal(h.calls.length,1);assert.match(h.c.textContent,/3 tới 200/);
 h.c.querySelector('[data-switch-edit="ai_council"]')?.click();
 h.c.querySelector('#switch-reason').value='Lỗi model';h.c.querySelector('[data-switch-form]').dispatchEvent(new h.w.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.equal(JSON.stringify(h.calls[1]),JSON.stringify(['set_ai_feature_switch',{feature_input:'ai_council',enabled_input:false,reason_input:'Lỗi model'},'ai.manage']));
 assert.match(h.c.textContent,/Đã tắt/);h.dom.window.close();
 const bad=harness(async name=>name==='get_ai_feature_switches'?rows.map(row=>({...row})):{feature:'ai_council',enabled:true});await bad.load();
 bad.c.querySelector('[data-switch-edit="ai_council"]').click();bad.c.querySelector('#switch-reason').value='Lỗi model';
 bad.c.querySelector('[data-switch-form]').dispatchEvent(new bad.w.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.match(bad.c.textContent,/Chưa lưu/);bad.dom.window.close();
});
test('an empty or failed load says features run normally without inventing states',async()=>{
 const h=harness(async()=>[]);await h.load();assert.match(h.c.textContent,/đang chạy bình thường/);h.dom.window.close();
 const failed=harness(async()=>{throw Error('PRIVATE');});await failed.load();assert.match(failed.c.textContent,/Không tải được/);assert.doesNotMatch(failed.c.textContent,/PRIVATE/);failed.dom.window.close();
});
test('the Numerology private message switch (2026-11-25, seeded off) is listed with its own label',async()=>{
 const h=harness(async()=>[{feature:'numerology_private_message',enabled:false,reason:'Off until the Owner approves the content and turns it on',updatedAt:'2026-11-25T00:00:00Z'}]);await h.load();
 assert.match(h.c.textContent,/Lời nhắn riêng Thần số học/);assert.match(h.c.textContent,/Đang tắt/);assert.doesNotMatch(h.c.textContent,/numerology_private_message/);h.dom.window.close();
});
