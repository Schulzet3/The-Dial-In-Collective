import test from 'node:test';
import assert from 'node:assert/strict';
import {lastRecipeContextShot} from '../site/lib/ui.js';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture,rawShot} from './cloud-fixtures/raw.js';

const recipe={style:'Turbo',basketId:'basketv',feedMode:'standard'};
const version={id:'version',calibrationId:'cal'};
const tastes={extraction:3,body:3,clarity:5,sweetness:4,astringency:1};
const shot=(id,timestamp,extra={})=>({
 id,coffeeId:'coffee',setupVersionId:'version',calibrationId:'cal',
 basketId:'basketv',feedMode:'standard',style:'Turbo',
 timestamp,doseG:18,yieldG:36,timeS:20,grindSetting:1,
 tasteScales:{...tastes},notes:'Keep original private note',hidden:false,...extra
});
const older='2026-11-05T03:00:00+02:00';
const newer='2026-11-04T23:30:00-07:00';

test('#455 visible recipe feedback uses later instant across offsets, preserving recorded shots',()=>{
 assert.ok(older>newer,'negative: lexical ISO order incorrectly chooses older');
 assert.ok(Date.parse(older)<Date.parse(newer),'positive: newer instant is later');
 const shots=[shot('older',older),shot('newer',newer)];
 const original=structuredClone(shots);
 assert.equal(lastRecipeContextShot(shots,'coffee',recipe,version)?.id,'newer');
 assert.deepEqual(shots,original,'do not rewrite measurements, notes or five taste inputs');
});

test('#455 feedback excludes invalid dates and mismatched contexts without erasing records',()=>{
 const shots=[
  shot('wrong-calibration','2026-11-06T01:00:00Z',{calibrationId:'old-cal'}),
  shot('wrong-basket','2026-11-06T01:00:00Z',{basketId:'other'}),
  shot('hidden','2026-11-06T01:00:00Z',{hidden:true}),
  shot('invalid','z-not-a-date'),
  shot('blank','  '),
  shot('newer',newer),shot('older',older)
 ];
 const before=structuredClone(shots);
 assert.equal(lastRecipeContextShot(shots,'coffee',recipe,version)?.id,'newer');
 assert.equal(lastRecipeContextShot(shots.slice(0,5),'coffee',recipe,version),null);
 assert.deepEqual(shots,before);
});

test('#455 equal/UTC feedback instants retain first observed record and expected order',()=>{
 const equal='2026-11-05T06:30:00Z';
 const shots=[shot('first',newer),shot('second',equal),shot('earlier','2026-11-05T05:00:00Z')];
 assert.equal(lastRecipeContextShot(shots,'coffee',recipe,version)?.id,'first');
 assert.equal(lastRecipeContextShot(shots.slice(1),'coffee',recipe,version)?.id,'second');
});

test('#455 cloud hydration derives feedback only from latest actual instant, not lexical date',()=>{
 const raw=rawFixture();
 raw.shots=[
  rawShot({id:'older',pulled_at:older,feed_mode:'standard',sweetness:4,is_dialed_in:false}),
  rawShot({id:'newer',pulled_at:newer,feed_mode:'standard',sweetness:4,is_dialed_in:false})
 ];
 raw.notes=[{shot_id:'older',notes:'Older private history'},{shot_id:'newer',notes:'Newer private history'}];
 const unchanged=structuredClone(raw),state=hydrate(raw);
 const byId=id=>state.shots.find(x=>x.id===id);
 assert.equal(byId('older').suggestion,undefined,'lexically later but chronologically older must not drive live advice');
 assert.ok(byId('newer').suggestion,'later instant gets hydrated suggestion');
 assert.equal(byId('older').notes,'Older private history');
 assert.equal(byId('newer').tasteScales.sweetness,4);
 assert.deepEqual(raw,unchanged,'no mutation of cloud records');
});

test('#455 hydrated invalid/undated records never receive latest advice; ordinary UTC still works',()=>{
 const raw=rawFixture();
 raw.shots=[
  rawShot({id:'utc-old',pulled_at:'2026-11-04T01:00:00Z',feed_mode:'standard',sweetness:4,is_dialed_in:false}),
  rawShot({id:'invalid',pulled_at:'z-not-a-date',feed_mode:'standard'}),
  rawShot({id:'blank',pulled_at:'  ',feed_mode:'standard'}),
  rawShot({id:'null',pulled_at:null,feed_mode:'standard'}),
  rawShot({id:'utc-new',pulled_at:'2026-11-05T01:00:00Z',feed_mode:'standard',sweetness:4,is_dialed_in:false})
 ];
 const state=hydrate(raw),byId=id=>state.shots.find(sh=>sh.id===id);
 assert.ok(byId('utc-new').suggestion);
 for(const id of ['utc-old','invalid','blank','null'])assert.equal(byId(id).suggestion,undefined,id+' must not be current feedback');
 assert.equal(state.shots.length,5,'retain every original historical record');
});
