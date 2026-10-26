import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STYLES,STYLE_COPY} from '../site/lib/constants.js';
import {hydrate,applyPending} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {validateShot,coffeeState,addCoffee} from '../site/lib/model.js';
import {saveShot,editShot,recommendation} from '../site/lib/engine.js';

const tastes={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const shot=(style='Custom',id='archived-custom')=>({
 id,style,doseG:18,yieldG:72,timeS:55,grindSetting:2,tempC:null,
 basketId:'basketv',feedMode:'standard',notes:'Historical note',tasteScales:{...tastes}
});

test('five approved active styles exclude retired Custom; history keeps its original label',()=>{
 assert.deepEqual(STYLES,['Traditional','Turbo','Fast-Flow','Ristretto','Lungo']);
 assert.equal(STYLES.includes('Custom'),false);
 assert.match(STYLE_COPY.Custom,/Retired historical style/);
 const raw=rawFixture();raw.workspaceCoffees[0].selected_style='Custom';
 assert.equal(coffeeState(hydrate(raw),'coffee').style,'Custom','historical workspace style is not silently rewritten');
 const main=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.ok(!main.includes("C.STYLES.filter(s=>s!=='Custom')"));
 assert.ok(!main.includes("C.STYLES.filter(style=>style!=='Custom')"));
 assert.ok(main.includes("if(!editing&&!C.STYLES.includes(styleOverride||M.coffeeState"));
 assert.ok(!main.includes("this.mutate('save_custom_targets'"),'new Custom configuration must not be exposed');
});

test('new Custom shots and new Custom coffee selection are rejected without reclassification',()=>{
 assert.match(validateShot(shot()).join(' '),/available shot style/);
 const state=hydrate(rawFixture());
 assert.throws(()=>saveShot(state,'coffee',shot()),/available shot style/);
 assert.equal(state.shots.length,0,'reject before changing state');
 assert.throws(()=>addCoffee(state,{name:'New',roaster:'Local',style:'Custom'}),/retired/);
 assert.equal(state.coffees.length,1);
});

test('historical Custom shot and all-green rating survive read/edit without enabling new Custom shots',()=>{
 const state=hydrate(rawFixture());
 const saved=saveShot(state,'coffee',shot(),{allowLegacyCustom:true});
 assert.equal(saved.style,'Custom');
 assert.equal(saved.dialedIn,true,'numeric time/ratio do not veto five all-green ratings');
 const originalId=saved.id;
 const changed=editShot(state,originalId,{notes:'Preserved archived note'});
 assert.equal(changed?.style??state.shots[0].style,'Custom');
 assert.equal(state.shots.length,1);
 assert.equal(state.shots[0].id,originalId);
 assert.equal(state.shots[0].notes,'Preserved archived note');
 assert.equal(state.shots[0].dialedIn,true);
});

test('offline pre-retirement Custom event is retained and rendered rather than discarded or relabeled',()=>{
 const raw=rawFixture(),state=hydrate(raw),beforeCount=state.shots.length;
 const event={id:'legacy-event',status:'pending',action:'save_shot',payload:{
  id:'legacy-offline-shot',expected_revision:0,setup_id:'setup',setup_version_id:'version',
  library_entry_id:'coffee',basket_version_id:'basketv',style:'Custom',
  pulled_at:'2026-10-25T12:00:00Z',dose_g:18,yield_g:72,time_s:55,grind_setting:2,
  temperature_c:null,feed_mode:'standard',taste:{...tastes},notes:'Local-first note'}};
 const pending=applyPending(state,[event]);
 assert.equal(state.shots.length,beforeCount,'original snapshot untouched');
 assert.equal(pending.shots.length,1);
 assert.equal(pending.shots[0].style,'Custom');
 assert.equal(pending.shots[0].notes,'Local-first note');
 assert.equal(pending.shots[0].cloudPending,true);
 assert.equal(event.status,'pending','outbox event not consumed or deleted');
});

test('archived Custom success cannot distort five active style recipe guidance',()=>{
 const state=hydrate(rawFixture());
 const before=STYLES.map(style=>recommendation(state,'coffee',{style,ignoreAdvice:true}));
 saveShot(state,'coffee',shot(),{allowLegacyCustom:true});
 const after=STYLES.map(style=>recommendation(state,'coffee',{style,ignoreAdvice:true}));
 for(let i=0;i<STYLES.length;i++){
  assert.equal(after[i].ratio.center,before[i].ratio.center,STYLES[i]);
  assert.equal(after[i].time.center,before[i].time.center,STYLES[i]);
  assert.equal(after[i].source,before[i].source,STYLES[i]);
 }
});
