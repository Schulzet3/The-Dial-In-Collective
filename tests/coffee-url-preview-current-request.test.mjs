import test from 'node:test';
import assert from 'node:assert/strict';
import {coffeeUrlRequestIsCurrent} from '../site/cloud/coffee-url-autofill.js';

test('late URL preview success or failure cannot claim a changed, closed, or replaced form',()=>{
 const form={elements:{source_url:{value:'https://roaster.example.org/products/old'}}};
 const sheet={open:true,querySelector:selector=>selector==='#new-coffee'?form:null};
 const captured='https://roaster.example.org/products/old';
 assert.equal(coffeeUrlRequestIsCurrent(sheet,form,captured),true);
 form.elements.source_url.value='https://roaster.example.org/products/new';
 assert.equal(coffeeUrlRequestIsCurrent(sheet,form,captured),false);
 form.elements.source_url.value=captured;
 sheet.open=false;
 assert.equal(coffeeUrlRequestIsCurrent(sheet,form,captured),false);
 sheet.open=true;
 sheet.querySelector=()=>({elements:form.elements});
 assert.equal(coffeeUrlRequestIsCurrent(sheet,form,captured),false);
 assert.equal(coffeeUrlRequestIsCurrent(null,form,captured),false);
 assert.equal(coffeeUrlRequestIsCurrent(sheet,null,captured),false);
});
test('matching URL allows whitespace normalization without accepting a different source',()=>{
 const form={elements:{source_url:{value:' https://roaster.example.org/products/current  '}}};
 const sheet={open:true,querySelector:()=>form};
 assert.equal(coffeeUrlRequestIsCurrent(sheet,form,'https://roaster.example.org/products/current'),true);
 assert.equal(coffeeUrlRequestIsCurrent(sheet,form,'https://roaster.example.org/products/other'),false);
});
