import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const q=JSON.parse(readFileSync(new URL('../docs/RELEASE_QUEUE.json',import.meta.url),'utf8'));
const all=[...q.items,...q.history];
test('four ready batch items or their final deployment receipts remain present',()=>{
 for(const issue of [5,10,33,100]){
  const item=all.find(x=>x.issue===issue);
  assert.ok(item,'missing issue '+issue);
  assert.ok(['READY','DEPLOYED'].includes(item.state),'unready issue '+issue);
  assert.equal(item.blockers.length,0);
  assert.ok(item.scope_paths.every(path=>existsSync(new URL('../'+path,import.meta.url))));
 }
});