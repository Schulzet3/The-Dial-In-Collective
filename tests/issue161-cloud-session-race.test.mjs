import test from 'node:test';
import assert from 'node:assert/strict';
import {rawFixture,OWNER} from './cloud-fixtures/raw.js';
const root={innerHTML:''},sheet={innerHTML:'',open:false,close(){this.open=false;},querySelector(){return null;}};
globalThis.document={querySelector:s=>s==='#app'?root:sheet,
 createElement:()=>({id:'',className:'',dataset:{},setAttribute(){},replaceChildren(){},close(){},querySelector(){return null;}}),
 body:{append(){}}};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {resolve,promise};};
test('new account cloud sync bypasses stalled prior read and discards its private result',async()=>{
 const blocked=deferred(),started=deferred();
 const store={async list(){return[];},async saveCache(){}};
 const oldRaw=rawFixture(),newRaw=rawFixture();
 oldRaw.submissions[0].proposed_data.name='Account A private coffee';
 newRaw.submissions[0].proposed_data.name='Account B private coffee';
 let reads=0;
 const client={async read(){reads++;if(reads===1){started.resolve();await blocked.promise;return oldRaw;}return newRaw;},
  async listCommunityReviews(){return[];}};
 const app=new CloudApp(client,store);app.identity={id:OWNER};app.status={admitted:true};
 app.queue.flush=async()=>({state:'synced'});app.syncFirstStylePrompts=async()=>{};app.render=()=>{};
 const old=app.sync();await started.promise;app.resetAccount();
 app.identity={id:'b1111111-1111-4111-8111-111111111111'};app.status={admitted:true};
 let timer;
 try{
  await Promise.race([app.sync(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('New owner blocked by old RPC')),1500);})]);
  assert.equal(reads,2);assert.equal(app.state.coffees[0].name,'Account B private coffee');
 }finally{clearTimeout(timer);blocked.resolve();await old;}
 assert.equal(app.state.coffees[0].name,'Account B private coffee');
});
