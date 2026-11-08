import test from 'node:test';
import assert from 'node:assert/strict';
import {inferDecaffeinationMethod,DECAFFEINATION_METHODS,decafOnlyCoffee} from '../src/server/coffee-decaffeination-method.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const sample=(name,markup)=>extractPublicCoffeeFacts('<main><h1>'+name+'</h1>'+markup+'</main>',{source_url:'https://coffee-example.com/products/decaf'});
test('three standardized decaf methods have stable vocabulary',()=>assert.deepEqual(DECAFFEINATION_METHODS,['Water Process','Sugar Process','Carbon Dioxide (CO2)']));
for(const [name,detail,expected] of [
 ['Decaf Brazil','Swiss Water Process','Water Process'],
 ['Decaf Brazil','Mountain Water Decaf','Water Process'],
 ['Decaf Colombia','Water Process Decaf','Water Process'],
 ['Decaf Colombia','Sugar Cane Decaffeination','Sugar Process'],
 ['Decaf Colombia','Natural EA decaffeination','Sugar Process'],
 ['Decaf Colombia','Ethyl Acetate','Sugar Process'],
 ['Decaf Colombia','CO₂ decaffeination','Carbon Dioxide (CO2)'],
 ['Decaf Colombia','Supercritical Carbon Dioxide process','Carbon Dioxide (CO2)'],
 ['Regular Colombia','Swiss Water Process',''],
 ['Regular Colombia','Our decaf coffee is decaffeinated using Swiss Water.',''],
 ['Decaf Colombia','Our decaf coffee is decaffeinated using Swiss Water.','Water Process'],
 ['Half-Caf Colombia','Swiss Water Process',''],
 ['Decaf Colombia','Methylene chloride decaffeination',''],
 ['Decaf Colombia','Chemical free decaf',''],
 ['Decaf Colombia','Natural process',''],
 ['Decaf Colombia','Not Swiss Water Process',''],
 ['Decaf Colombia','Swiss Water / Sugarcane decaf','']
])test(name+': '+detail,()=>assert.equal(inferDecaffeinationMethod({name,processingDetail:detail}),expected));
test('ordinary coffee and half caf are not fully decaffeinated',()=>{
 assert.equal(decafOnlyCoffee('Half-Caf Blend'),false);
 assert.equal(decafOnlyCoffee('Colombia Washed'),false);
 assert.equal(decafOnlyCoffee('Colombia Decaf'),true);
});
for(const [name,desc,expected] of [
 ['Colombia Decaf','Process: Swiss Water Process','Water Process'],
 ['Colombia Decaf','Decaffeination method: Sugarcane EA','Sugar Process'],
 ['Colombia Decaf','Process: Mountain Water Process','Water Process'],
 ['Colombia Decaf','Process: CO2 decaffeination','Carbon Dioxide (CO2)'],
 ['Colombia Decaf','Process: Washed',''],
 ['Colombia Medium','Process: Swiss Water Process',''],
 ['Half-Caf Colombia','Process: Swiss Water Process','']
])test('selected-page '+name+': '+desc,()=>{
 const result=sample(name,'<p>'+desc+'</p>');
 assert.equal(result.fields.decaffeination_method,expected||undefined);
 assert.equal(result.fields.process,desc==='Process: Washed'?'Washed':undefined);
});

// Issue #33 R35: real selected official #462 H1 explicitly names a half-decaf
// blend, while its own Process line mentions Swiss Water on one component.
// Prior exact public parser incorrectly assigned Water Process to the WHOLE blend.
for(const name of [
 'Even Steven -1/2 Decaf & 1/2 Colombia',
 'Even Steven - 1 / 2 Decaf + 1 / 2 Colombia',
 'Even Steven - ½ Decaf & ½ Colombia',
 'Even Steven - 50% Decaf and 50% Colombia',
 'Half Decaf Blend',
 'Half-Decaf Blend'
])test('fractional caffeine is not full decaf: '+name,()=>{
 assert.equal(inferDecaffeinationMethod({name,processingDetail:'Washed / Swiss Water Process',
  selectedMethod:'Swiss Water Process',selectedCurrentDecafIdentity:true}), '');
 assert.equal(decafOnlyCoffee(name,true),false);
});

test('original603 #462 exact selected source fraction keeps named coffee, green Washed and no whole-blend method',()=>{
 const selectedName='Even Steven -1/2 Decaf & 1/2 Colombia';
 const parsed=sample(selectedName,
  '<section><h2>The Nitty-gritty:</h2><p>Country: Colombia</p>'+ 
  '<p>Region: Mantiqueira de Minas</p><p>Altitude: 1300 masl</p>'+ 
  '<p>Variety: Catuai</p><p>Process: Washed/ Swiss Water Process</p>'+ 
  '<p>Roast Level: Medium/ Dark</p>'+ 
  '<p>What you\\'ll taste in your cup: Chocolate, Toffee, and Apricot.</p></section>');
 assert.equal(parsed.fields.name,selectedName);
 assert.equal(parsed.fields.decaffeination_method,undefined);
 // Preserve selected-scope facts for source review; the competing published
 // geography cannot be "fixed" by guessing which component/country is right.
 assert.ok(!parsed.fields.decaffeination_method);
});

test('fractions refer to caffeine content, not unrelated bag weights or recipes',()=>{
 assert.equal(inferDecaffeinationMethod({name:'Decaf Colombia 1/2 lb',
  processingDetail:'Swiss Water Process'}),'Water Process');
 assert.equal(inferDecaffeinationMethod({name:'Decaf Colombia',
  processingDetail:'Swiss Water Process',selectedMethod:'50% discount'}),'Water Process');
 assert.equal(decafOnlyCoffee('Decaf Colombia ½ lb bag'),true);
});
