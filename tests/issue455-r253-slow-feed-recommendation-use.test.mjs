import test from 'node:test';
import assert from 'node:assert/strict';
import {rawFixture} from './cloud-fixtures/raw.js';
import {hydrate,shotPayload} from '../site/cloud/mapping.js';
import {Outbox} from '../site/cloud/outbox.js';
import {recommendation} from '../site/lib/engine.js';
import {activeVersion} from '../site/lib/model.js';
import {recipeGrid} from '../site/lib/ui.js';

let form;
const reference={innerHTML:''};
const sheet={querySelector(selector){
 if(selector==='#shot')return form;
 if(selector==='#log-reference')return reference;
 const match=selector.match(/^\[name=(\w+)\]$/);
 return match?form?.elements[match[1]]:null;
}};
globalThis.document={querySelector:s=>s==='#sheet'?sheet:{},
 createElement:()=>({setAttribute(){},addEventListener(){},replaceChildren(){}}),
 body:{append(){}}};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;

const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function fixture(){
 const raw=rawFixture();
 Object.assign(raw.setupPreferences[0],{track_temperature:true,track_slow_feed:true,temperature_unit:'C'});
 const app=new CloudApp({},{});app.state=hydrate(raw);
 app.show=()=>{};app.updateDoseAdvisory=()=>{};app.error=e=>{throw e;};
 app.showLog('coffee',null,'Turbo');
 Object.assign(app.draft,{tasteScales:{...green},notes:'Private synthetic original note'});
 const elements={};
 for(const key of ['doseG','yieldG','timeS','grindSetting','notes'])
  elements[key]={value:String(app.draft[key]??'')};
 elements.doseG.value='18';elements.yieldG.value='36';elements.timeS.value='20';
 elements.temperature={value:String(app.draft.tempC??'')};
 elements.slowFeed={checked:app.draft.feedMode==='slow'};
 form={elements};reference.innerHTML='';
 return {app,elements,reference,
  use:action=>app.click({target:{closest:()=>({dataset:{action}})}}),
  toggle:checked=>{elements.slowFeed.checked=checked;app.change({target:{name:'slowFeed'}});}
 };
}

test('R253 changing feed after copying grind revokes only source attribution, not five tastes or measurements',async()=>{
 const f=fixture(),before=structuredClone(f.app.state);
 await f.use('use-grind');
 assert.deepEqual(f.app.draft.recommendationContext.used_controls,['grind']);
 const oldGrind=f.elements.grindSetting.value;
 const oldNotes=f.elements.notes.value;
 f.toggle(true);
 assert.equal(f.app.draft.feedMode,'slow');
 assert.equal(f.app.draft.recommendationContext,null);
 assert.deepEqual(f.app.appliedRecommendationValues,{});
 assert.equal(f.elements.grindSetting.value,oldGrind);
 assert.equal(f.elements.notes.value,oldNotes);
 assert.deepEqual(f.app.draft.tasteScales,green);
 assert.deepEqual(f.app.state,before,'no original history or preferences rewritten');
 const wanted=recommendation(f.app.state,'coffee',{style:'Turbo',basketId:f.app.draft.basketId,feedMode:'slow'});
 assert.equal(reference.innerHTML,recipeGrid(wanted,true,'C'),'show new feed reference');
 const payload=shotPayload(f.app.state,'coffee',f.app.draft);
 assert.equal(payload.feed_mode,'slow');
 assert.equal(payload.grind_setting,Number(oldGrind));
 assert.equal(Object.hasOwn(payload,'recommendation_context'),false);
 assert.deepEqual(payload.taste,green);
 assert.equal(payload.notes,'Private synthetic original note');
});

test('R253 after switching feed, explicit recopy creates truthful new-feed provenance in mapped shot',async()=>{
 const f=fixture();
 await f.use('use-grind');
 f.toggle(true);
 await f.use('use-grind');
 const c=f.app.draft.recommendationContext;
 assert.equal(c.kind,'member_selected_starting_reference');
 assert.deepEqual(c.used_controls,['grind']);
 assert.equal(f.app.draft.feedMode,'slow');
 const payload=shotPayload(f.app.state,'coffee',f.app.draft);
 assert.equal(payload.feed_mode,'slow');
 assert.deepEqual(payload.recommendation_context,c);
 assert.equal(payload.grind_setting,Number(f.elements.grindSetting.value));
 f.elements.grindSetting.value=String(Number(f.elements.grindSetting.value)+1);
 f.app.readDraft();
 assert.equal(f.app.draft.recommendationContext,null,'manual edit still revokes copied source');
});

test('R253 changing slow to standard also revokes copied source; toggling back never resurrects it',async()=>{
 const f=fixture();f.toggle(true);
 await f.use('use-grind');
 assert.deepEqual(f.app.draft.recommendationContext.used_controls,['grind']);
 const copy=f.elements.grindSetting.value;
 f.toggle(false);
 assert.equal(f.app.draft.recommendationContext,null);
 f.toggle(true);
 assert.equal(f.app.draft.recommendationContext,null);
 assert.equal(f.elements.grindSetting.value,copy);
 assert.equal(shotPayload(f.app.state,'coffee',f.app.draft).feed_mode,'slow');
});

test('R253 duplicate change event and ordinary rating/notes read retain real copied origin',async()=>{
 const f=fixture();await f.use('use-grind');
 const before=structuredClone(f.app.draft.recommendationContext);
 f.toggle(false);
 assert.deepEqual(f.app.draft.recommendationContext,before);
 f.elements.notes.value='Updated private synthetic note';
 f.app.readDraft();
 assert.deepEqual(f.app.draft.recommendationContext,before);
 assert.equal(shotPayload(f.app.state,'coffee',f.app.draft).notes,'Updated private synthetic note');
});

test('R253 optional feed switch without copied recommendation preserves entered values',()=>{
 const f=fixture();
 f.elements.grindSetting.value='2.5';f.elements.notes.value='Manual settings';
 f.toggle(true);
 assert.equal(f.app.draft.recommendationContext,null);
 assert.equal(f.elements.grindSetting.value,'2.5');
 assert.equal(f.app.draft.notes,'Manual settings');
 assert.deepEqual(f.app.draft.tasteScales,green);
});

test('R253 durable offline outbox keeps actual feed measurement but never stale source',async()=>{
 const f=fixture();await f.use('use-grind');f.toggle(true);
 const payload=shotPayload(f.app.state,'coffee',f.app.draft);
 const events=[];
 const store={async put(e){events.push(structuredClone(e));},async list(owner){return events.filter(e=>e.owner===owner);},async acknowledge(){}};
 const remote={async mutate(){throw Error('Network must not be used during queue creation');}};
 const outbox=new Outbox({store,remote,identity:()=>({id:'synthetic-owner'}),
  uuid:()=> 'offline-r253',now:()=> '2026-11-14T08:00:00.000Z'});
 await outbox.enqueue('save_shot',payload);
 assert.equal(events.length,1);
 assert.equal(events[0].payload.feed_mode,'slow');
 assert.equal(Object.hasOwn(events[0].payload,'recommendation_context'),false);
 assert.deepEqual(events[0].payload.taste,green);
 assert.equal(events[0].payload.notes,'Private synthetic original note');
 assert.equal(events[0].payload.grind_setting,payload.grind_setting);
});
