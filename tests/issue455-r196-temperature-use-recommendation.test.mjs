import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {recommendation} from '../site/lib/engine.js';
import {tempDisplay} from '../site/lib/constants.js';

// Synthetic CloudApp button interactions: no real accounts or provider calls.
const root={innerHTML:''},sheet={close(){},querySelector(){return null;}};
globalThis.document={querySelector:s=>s==='#app'?root:sheet};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;
function fixture(style='Traditional'){
 const app=new CloudApp({},{});app.state=hydrate(rawFixture());
 app.state.setups[0].versions[0].advanced.temperature=true;
 app.state.shots.push({id:'prior',coffeeId:'coffee',setupVersionId:'version',
  basketId:'basketv',calibrationId:'cal',style,feedMode:'standard',
  timestamp:'2026-11-10T12:00:00Z',doseG:18,yieldG:36,timeS:25,
  grindSetting:2,tempC:94,hidden:false,dialedIn:false,
  notes:'Original private shot note',snapshot:{grinderMin:0,grinderMax:5},
  tasteScales:{extraction:2,body:3,clarity:3,sweetness:3,astringency:2}});
 app.show=()=>{};app.updateDoseAdvisory=()=>{};app.showLog('coffee',null,'Turbo');
 app.readDraft=()=>{}; // Focused branch test; no artificial DOM parsing.
 const helper={removed:false,remove(){this.removed=true;}};
 const temperature={value:String(app.draft.tempC??''),
  closest:()=>({querySelector:sel=>sel==='small'?helper:null})};
 const grind={value:''};
 sheet.querySelector=sel=>sel==='[name=temperature]'?temperature:
  sel==='[name=grindSetting]'?grind:null;
 return {app,helper,temperature,grind,
  click:a=>app.click({target:{closest:()=>({dataset:{action:a}})}})};
}
test('R196 applying temperature recommendation clears now-false historical source',async()=>{
 const f=fixture(),before=structuredClone(f.app.state);
 assert.equal(f.app.draft.tempC,94);
 assert.equal(f.app.draft.tempSource,'Last used on Traditional');
 const r=recommendation(f.app.state,'coffee',{style:'Turbo',
  basketId:f.app.draft.basketId,feedMode:f.app.draft.feedMode});
 await f.click('use-temp');
 assert.equal(Number(f.temperature.value),tempDisplay(r.tempC,f.app.logUnit));
 assert.equal(f.app.draft.tempC,r.tempC);
 assert.equal(f.app.draft.tempSource,'');
 assert.equal(f.helper.removed,true);
 assert.deepEqual(f.app.draft.recommendationContext.used_controls,['temperature']);
 assert.deepEqual(f.app.draft.tasteScales,
  {extraction:null,body:null,clarity:null,sweetness:null,astringency:null});
 assert.deepEqual(f.app.state,before);
});
test('R196 same-style temperature recommendation remains usable with no source',async()=>{
 const f=fixture('Turbo');
 assert.equal(f.app.draft.tempSource,'');
 await f.click('use-temp');
 assert.equal(f.app.draft.tempSource,'');
 assert.deepEqual(f.app.draft.recommendationContext.used_controls,['temperature']);
});
test('R196 using grind retains accurate unchanged temperature source',async()=>{
 const f=fixture(),before=structuredClone(f.app.state);
 await f.click('use-grind');
 assert.equal(f.app.draft.tempSource,'Last used on Traditional');
 assert.equal(f.helper.removed,false);
 assert.deepEqual(f.app.draft.recommendationContext.used_controls,['grind']);
 assert.deepEqual(f.app.state,before);
});
