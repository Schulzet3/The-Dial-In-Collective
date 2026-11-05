import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {nextAdvice} from '../site/lib/engine.js';

const rec={time:{low:12,center:16,high:20}};
const tastes={extraction:3,body:3,clarity:5,sweetness:4,astringency:1};
function fixture(currentTime,priorTime) {
 const s=hydrate(rawFixture()),v=activeVersion(s);
 const common={coffeeId:'coffee',setupVersionId:v.id,calibrationId:v.calibrationId,
  basketId:'basketv',style:'Turbo',feedMode:'standard',doseG:18,timeS:16,
  grindSetting:1.2,tempC:93,hidden:false,notes:'Private original tasting note'};
 const current={...common,id:'current',timestamp:currentTime,yieldG:36,tasteScales:{...tastes}};
 const prior={...common,id:'prior',timestamp:priorTime,yieldG:31,
  tasteScales:{...tastes,sweetness:5}};
 s.shots=[prior];return {s,current,prior};
}
test('#455 later instant that sorts earlier in text cannot reverse sweetness direction',()=>{
 const {s,current,prior}=fixture('2026-11-05T01:00:00Z','2026-11-04T23:30:00-07:00');
 assert.ok(prior.timestamp<current.timestamp);
 assert.ok(Date.parse(prior.timestamp)>Date.parse(current.timestamp));
 const before=structuredClone([current,...s.shots]);
 const advice=nextAdvice(s,current,rec);
 assert.equal(advice.title,'Explore a longer yield');
 assert.equal(advice.next.yieldCenter,41);
 assert.match(advice.evidenceNote,/Exploratory starting step/);
 assert.deepEqual([current,...s.shots],before);
});
test('#455 earlier instant with later string order supports prior same-coffee evidence',()=>{
 const {s,current,prior}=fixture('2026-11-05T01:00:00-07:00','2026-11-05T05:30:00Z');
 assert.ok(prior.timestamp>current.timestamp);
 assert.ok(Date.parse(prior.timestamp)<Date.parse(current.timestamp));
 const before=structuredClone([current,...s.shots]);
 const advice=nextAdvice(s,current,rec);
 assert.equal(advice.title,'Explore a shorter yield');
 assert.equal(advice.next.yieldCenter,31);
 assert.match(advice.evidenceNote,/Earlier comparable same-coffee ratings suggest/);
 assert.deepEqual([current,...s.shots],before);
});
test('#455 malformed older-looking archived timestamps supply no chronology',()=>{
 const {s,current}=fixture('2026-11-05T01:00:00Z','1-not-a-date');
 const before=structuredClone([current,...s.shots]);
 const advice=nextAdvice(s,current,rec);
 assert.equal(advice.title,'Explore a longer yield');
 assert.equal(advice.next.yieldCenter,41);
 assert.deepEqual([current,...s.shots],before);
});
