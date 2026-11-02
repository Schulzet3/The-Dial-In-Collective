import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {nextAdvice} from '../site/lib/engine.js';
test('old setting remains recorded; next recommendation fits current range',()=>{
 const s=hydrate(rawFixture()),v=s.setups[0].versions[0];
 v.grinderMin=2.5;v.grinderMax=3.5;
 const old={grindSetting:8,timeS:10,tasteScales:{extraction:2,body:3,clarity:4,sweetness:4,astringency:1}};
 const advice=nextAdvice(s,old,{time:{low:12,center:15,high:18}});
 assert.equal(advice.next.grindSetting,3.5);
 assert.equal(old.grindSetting,8);
});

test('evenness-only feedback does not rewrite an out-of-range historical setting',()=>{
 const s=hydrate(rawFixture()),v=s.setups[0].versions[0];
 v.grinderMin=2.5;v.grinderMax=3.5;
 const old={grindSetting:8,timeS:10,tasteScales:{extraction:3,body:3,clarity:2,sweetness:4,astringency:3}};
 const advice=nextAdvice(s,old,{time:{low:12,center:15,high:18}});
 assert.equal(advice.kind,'diagnostic');
 assert.equal(advice.next,null);
 assert.equal(old.grindSetting,8);
});
