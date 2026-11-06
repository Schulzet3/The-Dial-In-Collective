import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://blackdogcoffee.net/product/ethiopian-harrar';
const roles='Light Roast<br />Low Acidity<br />Above Average Body<br />Above Average Sweetness<br />';
const notes='Dark Chocolate,Dried Fruit,Strawberry';
const html=(short=roles+notes,other='',leading='')=>'<html><head><link rel="canonical" href="'+url+'"/></head><body><main><article class="product"><h1>Ethiopian Harrar</h1>'+leading+
 '<div class="woocommerce-product-details__short-description"><p>'+short+'</p></div>'+
 '<section><h2>Description</h2><p>Harrar is unwashed, dry processed with wild fruit, blueberry and chocolate.</p></section></article></main>'+other+'</body></html>';
const parse=s=>extractPublicCoffeeFacts(s,{source_url:url});
const list=s=>(parse(s).fields.tasting_notes||'').split(/\s*,\s*/).filter(Boolean);
test('original603 #21 direct current selected BR compact five-line profile is no longer missing',()=>{
 const r=parse(html());
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,'Ethiopian Harrar');
 assert.deepEqual(list(html()),['Dark Chocolate','Dried Fruit','Strawberry']);
 assert.doesNotMatch(r.fields.tasting_notes,/wild fruit|blueberry/i);
});
test('no unlabeled notes without typed roast/acidity/body/sweetness current-product panel',()=>{
 for(const bad of [
  notes,'Dark Roast<br />'+notes,
  'Light Roast<br />Low Acidity<br />Above Average Body<br />'+notes,
  'Light Roast<br />Low Acidity<br />Above Average Body<br />High Acidity<br />'+notes,
  roles+'Optional Flavor Vanilla, Chocolate',
  roles+'Pear',
  roles+'Pear, Honey<br />Extra',
  roles+'Pear and Honey from previous harvest'
 ])assert.notDeepEqual(list(html(bad)),['Dark Chocolate','Dried Fruit','Strawberry'],bad);
 assert.deepEqual(list('<main><h1>Ethiopian Harrar</h1><p>'+roles+notes+'</p></main>'),[]);
});
test('no related coffee or duplicate short description may donate a single flavor',()=>{
 const related='<aside class="related-products"><div class="woocommerce-product-details__short-description"><p>'+roles+'Pear, Honey</p></div></aside>';
 assert.deepEqual(list(html(roles+notes,related)),['Dark Chocolate','Dried Fruit','Strawberry']);
 assert.deepEqual(list(html('Light Roast',related)),[]);
 assert.deepEqual(list(html(roles+notes,'','<div class="woocommerce-product-details__short-description"><p>'+roles+'Pear, Honey</p></div>')),[]);
});
test('a separately explicit direct label is preserved rather than replaced by an incomplete short description',()=>{
 assert.deepEqual(list(html('Light Roast','','<p>Tasting Notes: Pear, Jasmine</p>')),['Pear','Jasmine']);
});
