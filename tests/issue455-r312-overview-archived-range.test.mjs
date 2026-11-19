import test from 'node:test';
import assert from 'node:assert/strict';
import {lastRecipeContextShot} from '../site/lib/ui.js';

// R312: synthetic, immutable local imported History; no member/provider access.
const recipe={style:'Turbo',basketId:'basket',feedMode:'standard'};
const version={id:'v',calibrationId:'cal',grinderMin:0,grinderMax:10};
const taste={extraction:2,body:3,clarity:5,sweetness:4,astringency:1};
const shot=(id,time,patch={})=>({
 id,coffeeId:'coffee',setupVersionId:'v',calibrationId:'cal',
 style:'Turbo',basketId:'basket',feedMode:'standard',timestamp:time,hidden:false,
 doseG:18,yieldG:40,timeS:16,grindSetting:4,tempC:null,
 tasteScales:{...taste},snapshot:{grinderMin:0,grinderMax:10},
 notes:'Private synthetic note '+id,...patch
});
const pick=rows=>lastRecipeContextShot(rows,'coffee',recipe,version);

test('R312 original archived range excludes a newer out-of-range import even inside today\'s scale',()=>{
 const older=shot('older','2026-11-15T12:00:00Z');
 const newer=shot('import','2026-11-16T12:00:00Z',{
  snapshot:{grinderMin:5,grinderMax:8},grindSetting:4
 });
 const rows=[newer,older],unchanged=structuredClone(rows);
 assert.equal(pick(rows)?.id,'older');
 assert.deepEqual(rows,unchanged,'original ratings, notes and measurements remain untouched');
});

test('R312 inverted archived original bounds cannot become current feedback',()=>{
 const earlier=shot('valid','2026-11-14T12:00:00Z');
 const malformed=shot('inverted','2026-11-17T12:00:00Z',{
  snapshot:{grinderMin:8,grinderMax:2}
 });
 assert.equal(pick([earlier,malformed])?.id,'valid');
 assert.equal(pick([malformed]),null);
});

test('R312 valid archived bounds, equal lower endpoint and missing legacy optional bounds stay usable',()=>{
 const earlier=shot('earlier','2026-11-14T12:00:00Z');
 const valid=shot('valid','2026-11-16T12:00:00Z',{snapshot:{grinderMin:4,grinderMax:9}});
 assert.equal(pick([earlier,valid])?.id,'valid');
 const unknown=shot('missing','2026-11-17T12:00:00Z',{snapshot:{}});
 assert.equal(pick([earlier,unknown])?.id,'missing');
 assert.equal(pick([shot('current-range-bad','2026-11-17T12:00:00Z',{grindSetting:11,snapshot:{}})]),null);
});

test('R312 excludes only original-range mismatch; current coffee, setup, five tastes and measured feedback still required',()=>{
 const good=shot('good','2026-11-15T12:00:00Z');
 const later=shot('later','2026-11-16T12:00:00Z',{snapshot:{grinderMin:0,grinderMax:10}});
 assert.equal(pick([good,later])?.id,'later');
 assert.equal(pick([good,{...later,tasteScales:{...taste,sweetness:null}}])?.id,'good');
 assert.equal(pick([good,{...later,coffeeId:'other'}])?.id,'good');
});
