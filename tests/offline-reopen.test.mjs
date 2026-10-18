import test from 'node:test';
import assert from 'node:assert/strict';
import {rawFixture,OWNER,TIME} from './cloud-fixtures/raw.js';
import {createCloudClient} from '../site/cloud/client.js';

// Isolate browser-root dependency; the production app does not start in Node.
const root={innerHTML:''},sheet={close(){},querySelector(){return null;}};
globalThis.document={querySelector:sel=>sel==='#app'?root:sheet};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:false}});
function fixture({localSession={id:OWNER},cachedOwner=OWNER}={}){
 const raw=rawFixture(),events=[],cleared=[];
 const store={
  async readCache(owner){return cachedOwner===owner?{owner,snapshot:raw}:null;},
  async list(owner){return structuredClone(events.filter(e=>e.owner===owner));},
  async put(value){events.push(structuredClone(value));},
  async clearCache(owner){cleared.push(owner);}
 };
 let statusRequests=0;
 const client={async offlineIdentity(){return localSession;},
  async status(){statusRequests++;return {admitted:false};}};
 const app=new CloudApp(client,store);
 app.identity={id:OWNER,email:'member@example.invalid'};
 app.render=()=>{app.renders=(app.renders||0)+1;};
 return {app,store,client,raw,events,cleared,statusRequests:()=>statusRequests};
}
test('previously admitted matching owner with unexpired local session can reopen cached workspace offline',async()=>{
 const f=fixture();
 assert.equal(await f.app.restoreOfflineCache(),true);
 assert.equal(f.app.status,null,'cached member state is not server admission');
 assert.equal(f.app.localOfflineOwner,OWNER);
 assert.equal(f.app.state.coffees.length,1);
 assert.equal(f.statusRequests(),0);
});
test('missing session, different account and missing owner-scoped cache deny offline reopen',async()=>{
 for(const options of [{localSession:null},{localSession:{id:'different'}},{cachedOwner:'different'}]){
  const f=fixture(options);
  assert.equal(await f.app.restoreOfflineCache(),false);
  assert.equal(f.app.raw,null);
  assert.equal(f.app.localOfflineOwner,null);
  assert.equal(f.app.state.coffees.length,0);
 }
});
test('offline cache allows only new shot queue, never account settings or an existing shot edit',async()=>{
 const f=fixture();await f.app.restoreOfflineCache();
 await assert.rejects(()=>f.app.mutate('rename_setup',{name:'No'}),/Sign in with beta/);
 await assert.rejects(()=>f.app.mutate('save_shot',{expected_revision:5}),/Sign in with beta/);
 assert.equal(f.events.length,0);
 const payload={id:'local-shot-id',setup_id:'setup',setup_version_id:'version',
  library_entry_id:'coffee',basket_version_id:'basketv',calibration_id:'cal',
  style:'Turbo',pulled_at:TIME,dose_g:18,yield_g:48,time_s:25,grind_setting:1,
  feed_mode:'standard',taste:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},notes:'Private offline note'};
 await f.app.mutate('save_shot',payload);
 assert.equal(f.events.length,1);
 assert.equal(f.events[0].owner,OWNER);
 assert.equal(f.app.pending.length,1);
 assert.equal(f.statusRequests(),0);
});
test('fresh server non-admission clears cached snapshot while preserving durable outbox',async()=>{
 const f=fixture();await f.app.restoreOfflineCache();
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
 try{
  await f.app.connect();
  assert.deepEqual(f.cleared,[OWNER]);
  assert.equal(f.app.status.admitted,false);
  assert.equal(f.app.raw,null);
  assert.equal(f.app.localOfflineOwner,null);
 }finally{Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:false}});}
});
test('inflight local cache read never installs a different account\'s records',async()=>{
 const f=fixture();
 let notify;const started=new Promise(resolve=>notify=resolve);
 let release;const paused=new Promise(resolve=>release=resolve);
 f.store.readCache=async()=>{notify();await paused;return {owner:OWNER,snapshot:f.raw};};
 const work=f.app.restoreOfflineCache();await started;
 f.app.epoch++;f.app.identity={id:'other-account'};
 release();
 await assert.rejects(work,{code:'account_changed'});
 assert.equal(f.app.raw,null);
 assert.equal(f.app.localOfflineOwner,null);
});
test('offline SDK identity requires local unexpired session, token and same-origin secure context',async()=>{
 let session={access_token:'private-credential',refresh_token:'private-refresh',
  expires_at:Math.floor(Date.now()/1000)+3600,user:{id:OWNER,email:'member@example.invalid'}};
 const sdk={auth:{onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}};},
  async getSession(){return {data:{session},error:null};}}};
 const c=createCloudClient(sdk,{assertSecure:()=>{}});
 assert.deepEqual(await c.offlineIdentity(),{id:OWNER,email:'member@example.invalid'});
 session={...session,expires_at:Math.floor(Date.now()/1000)-10};
 assert.equal(await c.offlineIdentity(),null);
 session={...session,expires_at:Math.floor(Date.now()/1000)+3600,access_token:''};
 assert.equal(await c.offlineIdentity(),null);
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
 try{assert.equal(await c.offlineIdentity(),null);}
 finally{Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:false}});}
 c.dispose();
});
