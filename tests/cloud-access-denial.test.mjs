import test from 'node:test';
import assert from 'node:assert/strict';
import {CloudError,createCloudClient,isAccessDenied} from '../site/cloud/client.js';
import {Outbox} from '../site/cloud/outbox.js';
import {rawFixture,OWNER} from './cloud-fixtures/raw.js';
import {hydrate} from '../site/cloud/mapping.js';

const root={innerHTML:''},sheet={open:true,innerHTML:'Private form',close(){this.open=false;},querySelector(){return null;}};
globalThis.document={querySelector:selector=>selector==='#app'?root:sheet};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture(){
 const raw=rawFixture(),events=[{owner:OWNER,id:'unsynced',status:'pending'}],receipts=[{owner:OWNER,id:'acknowledged'}],cleared=[];
 let saved={owner:OWNER,snapshot:raw};
 const store={
  async list(){return events.slice();},
  async readCache(){return saved;},
  async saveCache(owner,snapshot){saved={owner,snapshot};},
  async clearCache(owner){cleared.push(owner);saved=null;}
 };
 const client={async read(){throw new CloudError('Admitted account required.','42501');},async offlineIdentity(){return {id:OWNER};},async listCommunityReviews(){return [];}};
 const app=new CloudApp(client,store);app.identity={id:OWNER};app.status={admitted:true,admin:true,emailVerified:true};
 app.raw=raw;app.state=hydrate(raw);app.pending=events.slice();app.communityRows=[{private:'review'}];app.reviews=[{shot_id:'held'}];
 app.queue.flush=async()=>({state:'rejected'});app.render=()=>{app.renders=(app.renders||0)+1;};
 return {app,store,client,raw,events,receipts,cleared};
}
test('explicit read denial clears admitted views and only the owner cache, preserving unsynced work',async()=>{
 const f=fixture();await f.app.doSync();
 assert.equal(f.app.status.admitted,false);assert.equal(f.app.status.admin,false);
 assert.equal(f.app.status.emailVerified,true);assert.equal(f.app.syncState,'access_denied');
 assert.equal(f.app.raw,null);assert.equal(f.app.localOfflineOwner,null);assert.equal(f.app.state.coffees.length,0);
 assert.deepEqual(f.app.communityRows,[]);assert.deepEqual(f.app.reviews,[]);assert.deepEqual(f.app.pending,[]);
 assert.equal(sheet.open,false);assert.equal(sheet.innerHTML,'');assert.deepEqual(f.cleared,[OWNER]);
 assert.equal(f.events.length,1);assert.equal(f.receipts.length,1);
});
test('temporary connection failure still restores the matching owner cache and pending work',async()=>{
 const f=fixture();f.client.read=async()=>{throw new TypeError('Failed to fetch');};
 await f.app.doSync();
 assert.equal(f.app.status.admitted,true);assert.equal(f.app.syncState,'offline');
 assert.equal(f.app.state.coffees.length,1);assert.equal(f.app.pending.length,1);assert.deepEqual(f.cleared,[]);
});
test('mutation denial prevents a later read outage from reopening the admitted cache',async()=>{
 for(const denial of [new CloudError('Admitted account required.','42501'),
  Object.assign(new CloudError('Forbidden'),{status:403}),new CloudError('Invalid JWT','PGRST303')]){
  const f=fixture();let reads=0;
  f.store.put=async event=>{f.events[0]=event;};
  f.client.mutate=async()=>{throw denial;};
  f.client.read=async()=>{reads++;throw new TypeError('Failed to fetch');};
  f.app.queue=new Outbox({store:f.store,remote:f.client,identity:()=>f.app.identity});
  await f.app.doSync();
  assert.equal(reads,0);assert.equal(f.app.status.admitted,false);assert.equal(f.app.raw,null);
  assert.equal(f.events.length,1);assert.equal(f.events[0].status,'rejected');assert.deepEqual(f.cleared,[OWNER]);
 }
});
test('restored membership can reopen its preserved rejected queue after a fresh admission check',async()=>{
 const f=fixture();let checks=0;
 f.events[0].status='rejected';f.events[0].error={code:'42501'};
 f.client.status=async()=>{checks++;return {admitted:true,admin:false};};f.client.read=async()=>f.raw;
 f.app.queue=new Outbox({store:f.store,remote:f.client,identity:()=>f.app.identity});
 await f.app.doSync();
 assert.equal(checks,1);assert.equal(f.app.status.admitted,true);assert.equal(f.app.status.admin,false);
 assert.equal(f.app.pending.length,1);assert.equal(f.app.pending[0].status,'rejected');
 assert.equal(f.app.state.coffees.length,1);assert.deepEqual(f.cleared,[]);
});
test('retained authorization denial cannot be bypassed when renewed admission is denied or unavailable',async()=>{
 for(const unavailable of [false,true]){
  const f=fixture();let reads=0;
  f.events[0].status='rejected';f.events[0].error={code:'42501'};
  f.client.status=async()=>{if(unavailable)throw new TypeError('Failed to fetch');return {admitted:false};};
  f.client.read=async()=>{reads++;return f.raw;};
  f.app.queue=new Outbox({store:f.store,remote:f.client,identity:()=>f.app.identity});
  await f.app.doSync();
  assert.equal(reads,0);assert.equal(f.app.status.admitted,false);assert.equal(f.app.raw,null);
  assert.equal(f.events.length,1);assert.deepEqual(f.cleared,[OWNER]);
 }
});
test('denied cache cleanup cannot blank a newly selected account',async()=>{
 const f=fixture(),started=deferred(),release=deferred();
 f.store.clearCache=async owner=>{f.cleared.push(owner);started.resolve();await release.promise;throw new Error('Storage busy');};
 const task=f.app.doSync();await started.promise;
 assert.equal(f.app.raw,null,'private UI is cleared before local storage finishes');
 f.app.resetAccount();f.app.identity={id:'new-owner'};f.app.status={admitted:true};f.app.notice='New workspace';
 const renders=f.app.renders;release.resolve();await task;
 assert.equal(f.app.identity.id,'new-owner');assert.equal(f.app.status.admitted,true);
 assert.equal(f.app.notice,'New workspace');assert.equal(f.app.renders,renders);assert.deepEqual(f.cleared,[OWNER]);
});
test('a denied owner cannot reopen leftover cache offline after storage cleanup fails',async()=>{
 const f=fixture();f.store.clearCache=async()=>{throw new Error('Storage busy');};
 await f.app.doSync();navigator.onLine=false;
 try{
  assert.equal(await f.app.restoreOfflineCache(),false);assert.equal(f.app.raw,null);assert.equal(f.app.localOfflineOwner,null);
 }finally{navigator.onLine=true;}
});
test('fresh read denial for an old account cannot revoke a replacement account',async()=>{
 const f=fixture(),started=deferred(),release=deferred();
 f.client.read=async()=>{started.resolve();await release.promise;throw new CloudError('Admitted account required.','42501');};
 const task=f.app.doSync();await started.promise;
 f.app.resetAccount();f.app.identity={id:'new-owner'};f.app.status={admitted:true};
 release.resolve();await task;
 assert.equal(f.app.status.admitted,true);assert.deepEqual(f.cleared,[]);
});
test('denial during required-review refresh also removes private workspace access',async()=>{
 const f=fixture();f.events.length=0;f.client.read=async()=>f.raw;
 f.client.listCommunityReviews=async()=>{throw new CloudError('Admitted account required.','42501');};
 await f.app.doSync();assert.equal(f.app.status.admitted,false);assert.equal(f.app.raw,null);assert.deepEqual(f.cleared,[OWNER]);
});
test('fresh admitted status restores eligibility after earlier denial',async()=>{
 const f=fixture();await f.app.doSync();
 f.events.length=0;f.client.status=async()=>({admitted:true,emailVerified:true});f.client.read=async()=>f.raw;
 await f.app.connect();
 assert.equal(f.app.status.admitted,true);assert.equal(f.app.deniedOfflineOwners.has(OWNER),false);assert.equal(f.app.state.coffees.length,1);
});
test('SDK HTTP denial is retained even when an error has no database code',async()=>{
 const sdk={auth:{onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}};}},
  async rpc(){return {error:{message:'Forbidden'},status:403};}};
 const client=createCloudClient(sdk,{assertSecure(){}});
 await assert.rejects(client.read(),error=>isAccessDenied(error)&&error.status===403);
 for(const code of ['42501','PGRST301','PGRST302','PGRST303'])
  assert.equal(isAccessDenied(new CloudError('Authentication denied',code)),true,code);
 assert.equal(isAccessDenied(new CloudError('Service unavailable','request_failed')),false);
 client.dispose();
});
