import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {setImmediate} from 'node:timers';
import {renderAdminDashboard,renderAdminDenied} from '../site/admin/view.js';
import {e} from '../site/lib/ui.js';
import {isAccessDenied} from '../site/cloud/client.js';
const source=readFileSync(new URL('../site/admin/main.js',import.meta.url),'utf8')
 .replace(/^import .*?;\n/gm,'').replace(/start\(\);\s*$/,'globalThis.started=start();');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function boot(dashboard){
 const trigger={disabled:false,dataset:{}},actionNotice={textContent:''},listeners={};
 const root={innerHTML:'',querySelector(selector){return selector==='#admin-refresh'?trigger:selector==='#admin-action-notice'?actionNotice:null;},addEventListener(name,fn){listeners[name]=fn;}};let auth;
 const sdk={auth:{onAuthStateChange(fn){auth=fn;return {data:{subscription:{unsubscribe(){}}}};},async getUser(){return {data:{user:{id:'admin'}}};}},
  from:()=>({select:()=>({eq:()=>({async maybeSingle(){return {data:{theme:'dark'}};}})})}),
  async rpc(name){if(name==='dic_session_status')return {data:{authenticated:true,admitted:true,admin:true}};const result=await dashboard(name);return result?.error?result:{data:result};}};
 const context=vm.createContext({document:{querySelector:s=>s==='#admin-root'?root:null},supabase:{createClient:()=>sdk},CLOUD_CONFIG:{enabled:true},secureOrigin(){},isAccessDenied,applyAppearance(){},readAppearance(){},renderAdminDashboard,renderAdminDenied,e});
 vm.runInContext(source,context);
 return {root,trigger,actionNotice,done:context.started,refresh(){listeners.click({target:{closest:()=>trigger}});},signOut(){assert.equal(typeof auth,'function');auth('SIGNED_OUT',null);},switchAccount(){assert.equal(typeof auth,'function');auth('SIGNED_IN',{user:{id:'member'}});}};
}
test('admin data disappears immediately when another tab signs out',async()=>{
 const f=boot(async()=>({counts:{},queue:[{name:'Private Review Coffee'}]}));await f.done;
 assert.match(f.root.innerHTML,/Private Review Coffee/);f.signOut();
 assert.doesNotMatch(f.root.innerHTML,/Private Review Coffee/);assert.match(f.root.innerHTML,/Admin Access Unavailable/);
});
test('a delayed admin response cannot restore private data after an account switch',async()=>{
 const waiting=deferred(),release=deferred();
 const f=boot(async()=>{waiting.resolve();await release.promise;return {counts:{},queue:[{name:'Old Private Review'}]};});
 await waiting.promise;f.switchAccount();release.resolve();await f.done;
 assert.doesNotMatch(f.root.innerHTML,/Old Private Review/);assert.match(f.root.innerHTML,/Admin Access Unavailable/);
});
test('administrator refresh can be retried after a temporary server failure',async()=>{
 let failure=false,calls=0;
 const f=boot(async()=>{calls++;return failure?{error:{message:'Temporary outage',code:'request_failed'}}:{counts:{},queue:[{name:'Private Review Coffee'}]};});
 await f.done;failure=true;f.refresh();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.trigger.disabled,false);assert.match(f.actionNotice.textContent,/Temporary outage/);
 assert.match(f.root.innerHTML,/Private Review Coffee/);
 failure=false;const before=calls;f.refresh();await new Promise(resolve=>setImmediate(resolve));
 assert.ok(calls>before);assert.equal(f.trigger.disabled,false);assert.match(f.root.innerHTML,/Private Review Coffee/);
});
test('explicit administrator denial removes private records and prevents further actions',async()=>{
 let denied=false,calls=0;
 const f=boot(async()=>{calls++;return denied?{error:{message:'Administrator required',code:'42501'}}:{counts:{},queue:[{name:'Private Review Coffee'}]};});
 await f.done;denied=true;f.refresh();await new Promise(resolve=>setImmediate(resolve));
 assert.doesNotMatch(f.root.innerHTML,/Private Review Coffee/);assert.match(f.root.innerHTML,/Admin Access Unavailable/);
 const before=calls;f.refresh();await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,before);
});
