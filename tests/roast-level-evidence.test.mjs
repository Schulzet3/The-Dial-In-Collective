import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRoastLabel} from '../src/server/roast-level-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

const url='https://newroaster.examplecoffee.com/products/wuri';
const product=part=>'<html><head><meta property="og:site_name" content="New Roaster"></head><body><main>'+
 '<h1>Wuri</h1><p>Gedeb, Ethiopia</p>'+part+
 '<h2>More coffees</h2><p>Dark Blend</p></main></body></html>';
const asPreview=part=>extractPublicCoffeeFacts(product(part),{source_url:url});

test('explicit roast evidence respects seven Title Case tiers and legacy aliases',()=>{
 for(const [label,want] of Object.entries({
  'Ultra Light':'Ultra Light','ultra-light roast':'Ultra Light',
  'Very Light':'Very Light','very light roast':'Very Light','Light':'Light','light roast':'Light',
  'Light-Medium':'Medium-Light','Medium Light':'Medium-Light','medium-light roast':'Medium-Light',
  'Medium':'Medium','Medium-Dark':'Medium-Dark','Medium Dark':'Medium-Dark',
  'Dark Roast':'Dark'
 })){
  assert.equal(normalizeRoastLabel(label),want,label);
 }
 for(const s of ['Extra Light','Nordic Light','Light Medium Dark','Cinnamon Roast','French Roast','Light to Medium']){
  assert.equal(normalizeRoastLabel(s),null,s);
 }
});
test('read explicit HTML data-roast-level in the product region',()=>{
 const r=asPreview('<div class="coffee-roast" data-roast-level="Medium Light"><span>Roast</span></div>');
 assert.equal(r.fields.roast_level,'Medium-Light');
 assert.equal(r.roast_source,'product_attribute');
});
test('accessible roast icon and inline SVG title carry exact roast information without fetching images',()=>{
 const a=asPreview('<figure><img src="/assets/bean.jpg" alt="Roast level: Light"/></figure>');
 assert.equal(a.fields.roast_level,'Light');
 assert.equal(a.roast_source,'graphic_accessible_label');
 const b=asPreview('<svg><title>Roast level: Medium Dark</title><circle cx="10" cy="10"/></svg>');
 assert.equal(b.fields.roast_level,'Medium-Dark');
 assert.equal(b.roast_source,'inline_svg_title');
});
test('discrete roast spectrum selected state is extracted only from a marked label',()=>{
 const a=asPreview('<h2>Roast Level</h2><div><span class="is-active">Light</span><span>Medium</span></div>');
 assert.equal(a.fields.roast_level,'Light');
 assert.equal(a.roast_source,'selected_roast_indicator');
 const b=asPreview('<h2>Roast Level</h2><span aria-selected="false">Light</span><span aria-selected="true">Medium</span>');
 assert.equal(b.fields.roast_level,'Medium');
});
test('Wuri-like unlabeled graphic with Light and Medium endpoints remains uncertain',()=>{
 const a=asPreview('<h2>Roast Level</h2><div class="scale"><span>Light</span><span>Medium</span></div>');
 assert.equal(a.ok,true);
 assert.equal(a.fields.roast_level,undefined);
 assert.match(a.roast_hint,/selected position/);
 const html=coffeeUrlPreviewMarkup(a,{applied:true});
 assert.match(html,/Roast graphic/);
 assert.match(html,/review|choose|position/i);
});
test('visual percent marker is a hint only, not interpreted as universally standardized roast',()=>{
 const r=asPreview('<h2>Roast Level</h2><div class="spectrum"><i class="roast-marker" style="left:22%"></i><span>Light</span><span>Medium</span></div>');
 assert.equal(r.fields.roast_level,undefined);
 assert.match(r.roast_hint,/Light–Medium/);
});
test('a product-specific roast meta field is stronger than unrelated page text',()=>{
 const r=extractPublicCoffeeFacts('<html><head><meta name="product:roast_level" content="medium-light"></head><body>'+
 '<h1>Wuri</h1><p>Enjoy this coffee. Shop medium and dark elsewhere!</p></body></html>',{source_url:url});
 assert.equal(r.fields.roast_level,'Medium-Light');
});
test('Shopify merchant JSON includes explicit roast metafields, tags and labeled description',()=>{
 const data={
  title:'Wuri',vendor:'New Roaster',url:'/products/wuri',
  description:'<dl><dt>Process</dt><dd>Washed</dd></dl>',
  tags:['Origin: Gedeb, Ethiopia'],metafields:{custom:{roast_level:{value:'Light'}}}
 };
 const html=product('<script type="application/json" data-product="wuri">'+JSON.stringify(data)+'</script>');
 const r=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(r.fields.name,'Wuri');
 assert.equal(r.fields.roast_level,'Light');
 assert.equal(r.fields.origin,'Gedeb, Ethiopia');
 assert.equal(r.fields.process,'Washed');
});
test('JSON-LD merchant description may contain labeled roast and origin evidence',()=>{
 const schema={
  '@context':'https://schema.org','@type':'Product',name:'Wuri',url,
  description:'<table><tr><th>Roast level</th><td>Light-Medium</td></tr>'+
  '<tr><th>Process</th><td>Washed</td></tr></table>'
 };
 const r=asPreview('<script type="application/ld+json">'+JSON.stringify(schema)+'</script>');
 assert.equal(r.fields.roast_level,'Medium-Light');
 assert.equal(r.fields.process,'Washed');
});
test('conflicting source signals require manual review without guessing',()=>{
 const schema={'@type':'Product',name:'Wuri',url,additionalProperty:[{name:'Roast Level',value:'Medium'}]};
 const html=product('<script type="application/ld+json">'+JSON.stringify(schema)+'</script>'+
  '<h2>Roast Level</h2><span aria-selected="true">Light</span><span>Medium</span>');
 const r=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(r.ok,true);
 assert.equal(r.fields.roast_level,undefined);
 assert.match(r.roast_hint,/inconsistent|Conflicting/i);
});
test('Ultra Light and Very Light require explicit evidence, while generic Extra Light stays a hint',()=>{
 for(const label of ['Ultra Light','Very Light']){
  const r=asPreview('<figure data-roast-level="'+label+'"></figure>');
  assert.equal(r.fields.roast_level,label);
 }
 const r=asPreview('<figure data-roast-level="Extra Light"></figure>');
 assert.equal(r.fields.roast_level,undefined);
 assert.match(r.roast_hint,/Extra Light/);
});
test('untrusted graphic markup remains escaped in preview',()=>{
 const r=asPreview('<h2>Roast Level</h2><span>Light</span><span>Medium</span>'+
  '<svg><title>Roast Level: <script>alert(1)</script></title></svg>');
 const markup=coffeeUrlPreviewMarkup(r);
 assert.doesNotMatch(markup,/<script>/);
 assert.equal(r.fields.roast_level,undefined);
});

