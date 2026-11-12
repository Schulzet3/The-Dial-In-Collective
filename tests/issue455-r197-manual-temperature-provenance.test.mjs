import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {tempDisplay} from '../site/lib/constants.js';

// Synthetic client-side events only: no Auth, member account, API, or SQL.
const root={innerHTML:''},sheet={close(){},querySelector(){return null;}};
globalThis.document={querySelector:s=>s==='#app'?root:sheet};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;
function fixture(style='Traditional'){
 const app=new CloudApp({},{});
 app.state=hydrate(rawFixture());
 app.state.setups[0].versions[0].advanced.temperature=true;
 app.state.shots.push({id:'prior',coffeeId:'coffee',setupVersionId:'version',
  basketId:'basketv',calibrationId:'cal',style,feedMode:'standard',
  timestamp:'2026-11-10T12:00:00Z',doseG:18,yieldG:36,timeS:25,
  grindSetting:2,tempC:94,hidden:false,dialedIn:false,
  notes:'Original private historical note',snapshot:{grinderMin:0,grinderMax:5},
  tasteScales:{extraction:2,body:3,clarity:3,sweetness:3,astringency:2}});
 app.show=()=>{};app.updateDoseAdvisory=()=>{};
 app.showLog('coffee',null,'Turbo');
 const helper={removed:false,remove(){this.removed=true;}};
 const input={name:'temperature',value:String(tempDisplay(app.draft.tempC,app.logUnit)),
  removeAttribute(){},getAttribute(){return null;},
  closest:s=>s==='#shot'?{}:s==='.field'?{querySelector:k=>k==='small'?helper:null}:null};
 const elements=Object.fromEntries(['doseG','yieldG','timeS','grindSetting'].map(k=>[k,{value:String(app.draft[k]??'')}]));
 elements.notes={value:''};elements.temperature=input;
 const form={elements};
 sheet.querySelector=s=>s==='#shot'?form:null;
 return {app,input,helper,form,change:value=>{input.value=value;app.input({target:input});}};
}
test('R197 changing another-style temperature clears its now-false source immediately',()=>{
 const f=fixture(),before=structuredClone(f.app.state);
 assert.equal(f.app.draft.tempSource,'Last used on Traditional');
 f.change(String(tempDisplay(95,f.app.logUnit)));
 assert.equal(f.helper.removed,true);
 assert.equal(f.app.draft.tempSource,'');
 f.app.readDraft();
 assert.ok(Math.abs(f.app.draft.tempC-95)<0.3);
 assert.deepEqual(f.app.state,before);
 assert.deepEqual(f.app.draft.tasteScales,
  {extraction:null,body:null,clarity:null,sweetness:null,astringency:null});
});
test('R197 untouched temperature retains original source through input and notes rating readback',()=>{
 const f=fixture();const measured=f.app.draft.tempC;
 f.change(String(tempDisplay(measured,f.app.logUnit)));
 f.form.elements.notes.value='Private new note';
 f.app.readDraft();
 assert.equal(f.helper.removed,false);
 assert.equal(f.app.draft.tempSource,'Last used on Traditional');
 assert.equal(f.app.draft.tempC,measured);
 assert.equal(f.app.draft.notes,'Private new note');
});
test('R197 programmatic temperature edit without input clears stale helper on Save/Rate readDraft',()=>{
 const f=fixture();f.input.value=String(tempDisplay(96,f.app.logUnit));
 f.app.readDraft();
 assert.ok(Math.abs(f.app.draft.tempC-96)<0.3);
 assert.equal(f.app.draft.tempSource,'');
 assert.equal(f.helper.removed,true);
});
test('R197 unchanged temperature with only a grind edit keeps truthful source',()=>{
 const f=fixture();f.form.elements.grindSetting.value='3';
 f.app.readDraft();
 assert.equal(f.app.draft.grindSetting,'3');
 assert.equal(f.app.draft.tempSource,'Last used on Traditional');
 assert.equal(f.helper.removed,false);
});
test('R197 same-style historical temperature has no cross-style label to remove',()=>{
 const f=fixture('Turbo');assert.equal(f.app.draft.tempSource,'');
 f.change(String(tempDisplay(95,f.app.logUnit)));f.app.readDraft();
 assert.ok(Math.abs(f.app.draft.tempC-95)<0.3);
 assert.equal(f.app.draft.tempSource,'');
});
test('R197 optional temperature input absent is safe; no implicit temperature added',()=>{
 const f=fixture();f.form.elements.temperature=undefined;
 f.app.readDraft();assert.equal(f.app.draft.tempC,94);
 assert.equal(f.app.draft.tempSource,'Last used on Traditional');
});
