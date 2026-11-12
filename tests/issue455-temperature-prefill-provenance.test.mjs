import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';

// Synthetic member-only fixture; no hosted Auth, member record or provider call.
const root={innerHTML:''},sheet={close(){},querySelector(){return null;}};
globalThis.document={querySelector:sel=>sel==='#app'?root:sheet};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;

function shot(id,style,tempC,at='2026-11-10T12:00:00Z'){
 return {id,coffeeId:'coffee',setupVersionId:'version',basketId:'basketv',
  calibrationId:'cal',style,feedMode:'standard',timestamp:at,
  doseG:18,yieldG:36,timeS:25,grindSetting:2,tempC,
  hidden:false,dialedIn:false,notes:'Private original notes',
  tasteScales:{extraction:2,body:3,clarity:3,sweetness:3,astringency:2},
  snapshot:{grinderMin:0,grinderMax:5}};
}
function appFixture(){
 const app=new CloudApp({},{});app.state=hydrate(rawFixture());
 app.state.setups[0].versions[0].advanced.temperature=true;
 let markup='';
 app.show=(_title,html)=>{markup=html;};
 app.updateDoseAdvisory=()=>{};
 return {app,render:()=>markup};
}
test('R195 Log Shot exposes source of a valid cross-style temperature prefill',()=>{
 const {app,render}=appFixture();app.state.shots.push(shot('prior','Traditional',94));
 const before=structuredClone(app.state);
 app.showLog('coffee',null,'Turbo');
 assert.equal(app.draft.tempC,94);
 assert.equal(app.draft.tempSource,'Last used on Traditional');
 assert.match(render(),/name="temperature"[^>]*>\s*<small>Last used on Traditional<\/small>/);
 assert.deepEqual(app.draft.tasteScales,
  {extraction:null,body:null,clarity:null,sweetness:null,astringency:null});
 assert.deepEqual(app.state,before,'the original shot and private notes remain untouched');
});
test('R195 same-style measured temperature does not show a misleading cross-style hint',()=>{
 const {app,render}=appFixture();
 app.state.shots.push(shot('older-turbo','Turbo',92,'2026-11-09T12:00:00Z'));
 app.state.shots.push(shot('newer-other','Traditional',96,'2026-11-10T12:00:00Z'));
 app.showLog('coffee',null,'Turbo');
 assert.equal(app.draft.tempC,92);
 assert.equal(app.draft.tempSource,'');
 assert.doesNotMatch(render(),/Last used on/);
});
test('R195 optional temperature OFF does not expose a cross-style value or field',()=>{
 const {app,render}=appFixture();app.state.shots.push(shot('prior','Traditional',94));
 app.state.setups[0].versions[0].advanced.temperature=false;
 app.showLog('coffee',null,'Turbo');
 assert.equal(app.draft.tempC,null);
 assert.doesNotMatch(render(),/name="temperature"/);
 assert.doesNotMatch(render(),/Last used on/);
});
test('R195 unloggable imported temperature cannot appear as a cross-style hint',()=>{
 const {app,render}=appFixture();
 app.state.shots.push(shot('prior','Traditional',105));
 app.showLog('coffee',null,'Turbo');
 assert.equal(app.draft.tempC,null);
 assert.doesNotMatch(render(),/Last used on/);
});
test('R195 arbitrary legacy style in provenance is escaped before HTML rendering',()=>{
 const {app,render}=appFixture();
 app.state.shots.push(shot('prior','<img src=x onerror=alert(1)>',93));
 const original=structuredClone(app.state.shots);
 app.showLog('coffee',null,'Turbo');
 assert.match(render(),/Last used on &lt;img src=x onerror=alert\(1\)&gt;/);
 assert.doesNotMatch(render(),/<img src=x/);
 assert.deepEqual(app.state.shots,original);
});
