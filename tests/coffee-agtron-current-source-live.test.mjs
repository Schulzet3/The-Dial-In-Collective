import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';
import {extractSelectedNextCoffeeProduct} from '../src/server/coffee-next-selected-product.mjs';
import {selectedCoffeeHeroFacts,hasIncompatibleCurrentTastingList} from '../src/server/coffee-selected-product-hero.mjs';
import {interpretAgtron} from '../src/server/agtron-roast.mjs';

const blue='https://bluebottlecoffee.com/us/eng/product/hayes-valley-espresso?a_oID=hayes-valley-espresso';
const next=(slug='hayes-valley-espresso',override={})=>{
 const conversion={slug:{current:'hayes-valley-espresso'},name:{_type:'localizedString',eng:'Hayes Valley Espresso'},
  flavorProfile:{_type:'localizedString',eng:'Baking Chocolate, Orange Zest, Brown Sugar'},
  roastLevel:[{label:{eng:'Dark Roast'},roastLevel:3}],
  processing:[{label:{eng:'Processing'},description:{eng:'Washed'}}],...override};
 const data={page:'/[region]/[lang]/product/[slug]',
  query:{region:'us',lang:'eng',slug},
  props:{pageProps:{slug,conversion,
   productRecs:[{slug:{current:'hayes-valley-espresso'},name:{eng:'Hayes Valley Espresso'},
    roastLevel:[{label:{eng:'Light Roast'}}],flavorProfile:{eng:'Never apply this recommendation'}}]}}};
 return '<div id="__next"></div><script type="application/json" id="__NEXT_DATA__">'+
  JSON.stringify(data).replace(/</g,'\\u003c')+'</script>';
};
test('Blue Bottle currently selected Next route yields only exact product values',()=>{
 const result=extractPublicCoffeeFacts(next(),{source_url:blue});
 assert.equal(result.ok,true);
 assert.equal(result.fields.name,'Hayes Valley Espresso');
 assert.equal(result.fields.roaster,'Blue Bottle Coffee');
 assert.equal(result.fields.roast_level,'Dark');
 assert.equal(result.fields.process,'Washed');
 assert.equal(result.fields.tasting_notes,'Baking Chocolate, Orange Zest, Brown Sugar');
 assert.equal(result.fields.origin,undefined);
 assert.equal(result.roaster_recipe,undefined);
 assert.ok(result.source_facts.every(f=>f.source_path.startsWith('/props/pageProps/conversion/')));
 assert.doesNotMatch(JSON.stringify(result),/Never apply this recommendation/);
});
test('Blue Bottle route mismatch, changed selected conversion, and unrelated product must fail closed',()=>{
 const wrong='https://bluebottlecoffee.com/us/eng/product/a-different-coffee';
 assert.equal(extractSelectedNextCoffeeProduct(next(),{source_url:wrong}).ok,false);
 assert.equal(extractPublicCoffeeFacts(next('another-coffee'),{source_url:blue}).ok,false);
 assert.equal(extractPublicCoffeeFacts(next('hayes-valley-espresso',{slug:{current:'other-coffee'}}),{source_url:blue}).ok,false);
});
test('Blue Bottle competing current roast/process options remain member-review conflicts',()=>{
 const html=next('hayes-valley-espresso',{roastLevel:[{label:{eng:'Dark Roast'}},{label:{eng:'Light Roast'}}],
 processing:[{description:{eng:'Washed'}},{description:{eng:'Natural'}}]});
 const r=extractPublicCoffeeFacts(html,{source_url:blue});
 assert.equal(r.fields.roast_level,undefined);assert.equal(r.fields.process,undefined);
 assert.ok(r.conflicts.includes('roast_level'));assert.ok(r.conflicts.includes('process'));
 assert.deepEqual(r.conflict_options.roast_level.map(x=>x.value),['Dark','Light']);
});
const counterUrl='https://counterculturecoffee.com/collections/coffee/products/sipacapa-1';
const counterHero='<p class="uppercase">Single-Origin | San Marcos, Guatemala</p>'+
 '<div><h1 class="product__title">Sipacapa</h1><p>apple | simple syrup | cocoa</p></div>'+
 '<h3>Tasting Notes</h3><p>Tasting notes are descriptors of a coffee sensory profile.</p>';
