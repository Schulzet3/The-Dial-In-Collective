import test from 'node:test';
import assert from 'node:assert/strict';
import {rawFixture} from './cloud-fixtures/raw.js';
import {hydrate} from '../site/cloud/mapping.js';
import * as M from '../site/lib/model.js';

const sheet={querySelector(){return null;}};
globalThis.document={
 querySelector:selector=>selector==='#sheet'?sheet:{},
 createElement:()=>({setAttribute(){},addEventListener(){},replaceChildren(){}}),
 body:{append(){}}
};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;

const archived=()=>({
 id:'archived-private-shot',coffeeId:'coffee',style:'Traditional',setupVersionId:'version',
 doseG:18,yieldG:36,timeS:28,grindSetting:1.2,tempC:93,
 tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},
 notes:'Original private <notes>',revision:1
});
function open(shot,unit='C'){
 const state=hydrate(rawFixture());
 M.activeVersion(state).tempUnit=unit;
 const app=new CloudApp({},{});
 app.state=state;
 let title='',html='';
 app.show=(name,markup)=>{title=name;html=markup;};
 app.showLog('coffee',shot);
 return {app,title,html};
}
test('#455 R296: legacy editable shot without snapshot opens without discarding private notes or five ratings',()=>{
 for(const snapshot of [undefined,null]){
  const original={...archived(),snapshot};
  const before=structuredClone(original);
  const {app,title,html}=open(original,'C');
  assert.equal(title,'Edit Shot');
  assert.equal(app.logUnit,'C','missing historical unit falls back to active equipment display unit');
  assert.match(html,/Original private &lt;notes&gt;/);
  assert.match(html,/Temperature \(°C, Optional\)/);
  assert.equal((html.match(/data-scale="/g)||[]).length,5);
  assert.equal((html.match(/aria-pressed="true"/g)||[]).length,5);
  assert.deepEqual(original,before,'original recorded shot remains unchanged');
 }
});
test('#455 R296: recorded historical F display unit remains authoritative over current C unit',()=>{
 const original={...archived(),snapshot:{setupName:'Original setup',tempUnit:'F'}};
 const before=structuredClone(original);
 const {app,html}=open(original,'C');
 assert.equal(app.logUnit,'F');
 assert.match(html,/Temperature \(°F, Optional\)/);
 assert.match(html,/name="temperature" type="number" value="199"/);
 assert.deepEqual(original,before);
});
test('#455 R296: ordinary new-shot logging still starts with no rated taste preselection',()=>{
 const {app,title,html}=open(null,'C');
 assert.equal(title,'Log A Shot');
 assert.equal(app.logUnit,'C');
 assert.equal((html.match(/data-scale="/g)||[]).length,5);
 assert.equal((html.match(/aria-pressed="true"/g)||[]).length,0);
});
