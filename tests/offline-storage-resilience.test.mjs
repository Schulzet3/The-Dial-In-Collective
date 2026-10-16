import test from 'node:test';
import assert from 'node:assert/strict';
import {IndexedStore} from '../site/cloud/outbox.js';

test('temporary IndexedDB open errors do not permanently disable later attempts',async()=>{
 let attempts=0;
 const idb={open(){attempts++;if(attempts===1)throw new Error('transient browser failure');
  const request={result:{objectStoreNames:{contains(){return true;}}}};
  queueMicrotask(()=>request.onsuccess());
  return request;}};
 const store=new IndexedStore(idb);
 await assert.rejects(()=>store.db(),/transient browser failure/);
 const db=await store.db();
 assert.ok(db);
 assert.equal(attempts,2);
});
test('blocked IndexedDB opening can be retried without losing queued owner records',async()=>{
 let attempts=0;
 const idb={open(){attempts++;const request={result:{objectStoreNames:{contains(){return true;}}}};
  queueMicrotask(()=>{if(attempts===1)request.onblocked();else request.onsuccess();});
  return request;}};
 const store=new IndexedStore(idb);
 await assert.rejects(()=>store.db(),/another open app tab/);
 await store.db();
 assert.equal(attempts,2);
});
test('transaction callback errors reject immediately and abort instead of hanging',async()=>{
 let aborted=0;
 const db={transaction(){return {abort(){aborted++;}};}};
 const store=new IndexedStore({open(){}});
 store.db=async()=>db;
 await assert.rejects(()=>store.transaction(['cache'],()=>{throw new Error('invalid cached payload');}),/invalid cached payload/);
 assert.equal(aborted,1);
});
test('database name is unchanged to preserve all existing offline writes',async()=>{
 let captured='';
 const db={objectStoreNames:{contains(){return true;}}};
 const idb={open(name,version){captured=name;assert.equal(version,1);
  const request={result:db};queueMicrotask(()=>request.onsuccess());return request;}};
 const store=new IndexedStore(idb);
 await store.db();
 assert.equal(captured,'dic_cloud_owner_test_v1');
});
