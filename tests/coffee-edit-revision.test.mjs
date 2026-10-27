import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture,OWNER} from './cloud-fixtures/raw.js';

const root={innerHTML:''},sheet={close(){},querySelector(){return null;}};
globalThis.document={querySelector:selector=>selector==='#app'?root:sheet};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;
function fixture(canonical=true){
 const raw=rawFixture();raw.submissions[0].revision=2;
 raw.submissions[0].source_url='https://example.invalid/products/original';
 if(canonical){
  raw.library[0].coffee_id='canonical';raw.submissions[0].status='approved';raw.submissions[0].canonical_coffee_id='canonical';
  raw.coffees=[{id:'canonical',name:'Corrected Coffee Name',roaster:'Corrected Roaster',origin:'New origin',revision:7}];
 }
 const app=new CloudApp({},{});app.raw=raw;app.state=hydrate(raw);
 app.show=(title,html)=>{app.shown={title,html};};return {app,raw};
}
const value=(html,name)=>html.match(new RegExp('name="'+name+'"[^>]*value="([^"]*)"'))?.[1];
test('new canonical correction uses current shared facts and canonical revision rather than original submission',()=>{
 const f=fixture();f.app.showEditCoffee('coffee');
 assert.equal(f.app.editCoffeeRevision,7);assert.equal(f.app.shown.title,'Suggest Coffee Corrections');
 assert.equal(value(f.app.shown.html,'name'),'Corrected Coffee Name');assert.equal(value(f.app.shown.html,'origin'),'New origin');
 assert.equal(value(f.app.shown.html,'source_url'),'https://example.invalid/products/original');
});
test('existing pending correction retains its own revision and intentional empty source URL',()=>{
 const f=fixture();f.raw.submissions.push({id:'correction',canonical_coffee_id:'canonical',status:'pending',revision:11,
  updated_at:'2026-10-21T01:00:00Z',source_url:null,proposed_data:{name:'Owner Correction',roaster:'Corrected Roaster'}});
 f.app.showEditCoffee('coffee');
 assert.equal(f.app.editCoffeeRevision,11);assert.equal(value(f.app.shown.html,'name'),'Owner Correction');
 assert.equal(value(f.app.shown.html,'source_url'),'');
});
test('correction selection uses the same timestamp and ID ordering as the server',()=>{
 const f=fixture();f.raw.submissions.push(...['a','b'].map((id,i)=>({id,canonical_coffee_id:'canonical',status:'pending',revision:10+i,
  updated_at:'2026-10-21T01:00:00Z',proposed_data:{name:'Correction '+id,roaster:'Roaster'}})));
 f.app.showEditCoffee('coffee');assert.equal(f.app.editCoffeeRevision,11);assert.equal(value(f.app.shown.html,'name'),'Correction b');
});
test('unapproved private submission continues to use its own facts and revision',()=>{
 const f=fixture(false);f.app.showEditCoffee('coffee');
 assert.equal(f.app.editCoffeeRevision,2);assert.equal(f.app.shown.title,'Edit Coffee Details');
 assert.equal(value(f.app.shown.html,'name'),'Test Coffee');
});
test('reusing a verified coffee retains a newly imported variety in an explicit correction form',async()=>{
 const f=fixture();f.app.render=()=>{};const writes=[];
 f.app.mutate=async(action,payload)=>writes.push({action,payload});
 await f.app.finishCoffeeAdd({name:'Source name',roaster:'Source brand',variety:'Bourbon Ají',
  source_url:'https://example.invalid/products/current'},{classification:'exact_verified'},'canonical');
 assert.deepEqual(writes.map(x=>x.action),['add_verified_coffee']);
 assert.equal(value(f.app.shown.html,'variety'),'Bourbon Ají');
 assert.equal(value(f.app.shown.html,'name'),'Corrected Coffee Name');
 assert.equal(value(f.app.shown.html,'source_url'),'https://example.invalid/products/current');
 assert.match(f.app.shown.html,/Your coffee was added/);
 assert.match(f.app.shown.html,/Submit Correction For Review/);
 assert.equal(f.raw.coffees[0].variety,undefined);
});
test('imported differences preserve nonempty approved facts and pending member corrections',()=>{
 const f=fixture();f.raw.submissions.push({id:'correction',canonical_coffee_id:'canonical',status:'pending',revision:12,
  updated_at:'2026-10-24T01:00:00Z',proposed_data:{name:'Corrected Coffee Name',roaster:'Corrected Roaster',origin:'Member origin',variety:'Member cultivar'}});
 f.app.showEditCoffee('coffee',{importedDetails:{origin:'Other origin',variety:'Other cultivar',producer:'New grower'}});
 assert.equal(value(f.app.shown.html,'origin'),'Member origin');
 assert.equal(value(f.app.shown.html,'variety'),'Member cultivar');
 assert.equal(value(f.app.shown.html,'producer'),'New grower');
 assert.match(f.app.shown.html,/Submitted: Other cultivar/);
 assert.equal(f.app.editCoffeeRevision,12);
});
test('unchanged descriptive facts do not open a correction or propose identity changes',()=>{
 const f=fixture();
 assert.equal(f.app.reviewAddedCoffeeDetails(f.raw.library[0],{name:'Different title',roaster:'Different brand',release_label:'Different harvest',origin:' New   origin '}),false);
 assert.equal(f.app.shown,undefined);
});
test('server-side canonical reuse with a newly created library link preserves details for correction review',async()=>{
 const f=fixture();f.app.render=()=>{};const writes=[];
 f.app.mutate=async(action,payload)=>{writes.push(action);f.raw.library[0].id=payload.library_entry_id;f.app.state=hydrate(f.raw);};
 await f.app.finishCoffeeAdd({name:'Source name',roaster:'Source brand',variety:'Chiroso'},{classification:'new'});
 assert.deepEqual(writes,['submit_coffee']);
 assert.equal(value(f.app.shown.html,'variety'),'Chiroso');
 assert.equal(f.raw.coffees[0].variety,undefined);
});
test('server-side reuse of an existing library entry uses its acknowledged ID for correction review',async()=>{
 const f=fixture();f.app.render=()=>{};const writes=[];
 const existingId=f.raw.library[0].id;
 f.app.mutate=async(action,payload)=>{
  writes.push({action,payload});
  assert.notEqual(payload.library_entry_id,existingId);
  return {ok:true,status:'verified',coffee_id:'canonical',library_entry_id:existingId,reused:true};
 };
 await f.app.finishCoffeeAdd({name:'Source name',roaster:'Source brand',variety:'Bourbon Ají'},
  {classification:'new'});
 assert.deepEqual(writes.map(item=>item.action),['submit_coffee']);
 assert.equal(f.raw.library[0].id,existingId);
 assert.equal(f.app.tempCoffee,existingId);
 assert.equal(value(f.app.shown?.html||'','variety'),'Bourbon Ají');
 assert.doesNotMatch(f.app.notice,/Saved privately/);
 assert.equal(f.app.editCoffeeRevision,7);
 assert.equal(f.raw.coffees[0].variety,undefined);
});
test('an acknowledged save missing from the stale snapshot retains imported details until a read-only refresh',async()=>{
 const f=fixture();f.app.identity={id:OWNER};f.app.render=()=>{};let writes=0;
 f.app.mutate=async()=>{writes++;return {ok:true,status:'verified',coffee_id:'canonical',library_entry_id:'saved-not-cached',reused:true};};
 await f.app.finishCoffeeAdd({name:'Source name',roaster:'Source brand',variety:'Bourbon Ají'},{classification:'new'});
 assert.equal(writes,1);assert.equal(f.app.pendingCoffeeReview.submitted.variety,'Bourbon Ají');
 assert.equal(f.app.shown.title,'Coffee Saved · Review Waiting');assert.match(f.app.shown.html,/Bourbon Ají/);
 assert.doesNotMatch(f.app.notice,/privately|duplicate/);
 f.app.showAdd();assert.equal(f.app.shown.title,'Coffee Saved · Review Waiting');
 f.app.sync=async()=>{f.raw.library[0].id='saved-not-cached';f.app.state=hydrate(f.raw);};
 await f.app.refreshAddedCoffeeReview();
 assert.equal(writes,1);assert.equal(f.app.pendingCoffeeReview,null);
 assert.equal(value(f.app.shown.html,'variety'),'Bourbon Ají');assert.equal(f.app.editCoffeeRevision,7);
 assert.equal(f.raw.coffees[0].variety,undefined);
});
test('a missing local acknowledgement is retried by its event ID without submitting another coffee',async()=>{
 const f=fixture();f.app.identity={id:OWNER};f.app.render=()=>{};let writes=0,reads=0;
 f.app.mutate=async()=>{writes++;return {acknowledgement_unavailable:true,mutation_id:'saved-event'};};
 await f.app.finishCoffeeAdd({name:'Source name',roaster:'Source brand',variety:'Chiroso'},{classification:'new'});
 assert.equal(f.app.shown.title,'Check Coffee Save');
 f.app.sync=async()=>{};
 f.app.store.readReceipt=async(owner,id)=>{assert.equal(owner,OWNER);assert.equal(id,'saved-event');reads++;
  return {result:{ok:true,library_entry_id:'coffee',coffee_id:'canonical'}};};
 await f.app.refreshAddedCoffeeReview();
 assert.equal(writes,1);assert.equal(reads,1);assert.equal(f.app.pendingCoffeeReview,null);
 assert.equal(value(f.app.shown.html,'variety'),'Chiroso');
});
test('the full mutation guard rejects an account transition after the inner receipt guard has resolved',async()=>{
 Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
 const f=fixture(),other='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
 const event={owner:OWNER,id:'cccccccc-cccc-4ccc-cccc-cccccccccccc'};
 f.app.identity={id:OWNER};f.app.status={admitted:true};f.app.render=()=>{};f.app.sync=async()=>{};
 f.app.queue={enqueue:async()=>event};f.app.store.list=async()=>[];
 f.app.store.readReceipt=()=>{queueMicrotask(()=>queueMicrotask(()=>{f.app.identity={id:other};f.app.epoch++;}));
  return Promise.resolve({result:{ok:true,library_entry_id:'coffee'}});};
 await assert.rejects(()=>f.app.mutate('submit_coffee',{}, {onlineOnly:true}),{code:'account_changed'});
});
test('a receipt read failure after save retains its mutation identity and does not imply a second save',async()=>{
 Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
 const f=fixture(),event={owner:OWNER,id:'cccccccc-cccc-4ccc-cccc-cccccccccccc'};
 f.app.identity={id:OWNER};f.app.status={admitted:true};f.app.render=()=>{};
 f.app.sync=async()=>{throw new Error('Refresh unavailable after acknowledgement');};
 f.app.queue={enqueue:async()=>event};f.app.store.list=async()=>[];
 f.app.store.readReceipt=async()=>{throw new Error('Storage read unavailable');};
 assert.deepEqual(await f.app.mutate('submit_coffee',{}, {onlineOnly:true}),{acknowledgement_unavailable:true,mutation_id:event.id});
});
test('an account transition after mutate returns cannot open the previous account coffee review',async()=>{
 const f=fixture();f.app.identity={id:OWNER};f.app.render=()=>{};
 f.app.mutate=async()=>{f.app.identity={id:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'};f.app.epoch++;
  return {ok:true,library_entry_id:'coffee',coffee_id:'canonical'};};
 await assert.rejects(()=>f.app.finishCoffeeAdd({variety:'Bourbon Ají'},{classification:'new'}),{code:'account_changed'});
 assert.equal(f.app.shown,undefined);assert.equal(f.app.pendingCoffeeReview,null);
});
