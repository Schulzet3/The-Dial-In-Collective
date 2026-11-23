import test from 'node:test';
import assert from 'node:assert/strict';
import {rawFixture,OWNER} from './cloud-fixtures/raw.js';

const root={innerHTML:'',querySelector(){return null;}};
const sheet={open:false,innerHTML:'',close(){},querySelector(){return null;},addEventListener(){},replaceChildren(){}};
globalThis.document={querySelector:s=>s==='#app'?root:sheet};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
test('admitted owner sees matching cached coffees before slow cloud synchronization',async()=>{
 const gate=deferred(),frames=[],raw=rawFixture();
 const store={async readCache(){return {owner:OWNER,snapshot:raw};},async list(){return [];}};
 const app=new CloudApp({async status(){return {admitted:true,admin:false};}},store);
 app.identity={id:OWNER};app.render=()=>frames.push(app.state.coffees.length);
 app.sync=()=>gate.promise;
 const connecting=app.connect();
 for(let n=0;n<10&&!frames.length;n++)await Promise.resolve();
 assert.ok(frames.includes(1),'cached workspace should render before remote sync finishes');
 gate.resolve();await connecting;
});
test('unadmitted owner cannot read or render cached private workspace',async()=>{
 let reads=0;const app=new CloudApp({async status(){return {admitted:false,approvalState:'rejected'};}},{
 async readCache(){reads++;return null;},async clearCache(){}
 });
 app.identity={id:OWNER};app.render=()=>{};
 await app.connect();
 assert.equal(reads,0);assert.equal(app.raw,null);
});
test('foreign owner cache never renders even after server admission',async()=>{
 const gate=deferred(),frames=[],raw=rawFixture();
 const app=new CloudApp({async status(){return {admitted:true,admin:false};}},{
 async readCache(){return {owner:'other-owner',snapshot:raw};},async list(){return [];}
 });
 app.identity={id:OWNER};app.render=()=>frames.push(app.state.coffees.length);app.sync=()=>gate.promise;
 const connecting=app.connect();
 for(let n=0;n<10;n++)await Promise.resolve();
 assert.equal(frames.includes(1),false);
 gate.resolve();await connecting;
});

test('simultaneous same-session startup triggers share one admission request',async()=>{
 const gate=deferred();let checks=0;
 const app=new CloudApp({async status(){checks++;return gate.promise;}},{
  async readCache(){return null;},async list(){return [];}
 });
 app.identity={id:OWNER};app.render=()=>{};app.sync=async()=>{};
 const a=app.connect(),b=app.connect();
 assert.equal(checks,1);
 gate.resolve({admitted:true,admin:false});
 await Promise.all([a,b]);
 assert.equal(checks,1);
});
test('a different owner never waits on the previous owner admission',async()=>{
 const gate=deferred(),owners=[];
 const app=new CloudApp({async status(){owners.push(app.identity.id);return owners.length===1?gate.promise:{admitted:true,admin:false};}},{
  async readCache(){return null;},async list(){return [];}
 });
 app.render=()=>{};app.sync=async()=>{};
 app.identity={id:OWNER};const old=app.connect();
 app.resetAccount();app.identity={id:'new-owner'};await app.connect();
 assert.deepEqual(owners,[OWNER,'new-owner']);
 gate.resolve({admitted:true,admin:false});await old;
 assert.equal(app.identity.id,'new-owner');
});

test('local cache failure does not prevent authoritative sync after admission',async()=>{
 let syncs=0;
 const app=new CloudApp({async status(){return {admitted:true,admin:false};}},{
  async readCache(){throw new Error('IndexedDB temporarily unavailable');},
  async list(){return [];}
 });
 app.identity={id:OWNER};app.render=()=>{};
 app.sync=async()=>{syncs++;};
 await app.connect();
 assert.equal(syncs,1);
 assert.equal(app.status.admitted,true);
});
test('cache lookup never begins before server admission finishes',async()=>{
 const gate=deferred();let reads=0;
 const app=new CloudApp({async status(){return gate.promise;}},{
  async readCache(){reads++;return null;},async list(){return [];}
 });
 app.identity={id:OWNER};app.render=()=>{};app.sync=async()=>{};
 const task=app.connect();
 await Promise.resolve();
 assert.equal(reads,0);
 gate.resolve({admitted:true,admin:false});await task;
 assert.equal(reads,1);
});

