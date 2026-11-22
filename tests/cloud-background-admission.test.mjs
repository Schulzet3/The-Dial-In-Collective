import test from 'node:test';
import assert from 'node:assert/strict';
import {rawFixture,OWNER} from './cloud-fixtures/raw.js';
import {createCloudClient} from '../site/cloud/client.js';

const root={innerHTML:'',querySelector(){return null;}};
const sheet={open:false,innerHTML:'',close(){this.open=false;},addEventListener(){},querySelector(){return null;}};
const doc={querySelector:s=>s==='#app'?root:sheet,addEventListener(){}};
globalThis.document=doc;
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
const user={id:OWNER,email:'member@example.invalid'};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function storeFixture(saved={owner:OWNER,snapshot:rawFixture()}){
 const cleared=[];const queue=[{owner:OWNER,id:'unsynced'}];
 return {cleared,queue,async readCache(){return saved;},async list(){return queue;},
  async clearCache(owner){cleared.push(owner);saved=null;}};
}
test('initial returning launch paints same-owner saved workspace before server admission completes',async()=>{
 const gate=deferred(),store=storeFixture(),frames=[];
 const app=new CloudApp({
  onAuthChange(){},async sessionIdentity(){return user;},
  async status(){return gate.promise;}
 },store);
 app.render=()=>frames.push({coffees:app.state.coffees.length,preview:app.localStartupOwner,verified:app.status?.admitted});
 let syncs=0;app.sync=async()=>{syncs++;};
 const priorAdd=globalThis.addEventListener,priorTimer=globalThis.setInterval;
 globalThis.document=doc;globalThis.addEventListener=()=>{};globalThis.setInterval=()=>1;
 try{
  await app.init();
  assert.equal(app.identity.id,OWNER);
  assert.equal(app.localStartupOwner,OWNER);
  assert.ok(frames.some(frame=>frame.coffees===1&&!frame.verified));
  assert.equal(syncs,0,'no cloud sync before server admission');
  await assert.rejects(app.mutate('save_shot',{id:'test'}),/beta access first/);
  gate.resolve({admitted:true,admin:false});
  await app.connect();
  assert.equal(app.localStartupOwner,null);
  assert.equal(app.status.admitted,true);
  assert.equal(syncs,1);
 }finally{
  delete globalThis.document;
  if(priorAdd===undefined)delete globalThis.addEventListener;else globalThis.addEventListener=priorAdd;
  globalThis.setInterval=priorTimer;
 }
});

test('background revocation immediately strips private preview and preserves outbox',async()=>{
 const gate=deferred(),store=storeFixture(),app=new CloudApp({async status(){return gate.promise;}},store);
 app.identity=user;app.render=()=>{};
 const task=app.connect();
 assert.equal(await app.openCachedWhileChecking(user),true);
 assert.equal(app.state.coffees.length,1);
 gate.resolve({admitted:false,approvalState:'revoked',emailVerified:true});
 await task;
 assert.equal(app.raw,null);assert.equal(app.localStartupOwner,null);
 assert.equal(app.state.coffees.length,0);assert.equal(app.status.admitted,false);
 assert.deepEqual(store.cleared,[OWNER]);
 assert.equal(store.queue.length,1,'unsynced outbox must remain durable');
});
test('unknown, foreign, denied or recovery cache cannot preview private records',async()=>{
 for(const kind of ['foreign','denied','recovery','no-cache']){
  const stored=kind==='foreign'?{owner:'other-member',snapshot:rawFixture()}:kind==='no-cache'?null:undefined;
  const app=new CloudApp({async status(){return {admitted:false};}},storeFixture(stored));
  app.identity=user;app.render=()=>{};
  if(kind==='denied')app.deniedOfflineOwners.add(OWNER);
  if(kind==='recovery')app.recovery=true;
  assert.equal(await app.openCachedWhileChecking(user),false,kind);
  assert.equal(app.raw,null,kind);assert.equal(app.localStartupOwner,null,kind);
 }
});
test('late cached read may not paint a previous member after account switch',async()=>{
 const gate=deferred(),app=new CloudApp({},{
  async readCache(){return gate.promise;},async list(){return [];}
 });
 app.identity=user;app.render=()=>{};
 const task=app.openCachedWhileChecking(user);
 app.resetAccount();app.identity={id:'replacement'};
 gate.resolve({owner:OWNER,snapshot:rawFixture()});
 assert.equal(await task,false);assert.equal(app.raw,null);
});
test('provisional poll revocation clears locally previewed data even without admitted status',async()=>{
 const store=storeFixture(),app=new CloudApp({async status(){return {admitted:false,approvalState:'revoked'};}},store);
 app.identity=user;app.render=()=>{};
 assert.equal(await app.openCachedWhileChecking(user),true);
 await app.pollOnce();
 assert.equal(app.raw,null);assert.equal(app.localStartupOwner,null);
 assert.deepEqual(store.cleared,[OWNER]);
});
test('SDK local session hint rejects expired and missing credentials and never grants admission',async()=>{
 let record={session:{access_token:'local-only',refresh_token:'refresh-local',expires_at:Math.floor(Date.now()/1000)+600,user}};
 const sdk={auth:{onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}};},
  async getSession(){return {data:record,error:null};}}};
 const client=createCloudClient(sdk,{assertSecure(){}});
 assert.deepEqual(await client.sessionIdentity(),user);
 assert.equal(await client.offlineIdentity(),null,'online session is not offline mode');
 record={session:{...record.session,expires_at:Math.floor(Date.now()/1000)+10}};
 assert.equal(await client.sessionIdentity(),null);
 record={session:null};assert.equal(await client.sessionIdentity(),null);
 client.dispose();
});
