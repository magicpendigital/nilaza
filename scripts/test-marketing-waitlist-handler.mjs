import test from 'node:test';
import assert from 'node:assert/strict';
import { createWaitlistHandler } from '../supabase/functions/marketing-waitlist/handler.ts';
const origin='https://nilaza.magicpendigital.com';
const valid={email:' SignUp@fixture.example ',locale:'vi',interest:'astrology',consent:true,website:'',turnstileToken:'qa-token',utm:{utm_source:'qa',unknown:'ignored',utm_campaign:'x'.repeat(200)}};
const request=(body=valid,headers={},method='POST')=>new Request('https://fixture.example/functions/v1/marketing-waitlist',{method,headers:{origin,'content-type':'application/json',...headers},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
function fixture(overrides={}){const state={writes:[],verifications:0};const handler=createWaitlistHandler({allowedOrigins:[origin],turnstileSecret:'server-only-fixture',backendConfigured:true,verify:async(_s,_t,_ip,host)=>{state.verifications++;assert.equal(host,'nilaza.magicpendigital.com');return true;},register:async input=>state.writes.push(input),...overrides});return {state,handler};}
test('exact origin CORS, missing/foreign origins and method rejection never write',async()=>{
 const {handler,state}=fixture();
 assert.equal((await handler(request(undefined,{},'OPTIONS'))).status,204);
 for(const foreign of ['', 'https://nilaza.ai','https://nilaza.magicpendigital.com.evil.example']){const r=await handler(request(valid,{origin:foreign}));assert.equal(r.status,403);assert.equal(r.headers.get('access-control-allow-origin'),null);}
 assert.equal((await handler(request(undefined,{},'GET'))).status,405);assert.equal(state.writes.length,0);
});
test('malformed JSON, null/arrays and oversized streamed bytes fail before services',async()=>{
 const {handler,state}=fixture();for(const body of ['{',null,[],{}, {...valid,email:'bad'}, {...valid,locale:'fr'}, {...valid,interest:'unknown'}, {...valid,consent:'true'}, {...valid,consent:false}])assert.equal((await handler(request(body))).status,400);
 assert.equal((await handler(request(valid,{'content-type':'text/plain'}))).status,400);
 assert.equal((await handler(request({...valid,email:'a'.repeat(255)+'@fixture.example'}))).status,400);
 assert.equal((await handler(request({...valid,extra:'x'.repeat(9000)}))).status,413);assert.equal(state.verifications,0);assert.equal(state.writes.length,0);
});
test('honeypot gives generic accepted without verification or database write',async()=>{const {handler,state}=fixture();assert.deepEqual(await (await handler(request({...valid,website:'bot'}))).json(),{accepted:true});assert.equal(state.writes.length,0);assert.equal(state.verifications,0);});
test('missing server secret/backend and failed challenge stay closed',async()=>{
 for(const overrides of [{turnstileSecret:undefined},{backendConfigured:false},{verify:async()=>false}]){const {handler,state}=fixture(overrides);const response=await handler(request());assert.ok([400,503].includes(response.status));assert.equal(state.writes.length,0);}
});
test('actual Turnstile verifier rejects absent/oversize tokens without provider request',async()=>{for(const token of [undefined,'','x'.repeat(2049)]){const {handler,state}=fixture({verify:undefined});assert.equal((await handler(request({...valid,turnstileToken:token}))).status,400);assert.equal(state.writes.length,0);}});
test('VI/EN success normalizes email, hashes, bounds UTM and binds consent',async()=>{
 for(const locale of ['vi','en']){const {handler,state}=fixture();const response=await handler(request({...valid,locale}));assert.equal(response.status,202);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('access-control-allow-origin'),origin);assert.deepEqual(await response.json(),{accepted:true});const row=state.writes[0];assert.equal(row.p_email,'signup@fixture.example');assert.match(row.p_email_hash,/^[a-f0-9]{64}$/);assert.equal(row.p_locale,locale);assert.equal(row.p_utm.utm_campaign.length,160);assert.equal(row.p_utm.unknown,undefined);assert.equal(row.p_consent_version,'waitlist-prelaunch-2026-10-11');}
});
test('database/provider failures are generic and reveal no contact or server detail',async()=>{
 for(const overrides of [{register:async()=>{throw new Error('private database detail');}},{verify:async()=>{throw new Error('provider detail');}}]){const {handler}=fixture(overrides);const r=await handler(request());assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'waitlist_unavailable'});}
});
