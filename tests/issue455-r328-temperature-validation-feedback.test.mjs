import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {acknowledgeShotInput,field} from '../site/lib/ui.js';
import {tempInput,STYLES} from '../site/lib/constants.js';
import {validateShot} from '../site/lib/model.js';

function fixture(value,unit='F',invalid=true,otherInvalid=false){
 const controls=[];
 const form={querySelector(selector){
  assert.equal(selector,'[aria-invalid="true"]');
  return controls.find(c=>c.getAttribute('aria-invalid')==='true')||null;
 }};
 function add(name,v,flag=invalid){
  const attrs=flag?{'aria-invalid':'true','aria-describedby':'shot-validation-feedback'}:{};
  const control={name,value:v,attrs,dataset:{temperatureUnit:unit},
   getAttribute(k){return attrs[k]??null;},
   removeAttribute(k){delete attrs[k];},
   closest(selector){assert.equal(selector,'form');return form;}};
  controls.push(control);return control;
 }
 const temperature=add('temperature',value);
 const other=otherInvalid?add('sweetness',undefined,true):null;
 return {temperature,other,feedback:{textContent:'Check temperature (70-100 degrees C).'},controls};
}
function savedErrors(value,unit){
 return validateShot({doseG:18,yieldG:36,timeS:25,grindSetting:2,notes:'',style:STYLES[0],
  tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},
  tempC:tempInput(value,unit)});
}
test('R328 Fahrenheit temperature remains invalid after a different still-high edit',()=>{
 const {temperature,feedback}=fixture('239','F');
 assert.match(savedErrors('239','F').join(' '),/Check temperature/);
 assert.equal(acknowledgeShotInput(temperature,feedback),true);
 assert.equal(temperature.getAttribute('aria-invalid'),'true');
 assert.match(feedback.textContent,/Check temperature/);
});
test('R328 Celsius temperature remains invalid above existing Save maximum',()=>{
 const {temperature,feedback}=fixture('101','C');
 assert.match(savedErrors('101','C').join(' '),/Check temperature/);
 acknowledgeShotInput(temperature,feedback);
 assert.equal(temperature.getAttribute('aria-invalid'),'true');
 assert.notEqual(feedback.textContent,'');
});
test('R328 F displayed upper boundary 212 resolves because model accepts 100 C',()=>{
 const {temperature,feedback}=fixture('212','F');
 assert.deepEqual(savedErrors('212','F'),[]);
 acknowledgeShotInput(temperature,feedback);
 assert.equal(temperature.getAttribute('aria-invalid'),null);
 assert.equal(temperature.getAttribute('aria-describedby'),null);
 assert.equal(feedback.textContent,'');
});
test('R328 F 157 remains invalid while 158 meets existing lower boundary',()=>{
 const {temperature,feedback}=fixture('157','F');
 assert.match(savedErrors('157','F').join(' '),/Check temperature/);
 acknowledgeShotInput(temperature,feedback);
 assert.equal(temperature.getAttribute('aria-invalid'),'true');
 temperature.value='158';
 assert.deepEqual(savedErrors('158','F'),[]);
 acknowledgeShotInput(temperature,feedback);
 assert.equal(temperature.getAttribute('aria-invalid'),null);
 assert.equal(feedback.textContent,'');
});
test('R328 Celsius 70 and 100 are accepted unchanged model limits',()=>{
 for(const value of ['70','100']){
  const {temperature,feedback}=fixture(value,'C');
  assert.deepEqual(savedErrors(value,'C'),[]);
  acknowledgeShotInput(temperature,feedback);
  assert.equal(temperature.getAttribute('aria-invalid'),null);
  assert.equal(feedback.textContent,'');
 }
});
test('R328 clearing optional temperature resolves Save error without fabricating a reading',()=>{
 const {temperature,feedback}=fixture('','C');
 assert.deepEqual(savedErrors('','C'),[]);
 acknowledgeShotInput(temperature,feedback);
 assert.equal(temperature.getAttribute('aria-invalid'),null);
 assert.equal(feedback.textContent,'');
});
test('R328 nonnumeric and unknown-unit edits never falsely clear flagged error',()=>{
 for(const [value,unit] of [['not-a-number','C'],['200','legacy']]){
  const {temperature,feedback}=fixture(value,unit);
  acknowledgeShotInput(temperature,feedback);
  assert.equal(temperature.getAttribute('aria-invalid'),'true');
  assert.notEqual(feedback.textContent,'');
 }
});
test('R328 corrected temperature leaves other invalid taste group and message intact',()=>{
 const {temperature,other,feedback}=fixture('200','F',true,true);
 acknowledgeShotInput(temperature,feedback);
 assert.equal(temperature.getAttribute('aria-invalid'),null);
 assert.equal(other.getAttribute('aria-invalid'),'true');
 assert.notEqual(feedback.textContent,'');
});
test('R328 normal temperature edits leave unrelated cloud errors untouched',()=>{
 const {temperature,feedback}=fixture('200','F',false);
 feedback.textContent='Cloud sync failed.';
 assert.equal(acknowledgeShotInput(temperature,feedback),false);
 assert.equal(feedback.textContent,'Cloud sync failed.');
});
test('R328 real Log Shot renders explicit F/C unit metadata without changing user editable control',()=>{
 const source=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.match(source,/data-temperature-unit/);
 assert.ok(source.includes('this.logUnit=historicalUnit'));
 assert.ok(source.includes("U.acknowledgeShotInput(ev.target,sheet.querySelector('#shot-validation-feedback'))"));
 for(const unit of ['F','C']){
  const markup=field('Temperature','temperature',200,{type:'number',step:'1',extra:`data-temperature-unit="${unit}"`});
  assert.match(markup,new RegExp('data-temperature-unit="'+unit+'"'));
 }
});
