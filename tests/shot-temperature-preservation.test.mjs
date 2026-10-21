import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {tempDisplay} from '../site/lib/constants.js';
import {recommendation} from '../site/lib/engine.js';

let form;
const root={innerHTML:''},sheet={close(){},querySelector:selector=>selector==='#shot'?form:selector==='[name=temperature]'?form.elements.temperature:null};
globalThis.document={querySelector:selector=>selector==='#app'?root:sheet};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;
function fixture(unit='C',temperature=93.2){
 const app=new CloudApp({},{});app.logUnit=unit;app.logCoffee='coffee';app.state=hydrate(rawFixture());
 app.draft={doseG:18,yieldG:36,timeS:25,grindSetting:1.2,tempC:temperature,notes:'Original',feedMode:'standard'};
 const input=value=>{let stored=String(value);return {get value(){return stored;},set value(next){stored=String(next);}};};
 form={elements:{doseG:input(18),yieldG:input(36),timeS:input(25),grindSetting:input(1.2),temperature:input(tempDisplay(temperature,unit)),notes:input('Corrected note')}};
 return app;
}
test('notes or rating edits preserve an untouched temperature in either display unit',()=>{
 for(const unit of ['C','F']){
  const app=fixture(unit);app.readDraft();
  assert.equal(app.draft.tempC,93.2,unit);assert.equal(app.draft.notes,'Corrected note');
  app.readDraft();assert.equal(app.draft.tempC,93.2,'repeated draft reads retain precision');
 }
});
test('intentional temperature changes and clears still update the draft',()=>{
 const app=fixture('F');form.elements.temperature.value='201';app.readDraft();
 assert.equal(app.draft.tempC,(201-32)*5/9);
 form.elements.temperature.value='';app.readDraft();assert.equal(app.draft.tempC,null);
});
test('Use Recommendation copies the exact calculated temperature before rounded presentation',async()=>{
 const app=fixture('F');app.state.coffees[0].roastLevel='Medium-Dark';
 const expected=recommendation(app.state,'coffee').tempC;assert.equal(expected,91.5);
 await app.click({target:{closest:()=>({dataset:{action:'use-temp'}})}});
 assert.equal(app.draft.tempC,91.5);assert.equal(form.elements.temperature.value,String(tempDisplay(91.5,'F')));
 app.readDraft();assert.equal(app.draft.tempC,91.5);
});