test('cloud read outage preserves already loaded owner snapshot if IndexedDB also fails',async()=>{
 const raw=rawFixture(),app=new CloudApp({
  async read(){throw new TypeError('Failed to fetch');},
  async listCommunityReviews(){return [];}
 },{
  async readCache(){throw new Error('IndexedDB unavailable');},
  async list(){return [];}
 });
 app.identity={id:OWNER};app.status={admitted:true};app.raw=raw;
 app.queue.flush=async()=>({state:'offline'});app.render=()=>{};
 await app.doSync();
 assert.equal(app.state.coffees.length,1);
 assert.equal(app.syncState,'offline');
});

test('INITIAL_SESSION renders cached coffee before the server admission RPC',async()=>{
 const session=deferred(),access=deferred(),order=[],user={id:OWNER,email:'member@example.invalid'},raw=rawFixture();
 let listener;
 const client={onAuthChange(fn){listener=fn;},sessionIdentity(){return session.promise;},async status(){order.push('status');return access.promise;}};
 const store={async readCache(owner){order.push('cache');return {owner,snapshot:raw};},async list(){return [];}};
 const app=new CloudApp(client,store);
 app.render=()=>order.push(app.state.coffees.length?'coffees':'public');
 app.sync=async()=>{};
 const priorDoc=globalThis.document,priorAdd=globalThis.addEventListener;
 globalThis.document={addEventListener(){},visibilityState:'visible'};
 globalThis.addEventListener=()=>{};
 let boot;
 try{
  boot=app.init();
  listener('INITIAL_SESSION',user);
  assert.deepEqual(order,[],'SDK callback cannot show a transient gate or start admission first');
  session.resolve(user);
  await boot;
  assert.deepEqual(order.slice(0,3),['cache','coffees','status'],
    'saved coffees must paint before the first server access request');
  assert.equal(app.status,null,'cached preview never grants admission');
  assert.equal(app.localStartupOwner,OWNER);
  access.resolve({admitted:true,admin:false});
  await app.connect();
  assert.equal(app.status.admitted,true,'background server admission still completes');
 }finally{
  session.resolve(user);access.resolve({admitted:true,admin:false});
  if(boot)await boot.catch(()=>{});
  clearInterval(app.poll);
  globalThis.document=priorDoc;globalThis.addEventListener=priorAdd;
 }
});

test('sign-out during pending cache read cannot reveal former owner',async()=>{
 const session=deferred(),cache=deferred(),user={id:OWNER},raw=rawFixture();
 let listener,cacheRequested=false,checks=0;
 const client={onAuthChange(fn){listener=fn;},sessionIdentity(){return session.promise;},async status(){checks++;return {admitted:true};}};
 const store={readCache(){cacheRequested=true;return cache.promise;},async list(){return [];}};
 const app=new CloudApp(client,store),frames=[];
 app.render=()=>frames.push(app.state.coffees.length);
 const priorDoc=globalThis.document,priorAdd=globalThis.addEventListener;
 globalThis.document={addEventListener(){},visibilityState:'visible'};
 globalThis.addEventListener=()=>{};
 let boot;
 try{
  boot=app.init();listener('INITIAL_SESSION',user);session.resolve(user);
  for(let i=0;i<15&&!cacheRequested;i++)await Promise.resolve();
  assert.equal(cacheRequested,true);
  listener('SIGNED_OUT',null);
  cache.resolve({owner:OWNER,snapshot:raw});
  await boot;
  assert.equal(app.identity,null);
  assert.equal(app.raw,null);
  assert.equal(frames.includes(1),false,"former owner's cache must never repaint");
  assert.equal(checks,0,'sign-out cannot start an admission RPC');
 }finally{
  session.resolve(user);cache.resolve({owner:OWNER,snapshot:raw});
  if(boot)await boot.catch(()=>{});
  clearInterval(app.poll);
  globalThis.document=priorDoc;globalThis.addEventListener=priorAdd;
 }
});
