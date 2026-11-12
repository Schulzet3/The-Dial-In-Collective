import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {enableApprovalPush,disableApprovalPush,approvalPushEnabled} from '../site/cloud/approval-push.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function withGlobals(values,fn){
 const descriptors=new Map(Object.keys(values).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 for(const [k,v] of Object.entries(values))Object.defineProperty(globalThis,k,{configurable:true,writable:true,value:v});
 return Promise.resolve().then(fn).finally(()=>{
  for(const [k,original] of descriptors)if(original)Object.defineProperty(globalThis,k,original);
   else delete globalThis[k];
 });
}
test('pending-account push button requests permission directly on user gesture, and uses isolated scope',async()=>{
 let sub=null,permissionCalled=0,registered='',scope='',disabled=0;
 const publicKey=Buffer.from([4,...new Array(64).fill(7)]).toString('base64url');
 const registration={pushManager:{
  async getSubscription(){return sub;},
  async subscribe(options){
   assert.equal(options.userVisibleOnly,true);
   assert.equal(options.applicationServerKey.length,65);
   sub={endpoint:'https://web.push.apple.com/test-member-endpoint-123456789',
    options:{applicationServerKey:options.applicationServerKey},async unsubscribe(){disabled++;sub=null;return true;}};
   return sub;
  }
 }};
 const notification={permission:'default',requestPermission(){
  permissionCalled++;notification.permission='granted';return Promise.resolve('granted');
 }};
 const calls=[];
 const client={async approvalPush(body){
  calls.push(body);
  if(body.op==='key')return {ok:true,publicKey};
  if(body.op==='subscribe')return {ok:true,subscribed:true};
  if(body.op==='status')return {ok:true,subscribed:true};
  if(body.op==='unsubscribe')return {ok:true};
  throw Error('Unexpected operation');
 }};
 await withGlobals({
  isSecureContext:true,Notification:notification,PushManager:function(){},
  navigator:{userAgent:'iPhone',standalone:true,serviceWorker:{
   async register(path,options){registered=path;scope=options.scope;return registration;},
   async getRegistration(){return registration;}
  }}
 },async()=>{
  const pending=enableApprovalPush(client);
  assert.equal(permissionCalled,1,'permission request must execute before the first await');
  assert.match(await pending,/enabled/i);
  assert.equal(registered,'/member-approval/sw.js');
  assert.equal(scope,'/member-approval/');
  assert.equal(await approvalPushEnabled(client),true);
  assert.match(await disableApprovalPush(client),/disabled/i);
  assert.equal(disabled,1);
  assert.deepEqual(calls.map(x=>x.op),['key','subscribe','status','unsubscribe']);
 });
});
test('iPhone browser tab cannot prompt for background push before Home Screen installation',async()=>{
 let prompted=false;
 await withGlobals({isSecureContext:true,PushManager:function(){},
  Notification:{permission:'default',requestPermission(){prompted=true;return Promise.resolve('granted');}},
  navigator:{userAgent:'iPhone',standalone:false,serviceWorker:{}},
  matchMedia:()=>({matches:false})
 },async()=>{
  await assert.rejects(enableApprovalPush({approvalPush:()=>{throw Error('unexpected');}}),/Home Screen/);
  assert.equal(prompted,false);
 });
});
test('only a verified pending member sees explicit opt-in; existing Admin offline worker stays unchanged',()=>{
 const main=read('site/cloud/main.js'),client=read('site/cloud/client.js'),build=read('build_cloud.mjs');
 const serviceWorker=read('scripts/pwa/service-worker.template.txt');
 const memberWorker=read('scripts/pwa/member-approval-worker.template.txt');
 assert.match(main,/state==='pending'&&this\.status\?\.emailVerified/);
 assert.match(main,/Enable Approval Push Alerts/);
 assert.match(main,/disable-approval-push/);
 assert.match(main,/Manage Account Approval Alerts/);
 assert.match(main,/disable-approval-push-post-approval/);
 assert.match(client,/sdk\.functions\.invoke\('dic-member-approval-broker'/);
 assert.match(build,/dist\/member-approval/);
 assert.match(build,/cloud\/approval-push\.js/);
 assert.match(serviceWorker,/Administrator review required/);
 assert.match(memberWorker,/Your account is approved/);
 assert.doesNotMatch(memberWorker,/Administrator review required/);
});
