import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {field} from '../site/lib/ui.js';

// Real CloudApp renderer, synthetic in-memory data; no member/provider access.
const root={innerHTML:''},sheet={close(){},querySelector(){return null;}};
globalThis.document={querySelector:selector=>selector==='#app'?root:sheet};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;

const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function render(editing=null){
 const app=new CloudApp({},{});
 app.state=hydrate(rawFixture());
 let html='';
 app.show=(_title,markup)=>{html=markup;};
 app.updateDoseAdvisory=()=>{};
 app.showLog('coffee',editing);
 return {app,html};
}
const input=(html,name)=>{
 const tag=html.match(new RegExp('<input\\b[^>]*name="'+name+'"[^>]*>'))?.[0]||'';
 assert.ok(tag,'Missing actual input '+name);
 return tag;
};
test('R456 new Log Shot allows fractional measured grinder and other measurements',()=>{
 const {html,app}=render();
 assert.match(input(html,'grindSetting'),/type="number"/);
 assert.match(input(html,'grindSetting'),/step="any" inputmode="decimal"/);
 assert.doesNotMatch(input(html,'grindSetting'),/step="\.1"/);
 for(const name of ['doseG','yieldG','timeS'])assert.match(input(html,name),/step="any" inputmode="decimal"/);
 for(const name of Object.keys(green))assert.match(html,new RegExp('data-scale="'+name+'"'));
 assert.match(html,/name=notes/);
 assert.match(html,/data-action="use-grind"/);
 assert.match(html,/id=shot novalidate/);
 assert.equal(app.editing,null);
});
test('R456 Edit Shot retains non-tenth original grind, five tastes and private notes',()=>{
 const initial=render();
 const old={...structuredClone(initial.app.draft),id:'r456-synthetic-shot',
  grindSetting:2.45,tasteScales:{...green},notes:'Synthetic private note'};
 const before=structuredClone(old);
 const {html,app}=render(old);
 assert.match(input(html,'grindSetting'),/value="2\.45"/);
 assert.match(input(html,'grindSetting'),/step="any" inputmode="decimal"/);
 assert.match(html,/Synthetic private note/);
 assert.doesNotMatch(html,/data-action="use-grind"/);
 for(const name of Object.keys(green))assert.match(html,new RegExp('data-scale="'+name+'"'));
 assert.deepEqual(app.draft.tasteScales,green);
 assert.equal(app.draft.grindSetting,2.45);
 assert.deepEqual(old,before,'The edit dialog must not rewrite old measured values or notes');
});
test('R456 fresh blank and arbitrary fractional number controls have no tenth-step grid',()=>{
 const blank=field('Grind Setting','grindSetting','',{required:true,type:'number',step:'any'});
 const fractional=field('Grind Setting','grindSetting','0.155',{required:true,type:'number',step:'any'});
 assert.match(blank,/value="" required\s+step="any" inputmode="decimal"/);
 assert.match(fractional,/value="0\.155" required\s+step="any" inputmode="decimal"/);
 assert.doesNotMatch(blank,/\bmin=/);
 assert.doesNotMatch(blank,/step="\.1"/);
});
