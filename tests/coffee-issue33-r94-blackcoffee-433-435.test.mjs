import test from 'node:test';
import assert from 'node:assert/strict';
import {cases,directCurrent} from '../scripts/audit/issue33-r94-blackcoffee-433-435-check.mjs';
import {normalizeRoastLabel,roastLabelHint} from '../src/server/roast-level-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const entry=n=>cases.find(x=>x.number===n);
const page=(n,story,other='')=>'<main><article class="product"><h1>'+entry(n).name+'</h1>'+
 '<div class="woocommerce-product-details__short-description"><p>'+story+'</p></div></article></main>'+other;
test('AM own direct current description and unsupported comparative roast are witnessed',()=>{
 const e=entry(433),p=page(433,'Graham cracker, cashew, hibiscus, with a hint of lemon and sunrise. Roast Level: Lighter');
 const r=directCurrent(p,[e.name],e);
 assert.equal(r.exactUniqueSelected,true);assert.deepEqual(r.directWitnesses,[true,true]);
 assert.equal(normalizeRoastLabel('Lighter'),null);
 assert.match(roastLabelHint('Lighter'),/manual/i);
});
test('AM cannot steal missing tasting or roast words from related/nav/reviews',()=>{
 const e=entry(433),other='<aside>'+e.witnesses.join(' ')+'</aside><nav>'+e.witnesses.join(' ')+'</nav>';
 const r=directCurrent(page(433,'Fresh crop; see product description.',other),[e.name],e);
 assert.deepEqual(r.directWitnesses,[false,false]);
});
test('AM current selected phrase changed must fail rather than use stale source receipt',()=>{
 const e=entry(433);
 const p=page(433,'Graham cracker, cashew and hibiscus with lemon. Roast Level: Medium');
 assert.deepEqual(directCurrent(p,[e.name],e).directWitnesses,[false,false]);
});
test('Red Room selected directly states literal Dark and clove/tamarind/starfruit',()=>{
 const e=entry(434),r=directCurrent(page(434,e.witnesses.join(' ')),[e.name],e);
 assert.deepEqual(r.directWitnesses,[true,true]);
 assert.equal(normalizeRoastLabel('Dark'),'Dark');
});
test('The Dark can be described as darkest without treating review flavor as own',()=>{
 const e=entry(435),r=directCurrent(page(435,e.witnesses.join(' '),'<aside>Review: rich chocolate</aside>'),[e.name],e);
 assert.deepEqual(r.directWitnesses,[true,true]);
 assert.equal(normalizeRoastLabel('Our Darkest'),null);
});
test('wrong, missing and duplicate selected headings never certify original identity',()=>{
 for(const e of cases)for(const headings of [[],['Other Coffee'],[e.name,e.name]])
  assert.equal(directCurrent(page(e.number,e.witnesses.join(' ')),headings,e).exactUniqueSelected,false);
});
test('actual public parser accepts chosen selected H1, never fabricates another coffee name',()=>{
 const p=extractPublicCoffeeFacts(page(434,'Clove, tamarind, starfruit. Roast Level: Dark',
   '<aside><h2>AM</h2>Graham cracker; cashew; hibiscus</aside>'),{source_url:'https://www.blackcoffeeroastingco.com/product/red-room-blend'});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.ok(!/am blend/i.test(JSON.stringify(p.fields)),JSON.stringify(p.fields));
});
