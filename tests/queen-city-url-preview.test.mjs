// Small representative fixture derived from the exact public Queen City
// product structure; not a saved original page or a global coffee mutation.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {safeCoffeeUrl} from '../src/server/coffee-url-guard.mjs';
import {coffeeUrlPreviewMarkup,applyCoffeeUrlFields} from '../site/cloud/coffee-url-autofill.js';
const base='https://queencitycollectivecoffee.com/products/banko-gotiti-washed-ethiopia';
const variant=base+'?variant=52819513737447';
const title='Banko Gotiti ~ Washed // Ethiopia';
const spec='<p><strong>Banko Gotiti CWS // Gedeb, Yirgacheffe, Gedeo Zone, Ethiopia</strong><br>'+
 '<strong><span style="color:#000">Washed-processed heirloom varietals // 2170 masl</span></strong></p>';
const narrative='<p>For this washed-process lot, beans are submerged in water tanks for a 24- to 48-hour fermentation period. '+
 'They are dried on raised African drying beds for roughly 10 to 15 days.</p>';
function page(body=spec+narrative){
 const product={'@type':'Product',name:title,url:base,brand:{name:'Queen City Collective Coffee'},
  offers:[{'@type':'Offer',url:variant,sku:'250g',price:'22'}]};
 return '<html><head><meta property="og:type" content="product"><meta property="og:site_name" content="Queen City Collective Coffee">'+
 '<link rel="canonical" href="'+base+'"><script type="application/ld+json">'+JSON.stringify(product)+'</script></head>'+
 '<body><main><h1>'+title+'</h1><p><strong><em>Reminds us of - Peach Brulee &amp; Cantaloupe</em></strong><br></p>'+body+
 '<p>Imported through Kidane Teklu at Leafy Coffee. This is our second year working together.</p>'+
 '<h2>Customer Reviews</h2></main><footer><p>Copyright 2026 Queen City</p></footer></body></html>';
}
const preview=(html=page(),url=variant)=>extractPublicCoffeeFacts(html,{source_url:url});
test('exact owner Queen City URL extracts all eight explicit canonical fields',()=>{
 const r=preview();
 assert.equal(r.ok,true);
 assert.equal(r.source,'unverified_public_page');
 assert.deepEqual(r.fields,{name:title,roaster:'Queen City Collective Coffee',
  tasting_notes:'Peach Brulee & Cantaloupe',producer:'Banko Gotiti CWS',
  origin:'Gedeb, Yirgacheffe, Gedeo Zone, Ethiopia',process:'Washed',
  variety:'heirloom',elevation_m:'2170 masl'});
});
test('variant, bare canonical and tracking links agree without using SKU or bag size as harvest',()=>{
 const expected=preview(page(),base).fields;
 for(const url of [variant,variant+'&utm_source=test',base+'?variant=other-size']){
  assert.ok(safeCoffeeUrl(url));
  assert.deepEqual(preview(page(),url).fields,expected);
  assert.equal(preview(page(),url).fields.release_label,undefined);
 }
});
test('fermentation and drying are escaped source-only supplemental details, not espresso recipes',()=>{
 const r=preview();
 assert.equal(r.roaster_details.processing_detail,'submerged in water tanks for a 24- to 48-hour fermentation period');
 assert.equal(r.roaster_details.drying_method,'raised African drying beds for roughly 10 to 15 days');
 assert.equal(r.roaster_recipe,undefined);
 assert.equal(r.roaster_details.recommended_rest,undefined);
 const markup=coffeeUrlPreviewMarkup(r,{applied:true});
 assert.match(markup,/Other published details/);
 assert.match(markup,/Processing Detail/);assert.match(markup,/Drying Method/);
 assert.doesNotMatch(markup,/24 g in|48 s|undefined/);
});
test('missing roast, harvest and espresso data stay absent despite brand, importer and copyright text',()=>{
 const r=preview();
 assert.equal(r.fields.roast_level,undefined);
 assert.equal(r.fields.release_label,undefined);
 assert.equal(r.roaster_recipe,undefined);
 assert.notEqual(r.fields.producer,'Kidane Teklu');
});
test('the same station Natural lot keeps its own processing and never inherits Washed',()=>{
 const url=base.replace('-washed-','-natural-');
 const html=page(spec).replaceAll(base,url).replaceAll('Washed','Natural');
 const r=preview(html,url+'?variant=52819513737447');
 assert.equal(r.fields.process,'Natural');
 assert.equal(r.fields.name,'Banko Gotiti ~ Natural // Ethiopia');
 assert.equal(r.fields.producer,'Banko Gotiti CWS');
});
test('autofill preserves typed names and sends only supported fields to the form',()=>{
 const fields={producer:{value:'My Confirmed Producer',tagName:'INPUT',dispatchEvent(){}},
  origin:{value:'',tagName:'INPUT',dispatchEvent(){}}};
 const result=preview();
 const changed=applyCoffeeUrlFields({elements:{namedItem:k=>fields[k]||null}},result);
 assert.equal(fields.producer.value,'My Confirmed Producer');
 assert.equal(fields.origin.value,'Gedeb, Yirgacheffe, Gedeo Zone, Ethiopia');
 assert.equal(changed.filled,1);
});
test('a homepage or collection never becomes the product from a nonmatching linked JSON-LD node',()=>{
 const html=page().replace('<meta property="og:type" content="product">','<meta property="og:type" content="website">');
 assert.equal(preview(html,'https://queencitycollectivecoffee.com/').ok,false);
 assert.equal(preview(html,'https://queencitycollectivecoffee.com/collections/coffee').ok,false);
});
