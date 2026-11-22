import test from 'node:test';
import assert from 'node:assert/strict';
import {rawFixture,OWNER} from './cloud-fixtures/raw.js';

const root={innerHTML:'',querySelector(){return null;}};
const sheet={open:false,innerHTML:'',close(){},querySelector(){return null;}};
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
