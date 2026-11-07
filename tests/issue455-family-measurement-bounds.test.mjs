import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion,selectedBasket,coffeeState} from '../site/lib/model.js';
import {familyStats,familiesFor,chooseRecipeFamily,recommendation} from '../site/lib/engine.js';

// R455-086: synthetic private archive; no real member or provider data.
const ideal={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function fixture(){
 const s=hydrate(rawFixture()),v=activeVersion(s);
 const f={id:'family-test',coffeeId:'coffee',style:'Turbo',seedRatio:2,createdAt:'2026-11-01T12:00:00Z'};
 s.families.push(f);
 const shot=(id,overrides={})=>({
  id,coffeeId:'coffee',setupVersionId:v.id,calibrationId:v.calibrationId,
  basketId:'basketv',style:'Turbo',feedMode:'standard',familyId:f.id,
  doseG:18,yieldG:36,timeS:16,tempC:93,grindSetting:2,
  timestamp:'2026-11-05T12:00:00Z',notes:'Preserve original historical notes',
  hidden:false,dialedIn:true,tasteScales:{...ideal},...overrides
 });
 const family=()=>chooseRecipeFamily(s,'coffee','Turbo',v,selectedBasket(s,'coffee'),'standard',coffeeState(s,'coffee'));
 return {s,v,f,shot,family};
}
test('R086 malformed larger archived yield does not displace valid same-coffee recipe',()=>{
 const {s,f,shot,family}=fixture();
 s.shots.push(shot('valid'),shot('bad',{yieldG:230,timestamp:'2026-11-06T12:00:00Z'}));
 const original=structuredClone(s);
 assert.equal(familyStats(s,f.id).count,1);
 assert.equal(familyStats(s,f.id).ratio.center,2);
 assert.equal(family()?.ratio,2);
 const rec=recommendation(s,'coffee',{style:'Turbo'});
 assert.equal(rec.source,'Your dialed in window');
 assert.equal(rec.observations,1);
 assert.equal(rec.ratio.center,2);
 assert.deepEqual(s,original,'original private readings and notes remain unchanged');
});
test('R086 unmeasured five-green archived success cannot create a measured family',()=>{
 const {s,f,shot,family}=fixture();
 s.shots.push(shot('bad',{doseG:0,yieldG:230,timeS:181}));
 assert.equal(familyStats(s,f.id).count,0);
 assert.equal(familyStats(s,f.id).ratio,null);
 assert.equal(familiesFor(s,'coffee','Turbo').length,0);
 assert.equal(family(),null);
 assert.notEqual(recommendation(s,'coffee',{style:'Turbo'}).source,'Your dialed in window');
});
test('R086 dose outside existing Log Shot bounds or nonnumeric remains in History only',()=>{
 for(const doseG of [-1,0,4.9,40.1,Infinity,NaN,'18',null]){
  const {s,f,shot,family}=fixture();
  s.shots.push(shot('imported',{doseG}));
  assert.equal(familyStats(s,f.id).count,0,String(doseG));
  assert.equal(family(),null);
 }
});
test('R086 yield and time outside existing Log Shot bounds cannot anchor recipe window',()=>{
 for(const patch of [{yieldG:0},{yieldG:4.9},{yieldG:200.1},
  {yieldG:Infinity},{yieldG:'36'},{timeS:0},{timeS:.9},
  {timeS:180.1},{timeS:NaN},{timeS:'16'}]){
  const {s,f,shot,family}=fixture();
  s.shots.push(shot('bad',patch));
  assert.equal(familyStats(s,f.id).count,0,JSON.stringify(patch));
  assert.equal(family(),null);
 }
});
test('R086 current inclusive Log Shot endpoints still count as measured',()=>{
 const {s,f,shot}=fixture();
 s.shots.push(shot('lower',{doseG:5,yieldG:5,timeS:1}),
              shot('upper',{doseG:40,yieldG:200,timeS:180}));
 assert.equal(familyStats(s,f.id).count,2);
 assert.equal(familyStats(s,f.id).confirmed,true);
 assert.equal(familiesFor(s,'coffee','Turbo').length,1);
});
test('R086 five real ideal ratings and not-hidden state remain necessary',()=>{
 const {s,f,shot}=fixture();
 s.shots.push(shot('unrated',{tasteScales:{...ideal,sweetness:4}}),
              shot('hidden',{hidden:true}),shot('false',{dialedIn:false}));
 assert.equal(familyStats(s,f.id),null);
 assert.equal(familiesFor(s,'coffee','Turbo').length,0);
});
test('R086 valid five-green alternate family remains separate',()=>{
 const {s,shot,family}=fixture();
 s.families.push({id:'alternative',coffeeId:'coffee',style:'Turbo',seedRatio:3,createdAt:'2026-11-01T12:01:00Z'});
 s.shots.push(shot('valid'),shot('bad',{familyId:'alternative',yieldG:240}),
              shot('alternate',{id:'alternate',familyId:'alternative',yieldG:54}));
 const original=structuredClone(s);
 const families=familiesFor(s,'coffee','Turbo');
 assert.equal(families.length,2);
 assert.equal(family()?.shots.length,1);
 assert.deepEqual(s,original);
});
