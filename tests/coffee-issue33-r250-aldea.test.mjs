import test from 'node:test';
import assert from 'node:assert/strict';
import {cases,direct,fieldChecks} from '../scripts/audit/issue33-r250-aldea-check.mjs';
import {inferDecaffeinationMethod} from '../src/server/coffee-decaffeination-method.mjs';
const prose={
424:'Flow State Decaf E.A. Process decaffeinated from Huila Colombia with RED BERRY and Caturra Castillo.',
425:'Gracias A Dios is Medium-Dark with DARK CHOCOLATE, STONEFRUIT, Honduras. How to brew says medium roast.',
426:'Ruth Reyes - Naturally Processed from Finca El Joconal Honduras. Lempira MILK CHOCOLATE; husband Ramon is also a farmer.'
};
const html=(n,p=prose[n],adjacent='')=>'<article class="product"><h1>'+cases[n].name+
 '</h1><div class="product__description">'+p+'</div></article>'+adjacent;
for(const n of [424,425,426]){
 test('#'+n+' owns selected direct product evidence',()=>assert.deepEqual(
  {identity:direct(n,html(n),[cases[n].name]).identity,own_facts:direct(n,html(n),[cases[n].name]).own_facts},
  {identity:true,own_facts:true}));
 test('#'+n+' fail closed for wrong, missing or doubled identity',()=>{
  for(const names of [[],['Another Coffee'],[cases[n].name,cases[n].name]])assert.equal(direct(n,html(n),names).identity,false);
 });
 test('#'+n+' related/sidebar/footer cannot repair missing direct selected fact',()=>{
  const removed=prose[n].replace(n===424?'E.A. Process':n===425?'Medium-Dark':'Finca El Joconal','RETRACTED');
  assert.equal(direct(n,html(n,removed,'<aside>'+prose[n]+'</aside><footer>'+prose[n]+'</footer>'),[cases[n].name]).own_facts,false);
 });
}
test('EA sugarcane decaf cannot be inferred as washed green processing',()=>{
 assert.equal(inferDecaffeinationMethod({name:'Flow State Decaf',selectedMethod:'Ethyl Acetate sugarcane'}),'Sugar Process');
 const c=fieldChecks(424,{decaffeination_method:'Sugar Process',origin:'Huila, Colombia'});
 assert.ok(Object.values(c).every(Boolean));
 assert.equal(fieldChecks(424,{decaffeination_method:'Water Process',origin:'Huila, Colombia',process:'Washed'}).sugar_method,false);
});
test('secondary brewing medium must not silently supersede direct Medium-Dark',()=>{
 assert.equal(fieldChecks(425,{roast_level:'Medium',origin:'Honduras',tasting_notes:'Dark Chocolate Stonefruit'}).not_secondary_medium,false);
 assert.equal(fieldChecks(425,{roast_level:'Medium-Dark',origin:'Honduras',tasting_notes:'Dark Chocolate Stonefruit'}).not_secondary_medium,true);
 assert.equal(fieldChecks(425,{origin:'Honduras',tasting_notes:'Dark Chocolate Stonefruit'},['roast_level']).not_secondary_medium,true);
});
test('named producer Ruth Reyes must not be replaced with spouse Ramon',()=>{
 assert.equal(fieldChecks(426,{process:'Natural',roast_level:'Light',producer:'Ruth Reyes',origin:'Honduras'}).named_producer,true);
 assert.equal(fieldChecks(426,{process:'Natural',roast_level:'Light',producer:'Ruth Reyes and Ramon',origin:'Honduras'}).named_producer,false);
});