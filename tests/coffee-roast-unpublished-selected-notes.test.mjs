import test from 'node:test';
import assert from 'node:assert/strict';
import {extractSelectedCoffeeRoastVariants,extractSelectedCoffeeRoastVariantsFromHtml}
 from '../src/server/coffee-roast-variants.mjs';
import {coffeeRoastVariantPreview} from '../site/cloud/coffee-url-autofill.js';
const chosen='100% Kona Peaberry Coffee, The Champagne of Kona';
const origin='https://konaearth.com/products/100-kona-peaberry-coffee-1-lb';
const first='Bittersweet chocolate, cream, prune, caramel';
const second='Caramel, butter, cocoa, toffee, creamy body, sweet spice';
const options=[{name:'Roast Profile',values:['Medium','Medium Dark']}];
const desc=(note=second)=>'<p>Our selected roast profiles</p><h3>Details</h3>'+
 '<p>Origin: 100% Kona, Big Island<br>Tasting Notes by Roast:<br>'+
 'Medium: '+first+'<br>Medium Dark: '+note+'</p><h3>Ingredients</h3><p>100% Kona coffee.</p>';
const page=(notes=desc())=>'<html><body><main><h1>'+chosen+'</h1>'+
 '<fieldset><legend>Roast Profile</legend><input type="radio" value="Medium">'+
 '<input type="radio" value="Medium Dark"></fieldset><section class="product__description">'+notes+
 '</section></main></body></html>';
test('explicit selected-roast no-data markers never become tasting notes',()=>{
 for(const x of ['not published','flavor profile not published','notes not yet available',
  'unknown','N/A','TBD','coming soon','not specified','to be determined']){
  assert.deepEqual(extractSelectedCoffeeRoastVariants({description:desc(x),options}),[],
   'no false flavor from '+x);
  assert.deepEqual(extractSelectedCoffeeRoastVariantsFromHtml(page(desc(x))),[],
   'no marketed unpurchasable second flavor from '+x);
 }
});
test('two complete directly labeled selected profiles retain independent exact published notes',()=>{
 const found=extractSelectedCoffeeRoastVariants({description:desc(),options});
 assert.deepEqual(found.map(x=>[x.id,x.fields.tasting_notes]),[
  ['medium',first],['medium-dark',second]]);
 const fromHtml=extractSelectedCoffeeRoastVariantsFromHtml(page());
 assert.deepEqual(fromHtml.map(x=>x.fields.tasting_notes),[first,second]);
});
test('selected purchased roast is explicit and only contributes own notes',()=>{
 const variants=extractSelectedCoffeeRoastVariantsFromHtml(page());
 const base={ok:true,source_url:origin,fields:{name:chosen,roaster:'Kona Earth Coffee'},roast_variants:variants};
 assert.equal(base.fields.tasting_notes,undefined);
 assert.equal(base.fields.roast_level,undefined);
 assert.equal(coffeeRoastVariantPreview(base,'medium').fields.tasting_notes,first);
 assert.equal(coffeeRoastVariantPreview(base,'medium-dark').fields.tasting_notes,second);
});
test('unrelated guide or hidden/unoffered option cannot donate no-data sensory values',()=>{
 const guide='<html><head><meta name="description" content="'+second+'"></head><body><nav>'+
 desc()+'</nav><main><h1>'+chosen+'</h1><p>Roast profiles not published</p></main></body></html>';
 assert.deepEqual(extractSelectedCoffeeRoastVariantsFromHtml(guide),[]);
 assert.deepEqual(extractSelectedCoffeeRoastVariants({description:desc(),options:[]}),[]);
});
