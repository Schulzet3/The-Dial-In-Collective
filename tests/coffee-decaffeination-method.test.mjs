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
