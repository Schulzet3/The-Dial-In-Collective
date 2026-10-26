import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCALES,tasteLabel} from '../site/lib/constants.js';
import {updateTasteSelection,focusShotValidationError,scales} from '../site/lib/ui.js';

function fakeScale(key){
 const scale=SCALES.find(s=>s.key===key);
 const output={textContent:'Tap to rate'};
 const controls=[1,2,3,4,5].map(value=>({
  dataset:{value:String(value)},pressed:'false',mark:{textContent:''},
  classList:{selected:false,toggle(name,on){assert.equal(name,'chosen');this.selected=on;}},
  setAttribute(name,value){assert.equal(name,'aria-pressed');this.pressed=value;},
  querySelector(name){assert.equal(name,'span');return this.mark;}
 }));
 const row={querySelector(name){assert.equal(name,'output');return output;},querySelectorAll(name){assert.equal(name,'[data-action="rate"]');return controls;}};
 const ratings={querySelector(name){return name==='[data-scale="'+key+'"]'?row:null;}};
 return {ratings,output,controls,scale};
}

test('rating updates in place and leaves the focused button object intact',()=>{
 for(const scale of SCALES){
  const {ratings,output,controls}=fakeScale(scale.key);
  const focused=controls[2];
  assert.equal(updateTasteSelection(ratings,scale.key,3),true);
  assert.equal(controls[2],focused);
  assert.equal(output.textContent,tasteLabel(scale,3));
  assert.equal(controls.filter(c=>c.classList.selected).length,1);
  assert.equal(focused.pressed,'true');
  assert.equal(focused.mark.textContent,'✓');
  assert.equal(updateTasteSelection(ratings,scale.key,5),true);
  assert.equal(focused.pressed,'false');
  assert.equal(focused.mark.textContent,'');
  assert.equal(controls[4].pressed,'true');
  assert.equal(output.textContent,tasteLabel(scale,5));
 }
});

test('invalid or missing rating does not mutate another scale',()=>{
 const {ratings,output,controls}=fakeScale('sweetness');
 for(const [key,value] of [['unknown',3],['sweetness',0],['sweetness',6],['sweetness',2.5]])
  assert.equal(updateTasteSelection(ratings,key,value),false);
 assert.equal(output.textContent,'Tap to rate');
 assert.ok(controls.every(c=>c.pressed==='false'));
 assert.equal(updateTasteSelection(null,'sweetness',5),false);
});

test('all five original sensory choices stay individually required and accessible',()=>{
 const html=scales({});
 assert.equal((html.match(/data-scale="/g)||[]).length,5);
 assert.equal((html.match(/data-action="rate"/g)||[]).length,25);
 assert.equal((html.match(/aria-pressed="false"/g)||[]).length,25);
 const main=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.ok(main.includes("U.updateTasteSelection(sheet.querySelector('#ratings'),target.dataset.key,Number(target.dataset.value))"));
 assert.ok(!main.includes("sheet.querySelector('#ratings').innerHTML=scales"));
 assert.ok(main.includes('M.validateShot(d)'));
});

test('invalid measurements receive error semantics and the first field retains focus',()=>{
 const changed=[];
 const control=(name)=>({name,attrs:{},setAttribute(k,v){this.attrs[k]=v;},focus(){changed.push(name);}});
 const dose=control('dose'),yieldField=control('yield'),notes=control('notes');
 const fields={'[name="doseG"]':dose,'[name="yieldG"]':yieldField,'[name="notes"]':notes};
 const form={isConnected:true,querySelector(selector){return fields[selector]||null;}};
 assert.equal(focusShotValidationError(form,['Yield must be between 5 and 120 g.','Dose must be between 5 and 40 g.','Notes must be 16,000 characters or fewer.'],{}),true);
 assert.deepEqual(changed,['dose']);
 for(const c of [dose,yieldField,notes]){assert.equal(c.attrs['aria-invalid'],'true');assert.equal(c.attrs['aria-describedby'],'shot-validation-feedback');}
});
test('missing taste score focuses the first incomplete group; no score is preselected',()=>{
 const focused=[];
 const groups={};
 for(const s of SCALES){
  const child={focus(){focused.push(s.key)}};
  groups[s.key]={attrs:{},setAttribute(k,v){this.attrs[k]=v;},querySelector(n){assert.equal(n,'button');return child;}};
 }
 const form={isConnected:true,querySelector(selector){
  const key=selector.includes('[data-scale="')?selector.split('"')[1]:null;
  return key&&selector.endsWith(' [role="group"]')?groups[key]:null;
 }};
 const tastes={extraction:3,body:3,clarity:null,sweetness:5,astringency:1};
 assert.equal(focusShotValidationError(form,['Rate all five taste scales.'],tastes),true);
 assert.deepEqual(focused,['clarity']);
 assert.equal(groups.clarity.attrs['aria-invalid'],'true');
 assert.equal(groups.clarity.attrs['aria-describedby'],'shot-validation-feedback');
 assert.equal(groups.body.attrs['aria-invalid'],undefined);
 assert.equal(focusShotValidationError({isConnected:false},['Rate all five taste scales.'],tastes),false);
});
test('Log Shot keeps semantic error announcement and re-enables fields before focusing validation',()=>{
 const main=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.ok(main.includes('role=alert id=shot-validation-feedback'));
 assert.ok(main.includes("form.querySelectorAll('button').forEach(b=>b.disabled=false);if(id==='shot'&&shotValidation?.length)U.focusShotValidationError"));
 assert.ok(main.includes("const group=target.closest('[role=\\"group\\"]')")||main.includes("target.closest('[role=\\"group\\"]')"));
});
