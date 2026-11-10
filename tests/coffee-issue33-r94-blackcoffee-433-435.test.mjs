import test from 'node:test';
import assert from 'node:assert/strict';
import {cases,directCurrent} from '../scripts/audit/issue33-r94-blackcoffee-433-435-check.mjs';
import {normalizeRoastLabel,roastLabelHint} from '../src/server/roast-level-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
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

test('review tab roast and sensory opinions cannot donate to chosen product',()=>{
 const html=page(433,'Current selected coffee only.',
  '<div class="woocommerce-Tabs-panel--reviews"><div class="woocommerce-Reviews" id="reviews">'+
  '<p>Feels like a medium roast, and tastes of chocolate and banana.</p></div></div>');
 const scope=productMarkup(html);
 assert.ok(scope.includes('Current selected coffee only.'));
 assert.ok(!scope.includes('Feels like a medium roast'));
});
test('current WooCommerce selected list outranks truncated narrative tail',()=>{
 const html='<main><article class="product"><h1>AM</h1><div class="woocommerce-product-details__short-description">'+
  '<p>Graham cracker, cashew, hibiscus, with a hint of lemon and sunrise. Perfect everyday coffee.</p>'+
  '<p><strong>Roast Level: Lighter</strong></p></div>'+
  '<div class="woocommerce-Reviews"><p>Feels like a medium roast, chocolate and banana.</p></div></article></main>';
 const p=extractPublicCoffeeFacts(html,{source_url:'https://www.blackcoffeeroastingco.com/product/am-blend/'});
 assert.equal(p.ok,true,JSON.stringify(p));
 for(const x of ['graham cracker','cashew','hibiscus','lemon'])
  assert.ok(p.fields.tasting_notes?.toLowerCase().includes(x),JSON.stringify(p.fields));
 assert.ok(!p.fields.roast_level,JSON.stringify(p.fields));
 assert.ok(!/banana|chocolate/i.test(p.fields.tasting_notes||''));
});
test('incomplete or altered selected sensory assertion cannot inherit neighbor review',()=>{
 for(const s of ['Graham cracker, cashew, with a hint of lemon and sunrise.',
  'Graham cracker, cashew, hibiscus, made with lemon and sunrise.']){
  const html='<main><h1>AM</h1><div class="woocommerce-product-details__short-description"><p>'+s+'</p></div>'+
   '<div class="woocommerce-Reviews"><p>Graham cracker, cashew, hibiscus, with a hint of lemon and sunrise.</p></div></main>';
  const p=extractPublicCoffeeFacts(html,{source_url:'https://www.blackcoffeeroastingco.com/product/am-blend/'});
  assert.equal(p.ok,true,JSON.stringify(p));
  assert.ok(!/graham cracker.*cashew.*hibiscus/i.test(p.fields.tasting_notes||''),JSON.stringify(p.fields));
 }
});
