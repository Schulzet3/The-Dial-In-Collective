import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {recommendation} from '../site/lib/engine.js';
import {tempDisplay,tastesComplete} from '../site/lib/constants.js';

// Exercise the real CloudApp Use Recommendation handler without network,
// production users, a browser, or any cloud mutations.
const root={innerHTML:''},sheet={close(){},querySelector(){return null;}};
globalThis.document={querySelector:s=>s==='#app'?root:sheet};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;

function fixture(unit='F'){
 const app=new CloudApp({},{});
 app.state=hydrate(rawFixture());
 const version=app.state.setups[0].versions[0];
 version.advanced.temperature=true;
 version.tempUnit=unit;
 app.show=()=>{};
 app.updateDoseAdvisory=()=>{};
 app.showLog('coffee',null,'Turbo');
 app.readDraft=()=>{}; // Only exercise the existing button path.
 app.error=error=>{throw error;};
 const controls=[];
 const form={querySelector(selector){
  assert.equal(selector,'[aria-invalid="true"]');
  return controls.find(x=>x.getAttribute('aria-invalid')==='true')||null;
 }};
 function control(name,value){
  const attrs={};
  const input={name,value:String(value),dataset:{temperatureUnit:unit},
   getAttribute(k){return attrs[k]??null;},
   removeAttribute(k){delete attrs[k];},
   closest(selector){
    if(selector==='form')return form;
    if(selector==='.field')return {querySelector:()=>({remove(){}})};
    return null;
   },
   flag(){attrs['aria-invalid']='true';attrs['aria-describedby']='shot-validation-feedback';}
  };
  controls.push(input);
  return input;
 }
 const grind=control('grindSetting','bad');
 const temperature=control('temperature',unit==='F'?'239':'101');
 const dose=control('doseG','0');
 const feedback={textContent:''};
 sheet.querySelector=selector=>
  selector==='[name=grindSetting]'?grind:
  selector==='[name=temperature]'?temperature:
  selector==='#shot-validation-feedback'?feedback:null;
 const click=action=>app.click({target:{closest:()=>({dataset:{action}})}});
 const advice=()=>recommendation(app.state,'coffee',{
  style:app.draft.style,basketId:app.draft.basketId,feedMode:app.draft.feedMode
 });
 return {app,grind,temperature,dose,feedback,click,advice};
}

test('R366 Use Grind clears stale invalid semantics for the corrected control',async()=>{
 const f=fixture(),before=structuredClone(f.app.state);
 const draftTastes=structuredClone(f.app.draft.tasteScales);
 f.grind.flag();f.feedback.textContent='Enter the actual grind setting.';
 const expected=f.advice().grind.value;
 await f.click('use-grind');
 assert.equal(Number(f.grind.value),expected);
 assert.equal(f.grind.getAttribute('aria-invalid'),null);
 assert.equal(f.grind.getAttribute('aria-describedby'),null);
 assert.equal(f.feedback.textContent,'');
 assert.deepEqual(f.app.state,before);
 assert.deepEqual(f.app.draft.tasteScales,draftTastes);
 assert.equal(tastesComplete(f.app.draft.tasteScales),false);
});

test('R366 corrected grind preserves unrelated invalid dose and its alert',async()=>{
 const f=fixture();
 f.grind.flag();f.dose.flag();
 f.feedback.textContent='Enter the actual grind setting. Dose must be between 5 and 40 g.';
 await f.click('use-grind');
 assert.equal(f.grind.getAttribute('aria-invalid'),null);
 assert.equal(f.dose.getAttribute('aria-invalid'),'true');
 assert.match(f.feedback.textContent,/Dose must/);
});

test('R366 Use Temperature resolves local Save error in both display units',async()=>{
 for(const unit of ['F','C']){
  const f=fixture(unit),before=structuredClone(f.app.state);
  f.temperature.flag();f.feedback.textContent='Check temperature (70-100 degrees C).';
  const expected=tempDisplay(f.advice().tempC,unit);
  await f.click('use-temp');
  assert.equal(Number(f.temperature.value),expected);
  assert.equal(f.temperature.getAttribute('aria-invalid'),null);
  assert.equal(f.temperature.getAttribute('aria-describedby'),null);
  assert.equal(f.feedback.textContent,'');
  assert.deepEqual(f.app.state,before);
 }
});

test('R366 Use Temperature keeps other still-invalid measurements visible',async()=>{
 const f=fixture('F');
 f.temperature.flag();f.grind.flag();
 f.feedback.textContent='Check temperature. Enter the actual grind setting.';
 await f.click('use-temp');
 assert.equal(f.temperature.getAttribute('aria-invalid'),null);
 assert.equal(f.grind.getAttribute('aria-invalid'),'true');
 assert.match(f.feedback.textContent,/grind setting/);
});

test('R366 ordinary recommendation use does not dismiss cloud or sync errors',async()=>{
 const f=fixture();
 f.feedback.textContent='Cloud sync failed. Try again.';
 await f.click('use-grind');
 assert.equal(f.feedback.textContent,'Cloud sync failed. Try again.');
 await f.click('use-temp');
 assert.equal(f.feedback.textContent,'Cloud sync failed. Try again.');
});
