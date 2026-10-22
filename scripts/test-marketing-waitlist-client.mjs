import test from 'node:test';
import assert from 'node:assert/strict';
import { sendWaitlistRequest } from '../apps/web/src/lib/waitlistRequest.ts';
import { getWaitlistConfig, singaporeWaitlistEndpoint } from '../apps/web/src/lib/waitlistConfig.ts';
const key='0x4AAAAAfixtureKeyForConfig';
test('production requires exact Singapore URL and real site key, dev fixtures never enable production',()=>{
 assert.equal(getWaitlistConfig(singaporeWaitlistEndpoint,key).enabled,true);
 for(const [endpoint,siteKey] of [['',key],[singaporeWaitlistEndpoint,''],[singaporeWaitlistEndpoint,'1x00000000000000000000AA'],['https://akgrokwnkfqnfjqrildi.supabase.co/functions/v1/marketing-waitlist',key],['http://127.0.0.1:4323/functions/v1/marketing-waitlist',key]])assert.equal(getWaitlistConfig(endpoint,siteKey).enabled,false);
 assert.equal(getWaitlistConfig('http://127.0.0.1:4323/functions/v1/marketing-waitlist','1x00000000000000000000AA',true).enabled,true);
});
test('only explicit HTTP202 accepted:true is success',async()=>{
 for(const [status,body,expected] of [[202,{accepted:true},'accepted'],[200,{accepted:true},'unavailable'],[202,{accepted:'true'},'unavailable'],[202,{},'unavailable'],[503,{accepted:true},'unavailable'],[400,{error:'challenge_failed'},'challenge_failed'],[400,{error:'invalid_request'},'invalid_request']])assert.equal(await sendWaitlistRequest('https://fixture.example',{},async()=>Response.json(body,{status})),expected);
});
test('network and invalid JSON fail without false success; timeout aborts the request',async context=>{
 assert.equal(await sendWaitlistRequest('https://fixture.example',{},async()=>{throw new Error('offline');}),'unavailable');
 assert.equal(await sendWaitlistRequest('https://fixture.example',{},async()=>new Response('<html>error</html>')),'unavailable');
 context.mock.timers.enable({apis:['setTimeout']});
 const pending=sendWaitlistRequest('https://fixture.example',{},async(_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('timeout')),{once:true})));
 context.mock.timers.tick(20000);assert.equal(await pending,'unavailable');
});
