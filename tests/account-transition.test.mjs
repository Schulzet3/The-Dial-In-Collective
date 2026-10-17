import test from 'node:test';
import assert from 'node:assert/strict';
import {rawFixture,OWNER} from './cloud-fixtures/raw.js';

// Import the real controller with only its two document roots stubbed. The
// disabled startup is harmless; these tests exercise actual async methods.
const root={innerHTML:''},sheet={close(){},querySelector(){return null;}};
globalThis.document={querySelector:selector=>selector==='#app'?root:sheet};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture(){
 const raw=rawFixture();
 const store={async list(){return [];},async saveCache(){},async readCache(){return null;},async put(){}};
 const client={async read(){return raw;},async mutate(){return {ok:true};}};
 const app=new CloudApp(client,store);app.identity={id:OWNER};app.status={admitted:true};
 app.queue.flush=async()=>({state:'synced'});app.render=()=>{app.renders=(app.renders||0)+1;};
 const switchAccount=()=>{app.epoch++;app.identity={id:'other-owner'};app.raw=null;app.pending=[];};
 return {app,raw,store,client,switchAccount};
}
test('account switch during cache persistence cannot render the former owner snapshot',async()=>{
 const f=fixture(),writing=deferred(),release=deferred();
 f.store.saveCache=async()=>{writing.resolve();await release.promise;};
 const task=f.app.doSync();await writing.promise;f.switchAccount();release.resolve();await task;
 assert.equal(f.app.raw,null);assert.equal(f.app.renders||0,0);
});
test('account switch during pending read cannot install the former owner queue or make another read',async()=>{
 const f=fixture(),reading=deferred(),release=deferred();let reads=0;
 f.store.list=async()=>{reading.resolve();await release.promise;return [{owner:OWNER,id:'private-event'}];};
 f.client.read=async()=>{reads++;return f.raw;};
 const task=f.app.doSync();await reading.promise;f.switchAccount();release.resolve();await task;
 assert.deepEqual(f.app.pending,[]);assert.equal(reads,0);
});
test('account switch during durable enqueue preserves the original event without rendering it for the next owner',async()=>{
 const f=fixture(),writing=deferred(),release=deferred(),saved=[];
 f.app.raw=f.raw;
 f.store.put=async event=>{saved.push(event);writing.resolve();await release.promise;};
 const task=f.app.mutate('save_shot',{id:'original-shot'});await writing.promise;f.switchAccount();release.resolve();
 await assert.rejects(task,{code:'account_changed'});
 assert.equal(saved.length,1);assert.equal(saved[0].owner,OWNER);assert.equal(f.app.raw,null);
 assert.equal(f.app.renders||0,0);
});
test('pending-coffee match response is ignored after the account changes',async()=>{
 const f=fixture(),reading=deferred(),release=deferred();let shown=0;
 f.app.raw=f.raw;f.app.show=()=>shown++;
 f.client.findCoffeeMatches=async()=>{reading.resolve();await release.promise;return {candidates:[{id:'private-match'}]};};
 const task=f.app.click({target:{closest:()=>({dataset:{action:'check-pending-match',id:'coffee'}})}});
 await reading.promise;f.switchAccount();release.resolve();await task;
 assert.equal(shown,0);assert.equal(f.app.pendingMergeSubmissionId,undefined);
});
test('account-change notification immediately clears rendered records while reconnecting',async()=>{
 const f=fixture(),release=deferred();f.app.raw=f.raw;f.app.pending=[{owner:OWNER}];
 f.app.render=()=>{assert.equal(f.app.raw,null);assert.deepEqual(f.app.pending,[]);f.app.renders=1;};
 f.app.connect=()=>release.promise;
 f.app.authChanged('SIGNED_IN',{id:'other-owner'});
 assert.equal(f.app.renders,1);assert.equal(f.app.identity.id,'other-owner');release.resolve();
});
test('delayed sync-detail read cannot display the former account queue',async()=>{
 const f=fixture(),reading=deferred(),release=deferred();let shown=0;
 f.app.queue.pending=async()=>{reading.resolve();await release.promise;return [{owner:OWNER}];};
 f.app.show=()=>shown++;
 const task=f.app.click({target:{closest:()=>({dataset:{action:'sync'}})}});
 await reading.promise;f.switchAccount();release.resolve();await task;
 assert.equal(shown,0);
});
test('sign-out preserves unsynced changes and does not call the auth service',async()=>{
 const f=fixture();let signs=0;const event={owner:OWNER,id:'unsynced'};
 f.store.list=async()=>[event];f.client.signOut=async()=>signs++;
 await f.app.click({target:{closest:()=>({dataset:{action:'signout'}})}});
 assert.equal(signs,0);assert.equal(f.app.identity.id,OWNER);
 assert.deepEqual(await f.app.queue.pending(),[event]);assert.match(f.app.notice,/Changes are waiting to sync/);
});
test('late sign-out completion cannot erase a newer account session',async()=>{
 const f=fixture(),signing=deferred(),release=deferred();
 f.client.signOut=async()=>{signing.resolve();await release.promise;};
 const task=f.app.click({target:{closest:()=>({dataset:{action:'signout'}})}});
 await signing.promise;f.switchAccount();release.resolve();await task;
 assert.equal(f.app.identity.id,'other-owner');assert.equal(f.app.renders||0,0);
});
