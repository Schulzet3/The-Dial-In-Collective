import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const template=readFileSync(path.join(root,'scripts/pwa/service-worker.template.txt'),'utf8');
function mockWorker(offline=false){
 const handlers=new Map(),calls=[],cached={status:'cached'};
 const routes=['/','/index.html','/icon.svg','/icon-192.png','/icon-512.png','/manifest.webmanifest','/cloud/main.js','/vendor/supabase.js'];
 const storage={async open(name){calls.push({type:'open',name});return {
  async addAll(paths){calls.push({type:'add',paths});},
  async match(path){calls.push({type:'match',path});return cached;}};},
 async keys(){return ['dic-public-shell-old','other-cache','dic-public-shell-test'];},
 async delete(name){calls.push({type:'delete',name});return true;}};
 let network=0;
 const code=template.replaceAll('__DIC_BUILD_ID__','test').replaceAll('__DIC_ASSETS__',JSON.stringify(routes));
 vm.runInNewContext(code,{
  self:{location:{origin:'https://app.example'},addEventListener:(name,fn)=>handlers.set(name,fn),
   skipWaiting:async()=>{calls.push({type:'skipWaiting'});}},
  caches:storage,URL,fetch:async()=>{network++;if(offline)throw Error('offline');return {ok:true,status:'network'};}
 });
 const dispatch=async request=>{
  let response=null;
  handlers.get('fetch')({request,respondWith(p){response=p;}});
  return response?await response:null;};
 return {handlers,calls,routes,dispatch,network:()=>network};
}
test('precache contains only static app shell, not remote API, admin or private records',async()=>{
 const w=mockWorker();let pending;w.handlers.get('install')({waitUntil(p){pending=p;}});await pending;
 assert.deepEqual(Array.from(w.calls.find(c=>c.type==='add').paths),w.routes);
 assert.equal(w.calls.some(c=>c.type==='skipWaiting'),true,'An installed update must not wait forever for all iOS tabs to close');
 assert.equal(w.routes.some(p=>/admin|rest\/v1|auth|token|notes/.test(p)),false);
});
test('worker never intercepts POST, API, admin, query strings or external hosts',async()=>{
 const w=mockWorker();
 for(const request of [
  {method:'GET',url:'https://app.example/rest/v1/rpc/dic_read_personal_state',mode:'cors'},
  {method:'GET',url:'https://app.example/auth/v1/user',mode:'cors'},
  {method:'POST',url:'https://app.example/api/coffee-preview',mode:'cors'},
  {method:'GET',url:'https://app.example/admin.html',mode:'navigate'},
  {method:'GET',url:'https://app.example/cloud/main.js?debug=1',mode:'cors'},
  {method:'GET',url:'https://elsewhere.example/cloud/main.js',mode:'cors'}]){
  assert.equal(await w.dispatch(request),null,request.url);
 }
 assert.equal(w.calls.length,0);
 assert.equal(w.network(),0);
});
test('worker only returns cached public path and deletes its own old revision',async()=>{
 const w=mockWorker();
 assert.equal((await w.dispatch({method:'GET',url:'https://app.example/cloud/main.js',mode:'cors'})).status,'cached');
 let pending;w.handlers.get('activate')({waitUntil(p){pending=p;}});await pending;
 assert.deepEqual(w.calls.filter(c=>c.type==='delete').map(c=>c.name),['dic-public-shell-old']);
 assert.equal(w.network(),0);
});

test('online navigation revalidates HTML; offline reopening falls back to the revisioned public cache',async()=>{
 const online=mockWorker();
 const request={method:'GET',url:'https://app.example/',mode:'navigate'};
 assert.equal((await online.dispatch(request)).status,'network');
 assert.equal(online.network(),1);
 assert.equal(online.calls.some(x=>x.type==='match'),false);
 const offline=mockWorker(true);
 assert.equal((await offline.dispatch(request)).status,'cached');
 assert.equal(offline.calls.some(x=>x.type==='match'&&x.path==='/'),true);
 assert.equal(await offline.dispatch({...request,url:'https://app.example/admin.html'}),null);
});
