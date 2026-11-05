import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {recommendation,prefill} from '../site/lib/engine.js';
import {activeVersion} from '../site/lib/model.js';

function makeShots() {
 const s=hydrate(rawFixture()),v=activeVersion(s);
 const common={
  coffeeId:'coffee',setupVersionId:v.id,calibrationId:v.calibrationId,
  basketId:'basketv',style:'Turbo',feedMode:'standard',
  timeS:16,hidden:false,dialedIn:false,tempC:null,
  tasteScales:{extraction:3,body:3,clarity:5,sweetness:4,astringency:1}
 };
 // The chronologically later shot has the lexically EARLIER offset string.
 const older={...common,id:'older',timestamp:'2026-11-05T03:00:00+02:00',
  doseG:17,yieldG:34,grindSetting:1.2,notes:'Older private note',
  suggestion:{kind:'adjustment',next:{doseG:17,grindSetting:1.1,yieldCenter:34}}};
 const newer={...common,id:'newer',timestamp:'2026-11-04T23:30:00-07:00',
  doseG:19,yieldG:38,grindSetting:2.3,notes:'Newer private note',
  suggestion:{kind:'adjustment',next:{doseG:19,grindSetting:2.2,yieldCenter:38}}};
 assert.ok(older.timestamp>newer.timestamp);
 assert.ok(Date.parse(older.timestamp)<Date.parse(newer.timestamp));
 s.shots=[older,newer];
 return {s,older,newer};
}

test('#455 Log Shot prefill selects latest real instant, not ISO offset text',()=>{
 const {s}=makeShots(),before=structuredClone(s.shots);
 const draft=prefill(s,'coffee');
 assert.equal(draft.doseG,19);
 assert.equal(draft.grindSetting,2.3);
 assert.deepEqual(draft.tasteScales,{extraction:null,body:null,clarity:null,sweetness:null,astringency:null});
 assert.deepEqual(s.shots,before,'historical measurements and private notes untouched');
});

test('#455 latest rated-shot recommendation uses latest real instant',()=>{
 const {s}=makeShots(),before=structuredClone(s.shots);
 const rec=recommendation(s,'coffee');
 assert.equal(rec.source,'Adjustment from your latest taste rating');
 assert.equal(rec.grind.value,2.2,'newer measured shot controls one next change');
 assert.equal(rec.doseG,19,'newer measured dose preserved');
 assert.deepEqual(s.shots,before,'all five tastes, old suggestions and notes preserved');
});

test('#455 malformed archived timestamps are not treated as latest measured evidence',()=>{
 const {s}=makeShots();
 s.shots.push({...s.shots[0],id:'bad-legacy',timestamp:'z-not-a-date',
  doseG:23,grindSetting:4.8,notes:'Unparseable historic date',
  suggestion:{kind:'adjustment',next:{doseG:23,grindSetting:4.7,yieldCenter:46}}});
 const before=structuredClone(s.shots);
 const draft=prefill(s,'coffee'),rec=recommendation(s,'coffee');
 assert.equal(draft.doseG,19);
 assert.equal(draft.grindSetting,2.3);
 assert.equal(rec.grind.value,2.2);
 assert.deepEqual(s.shots,before);
});

test('#455 already normalized ISO timestamps and empty-state baseline remain valid',()=>{
 const {s,older,newer}=makeShots();
 older.timestamp='2026-11-05T01:00:00Z';newer.timestamp='2026-11-05T06:30:00Z';
 assert.equal(prefill(s,'coffee').grindSetting,2.3);
 assert.equal(recommendation(s,'coffee').grind.value,2.2);
 s.shots=[];
 const draft=prefill(s,'coffee');
 assert.equal(draft.doseG,18);
 assert.equal(draft.grindSetting,'');
 assert.notEqual(recommendation(s,'coffee').source,'Adjustment from your latest taste rating');
});
