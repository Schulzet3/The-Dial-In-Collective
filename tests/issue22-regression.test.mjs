import test from 'node:test';
import assert from 'node:assert/strict';
import {Outbox,independentMutations} from '../site/cloud/outbox.js';
import {CloudError} from '../site/cloud/client.js';
const A='a1111111-1111-4111-8111-111111111111',B='b2222222-2222-4222-8222-222222222222';
const shot=(id,rev=0)=>({id,expected_revision:rev,setup_version_id:'setup-version',library_entry_id:'coffee',time_s:25});
function store(){
 const events=[],receipts=[],caches=new Map();let sequence=0;
 return {events,receipts,caches,
  async put(x){const item=events.find(e=>e.owner===x.owner&&e.id===x.id);
   if(item){Object.assign(item,structuredClone(x));return;}
   events.push({...structuredClone(x),sequence:++sequence});},
  async list(owner){return structuredClone(events.filter(e=>e.owner===owner).sort((a,b)=>a.sequence-b.sequence));},
  async acknowledge(e,r){receipts.push({owner:e.owner,id:e.id,result:structuredClone(r)});
   const i=events.findIndex(x=>x.owner===e.owner&&x.id===e.id);if(i!==-1)events.splice(i,1);},
  async readCache(owner){return caches.get(owner)||null;},
  async saveCache(owner,snapshot){caches.set(owner,{owner,snapshot:structuredClone(snapshot)});},
  async clearCache(owner){caches.delete(owner);}
 };
}
function queue(s,remote,identity,tag='event'){
 let n=0;return new Outbox({store:s,remote,identity,uuid:()=>tag+'-'+(++n)});
}
test('1: two tabs with the same shot revision cannot overwrite the first writer',async()=>{
 const server={revision:1,time_s:25},first=store(),second=store();
 const remote={mutate:async e=>{
  if(e.payload.expected_revision!==server.revision)return {ok:false,code:'conflict',revision:server.revision};
  server.revision++;server.time_s=e.payload.time_s;return {ok:true,record:{id:e.payload.id,...server}};
 }};
 const a=queue(first,remote,()=>({id:A}),'tab-a');const b=queue(second,remote,()=>({id:A}),'tab-b');
 await a.enqueue('save_shot',{...shot('same-shot',1),time_s:26});
 await b.enqueue('save_shot',{...shot('same-shot',1),time_s:45});
 assert.equal((await a.flush()).state,'synced');assert.equal((await b.flush()).state,'conflict');
 assert.equal(server.time_s,26);assert.equal(server.revision,2);
 assert.equal(second.events[0].status,'conflict');assert.equal(second.events[0].payload.time_s,45);
 assert.equal((await b.flush()).state,'conflict');assert.equal(server.revision,2);
});
test('2: stale offline update stays held while independent new shot succeeds',async()=>{
 const s=store(),calls=[];
 const q=queue(s,{mutate:async e=>{calls.push(e.payload.id);
  if(e.payload.id==='old-shot')return {ok:false,code:'conflict',revision:9};
  return {ok:true,record:{id:e.payload.id}};}},()=>({id:A}));
 await q.enqueue('save_shot',shot('old-shot',1));await q.enqueue('save_shot',shot('new-shot',0));
 assert.equal((await q.flush()).state,'conflict');assert.deepEqual(calls,['old-shot','new-shot']);
 assert.equal(s.events.length,1);assert.equal(s.events[0].payload.id,'old-shot');
 assert.equal(s.receipts.length,1);assert.equal(s.receipts[0].owner,A);
 assert.equal(independentMutations({action:'create_setup',payload:{}},{action:'save_shot',payload:shot('new')}),false);
});
test('3: signout holds A pending; B cannot see or submit A operations',async()=>{
 const s=store(),sent=[];let owner=A;
 const q=queue(s,{mutate:async e=>{sent.push(e.owner);return {ok:true};}},()=>owner?{id:owner,sessionEpoch:1}:null);
 await q.enqueue('save_shot',shot('owner-a'));
 owner=null;assert.equal((await q.flush()).state,'signed_out');
 await assert.rejects(()=>q.enqueue('save_shot',shot('unsigned')),{code:'signed_out'});
 owner=B;await q.enqueue('save_shot',shot('owner-b'));
 assert.equal((await q.flush()).state,'synced');assert.deepEqual(sent,[B]);
 assert.equal(s.events.length,1);assert.equal(s.events[0].owner,A);
 owner=A;await q.flush();assert.deepEqual(sent,[B,A]);assert.equal(s.events.length,0);
});
test('4: denial after expired authorization preserves queue and blocks subsequent writes',async()=>{
 const s=store();let calls=0;
 const q=queue(s,{mutate:async()=>{calls++;throw Object.assign(new CloudError('Access denied','42501'),{status:403});}},()=>({id:A}));
 await q.enqueue('save_shot',shot('blocked'));await q.enqueue('save_shot',shot('later'));
 assert.equal((await q.flush()).accessDenied,true);assert.equal((await q.flush()).accessDenied,true);
 assert.equal(calls,1);assert.equal(s.events.length,2);
 assert.deepEqual(s.events.map(e=>e.status),['rejected','pending']);
});
test('4: a missing local session never flushes; reauthenticated original owner resumes',async()=>{
 const s=store();let calls=0,session={id:A,sessionEpoch:1};
 const q=queue(s,{mutate:async()=>{calls++;return {ok:true};}},()=>session);
 await q.enqueue('save_shot',shot('waiting'));
 session=null;assert.equal((await q.flush()).state,'signed_out');assert.equal(calls,0);
 assert.equal(s.events.length,1);
 session={id:A,sessionEpoch:2};assert.equal((await q.flush()).state,'synced');
 assert.equal(calls,1);assert.equal(s.events.length,0);
});
test('5: cache eviction does not make pending mutation falsely acknowledged',async()=>{
 const s=store();let offline=true,calls=0;
 const q=queue(s,{mutate:async()=>{calls++;if(offline)throw new TypeError('offline');return {ok:true};}},()=>({id:A}));
 await s.saveCache(A,{shots:[{id:'earlier'}]});await q.enqueue('save_shot',shot('offline-shot'));
 assert.equal((await q.flush()).state,'offline');s.caches.delete(A);
 assert.equal(await s.readCache(A),null);assert.equal(s.events.length,1);assert.equal(s.receipts.length,0);
 offline=false;assert.equal((await q.flush()).state,'synced');
 assert.equal(s.events.length,0);assert.equal(s.receipts.length,1);assert.equal(calls,2);
});
test('6: lost server response retries identical mutation ID and leaves one receipt',async()=>{
 const s=store(),seen=new Set(),attempts=[];let lost=true;
 const q=queue(s,{mutate:async e=>{attempts.push(e.id);seen.add(e.id);
  if(lost){lost=false;throw TypeError('response lost');}return {ok:true,record:{id:e.payload.id}};}},()=>({id:A}));
 await q.enqueue('save_shot',shot('new-shot'));
 assert.equal((await q.flush()).state,'offline');assert.equal(s.events.length,1);
 assert.equal((await q.flush()).state,'synced');assert.equal(seen.size,1);
 assert.equal(attempts[0],attempts[1]);assert.equal(s.receipts.length,1);assert.equal(s.events.length,0);
});
test('6: IndexedDB acknowledgement failure keeps idempotency key and original write',async()=>{
 const s=store(),ack=s.acknowledge.bind(s);let broken=true;const ids=[];
 s.acknowledge=async(e,r)=>{if(broken){broken=false;throw Error('IndexedDB transaction aborted');}return ack(e,r);};
 const q=queue(s,{mutate:async e=>{ids.push(e.id);return {ok:true};}},()=>({id:A}));
 await q.enqueue('save_shot',shot('durable'));
 await assert.rejects(()=>q.flush(),/IndexedDB transaction aborted/);
 assert.equal(s.events.length,1);assert.equal(s.receipts.length,0);
 assert.equal((await q.flush()).state,'synced');assert.equal(ids[0],ids[1]);
 assert.equal(s.receipts.length,1);assert.equal(s.events.length,0);
});
