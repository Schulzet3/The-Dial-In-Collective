import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

// Structural excerpt of the exact selected Lowcountry #205 H1 and own
// product-details section, independently confirmed on live 2026-11-06 HTML.
// No original frozen603 CSV/oracle or captured HTML becomes a fixture.
const url='https://lowcountrycoffeeroasters.com/products/breakfast-blend';
const description='Breakfast Blend showcases Colombia, Costa La Amistad &amp; Robusta. Smooth bodied with notes of brown sugar, almond, cherry &amp; red apple.';
const otherNotes='Nutmeg, Whole Bean Vanilla, Creamy Butter';
function page({name='Breakfast Blend',flavor=otherNotes,descriptionText=description,extra='',flavorSection=true}={}){
 return '<html><head><link rel="canonical" href="'+url+'"><meta property="og:site_name" content="Lowcountry Coffee Roasters"></head>'+
  '<body><main><section class="shopify-section"><article class="product"><h1>'+name+'</h1></article></section>'+
  '<section class="section__product-details product-bottom" data-product-details>'+
  '<article class="span-8"><ul class="product-template__details-table">'+
  '<li class="description rte"><p class="label mb3 h4">Product Info</p><p><span>'+descriptionText+'</span></p></li>'+
  '<li class="detail"><p class="label">Roast:</p><p class="item custom_metafield">Medium</p></li>'+
  (flavorSection?'<li class="detail"><p class="label">Flavor:</p><p class="item custom_metafield">'+flavor+'</p></li>':'')+
  '</ul></article></section></main>'+extra+'</body></html>';
}
const parse=html=>extractPublicCoffeeFacts(html,{source_url:url});

test('selected #205 contradictory literal Flavor label and description stay blank but reviewable',()=>{
 const r=parse(page());
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,'Breakfast Blend');
 assert.equal(r.fields.roast_level,'Medium');
 assert.equal(r.fields.tasting_notes,undefined,JSON.stringify(r));
 assert.ok(r.conflicts?.includes('tasting_notes'),JSON.stringify(r));
 const options=r.conflict_options?.tasting_notes||[];
 assert.ok(options.some(x=>/brown sugar/i.test(x.value)),JSON.stringify(options));
 assert.ok(options.some(x=>/Nutmeg, Whole Bean Vanilla, Creamy Butter/i.test(x.value)),JSON.stringify(options));
 assert.ok(r.source_facts?.some(f=>f.field==='tasting_notes'&&f.conflicting&&/^Flavor:/i.test(f.label)));
 assert.match(coffeeUrlPreviewMarkup(r),/coffee-url-preview/);
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:url}));
});
test('no contradictory Flavor caption leaves honest current prose field intact',()=>{
 const r=parse(page({flavorSection:false}));
 assert.equal(r.ok,true);
 assert.match(r.fields.tasting_notes||'',/brown sugar/i);
 assert.ok(!r.conflicts?.includes('tasting_notes'));
});
test('equivalent literal Flavor label is not a contradiction',()=>{
 const r=parse(page({flavor:'Brown Sugar, Almond, Cherry, Red Apple'}));
 assert.equal(r.ok,true);
 assert.ok(!r.conflicts?.includes('tasting_notes'),JSON.stringify(r));
 assert.match(r.fields.tasting_notes||'',/brown sugar/i);
});
test('unselected related coffee Flavor text does not blank current product',()=>{
 const extra='<aside class="related-products"><h2>Other Coffee</h2><p>Flavor: '+otherNotes+'</p></aside>';
 const r=parse(page({flavorSection:false,extra}));
 assert.equal(r.ok,true);
 assert.match(r.fields.tasting_notes||'',/brown sugar/i);
 assert.ok(!r.conflicts?.includes('tasting_notes'),JSON.stringify(r));
});
test('a different selected identity cannot be retroactively assigned Breakfast Blend',()=>{
 const r=parse(page({name:'Other Selected Coffee',descriptionText:'A different coffee with notes of chocolate.'}));
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,'Other Selected Coffee');
 assert.notEqual(r.fields.name,'Breakfast Blend');
});
