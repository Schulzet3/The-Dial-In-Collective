import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {acknowledgeShotRating} from '../site/lib/ui.js';

function setup(otherInvalid=[]){
 const controls=[];
 const form={querySelector(selector){assert.equal(selector,'[aria-invalid="true"]');return controls.find(c=>c.getAttribute('aria-invalid')==='true')||null;}};
 function field(name,invalid){
  const attrs=invalid?{'aria-invalid':'true','aria-describedby':'shot-validation-feedback'}:{};
  return {name,attrs,getAttribute(k){return attrs[k]??null;},removeAttribute(k){delete attrs[k];},
   closest(selector){assert.equal(selector,'form');return form;}};
 }
 const tapped=field('rated taste',true);controls.push(tapped);
 for(const name of otherInvalid)controls.push(field(name,true));
 return {tapped,controls,feedback:{textContent:'Rate all five taste scales. Dose must be between 5 and 40 g.'}};
}
test('rating one taste retains visible alert for other missing tastes',()=>{
 const {tapped,controls,feedback}=setup(['clarity','body']);
 assert.equal(acknowledgeShotRating(tapped,feedback),true);
 assert.equal(tapped.getAttribute('aria-invalid'),null);
 assert.equal(tapped.getAttribute('aria-describedby'),null);
 assert.equal(controls[1].getAttribute('aria-invalid'),'true');
 assert.match(feedback.textContent,/Rate all five/);
});
test('rating does not hide still-invalid dose, yield or notes alert',()=>{
 for(const name of ['doseG','yieldG','notes']){
  const {tapped,controls,feedback}=setup([name]);
  assert.equal(acknowledgeShotRating(tapped,feedback),true);
  assert.equal(controls[1].getAttribute('aria-invalid'),'true');
  assert.match(feedback.textContent,/Dose must/);
 }
});
test('final missing rating clears resolved validation alert',()=>{
 const {tapped,feedback}=setup();
 assert.equal(acknowledgeShotRating(tapped,feedback),true);
 assert.equal(feedback.textContent,'');
});
test('already valid rating never dismisses unrelated cloud sync error',()=>{
 const {tapped,feedback}=setup();
 tapped.removeAttribute('aria-invalid');
 feedback.textContent='Your cloud connection was lost.';
 assert.equal(acknowledgeShotRating(tapped,feedback),false);
 assert.equal(feedback.textContent,'Your cloud connection was lost.');
});
test('detached rating does not hide shared alert without remaining-form evidence',()=>{
 const feedback={textContent:'Rate all five taste scales.'};
 const orphan={getAttribute(k){return k==='aria-invalid'?'true':null;},removeAttribute(){},closest(){return null;}};
 assert.equal(acknowledgeShotRating(orphan,feedback),true);
 assert.equal(feedback.textContent,'Rate all five taste scales.');
});
test('live rating handler uses scoped acknowledgement, not blanket clear',()=>{
 const main=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 const line=main.split('\n').find(line=>line.includes("if(a==='rate')"));
 assert.ok(line,'live handler present');
 assert.ok(line.includes("U.acknowledgeShotRating(target.closest('[role=\"group\"]'),sheet.querySelector('#shot-validation-feedback'))"));
 assert.ok(!line.includes("alert.textContent=''"));
 assert.ok(main.includes("U.focusShotValidationError(form,shotValidation,this.draft?.tasteScales)"));
});
