import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {nextAdvice} from '../site/lib/engine.js';
test('old setting remains recorded; next recommendation fits current range',()=>{
 const s=hydrate(rawFixture()),v=s.setups[0].versions[0];
 v.grinderMin=2.5;v.grinderMax=3.5;
 const old={grindSetting:8,tasteScales:{extraction:3,body:3,clarity:2,sweetness:4,astringency:3}};
 const advice=nextAdvice(s,old,{time:{low:12,center:15,high:18}});
 assert.equal(advice.next.grindSetting,3.5);
 assert.equal(old.grindSetting,8);
});
