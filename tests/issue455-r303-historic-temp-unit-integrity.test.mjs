import test from 'node:test';
import assert from 'node:assert/strict';
import {rawFixture} from './cloud-fixtures/raw.js';
import {hydrate} from '../site/cloud/mapping.js';
import {activeVersion} from '../site/lib/model.js';

// Synthetic legacy shot objects. No network, real member, Auth, or provider access.
const sheet={querySelector(){return null;}};
globalThis.document={
 querySelector:selector=>selector==='#sheet'?sheet:{},
 createElement:()=>({setAttribute(){},addEventListener(){},replaceChildren(){}}),
 body:{append(){}}
};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;

const archived=unit=>({
 id:'archived-shot-unit',coffeeId:'coffee',style:'Traditional',
 setupVersionId:'version',doseG:18,yieldG:36,timeS:28,grindSetting:2,
 tempC:93,tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},
 notes:'Original private <notes>',snapshot:{tempUnit:unit},revision:1
});
function open(shot,unit){
 const state=hydrate(rawFixture());activeVersion(state).tempUnit=unit;
 const app=new CloudApp({},{});app.state=state;
 let title='',html='';app.show=(t,markup)=>{title=t;html=markup;};
 app.showLog('coffee',shot);
 return {app,title,html};
}
test('#455 R303 malformed historical temperature units use active valid display unit, preserving the original shot',()=>{
 for(const invalid of ['K','unknown','<bad-unit>','']){
  const shot=archived(invalid),original=structuredClone(shot);
  const {app,title,html}=open(shot,'C');
  assert.equal(title,'Edit Shot');
  assert.equal(app.logUnit,'C');
  assert.ok(html.includes('Temperature (°C, Optional)'));
  assert.match(html,/name="temperature" type="number" value="93"/);
  assert.doesNotMatch(html,/°K|°unknown|bad-unit/);
  assert.match(html,/Original private &lt;notes&gt;/);
  assert.equal((html.match(/aria-pressed="true"/g)||[]).length,5);
  assert.deepEqual(shot,original,'never rewrite original private history');
 }
});
test('#455 R303 valid original F/C unit remains authoritative even when current settings differ',()=>{
 for(const [historical,current,display] of [['F','C','199'],['C','F','93']]){
  const shot=archived(historical),original=structuredClone(shot);
  const {app,html}=open(shot,current);
  assert.equal(app.logUnit,historical);
  assert.ok(html.includes('Temperature (°'+historical+', Optional)'));
  assert.ok(html.includes('name="temperature" type="number" value="'+display+'"'));
  assert.deepEqual(shot,original);
 }
});
test('#455 R303 malformed current unit also fails closed to Fahrenheit without changing measurements or taste ratings',()=>{
 const shot=archived('Kelvin'),original=structuredClone(shot);
 const {app,html}=open(shot,'Kelvin');
 assert.equal(app.logUnit,'F');
 assert.ok(html.includes('Temperature (°F, Optional)'));
 assert.match(html,/name="temperature" type="number" value="199"/);
 assert.deepEqual(shot,original);
 const newer=open(null,'Kelvin');
 assert.equal(newer.app.logUnit,'F');
 assert.equal((newer.html.match(/data-scale="/g)||[]).length,5);
 assert.equal((newer.html.match(/aria-pressed="true"/g)||[]).length,0);
});