test('Counter Culture selected banner geography and adjacent flavor list are exact current facts',()=>{
 const hero=selectedCoffeeHeroFacts(counterHero,{name:'Sipacapa'});
 assert.equal(hero.origin,'San Marcos, Guatemala');
 assert.equal(hero.tasting_notes,'apple, simple syrup, cocoa');
 assert.equal(hasIncompatibleCurrentTastingList(counterHero,hero.tasting_notes),false);
 const page='<script type="application/ld+json">'+JSON.stringify({'@type':'Product',
  name:'Sipacapa',url:counterUrl,brand:{name:'Counter Culture Coffee'}})+'</script>'+
  '<main>'+counterHero+'<p>Origin: Sipacapa</p>'+
  '<p>Process: Washed</p><p>Roast Level: Light</p></main>';
 const result=extractPublicCoffeeFacts(page,{source_url:counterUrl});
 assert.equal(result.ok,true);
 assert.equal(result.fields.origin,'San Marcos, Guatemala');
 assert.equal(result.fields.tasting_notes,'apple, simple syrup, cocoa');
 assert.ok(!result.conflicts?.includes('tasting_notes'));
 assert.ok(result.source_facts.some(f=>f.label==='Selected current coffee origin'));
});
test('current independent explicit incompatible tasting notes cannot be overridden by hero',()=>{
 const html=counterHero+'<p>Tasting Notes: Mango, Strawberry, Cocoa</p>';
 assert.equal(hasIncompatibleCurrentTastingList(html,'apple, simple syrup, cocoa'),true);
});
test('unmatched coffee hero or related product does not supply origin or flavor',()=>{
 assert.equal(selectedCoffeeHeroFacts(counterHero,{name:'Another Coffee'}),null);
 assert.equal(selectedCoffeeHeroFacts('<h1>Other</h1><p>Single-Origin | San Marcos, Guatemala</p>',
 {name:'Sipacapa'}),null);
});
const agtronUrl='https://roaster.example.org/products/selected-agtron-coffee';
const agtronPage=(additionalProperty,body='<p>Roast Level: Dark</p>')=>
 '<script type="application/ld+json">'+JSON.stringify({
 '@context':'https://schema.org','@type':'Product',name:'Selected Agtron Coffee',
 url:agtronUrl,brand:{name:'Roaster Coffee'},additionalProperty})+'</script>'+
 '<main><h1>Selected Agtron Coffee</h1>'+body+'</main>';
test('authentic explicitly identified Gourmet ground Agtron measurement outranks descriptive roast wording',()=>{
 const source=agtronPage([{name:'Agtron Gourmet',value:'75 Ground'}]);
 const r=extractPublicCoffeeFacts(source,{source_url:agtronUrl});
 assert.equal(r.roaster_details.agtron,'75');
 assert.equal(r.roaster_details.agtron_scale,'gourmet');
 assert.equal(r.roaster_details.agtron_sample,'ground');
 assert.equal(r.fields.roast_level,'Light');
 assert.equal(r.roast_source,'agtron_ground_measurement');
 assert.match(r.roast_hint,/takes priority/i);
 assert.match(JSON.stringify(r.source_facts),/Roast Level|Dark/i);
});
test('Commercial Agtron ground scale uses its own calibrated anchors',()=>{
 const source=agtronPage([{name:'Agtron Commercial',value:'42 Ground'}]);
 const r=extractPublicCoffeeFacts(source,{source_url:agtronUrl});
 assert.equal(r.fields.roast_level,'Medium');
 assert.equal(r.roast_source,'agtron_ground_measurement');
});
test('unspecified Agtron scale remains provisional and does not override dark roast',()=>{
 const r=extractPublicCoffeeFacts(agtronPage([{name:'Agtron',value:'75'}]),{source_url:agtronUrl});
 assert.equal(r.fields.roast_level,'Dark');
 assert.notEqual(r.roast_source,'agtron_ground_measurement');
 assert.match(r.roast_hint||'',/Provisional|roaster explicitly/i);
});
test('whole-bean measured Agtron cannot be mapped with ground reference',()=>{
 const r=extractPublicCoffeeFacts(agtronPage([{name:'Agtron Gourmet',value:'75 Whole Bean'}]),{source_url:agtronUrl});
 assert.equal(r.fields.roast_level,'Dark');
 assert.notEqual(r.roast_source,'agtron_ground_measurement');
});
test('Peets 86/100 roast slider is not an Agtron measurement or automatic numeric conversion',()=>{
 const peets='https://www.peets.com/products/guatemala-linda-vista';
 const r=extractPublicCoffeeFacts('<main><h1>Guatemala Linda Vista</h1>'+
  '<p>Roast Level: Dark</p><p>86 out of 100 on our roast scale</p></main>',
  {source_url:peets});
 assert.equal(r.roaster_details?.agtron,undefined);
 assert.notEqual(r.roast_source,'agtron_ground_measurement');
});
test('merging same current coffee preserves trusted measured Agtron above subjective endpoint roast',()=>{
 const base=extractPublicCoffeeFacts(agtronPage([{name:'Agtron Gourmet',value:'75 Ground'}]),{source_url:agtronUrl});
 const extra={ok:true,fields:{name:base.fields.name,roast_level:'Dark'},source_url:agtronUrl};
 const r=mergePublicProductPreview(base,extra);
 assert.equal(r.fields.roast_level,'Light');
 assert.equal(r.roast_source,'agtron_ground_measurement');
 assert.ok(!r.conflicts?.includes('roast_level'));
});
test('two incompatible actual measured Agtron sources are not silently reconciled',()=>{
 const base={ok:true,fields:{name:'Same Coffee',roast_level:'Light'},
 roaster_details:{agtron:'75',agtron_scale:'gourmet',agtron_sample:'ground'},
 roast_source:'agtron_ground_measurement'};
 const extra={...base,fields:{name:'Same Coffee',roast_level:'Dark'},
 roaster_details:{agtron:'35',agtron_scale:'gourmet',agtron_sample:'ground'}};
 const r=mergePublicProductPreview(base,extra);
 assert.equal(r.fields.roast_level,undefined);
 assert.ok(r.conflicts?.includes('roast_level'));
});
test('Agtron inverse direction and declared sample/scale are enforced',()=>{
 assert.equal(interpretAgtron('75 Ground',{scale:'Gourmet'}).roast,'Light');
 assert.equal(interpretAgtron('42 Ground',{scale:'Commercial'}).roast,'Medium');
 assert.equal(interpretAgtron('75 Whole Bean',{scale:'Gourmet'}).roast,'');
 assert.equal(interpretAgtron('86 out of 100'),null);
});
