// Issue33 original603 #319: only a current exact named coffee's own growing region.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

const url='https://shop.ohenryscoffee.com/products/brazil-oberon';
const name='Brazil Oberon';
const original='Grown in the famed Cerrado region, Brazil Oberon is a classic, dependable cup of coffee. With a creamy body, sweet chocolate and citrus notes, and mild acidity, it is a crowd-pleasing cup.';
const page=(n,body)=>'<html><body><main><article class="product"><h1>'+n+'</h1><div itemprop="description"><p>'+body+'</p></div></article></main></body></html>';
const parse=(n,body)=>extractPublicCoffeeFacts(page(n,body),{source_url:url});

test('direct selected Brazil Oberon published Cerrado region refines country, with Add Coffee preview',()=>{
 const p=parse(name,original);
 assert.equal(p.ok,true);
 assert.equal(p.fields.origin,'Cerrado, Brazil');
 assert.match(coffeeUrlPreviewMarkup(p),/Cerrado/);
});
test('selected country is not a guessed region when only a generic sentence is given',()=>{
 const p=parse(name,'This coffee is smooth with sweet chocolate and citrus.');
 assert.equal(p.ok,true);
 assert.equal(p.fields.origin,'Brazil');
});
test('a differently named coffee cannot donate its current grown region to Brazil Oberon',()=>{
 const p=parse(name,'Grown in the famed Cerrado region, Brazil Other Coffee is a classic and dependable cup.');
 assert.notEqual(p.fields.origin,'Cerrado, Brazil');
});
test('a different selected national coffee cannot borrow the Brazilian region',()=>{
 const p=parse('Colombia Oberon',original);
 assert.notEqual(p.fields.origin,'Cerrado, Colombia');
});
test('country name absent from selected title must not be inferred from a loose region name',()=>{
 const p=parse('Oberon','Grown in the famed Cerrado region, Oberon is a classic cup.');
 assert.notEqual(p.fields.origin,'Cerrado, Brazil');
});
test('historical, hypothetical and noncurrent growing assertions do not refine region',()=>{
 for(const line of [
  'Previously grown in the famed Cerrado region, Brazil Oberon is now sourced elsewhere.',
  'Grown in the famed Cerrado region, Brazil Oberon was formerly a seasonal offering.',
  'Other coffees are grown in the famed Cerrado region, Brazil Oberon is a classic cup.',
  'This roaster is based in the famed Cerrado region, Brazil Oberon is a classic cup.'
 ])assert.notEqual(parse(name,line).fields.origin,'Cerrado, Brazil',line);
});
test('a named marketing product or roast cannot be a geographic region',()=>{
 for(const label of ['Coffee','Blend','Roast','Product']){
  const p=parse(name,'Grown in the famed '+label+' region, Brazil Oberon is a classic cup.');
  assert.notEqual(p.fields.origin,label+', Brazil',label);
 }
});
