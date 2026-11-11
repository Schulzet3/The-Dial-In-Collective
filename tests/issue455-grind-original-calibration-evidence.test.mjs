import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {grindGuidance,recommendation} from '../site/lib/engine.js';
// Synthetic restored history only, no member/provider data.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const fixture=()=>{const s=hydrate(rawFixture()),v=s.setups[0].versions[0];return{s,v,c:s.coffees[0],basket:v.baskets[0]};};
const shot=(id,patch={})=>({id,coffeeId:'coffee',setupVersionId:'version',calibrationId:'cal',
 basketId:'basketv',style:'Turbo',feedMode:'standard',hidden:false,dialedIn:true,
 tasteScales:{...green},doseG:18,yieldG:36,timeS:15,grindSetting:2.5,
 timestamp:'2026-11-09T12:00:00Z',notes:'Private original note',...patch});
const guide=(f,feed='standard')=>grindGuidance(f.s,f.c,'Turbo',f.basket,feed);

test('R183 impossible original scale cannot be a proven personal grind',()=>{
 const f=fixture();f.s.shots.push(shot('impossible',{snapshot:{grinderMin:3,grinderMax:5}}));
 const original=structuredClone(f.s),g=guide(f);
 assert.deepEqual([g.value,g.proven,g.source],[3.8,false,'Espresso range starting estimate']);
 assert.deepEqual(f.s,original);
});
test('R183 reversed original bounds also exclude false green grinder evidence',()=>{
 const f=fixture();f.s.shots.push(shot('reverse',{snapshot:{grinderMin:5,grinderMax:1}}));
 assert.equal(guide(f).source,'Espresso range starting estimate');
});
test('R183 inclusive original endpoints preserve valid measured grind',()=>{
 for(const n of [0,5]){const f=fixture();f.s.shots.push(shot('valid',{grindSetting:n,
  snapshot:{grinderMin:0,grinderMax:5}}));
  const g=guide(f);assert.deepEqual([g.value,g.source,g.proven],[n,'Your successful setting',true]);}
});
test('R183 impossible source cannot skew a valid median or change History',()=>{
 const f=fixture();f.s.shots.push(shot('good',{grindSetting:2.5,snapshot:{grinderMin:0,grinderMax:5}}),
  shot('bad',{grindSetting:1,snapshot:{grinderMin:3,grinderMax:5}}));
 const original=structuredClone(f.s),g=guide(f);
 assert.deepEqual([g.value,g.source],[2.5,'Your successful setting']);assert.deepEqual(f.s,original);
});
test('R183 impossible slow row cannot produce false paired feed offset',()=>{
 const f=fixture();f.s.shots.push(shot('target-standard',{grindSetting:3}),
  shot('other-standard',{coffeeId:'other',grindSetting:4}),
  shot('other-slow',{coffeeId:'other',feedMode:'slow',grindSetting:2,
   snapshot:{grinderMin:3,grinderMax:5}}));
 const original=structuredClone(f.s),g=guide(f,'slow');
 assert.equal(g.value,1);assert.match(g.source,/adjusted from your Standard Feed result/);
 assert.doesNotMatch(g.source,/paired feed-mode/);assert.deepEqual(f.s,original);
 f.s.shots[2].snapshot={grinderMin:0,grinderMax:5};
 assert.match(guide(f,'slow').source,/paired feed-mode/);
});
test('R183 impossible original Standard Feed scale cannot anchor Slow Feed estimate',()=>{
 const f=fixture();f.s.shots.push(shot('standard',{grindSetting:3,
  snapshot:{grinderMin:4,grinderMax:5}}));
 const g=guide(f,'slow');assert.equal(g.value,1.8);assert.match(g.source,/Cautious Slow Feed/);
 f.s.shots[0].snapshot={grinderMin:0,grinderMax:5};
 assert.equal(guide(f,'slow').value,1);assert.match(guide(f,'slow').source,/Standard Feed result/);
});
test('R183 missing optional legacy snapshot remains eligible in real recommendation',()=>{
 const f=fixture(),opts={style:'Turbo',basketId:'basketv',feedMode:'standard',ignoreAdvice:true};
 f.s.shots.push(shot('bad',{snapshot:{grinderMin:3,grinderMax:5}}));
 const original=structuredClone(f.s.shots[0]);
 assert.equal(recommendation(f.s,'coffee',opts).grind.source,'Espresso range starting estimate');
 f.s.shots.push(shot('legacy',{grindSetting:2.1,snapshot:null}));
 const r=recommendation(f.s,'coffee',opts);
 assert.deepEqual([r.grind.value,r.grind.source,r.grind.proven],[2.1,'Your successful setting',true]);
 assert.deepEqual(f.s.shots[0],original);
});
