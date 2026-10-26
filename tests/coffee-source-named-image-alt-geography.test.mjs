import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://example.test/products/red-bourbon-decaf';
const parse=(image,name='Red Bourbon DECAF',body='')=>extractPublicCoffeeFacts(
 '<main><h1>'+name+'</h1>'+body+'<div class="product__media">'+image+'</div></main>',{source_url:url});
const image=(alt,attrs='')=>'<img '+attrs+' alt="'+alt+'">';
const named='Red Bourbon Decaf coffee bag from Piendamó, Cauca, Colombia - light roast by producer Wilton Benítez';
test('the current coffee bag has a fully published three-part locality',()=>{
 const result=parse(image(named),undefined,'<p>Producer: Wilton Benítez</p><p>Roast Level: Light</p>');
 assert.equal(result.fields.origin,'Piendamó, Cauca, Colombia');
 assert.ok(!result.conflicts?.includes('origin'));
});
test('unknown, adjacent, or unscoped images never supply a current origin',()=>{
 const negatives=[
  image('Other Coffee coffee bag from Piendamó, Cauca, Colombia - light roast by producer Wilton Benítez'),
  image('Red Bourbon Decaf coffee bag from Piendamó, Cauca - light roast by producer Wilton Benítez'),
  image('Red Bourbon Decaf coffee bag from Piendamó, Cauca, Nicaragua - light roast'),
  image('Red Bourbon Decaf coffee bag from Piendamó, Cauca, Colombia - light roast by producer'),
  image('Red Bourbon Decaf coffee bag from Piendamó, Cauca, Colombia - color profile'),
  '<div class="related-products">'+image(named)+'</div>',
  '<img data-alt="'+named+'" alt="no source evidence">'
 ];
 for(const value of negatives){
  const result=parse(value);
  assert.notEqual(result.fields.origin,'Piendamó, Cauca, Colombia',value);
 }
});
test('genuinely contradictory printed origins stay flagged',()=>{
 const result=parse(image(named),undefined,'<p>Origin: Peru</p>');
 assert.notEqual(result.fields.origin,'Piendamó, Cauca, Colombia');
 assert.ok(result.conflicts?.includes('origin'));
});
