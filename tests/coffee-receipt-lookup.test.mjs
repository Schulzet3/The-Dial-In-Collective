import test from 'node:test';
import assert from 'node:assert/strict';
import {IndexedStore} from '../site/cloud/outbox.js';

const owner='11111111-1111-4111-8111-111111111111';
const eventId='22222222-2222-4222-8222-222222222222';
const otherOwner='33333333-3333-4333-8333-333333333333';
const receipt={owner,id:eventId,event:{owner,id:eventId,action:'submit_coffee'},
 result:{ok:true,library_entry_id:'existing-library-entry',reused:true}};
function fixture(result=receipt,error=null){
 const calls=[],store=new IndexedStore({});
 store.db=async()=>({transaction(name,mode){
  calls.push({name,mode});return {objectStore(storeName){
   assert.equal(storeName,'receipts');return {get(key){
    calls.push({key});const request={result,error};
    queueMicrotask(()=>error?request.onerror():request.onsuccess());return request;
   }};
  }};
 }});
 return {store,calls};
}
test('receipt lookup reads only the exact owner and mutation key using a readonly transaction',async()=>{
 const {store,calls}=fixture();
 assert.deepEqual(await store.readReceipt(owner,eventId),receipt);
 assert.deepEqual(calls,[{name:'receipts',mode:'readonly'},{key:[owner,eventId]}]);
});
test('invalid owner or mutation keys fail closed before opening local storage',async()=>{
 const {store,calls}=fixture();
 for(const [user,id] of [[null,eventId],[owner,null],['',eventId],[owner,''],
  [{id:owner},eventId],[owner,[eventId]],['another account',eventId],[owner,'x'.repeat(1000)]])
  assert.equal(await store.readReceipt(user,id),null);
 assert.deepEqual(calls,[]);
});
test('missing or mismatched stored acknowledgements cannot attach another coffee or account',async()=>{
 for(const candidate of [undefined,{...receipt,owner:otherOwner},
  {...receipt,id:otherOwner},{...receipt,event:{...receipt.event,owner:otherOwner}},
  {...receipt,event:{...receipt.event,id:otherOwner}}]){
  const {store}=fixture(candidate===undefined?null:candidate);
  assert.equal(await store.readReceipt(owner,eventId),null);
 }
});
test('a receipt read failure is reported without changing or acknowledging an event',async()=>{
 const error=new Error('read unavailable'),{store,calls}=fixture(null,error);
 await assert.rejects(()=>store.readReceipt(owner,eventId),/read unavailable/);
 assert.deepEqual(calls,[{name:'receipts',mode:'readonly'},{key:[owner,eventId]}]);
});
