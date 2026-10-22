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
test('declined sign-out preserves account, unsynced work, and does not call auth signOut',async()=>{
 const f=fixture(),event={owner:OWNER,id:'unsynced'};let signs=0;
 f.store.list=async()=>[event];f.client.signOut=async()=>signs++;
 const old=globalThis.confirm;globalThis.confirm=()=>false;
 try{await f.app.click({target:{closest:()=>({dataset:{action:'signout'}})}});}
 finally{if(old===undefined)delete globalThis.confirm;else globalThis.confirm=old;}
 assert.equal(signs,0);assert.equal(f.app.identity.id,OWNER);
 assert.deepEqual(await f.app.queue.pending(),[event]);
});
test('accepted sign-out leaves unsynced work durable and bound to the original owner',async()=>{
 const f=fixture(),event={owner:OWNER,id:'unsynced'};let signs=0;
 f.store.list=async()=>[event];f.client.signOut=async()=>signs++;
 const old=globalThis.confirm;globalThis.confirm=()=>true;
 try{await f.app.click({target:{closest:()=>({dataset:{action:'signout'}})}});}
 finally{if(old===undefined)delete globalThis.confirm;else globalThis.confirm=old;}
 assert.equal(signs,1);
 assert.equal(f.app.identity,null);
 assert.deepEqual(await f.store.list(OWNER),[event]);
});
test('late sign-out completion cannot erase a newer account session',async()=>{
 const f=fixture(),signing=deferred(),release=deferred();
 f.client.signOut=async()=>{signing.resolve();await release.promise;};
 const task=f.app.click({target:{closest:()=>({dataset:{action:'signout'}})}});
 await signing.promise;f.switchAccount();release.resolve();await task;
 assert.equal(f.app.identity.id,'other-owner');assert.equal(f.app.renders||0,0);
});


test('idle foreground checks admission without reloading every personal and Community dataset',async()=>{
 const f=fixture();let statusCalls=0,heavyCalls=0;
 f.client.status=async()=>{statusCalls++;return {admitted:true,role:'member'};};
 f.app.sync=async()=>{heavyCalls++;};
 f.app.lastHeavySyncAt=Date.now();
 await f.app.pollOnce();
 assert.equal(statusCalls,1);
 assert.equal(heavyCalls,0,'a verified recent full sync avoids duplicated full-state reads');
 f.app.lastHeavySyncAt=Date.now()-181000;
 await f.app.pollOnce();
 assert.equal(statusCalls,2);
 assert.equal(heavyCalls,1,'long idle tab still picks up cross-device changes');
});
test('revocation is checked every polling interval, not delayed until a full-state refresh',async()=>{
 const f=fixture();let denied=0,synced=0;
 f.app.lastHeavySyncAt=Date.now();
 f.client.status=async()=>({admitted:false});
 f.app.denyAccess=async(user,epoch,status)=>{denied++;assert.equal(user.id,OWNER);assert.equal(status.admitted,false);};
 f.app.sync=async()=>{synced++;};
 await f.app.pollOnce();
 assert.equal(denied,1);
 assert.equal(synced,0,'must never read personal data after admission denial');
});
test('an old account polling response cannot mutate newer owner session',async()=>{
 const f=fixture(),started=deferred(),release=deferred();let synced=0;
 f.client.status=async()=>{started.resolve();await release.promise;return {admitted:false};};
 f.app.denyAccess=async()=>{throw new Error('Stale user must not be denied on another account');};
 f.app.sync=async()=>{synced++;};
 const pending=f.app.pollOnce();await started.promise;f.switchAccount();release.resolve();await pending;
 assert.equal(synced,0);
 assert.equal(f.app.identity.id,'other-owner');
});
