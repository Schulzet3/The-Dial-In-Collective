import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRoastLabel,extractRoastVisualEvidence} from '../src/server/roast-level-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

const url='https://newroaster.examplecoffee.com/products/wuri';
const product=part=>'<html><head><meta property="og:site_name" content="New Roaster"></head><body><main>'+
 '<h1>Wuri</h1><p>Gedeb, Ethiopia</p>'+part+
 '<h2>More coffees</h2><p>Dark Blend</p></main></body></html>';
const asPreview=part=>extractPublicCoffeeFacts(product(part),{source_url:url});

test('roast-label normalization respects the current canonical taxonomy',()=>{
 for(const [label,want] of Object.entries({
  'Light':'Light','light roast':'Light',
  'Light-Medium':'Light-Medium','Medium Light':'Light-Medium','medium-light roast':'Light-Medium',
  'Medium':'Medium','Medium-Dark':'Medium-Dark','Medium Dark':'Medium-Dark',
  'Dark Roast':'Dark'
 })){
  assert.equal(normalizeRoastLabel(label),want,label);
 }
 for(const s of ['Ultra Light','Ultra-light','Very Light','Light Medium Dark','Cinnamon Roast','French Roast','Light to Medium']){
  assert.equal(normalizeRoastLabel(s),null,s);
 }
});
test('read explicit HTML data-roast-level in the product region',()=>{
 const r=asPreview('<div class="coffee-roast" data-roast-level="Medium Light"><span>Roast</span></div>');
 assert.equal(r.fields.roast_level,'Light-Medium');
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
 assert.equal(r.fields.roast_level,'Light-Medium');
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
 assert.equal(r.fields.roast_level,'Light-Medium');
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
test('Ultra Light unknown category is preserved as hint, never silently forced into Light',()=>{
 const r=asPreview('<figure data-roast-level="Ultra Light"></figure>');
 assert.equal(r.fields.roast_level,undefined);
 assert.match(r.roast_hint,/Ultra Light/);
});
test('untrusted graphic markup remains escaped in preview',()=>{
 const r=asPreview('<h2>Roast Level</h2><span>Light</span><span>Medium</span>'+
  '<svg><title>Roast Level: <script>alert(1)</script></title></svg>');
 const markup=coffeeUrlPreviewMarkup(r);
 assert.doesNotMatch(markup,/<script>/);
 assert.equal(r.fields.roast_level,undefined);
});
