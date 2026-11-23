import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {validateShot} from '../site/lib/model.js';

// Actual CloudApp renderer and real validator with synthetic, in-memory fixtures.
const root={innerHTML:''},sheet={close(){},querySelector(){return null;}};
globalThis.document={querySelector:selector=>selector==='#app'?root:sheet};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;
const five={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const measured={doseG:18.25,yieldG:36.125,timeS:25.22};
function render(editing=null){
 const app=new CloudApp({},{});
 app.state=hydrate(rawFixture());
 let html='';
 app.show=(_title,markup)=>{html=markup;};
 app.updateDoseAdvisory=()=>{};
 app.showLog('coffee',editing);
 return {app,html};
}
function input(html,name){
 const tag=html.match(new RegExp('<input\\b[^>]*name="'+name+'"[^>]*>'))?.[0]||'';
 assert.ok(tag,'Missing actual input '+name);
 return tag;
}
test('R461 new Log Shot physical measurements accept arbitrary decimal HTML steps',()=>{
 const {html,app}=render();
 for(const name of Object.keys(measured)){
  const tag=input(html,name);
  assert.match(tag,/type="number"/);
  assert.match(tag,/step="any" inputmode="decimal"/);
  assert.doesNotMatch(tag,/step="\.1"/);
 }
 assert.match(input(html,'grindSetting'),/step="any" inputmode="decimal"/);
 for(const name of Object.keys(five))assert.match(html,new RegExp('data-scale="'+name+'"'));
 assert.match(html,/name=notes/);
 assert.match(html,/id=shot novalidate/);
 assert.equal(app.editing,null);
});
test('R461 edit preserves original fractional dose, yield, time, grind, notes and five tastes',()=>{
 const original={...structuredClone(render().app.draft),id:'r461-synthetic-shot',
  ...measured,grindSetting:2.45,tasteScales:{...five},notes:'Synthetic private note'};
 const before=structuredClone(original);
 const {html,app}=render(original);
 for(const [name,value] of Object.entries(measured)){
  assert.match(input(html,name),new RegExp('value="'+String(value).replace('.','\\.')+'"'));
  assert.match(input(html,name),/step="any" inputmode="decimal"/);
 }
 assert.match(input(html,'grindSetting'),/value="2\.45"/);
 assert.match(html,/Synthetic private note/);
 assert.deepEqual(app.draft.tasteScales,five);
 assert.deepEqual(original,before);
});
test('R461 actual model accepts real fractional measurements but rejects invalid entries',()=>{
 const shot={...render().app.draft,...measured,grindSetting:2.45,tasteScales:{...five},notes:'Original synthetic note'};
 assert.deepEqual(validateShot(shot),[]);
 assert.ok(validateShot({...shot,doseG:-1}).some(x=>x.includes('Dose')));
 assert.ok(validateShot({...shot,yieldG:'abc'}).some(x=>x.includes('Yield')));
 assert.ok(validateShot({...shot,timeS:''}).some(x=>x.includes('Time')));
 assert.ok(validateShot({...shot,tasteScales:{...five,sweetness:undefined}}).some(x=>x.includes('five taste')));
});
