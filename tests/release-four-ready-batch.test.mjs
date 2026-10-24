import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const q=JSON.parse(readFileSync(new URL('../docs/RELEASE_QUEUE.json',import.meta.url),'utf8'));
const all=q.history;
test('four ready batch items or their final deployment receipts remain present',()=>{
 for(const issue of [5,10,33,100]){
  const item=all.find(x=>x.issue===issue&&x.delivered_release_id==='DIC-20261024-READY-QUEUE-06');
  assert.ok(item,'missing issue '+issue);
  assert.equal(item.state,'DEPLOYED','missing deployed receipt for issue '+issue);
  assert.equal(item.blockers.length,0);
  assert.ok(item.scope_paths.every(path=>existsSync(new URL('../'+path,import.meta.url))));
 }
});