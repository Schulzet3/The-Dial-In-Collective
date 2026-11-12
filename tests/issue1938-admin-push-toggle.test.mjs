import test from 'node:test';
import assert from 'node:assert/strict';
import {renderAdminAttention} from '../site/admin/view.js';
import {getAdminPushStatus} from '../site/admin/push.js';

test('push controls are mutually exclusive and unknown state fails closed',()=>{
 for(const [state,enabled,disabled] of [['enabled',false,true],['disabled',true,false],['unknown',false,false]]){
  const html=renderAdminAttention({},state);
  assert.equal(html.includes('data-action="enable-admin-push"'),enabled);
  assert.equal(html.includes('data-action="disable-admin-push"'),disabled);
 }
});
test('push state reads device subscription on each call',async()=>{
 const previous={navigator:globalThis.navigator,Notification:globalThis.Notification,PushManager:globalThis.PushManager};
 let subscribed=false;
 try{
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{serviceWorker:{getRegistration:async()=>({pushManager:{getSubscription:async()=>subscribed?{endpoint:'https://example.test'}:null}})}}});
  globalThis.Notification={permission:'granted'};globalThis.PushManager=class {};
  assert.equal(await getAdminPushStatus(),'disabled');
  subscribed=true;
  assert.equal(await getAdminPushStatus(),'enabled');
  globalThis.Notification.permission='denied';
  assert.equal(await getAdminPushStatus(),'disabled');
 }finally{
  for(const [key,value] of Object.entries(previous)){
   if(value===undefined)delete globalThis[key];
   else Object.defineProperty(globalThis,key,{configurable:true,value,writable:true});
  }
 }
});
