import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {renderAdminDashboard,renderAdminDenied} from '../site/admin/view.js';
import {e} from '../site/lib/ui.js';
const source=readFileSync(new URL('../site/admin/main.js',import.meta.url),'utf8')
 .replace(/^import .*?;\n/gm,'').replace(/start\(\);\s*$/,'globalThis.started=start();');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function boot(dashboard){
 const root={innerHTML:'',querySelector(){return null;}};let auth;
 const sdk={auth:{onAuthStateChange(fn){auth=fn;return {data:{subscription:{unsubscribe(){}}}};},async getUser(){return {data:{user:{id:'admin'}}};}},
  from:()=>({select:()=>({eq:()=>({async maybeSingle(){return {data:{theme:'dark'}};}})})}),
  async rpc(name){return {data:name==='dic_session_status'?{authenticated:true,admitted:true,admin:true}:await dashboard()};}};
 const context=vm.createContext({document:{querySelector:s=>s==='#admin-root'?root:null},supabase:{createClient:()=>sdk},CLOUD_CONFIG:{enabled:true},secureOrigin(){},applyAppearance(){},readAppearance(){},renderAdminDashboard,renderAdminDenied,e});
 vm.runInContext(source,context);
 return {root,done:context.started,signOut(){assert.equal(typeof auth,'function');auth('SIGNED_OUT',null);},switchAccount(){assert.equal(typeof auth,'function');auth('SIGNED_IN',{user:{id:'member'}});}};
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
