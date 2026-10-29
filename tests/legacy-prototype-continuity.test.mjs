import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCALES,STYLES,isDialed} from '../site/lib/constants.js';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {visibleCoffees,workspace} from '../site/lib/model.js';
import {prefill,saveShot,recommendation} from '../site/lib/engine.js';

const readJson=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const original=readJson('docs/archive/requirements/The_Dial-In_Collective_Decision_Ledger_v1.0.json');
const canonical=readJson('docs/DECISION_LEDGER.json');
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const shot=(id,other={})=>({id,style:'Turbo',basketId:'basketv',feedMode:'standard',doseG:18,yieldG:72,timeS:50,grindSetting:1.5,tempC:null,tasteScales:green,notes:'An individually measured, retained result',...other});

test('original JSON baseline is present and every decision survives consolidation unchanged',()=>{
 assert.equal(original.locked.length,79);
 assert.equal(original.open.length,20);
 assert.deepEqual(canonical.baseline.content,original);
});

test('owner-approved retirements override only obsolete prototype features',()=>{
 for(const key of ['UX-RETIRE-CUSTOM-STYLE-20261026','UX-RETIRE-EXPERIMENTS-20261026','UX-RETIRE-BAG-MANAGEMENT-20261026','UX-RETIRE-BASKET-EQUIPMENT-VERSION-MANAGEMENT-20261026','current_owner_retire_screenshot_claude_20261028']){
  assert.match(canonical[key]?.status||'',/Locked/,'missing explicit owner supersession: '+key);
 }
 assert.deepEqual(STYLES,['Traditional','Turbo','Fast-Flow','Ristretto','Lungo']);
 assert.ok(!STYLES.includes('Custom'),'retired Custom is historic-only, not an active style');
});

test('all five active ratings, not traditional time/ratio rules, determine Dialed In',()=>{
 assert.deepEqual(SCALES.map(({key,ideal})=>[key,ideal]),Object.entries(green));
 assert.equal(isDialed(green),true);
 for(const key of Object.keys(green))assert.equal(isDialed({...green,[key]:null}),false,key+' must be actively rated');
 const state=hydrate(rawFixture());
 const recorded=saveShot(state,'coffee',shot('outside-style-guidance'));
 assert.equal(recorded.dialedIn,true,'a plausible but nontraditional Turbo shot must remain successful');
 assert.equal(recorded.yieldG/recorded.doseG,4);
 assert.equal(recorded.timeS,50);
 assert.equal(recorded.notes,'An individually measured, retained result');
 assert.equal(state.shots.length,1,'raw shot is retained, not replaced by an average');
 assert.equal(workspace(state).currentCoffeeId,'coffee','saving a shot, not browsing, establishes Current Coffee');
 assert.equal(recommendation(state,'coffee')?.familyId,recorded.familyId,'successful shot feeds its own recipe family');
});

test('new shot prefill keeps measured time and yield blank, preserves prior actual grind and unrated taste',()=>{
 const state=hydrate(rawFixture());
 const before=prefill(state,'coffee');
 assert.equal(before.yieldG,'');
 assert.equal(before.timeS,'');
 assert.equal(before.grindSetting,'');
 assert.deepEqual(before.tasteScales,{extraction:null,body:null,clarity:null,sweetness:null,astringency:null});
 saveShot(state,'coffee',shot('first-success'));
 const after=prefill(state,'coffee');
 assert.equal(after.yieldG,'');
 assert.equal(after.timeS,'');
 assert.equal(after.grindSetting,1.5,'prefill the measured value, not an invented cross-grinder number');
 assert.deepEqual(after.tasteScales,before.tasteScales);
});

test('searching a different coffee does not silently switch Current Coffee; only logged shot does',()=>{
 const state=hydrate(rawFixture());
 state.coffees.push({...state.coffees[0],id:'second',name:'Second Coffee'});
 saveShot(state,'coffee',shot('first'));
 const listed=visibleCoffees(state,'recent','second');
 assert.deepEqual(listed.map(x=>x.id),['second']);
 assert.equal(workspace(state).currentCoffeeId,'coffee','browsing/search may not change current');
 saveShot(state,'second',shot('second-shot'));
 assert.equal(workspace(state).currentCoffeeId,'second');
 assert.equal(visibleCoffees(state)[0].id,'second','Current Coffee is pinned');
 assert.deepEqual(state.shots.map(x=>x.id),['first','second-shot'],'both original shots survive');
});
