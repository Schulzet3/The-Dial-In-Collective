import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion,validateShot} from '../site/lib/model.js';
import {tempInput} from '../site/lib/constants.js';

// Real CloudApp Log/Edit renderer and model; synthetic local fixtures only.
const root={innerHTML:''},sheet={close(){},querySelector(){return null;}};
globalThis.document={querySelector:selector=>selector==='#app'?root:sheet};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;
const allFive={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function render(editing=null,track=true){
 const app=new CloudApp({},{});
 app.state=hydrate(rawFixture());
 activeVersion(app.state).advanced.temperature=track;
 let html='';
 app.show=(_title,markup)=>{html=markup;};
 app.updateDoseAdvisory=()=>{};
 app.showLog('coffee',editing);
 return {app,html};
}
function input(html,name){
 const tag=html.match(new RegExp('<input\\b[^>]*name="'+name+'"[^>]*>'))?.[0]||'';
 assert.ok(tag,'Missing actual '+name+' input');
 return tag;
}
test('R462 tracked Log Shot accepts optional measured fractional C/F inputs without a native integer-only step',()=>{
 const {html}=render();
 assert.match(input(html,'temperature'),/type="number"/);
 assert.match(input(html,'temperature'),/step="any" inputmode="decimal"/);
 assert.doesNotMatch(input(html,'temperature'),/step="1"/);
 assert.match(input(html,'temperature'),/data-temperature-unit="F"/);
 for(const name of ['doseG','yieldG','timeS','grindSetting'])
  assert.match(input(html,name),/step="any" inputmode="decimal"/);
 for(const taste of Object.keys(allFive))assert.match(html,new RegExp('data-scale="'+taste+'"'));
 assert.match(html,/id=shot novalidate/);
 assert.match(html,/name=notes/);
});
test('R462 edited historical fractional Celsius measurement and private five-taste shot remain unchanged',()=>{
 const original={...structuredClone(render().app.draft),id:'r462-synthetic-shot',
  tempC:93.25,grindSetting:2.45,doseG:18.25,yieldG:36.125,timeS:25.22,
  notes:'Synthetic private note',tasteScales:{...allFive}};
 const before=structuredClone(original);
 const {app,html}=render(original);
 assert.match(input(html,'temperature'),/step="any" inputmode="decimal"/);
 assert.match(input(html,'temperature'),/data-temperature-unit="F"/);
 assert.equal(app.draft.tempC,93.25);
 assert.deepEqual(app.draft.tasteScales,allFive);
 assert.match(html,/Synthetic private note/);
 assert.deepEqual(original,before);
});
test('R462 optional temperature stays hidden when tracking off but historical edit can preserve it',()=>{
 const plain=render(null,false);
 assert.doesNotMatch(plain.html,/name="temperature"/);
 const old={...structuredClone(plain.app.draft),id:'r462-legacy',tempC:93.25,tasteScales:{...allFive}};
 const edited=render(old,false);
 assert.match(input(edited.html,'temperature'),/step="any" inputmode="decimal"/);
 assert.equal(edited.app.draft.tempC,93.25);
});
test('R462 real shot validator accepts finite fractional physical temperatures, rejects invalid and preserves all ratings',()=>{
 const shot={...render().app.draft,doseG:18.25,yieldG:36.125,timeS:25.22,
  grindSetting:2.45,tempC:93.25,notes:'Synthetic note',tasteScales:{...allFive}};
 assert.deepEqual(validateShot(shot),[]);
 const fahrenheit=tempInput('200.5','F');
 assert.ok(fahrenheit>70&&fahrenheit<100);
 assert.deepEqual(validateShot({...shot,tempC:fahrenheit}),[]);
 assert.deepEqual(validateShot({...shot,tempC:null}),[]);
 assert.ok(validateShot({...shot,tempC:69.9}).some(x=>x.startsWith('Check temperature')));
 assert.ok(validateShot({...shot,tempC:100.1}).some(x=>x.startsWith('Check temperature')));
 assert.ok(validateShot({...shot,tasteScales:{...allFive,body:undefined}}).some(x=>x.includes('five taste')));
});
