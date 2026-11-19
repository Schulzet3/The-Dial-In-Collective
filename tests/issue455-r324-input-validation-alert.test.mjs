import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {acknowledgeShotInput} from '../site/lib/ui.js';

function makeForm(otherInvalid=[]) {
 const controls=[];
 const form={querySelector(selector){
  assert.equal(selector,'[aria-invalid="true"]');
  return controls.find(c=>c.getAttribute('aria-invalid')==='true')||null;
 }};
 const field=(name,invalid=true)=> {
  const attrs=invalid?{'aria-invalid':'true','aria-describedby':'shot-validation-feedback'}:{};
  const control={name,getAttribute(k){return attrs[k]??null;},
   removeAttribute(k){delete attrs[k];},
   closest(selector){assert.equal(selector,'form');return form;}};
  controls.push(control);return control;
 };
 const edited=field('doseG');
 for(const name of otherInvalid)field(name);
 return {edited,controls,feedback:{textContent:'Dose must be between 5 and 40 g. Rate all five taste scales.'}};
}

test('R324 editing one flagged measurement retains alert while other measurement invalid',()=>{
 const {edited,controls,feedback}=makeForm(['yieldG']);
 assert.equal(acknowledgeShotInput(edited,feedback),true);
 assert.equal(edited.getAttribute('aria-invalid'),null);
 assert.equal(edited.getAttribute('aria-describedby'),null);
 assert.equal(controls[1].getAttribute('aria-invalid'),'true');
 assert.match(feedback.textContent,/Dose must/);
});
test('R324 editing flagged measurement retains alert while taste groups remain invalid',()=>{
 const {edited,controls,feedback}=makeForm(['clarity','body']);
 assert.equal(acknowledgeShotInput(edited,feedback),true);
 assert.equal(controls[1].getAttribute('aria-invalid'),'true');
 assert.equal(controls[2].getAttribute('aria-invalid'),'true');
 assert.match(feedback.textContent,/Rate all five/);
});
test('R324 editing final flagged measurement clears only resolved local Save alert',()=>{
 const {edited,feedback}=makeForm();
 assert.equal(acknowledgeShotInput(edited,feedback),true);
 assert.equal(feedback.textContent,'');
 assert.equal(edited.getAttribute('aria-invalid'),null);
});
test('R324 already valid input does not erase unrelated cloud or sync feedback',()=>{
 const {edited,feedback}=makeForm();
 edited.removeAttribute('aria-invalid');
 feedback.textContent='Your cloud connection was lost.';
 assert.equal(acknowledgeShotInput(edited,feedback),false);
 assert.equal(feedback.textContent,'Your cloud connection was lost.');
});
test('R324 detached invalid input never clears alert without form evidence',()=>{
 const feedback={textContent:'Rate all five taste scales.'};
 const orphan={getAttribute(k){return k==='aria-invalid'?'true':null;},
  removeAttribute(){},closest(){return null;}};
 assert.equal(acknowledgeShotInput(orphan,feedback),true);
 assert.equal(feedback.textContent,'Rate all five taste scales.');
});
test('R324 current app input event delegates to the tested input acknowledgement',()=>{
 const main=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.ok(main.includes("U.acknowledgeShotInput(ev.target,sheet.querySelector('#shot-validation-feedback'))"));
 assert.ok(main.includes("if(ev.target.closest?.('#shot'))"));
});
