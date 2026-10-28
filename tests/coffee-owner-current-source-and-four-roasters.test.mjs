import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractShopifyAjaxData,shopifyProductRequest,mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';
// New independent source-backed smoke fixtures, not changes to the immutable
// 603 originals. Current official page facts reviewed 2026-10-27.
const urls={
 stumptown:'https://www.stumptowncoffee.com/products/ethiopia-nano-challa?variant=40006909722792',
 blueBottle:'https://bluebottlecoffee.com/us/eng/product/hayes-valley-espresso?a_oID=hayes-valley-espresso',
 counterCulture:'https://counterculturecoffee.com/collections/coffee/products/sipacapa-1',
 peets:'https://www.peets.com/products/guatemala-linda-vista'
};
const shopifyUrl='https://roaster.example.org/products/selected-lot';
const request=shopifyProductRequest(shopifyUrl);
const selected=(name,description,tags=[])=>extractShopifyAjaxData({
 title:name,handle:'selected-lot',description,tags
},request);
const page=(name,body,url)=>extractPublicCoffeeFacts(
 '<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name,url})+'</script>'+
 '<main><h1>'+name+'</h1>'+body+'</main>',{source_url:url});
test('Brewpoint: current selected direct specifications override demonstrably stale SEO only',()=>{
 const description='<p>Origin: Brazil (Mountain Water Processed)</p>'+
  '<p>Roast: Medium</p><p>Tasting Notes: Chocolate, Graham Cracker</p>'+
  '<p>Historical Mexico Dark SEO is an older lot, not the current description.</p>';
 const current=selected('The Alchemist: Decaf Medium Roast',description);
 assert.equal(current.fields.origin,'Brazil');
 assert.equal(current.fields.roast_level,'Medium');
 assert.equal(current.fields.tasting_notes,'Chocolate, Graham Cracker');
 assert.match(JSON.stringify(current.source_facts),/Mountain Water Processed/);
 const archived={ok:true,source_url:shopifyUrl,fields:{
  name:current.fields.name,origin:'Mexico',roast_level:'Dark'},
  source_facts:[{field:'origin',label:'Archived SEO description',value:'Mexico',source_type:'page_meta'},
   {field:'roast_level',label:'Archived SEO description',value:'Dark',source_type:'page_meta'}]};
 const merged=mergePublicProductPreview(archived,current);
 assert.equal(merged.fields.origin,'Brazil');
 assert.equal(merged.fields.roast_level,'Medium');
 assert.ok(!merged.conflicts?.includes('origin'));
});
test('current exact opposing product tags still veto the printed roast rather than bypassing conflicts',()=>{
 const r=selected('Current Coffee','<p>Roast Level: Dark</p>',['Medium']);
 assert.equal(r.fields.roast_level,undefined);
 assert.ok(r.conflicts?.includes('roast_level'));
});
test('Gnosis: named staged inoculated ferment maps to app Anaerobic while stages remain literal',()=>{
 const description='<p>Process: Extended Ferment / Yeast Inoculation / Sugarcane Decaffeination (EA)</p>'+
  '<h3>Processing Method</h3><ol>'+
  '<li>48-hour whole cherry fermentation with Saccharomyces pastorianus yeast</li>'+
  '<li>68-hour secondary fermentation using naturally developed coffee juices</li>'+
  '<li>Pulped and washed, then dried</li></ol>'+
  '<p>Our natural processing description refers to the cherry stage.</p>';
 const r=selected('Red Bourbon DECAF',description);
 assert.equal(r.fields.process,'Anaerobic',JSON.stringify({conflicts:r.conflicts,fields:r.fields}));
 assert.match(JSON.stringify(r.source_facts),/48-hour whole cherry fermentation/);
 assert.match(JSON.stringify(r.source_facts),/68-hour secondary fermentation/);
 assert.match(JSON.stringify(r.source_facts),/Sugarcane Decaffeination/);
 assert.ok(r.current_product_spec_fields?.includes('process'));
});
test('plain timed washed fermentation, aerobic processing and unrelated words never imply Anaerobic',()=>{
 for(const description of [
  '<p>Process: Washed</p><p>The lot undergoes a 48-hour fermentation.</p>',
  '<p>Process: Extended Ferment / Yeast Inoculation</p><p>Open-air aerobic fermentation. No secondary fermentation.</p>',
  '<p>Process: Natural</p><p>Extended sweetness from yeast aromas and longer rest.</p>'
 ]){
  const r=selected('Current Lot',description);
  assert.notEqual(r.fields.process,'Anaerobic',description);
 }
});
test('Black River: simultaneous current Mexico/Peru claims stay withheld with BOTH review options',()=>{
 const description='<h3>Current Decaf Coffee</h3>'+
  '<p>Location: Mexico</p><p>Altitude: 1000-1500 masl</p><p>Process: Washed</p>'+
  '<p>The current offering is from Peru, with a rich, nutty flavor.</p>';
 const r=selected('Organic Specialty Decaf',description);
 assert.equal(r.fields.origin,undefined);
 assert.ok(r.conflicts?.includes('origin'));
 assert.deepEqual(r.conflict_options.origin.map(x=>x.value),['Mexico','Peru']);
 const html={ok:true,fields:{name:r.fields.name,origin:'Mexico'}};
 const merged=mergePublicProductPreview(html,r);
 assert.equal(merged.fields.origin,undefined);
 assert.ok(merged.conflicts?.includes('origin'));
});
test('two incompatible current explicit origins and roasts still require member review',()=>{
 const r=selected('Selected Lot','<p>Origin: Brazil</p><p>Origin: Mexico</p>'+
  '<p>Roast: Medium</p><p>Roast: Dark</p>');
 assert.equal(r.fields.origin,undefined);
 assert.equal(r.fields.roast_level,undefined);
 assert.ok(r.conflicts.includes('origin'));
 assert.ok(r.conflicts.includes('roast_level'));
});
test('current product endpoint does not accept another Shopify handle',()=>{
 assert.equal(extractShopifyAjaxData({title:'Another',handle:'unrelated-lot',
  description:'<p>Origin: Peru</p>'},request),null);
});
test('Stumptown Nano Challa: literal selected notes, no process inferred from a historical washing-station story',()=>{
 const result=page('Ethiopia Nano Challa',
  '<p>Tasting Notes: Peach, Citrus, Orange Blossom</p>'+
  '<p>In 2010 this cooperative built a washing station and transitioned to fully washed coffees.</p>'+
  '<h2>Choose Your Brew</h2><p>Espresso: 19.5g, about 1.5 oz, 23-28 seconds (general brew guide)</p>',urls.stumptown);
 assert.equal(result.ok,true);
 assert.match(result.fields.tasting_notes||'',/Peach.*Citrus.*Orange Blossom/i);
 assert.equal(result.fields.process,undefined);
});
test('Blue Bottle Hayes Valley: current product flavor, dark roast, Washed without origin invented',()=>{
 const result=page('Hayes Valley Espresso','<p>Tasting Notes: Baking Chocolate, Orange Zest, Brown Sugar</p>'+
  '<p>Roast Level: Dark</p><p>Process: Washed</p>'+
  '<p>Our roasters create blends from organic coffees from the Americas.</p>',urls.blueBottle);
 assert.equal(result.fields.roast_level,'Dark');
 assert.equal(result.fields.process,'Washed');
 assert.match(result.fields.tasting_notes||'',/Baking Chocolate.*Orange Zest.*Brown Sugar/i);
 assert.equal(result.fields.origin,undefined);
});
test('Counter Culture Sipacapa: current lot explicit provenance stays field-specific',()=>{
 const result=page('Sipacapa','<p>Origin: San Marcos, Guatemala</p>'+
  '<p>Tasting Notes: Apple, Simple Syrup, Cocoa</p><p>Roast Level: Light</p>'+
  '<p>Process: Washed</p><p>Variety: Caturra and Bourbon</p>'+
  '<p>Elevation: 1,640-2,150 meters</p>',urls.counterCulture);
 assert.equal(result.fields.roast_level,'Light');
 assert.equal(result.fields.process,'Washed');
 assert.match(result.fields.origin||'',/San Marcos.*Guatemala/i);
 assert.match(result.fields.tasting_notes||'',/Apple.*Simple Syrup.*Cocoa/i);
 assert.match(result.fields.elevation_m||'',/1,?640.*2,?150/i);
});
test('Peets Linda Vista: 86 out of 100 is a roast chart, never an Agtron measurement',()=>{
 const result=page('Guatemala Linda Vista','<p>Roast Level: Dark</p>'+
  '<p>Flavor Profile: Dark Chocolate, Caramel, Cardamom</p>'+
  '<h3>Roast Details</h3><p>Roast level: 86 out of 100</p>',urls.peets);
 assert.equal(result.fields.roast_level,'Dark');
 assert.equal(result.roaster_details?.agtron,undefined);
 assert.ok(!String(result.fields.elevation_m||'').includes('86'));
});

test('origin rotation is mandatory only for an explicitly labeled selected-coffee rotating origin',()=>{
 const explicit=selected('Rotating Decaf','<p>Origin: Rotating</p><p>Current Coffee Origin: Mexico</p>');
 assert.equal(explicit.origin_confirmation_required,true);
 const ordinary=selected('Stable Coffee','<p>Origin: Mexico</p><p>Roaster sells seasonal releases</p>');
 assert.equal(ordinary.origin_confirmation_required,undefined);
 const current=selected('Current Coffee','<p>This coffee has a rotating origin.</p>');
 assert.equal(current.origin_confirmation_required,true);
 const merged=mergePublicProductPreview({ok:true,fields:{name:'Current Coffee'}},current);
 assert.equal(merged.origin_confirmation_required,true);
});
