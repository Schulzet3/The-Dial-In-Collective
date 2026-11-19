import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {acknowledgeShotInput} from '../site/lib/ui.js';
import {CONFIG} from '../site/lib/constants.js';

function fixture(){
 const fields=[];
 const form={querySelector(selector){
  assert.equal(selector,'[aria-invalid="true"]');
  return fields.find(f=>f.getAttribute('aria-invalid')==='true')||null;
 }};
 function field(name,value,invalid=true){
  const attrs=invalid?{'aria-invalid':'true','aria-describedby':'shot-validation-feedback'}:{};
  const control={name,value,attrs,
   getAttribute(key){return attrs[key]??null;},
   removeAttribute(key){delete attrs[key];},
   closest(selector){assert.equal(selector,'form');return form;}};
  fields.push(control);return control;
 }
 return {field,fields,feedback:{textContent:'Dose must be between 5 and 40 g.'}};
}

test('R327 source-bound current dose guard keeps invalid feedback after out-of-bounds edit',()=>{
 const {field,feedback}=fixture();
 const dose=field('doseG',String(CONFIG.bounds.doseG[1]+1));
 assert.equal(acknowledgeShotInput(dose,feedback),true);
 assert.equal(dose.getAttribute('aria-invalid'),'true');
 assert.equal(dose.getAttribute('aria-describedby'),'shot-validation-feedback');
 assert.match(feedback.textContent,/Dose must/);
});
test('R327 final corrected measured field clears resolved local alert and semantics',()=>{
 const {field,feedback}=fixture(),dose=field('doseG','18.25');
 assert.equal(acknowledgeShotInput(dose,feedback),true);
 assert.equal(dose.getAttribute('aria-invalid'),null);
 assert.equal(dose.getAttribute('aria-describedby'),null);
 assert.equal(feedback.textContent,'');
});
test('R327 blank and negative grind edits remain flagged, true measured zero resolves',()=>{
 const {field,feedback}=fixture(),grind=field('grindSetting',' ');
 assert.equal(acknowledgeShotInput(grind,feedback),true);
 assert.equal(grind.getAttribute('aria-invalid'),'true');
 grind.value='-0.1';
 assert.equal(acknowledgeShotInput(grind,feedback),true);
 assert.equal(grind.getAttribute('aria-invalid'),'true');
 grind.value='0';
 assert.equal(acknowledgeShotInput(grind,feedback),true);
 assert.equal(grind.getAttribute('aria-invalid'),null);
 assert.equal(feedback.textContent,'');
});
test('R327 current yield/time bounds govern invalid edit without shifting numeric policy',()=>{
 for(const [name,bounds] of [['yieldG',CONFIG.bounds.yieldG],['timeS',CONFIG.bounds.timeS]]){
  const {field,feedback}=fixture(),control=field(name,String(bounds[1]+1));
  assert.equal(acknowledgeShotInput(control,feedback),true);
  assert.equal(control.getAttribute('aria-invalid'),'true');
  control.value=String(bounds[0]);
  assert.equal(acknowledgeShotInput(control,feedback),true);
  assert.equal(control.getAttribute('aria-invalid'),null);
 }
});
test('R327 Unicode note length matches model code-point limit',()=>{
 const {field,feedback}=fixture(),notes=field('notes','☕'.repeat(16001));
 assert.equal(acknowledgeShotInput(notes,feedback),true);
 assert.equal(notes.getAttribute('aria-invalid'),'true');
 notes.value='☕'.repeat(16000);
 assert.equal(acknowledgeShotInput(notes,feedback),true);
 assert.equal(notes.getAttribute('aria-invalid'),null);
 assert.equal(feedback.textContent,'');
});
test('R327 corrected field retains message if another taste group is invalid',()=>{
 const {field,feedback,fields}=fixture(),dose=field('doseG','18.25'),taste=field('clarity',undefined);
 assert.equal(acknowledgeShotInput(dose,feedback),true);
 assert.equal(dose.getAttribute('aria-invalid'),null);
 assert.equal(taste.getAttribute('aria-invalid'),'true');
 assert.notEqual(feedback.textContent,'');
 assert.equal(fields.length,2);
});
test('R327 ordinary valid input never erases unrelated cloud or sync error',()=>{
 const {field,feedback}=fixture(),control=field('doseG','18.2',false);
 feedback.textContent='Cloud sync failed.';
 assert.equal(acknowledgeShotInput(control,feedback),false);
 assert.equal(feedback.textContent,'Cloud sync failed.');
});
test('R327 actual Log Shot input flow remains connected to targeted UI helper',()=>{
 const source=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.ok(source.includes("U.acknowledgeShotInput(ev.target,sheet.querySelector('#shot-validation-feedback'))"));
 assert.ok(source.includes("M.validateShot(d,{allowLegacyCustom:!!this.editing&&this.editing.style==='Custom'})"));
});