test('Full City explicit labels map to Medium-Dark, not compound unrelated labels',()=>{
 for(const label of ['Full City','Full-City','Full City Roast','Roast: Full City','ROAST LEVEL: full city'])
  assert.equal(normalizeRoastLabel(label),'Medium-Dark',label);
 for(const label of ['Full City +','Full City Dark','Full City Blend','City','City+','Vienna Roast'])
  assert.equal(normalizeRoastLabel(label),null,label);
});
test('Ahrres African Blend selected COFFEE DETAILS Full City is Medium-Dark',()=>{
 const r=extractPublicCoffeeFacts('<html><body><main><section class="selected-product">'+
  '<h2>COFFEE DETAILS</h2><h6>FLAVOR NOTES</h6><p>Floral, Fruity, Berry</p>'+
  '<h6>REGION</h6><p>Africa</p><h6>ROAST</h6><p>Full City</p>'+
  '<h1>AFRICAN BLEND</h1><p>The African Blend is medium to full-bodied.</p>'+
  '</section></main></body></html>',{source_url:'https://www.ahrre.com/products/african-blend'});
 assert.equal(r.ok,true);assert.equal(r.fields.roast_level,'Medium-Dark');
 assert.equal(r.roast_source,'selected_product_roast_detail');
});
test('Ahrres Tanzanian Peaberry is read from its exact current /products/test identity',()=>{
 const r=extractPublicCoffeeFacts('<html><body><main><section class="selected-product">'+
  '<h2>COFFEE DETAILS</h2><h6>FLAVOR NOTES</h6><p>Floral, Fruity, Berry</p>'+
  '<h6>REGION</h6><p>Africa</p><h6>ROAST</h6><p>Full City</p>'+
  '<h1>TANZANIAN PEABERRY</h1><p>Wet-processed beans grown in Tanzania.</p>'+
  '</section></main></body></html>',{source_url:'https://www.ahrre.com/products/test'});
 assert.equal(r.ok,true);assert.equal(r.fields.roast_level,'Medium-Dark');
 assert.equal(r.roast_source,'selected_product_roast_detail');
});
test('a coffee name, educational prose or related Full City cannot donate selected roast',()=>{
 for(const detail of [
  '<h1>Full City</h1><p>A named coffee without a roast level.</p>',
  '<h1>African Blend</h1><p>Full City is traditionally a roast classification.</p>',
  '<h1>African Blend</h1><h2>Roast guide</h2><h6>ROAST</h6><p>Full City</p>',
  '<h1>African Blend</h1><h2>More coffees</h2><a href="/products/full-city"><h6>ROAST</h6><p>Full City</p></a>'
 ]){
  const r=asPreview(detail);
  assert.equal(r.fields?.roast_level,undefined,detail);
 }
});
test('conflicting current product roast source still requires human review',()=>{
 const r=extractPublicCoffeeFacts('<html><head><meta name="product:roast_level" content="Dark"></head>'+
  '<body><main><section><h2>COFFEE DETAILS</h2><h6>ROAST</h6><p>Full City</p><h1>AFRICAN BLEND</h1></section></main></body></html>',
  {source_url:'https://www.ahrre.com/products/african-blend'});
 assert.equal(r.fields.roast_level,undefined);
 assert.ok(r.conflicts?.includes('roast_level'));
});
