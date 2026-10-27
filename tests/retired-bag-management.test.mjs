import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {addCoffee,coffeeState} from '../site/lib/model.js';
import {recommendation,saveShot,makeCurrent} from '../site/lib/engine.js';
import {hydrate,applyPending,shotPayload} from '../site/cloud/mapping.js';
import {parseImport} from '../site/cloud/import-preview.js';
import {rawFixture,rawShot,OWNER} from './cloud-fixtures/raw.js';
import {fixture} from './import-fixture.js';

const rating={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function shot(id,coffee,ratio=2){
 return {id,style:'Turbo',doseG:18,yieldG:18*ratio,timeS:26,grindSetting:1,
  basketId:'basketv',feedMode:'standard',tempC:null,notes:'Private '+id,tasteScales:{...rating},coffeeId:coffee};
}

test('new local coffee has no synthetic bag, active bag or date/frozen tracking',()=>{
 const s=hydrate(rawFixture());
 const c=addCoffee(s,{name:'Same release',roaster:'Fictional Roaster',style:'Turbo'});
 assert.deepEqual(c.bags,[],'empty archive compatibility list, not a created bag');
 assert.equal(Object.hasOwn(c,'activeBagId'),false);
 assert.equal(c.roastDate,undefined);
 assert.equal(c.frozen,undefined);
 const a=saveShot(s,c.id,shot('fresh-1',c.id));
 assert.equal(Object.hasOwn(a,'bagId'),false,'new shot must not acquire synthetic bag association');
 assert.equal(a.notes,'Private fresh-1');
 assert.equal(a.dialedIn,true);
 makeCurrent(s,a.id);
 const b=saveShot(s,c.id,shot('fresh-2',c.id,3));
 assert.notEqual(a.familyId,b.familyId,'materially different green ratios remain distinct');
 assert.equal(recommendation(s,c.id,{style:'Turbo'}).familyId,a.familyId,'explicit favorite persists');
 assert.equal(coffeeState(s,c.id).favoriteShots[a.familyId],a.id);
 assert.equal(s.shots.length,2);
});

test('hosted cloud hydration preserves historical shot bag ID without fabricating active bag state',()=>{
 const raw=rawFixture();
 raw.bags=[{id:'historical-bag',owner_id:OWNER,library_entry_id:'coffee',frozen:false,roast_date:null}];
 raw.shots=[rawShot({id:'saved',bag_id:'historical-bag',dose_g:18,yield_g:36})];
 raw.notes=[{owner_id:OWNER,shot_id:'saved',notes:'Archived note'}];
 const before=structuredClone(raw);
 const state=hydrate(raw);
 assert.equal(state.coffees.length,1);
 assert.equal(Object.hasOwn(state.coffees[0],'bags'),false);
 assert.equal(Object.hasOwn(state.coffees[0],'activeBagId'),false);
 assert.equal(state.shots.length,1);
 assert.equal(state.shots[0].bagId,'historical-bag');
 assert.equal(state.shots[0].notes,'Archived note');
 assert.equal(state.shots[0].doseG,18);
 assert.equal(state.shots[0].yieldG,36);
 assert.deepEqual(raw,before,'server-provided archived bag evidence is not changed');
});

test('new cloud shot mutation omits bag binding, preserving normal five-scale logging',()=>{
 const state=hydrate(rawFixture());
 const pending=shotPayload(state,'coffee',shot('fresh-cloud','coffee'));
 assert.equal(Object.hasOwn(pending,'bag_id'),false);
 assert.equal(pending.library_entry_id,'coffee');
 assert.equal(pending.notes,'Private fresh-cloud');
 assert.deepEqual(pending.taste,rating);
 assert.equal(pending.dose_g,18);
 assert.equal(pending.yield_g,36);
});

test('old offline queued bag association remains in durable payload and local pending display',()=>{
 const state=hydrate(rawFixture());
 const event={status:'pending',action:'save_shot',payload:{
  id:'historic-queued',expected_revision:0,setup_id:'setup',setup_version_id:'version',
  library_entry_id:'coffee',basket_version_id:'basketv',style:'Turbo',
  pulled_at:'2026-10-26T12:00:00Z',dose_g:18,yield_g:38,time_s:24,
  grind_setting:1,temperature_c:null,feed_mode:'standard',taste:{...rating},
  notes:'Keep queued note',bag_id:'prior-bag-link'
 }};
 const bytes=JSON.stringify(event);
 const once=applyPending(state,[event,event]);
 assert.equal(once.shots.length,1,'idempotent pending view');
 assert.equal(once.shots[0].bagId,'prior-bag-link');
 assert.equal(once.shots[0].notes,'Keep queued note');
 assert.equal(once.shots[0].cloudPending,true);
 assert.equal(JSON.stringify(event),bytes,'outbox event must stay byte-identical');
 assert.equal(state.shots.length,0);
});

test('old backups preserve archived bag facts and shot references exactly',()=>{
 const doc=fixture();
 doc.data.coffees[0].bags[0].roastDate='2026-09-02';
 doc.data.coffees[0].bags[0].frozen=true;
 const before=structuredClone(doc);
 const result=parseImport(JSON.stringify(doc));
 assert.deepEqual(result.document,before);
 assert.equal(result.document.data.coffees[0].bags[0].frozen,true);
 assert.equal(result.document.data.shots[0].bagId,'bag1');
 assert.equal(result.summary.shots,3);
 const noBag=fixture();
 noBag.data.coffees[1].bags=[];
 assert.equal(parseImport(JSON.stringify(noBag)).summary.coffees[1].shots,0,
  'new coffees may have an empty legacy archive list');
});

test('broken, cross-coffee or missing legacy bag shot link fails closed before any import',()=>{
 const orphan=fixture();orphan.data.shots[0].bagId='missing-bag';
 assert.throws(()=>parseImport(JSON.stringify(orphan)),/missing legacy bag/);
 const cross=fixture();cross.data.shots[0].bagId='bag2';
 assert.throws(()=>parseImport(JSON.stringify(cross)),/missing legacy bag/);
 const absent=fixture();absent.data.coffees[0].bags=[];
 assert.throws(()=>parseImport(JSON.stringify(absent)),/missing legacy bag/);
});

test('no new Bag Details workflow or misleading Bag Label field is offered',()=>{
 const cloud=source('site/cloud/main.js');
 const autofill=source('site/cloud/coffee-url-autofill.js');
 const state=source('site/cloud/mapping.js');
 const engine=source('site/lib/engine.js');
 assert.match(cloud,/field\('Coffee Name','name'/);
 assert.match(autofill,/\['name','Coffee Name'\]/);
 for(const pattern of [/Bag Details/i,/New Bag/i,/Mark Frozen/i,/bag-age/i,/bag lifecycle/i]){
  assert.doesNotMatch(cloud,pattern,'no Bag Management UI');
 }
 assert.doesNotMatch(state,/\bbags:\[\],activeBagId:null/);
 assert.doesNotMatch(engine,/bagId:c\.activeBagId/);
 assert.match(state,/bagId:sh\.bag_id/,'old shot bag links remain read-only');
});
