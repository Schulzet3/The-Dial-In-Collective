// Issue #33: selected decaf method in exact current product prose, never site SEO.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
import {selectedNamedCurrentDecafEvidence} from '../src/server/coffee-direct-product-prose.mjs';
const source_url='https://leapcoffeeroasters.com/products/decaf-coffee';
const page=(name,body)=>'<html><head><meta property="og:type" content="product"></head><body>'+
 '<main><h1>'+name+'</h1>'+body+'</main></body></html>';
const parse=(name,body)=>extractPublicCoffeeFacts(page(name,body),{source_url});
const official='The SWISS WATER® Process is a 100% chemical free decaffeination process '+
 'that delivers coffee that is caffeine-free while protecting the unique origin characteristics and flavor.';

test('actual current Leap Decaf Coffee selected prose identifies Water Process in Add Coffee',()=>{
 const result=parse('Decaf Coffee','<p>'+official+'</p>'+
  '<p>Tasting Notes: characteristically smooth, mellow, and sweet, with a slight caramel note and pleasant acidity.</p>');
 assert.equal(result.ok,true);
 assert.equal(result.fields.decaffeination_method,'Water Process');
 assert.equal(result.fields.process,undefined,'decaffeination is not green-coffee processing');
 assert.match(coffeeUrlPreviewMarkup(result),/Water Process/);
 assert.ok(result.source_facts?.some(f=>f.field==='decaffeination_method'&&f.value===official));
});
for(const [statement,expected] of [
 ['Our decaf coffee is decaffeinated using the Swiss Water process.','Water Process'],
 ['This coffee is decaffeinated using Sugar Cane EA.','Sugar Process'],
 ['Our decaf coffee is decaffeinated via supercritical carbon dioxide.','Carbon Dioxide (CO2)']
])test('bounded selected current method: '+expected,()=>{
 const result=parse('Selected Decaf','<p>'+statement+'</p>');
 assert.equal(result.fields.decaffeination_method,expected);
 assert.equal(result.fields.process,undefined);
});
test('unrelated regular and half-caf products cannot receive full decaf method',()=>{
 for(const name of ['Regular Colombia','Half-Caf Blend']){
  const result=parse(name,'<p>'+official+'</p>'+
   '<p>Our decaf coffee is decaffeinated using Swiss Water.</p>');
  assert.equal(result.fields.decaffeination_method,undefined,name);
 }
});
test('product education, not current coffee evidence, cannot donate a method',()=>{
 const result=parse('Selected Decaf','<p>Delicious daily decaf.</p>'+
  '<section><h2>What is Swiss Water decaffeination?</h2><p>'+official+'</p></section>');
 assert.equal(result.fields.decaffeination_method,undefined);
});
test('related product card cannot donate its decaf method',()=>{
 const result=parse('Selected Decaf','<p>Sweet balanced decaf coffee.</p>'+
  '<section class="product-recommendations"><h2>Other coffees</h2><p>'+official+'</p></section>');
 assert.equal(result.fields.decaffeination_method,undefined);
});
test('generic method background, unspecified decaf and past-lot references are not proof',()=>{
 for(const statement of [
  'The Swiss Water Process is a chemical-free decaffeination process.',
  'Our other coffees use Swiss Water decaffeination.',
  'Last year our coffee was decaffeinated using Swiss Water.',
  'Our decaf coffee is not decaffeinated with Swiss Water.'
 ]){
  const result=parse('Selected Decaf','<p>'+statement+'</p>');
  assert.equal(result.fields.decaffeination_method,undefined,statement);
 }
});
test('two contradictory current decaf method statements are withheld with raw evidence',()=>{
 const result=parse('Selected Decaf',
  '<p>Our decaf coffee is decaffeinated using Swiss Water.</p>'+
  '<p>This coffee is decaffeinated using Sugar Cane EA.</p>');
 assert.equal(result.fields.decaffeination_method,undefined);
 const raw=result.source_facts?.filter(f=>f.field==='decaffeination_method')||[];
 assert.equal(raw.length,2);
 assert.ok(raw.every(f=>f.conflicting===true));
});
test('unrelated selected coffee title blocks direct decaf prose',()=>{
 const result=parse('Everyday Blend','<p>'+official+'</p>');
 assert.equal(result.fields.decaffeination_method,undefined);
});
test('exact selected coffee repeated H1 remains eligible after PR255',()=>{
 const html='<main><h1>Decaf Coffee</h1><h1>Decaf Coffee</h1><p>'+official+'</p></main>';
 const result=extractPublicCoffeeFacts(html,{source_url});
 assert.equal(result.fields.decaffeination_method,'Water Process');
});


const nativo='Tranquilo is decaffeinated using the natural Sugar Cane Process in Colombia.';
test('selected exact named current decaf recovers Sugar Process from second sentence without borrowing Colombian origin',()=>{
 const result=parse('TRANQUILO, Decaffeinated, 12 oz',
  '<p>Savor the richness of world-class coffee without the caffeine kick. '+nativo+'</p>'+
  '<p>Notes: Sugar Cane, Chocolate, Creamy.</p>');
 assert.equal(result.ok,true);
 assert.equal(result.fields.decaffeination_method,'Sugar Process');
 assert.equal(result.fields.process,undefined,'decaffeination is not green-bean Natural processing');
 assert.equal(result.fields.origin,undefined,'decaffeination location is not a growing origin');
 assert.ok(result.source_facts?.some(f=>f.field==='decaffeination_method'&&f.value.includes(nativo)));
 assert.match(coffeeUrlPreviewMarkup(result),/Sugar Process/);
});
test('named current decaf evidence must match EXACT selected coffee, not another decaf or regular product',()=>{
 for(const name of ['Other Decaf, 12 oz','Regular Tranquilo','TRANQUILO, Half-Caf']){
  const result=parse(name,'<p>'+nativo+'</p>');
  assert.equal(result.fields.decaffeination_method,undefined,name);
 }
});
test('named current decaf method is not donated by past lot, unrelated current subject or education',()=>{
 for(const sentence of [
  'Previously, Tranquilo is decaffeinated using the natural Sugar Cane Process.',
  'Last year Tranquilo is decaffeinated using the natural Sugar Cane Process.',
  'Our other coffee is decaffeinated using the natural Sugar Cane Process.',
  'Tranquilo is naturally sweet, with notes of sugar cane.'
 ]){
  const result=parse('TRANQUILO, Decaffeinated, 12 oz','<p>'+sentence+'</p>');
  assert.equal(result.fields.decaffeination_method,undefined,sentence);
 }
 const educational=parse('TRANQUILO, Decaffeinated, 12 oz',
  '<section><h2>What is decaffeination?</h2><p>'+nativo+'</p></section>');
 assert.equal(educational.fields.decaffeination_method,undefined);
});
test('named selected decaf conflicting current methods stay reviewable rather than arbitrary',()=>{
 const result=parse('TRANQUILO, Decaffeinated, 12 oz',
  '<p>'+nativo+'</p><p>Tranquilo is decaffeinated using Swiss Water.</p>');
 assert.equal(result.fields.decaffeination_method,undefined);
 assert.equal(result.source_facts?.filter(x=>x.field==='decaffeination_method').length,2);
});


test('strict current exact H1 restores named decaf-method evidence after geography context isolation',()=>{
 const name='TRANQUILO, Decaffeinated, 12 oz';
 const paragraph='Savor the richness of world-class coffee without the caffeine kick. '+
  'Tranquilo is decaffeinated using the natural Sugar Cane Process in Colombia, '+
  'which preserves the bean cellular structure and flavor integrity unlike harsh chemical methods.';
 const current='<main><h1>'+name+'</h1><p>'+paragraph+'</p></main>';
 const dropped='<main><h1>'+name+'</h1></main>';
 const clean=html=>String(html).replace(/<[^<>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
 assert.deepEqual(selectedNamedCurrentDecafEvidence(dropped,{name,clean}),[]);
 const facts=selectedNamedCurrentDecafEvidence(current,{name,clean});
 assert.equal(facts.length,1);
 assert.match(facts[0],/Tranquilo is decaffeinated using the natural Sugar Cane Process/);
 assert.deepEqual(selectedNamedCurrentDecafEvidence(current,{name:'Other Decaf',clean}),[]);
 assert.deepEqual(selectedNamedCurrentDecafEvidence(current,{name:'TRANQUILO, Half-Caf',clean}),[]);
 for(const body of [
  'Our coffee is decaffeinated using Swiss Water.',
  'Previously, Tranquilo is decaffeinated using Swiss Water.',
  'Last year Tranquilo is decaffeinated using Swiss Water.',
  'Tranquilo is naturally sweet, with notes of sugar cane.'
 ])assert.deepEqual(selectedNamedCurrentDecafEvidence('<main><h1>'+name+'</h1><p>'+body+'</p></main>',{name,clean}),[],body);
 assert.deepEqual(selectedNamedCurrentDecafEvidence(
  '<main><h1>'+name+'</h1><section class="product-recommendations"><p>'+paragraph+'</p></section></main>',
  {name,clean}),[],'related coffee prose cannot enter current selected product');
});


test('independent exact Sugar Cane EA named sentence and printed spec corroborate under layout disagreement',()=>{
 const result=parse('TRANQUILO, Decaffeinated, 12 oz',
  '<p>Savor the richness of world-class coffee without the caffeine kick. '+
  'Tranquilo is decaffeinated using the natural Sugar Cane Process in Colombia.</p>'+
  '<ul><li>Process: Natural Sugar Cane (EA) Decaf.</li></ul>'+
  '<p>Decaffeination Method: Sugar Cane EA Decaf.</p>');
 assert.equal(result.ok,true);
 assert.equal(result.fields.decaffeination_method,'Sugar Process');
 assert.equal(result.fields.process,undefined,'Natural describes EA treatment, not green processing');
 assert.equal(result.fields.origin,undefined,'decaffeination country is not farm origin');
 assert.ok(result.source_facts?.some(f=>f.field==='decaffeination_method'&&/Natural Sugar Cane \(EA\) Decaf/.test(f.value)));
});

test('contrary exact current decaf spec blocks named method even without prior layout conflict',()=>{
 const result=parse('TRANQUILO, Decaffeinated, 12 oz',
  '<p>Tranquilo is decaffeinated using the natural Sugar Cane Process in Colombia.</p>'+
  '<li>Process: Swiss Water Decaf.</li>');
 assert.equal(result.fields.decaffeination_method,undefined);
 assert.ok(result.source_facts?.some(f=>f.field==='decaffeination_method'&&f.conflicting));
});

test('unrelated green processing or related coffee spec never overrides direct decaf evidence',()=>{
 const result=parse('TRANQUILO, Decaffeinated, 12 oz',
  '<p>Tranquilo is decaffeinated using the natural Sugar Cane Process in Colombia.</p>'+
  '<li>Process: Washed.</li>'+
  '<section class="product-recommendations"><li>Decaffeination Method: Swiss Water Decaf.</li></section>');
 assert.equal(result.fields.decaffeination_method,'Sugar Process');
});


// An actual Shopify/JSON-LD product page identifies the selected item
// independently of editorial H1 sections. A synthetic page without Product
// identity is intentionally ambiguous and cannot validate multi-H1 handling.
const hillTreeExactUrl='https://hilltreeroastery.com/products/colombia-valle-del-cauca-sugarcane-ea-decaf';
const parseEditorial=(name,body)=>{
 const html='<html><head><meta property="og:type" content="product">'+
  '<meta property="og:title" content="'+name+'">'+
  '<meta property="og:url" content="'+hillTreeExactUrl+'">'+
  '<script type="application/ld+json">'+JSON.stringify({
   '@context':'https://schema.org','@type':'Product',name,url:hillTreeExactUrl
  })+'</script></head><body><main><h1>'+name+'</h1>'+body+'</main></body></html>';
 return extractPublicCoffeeFacts(html,{source_url:hillTreeExactUrl});
};

// Current original603 #151's actual selected page uses editorial H1 headings
// and a BR-separated printed spec. This is not general FAQ decaf education.
test('Hill Tree current selected sugarcane EA caption retains distinct Washed and Sugar Process',()=>{
 const name='COLOMBIA VALLE DEL CAUCA SUGARCANE EA DECAF';
 const body='<h1>Tasting Notes</h1>'+
  '<p>FLAVOR: Warm Chocolate • Roasted Almond • Cane Sugar • Bright Citrus<br>'+
  'BODY: Medium & Smooth<br>ACIDITY: Low to Medium<br>'+
  'PROCESS: Washed • EA Sugarcane Decaffeination</p>'+
  '<p>Process: Washed.</p>'+
  '<h1>Origin Notes</h1><p>Colombia Valle del Cauca Sugarcane Decaf is washed processed before decaffeination.</p>'+
  '<h1>Why You’ll Love This Coffee</h1><p>This is a rich dark roast.</p>'+
  '<h1>Frequently Asked Questions</h1><p>What is EA decaf?</p>';
 const result=parseEditorial(name,body);
 assert.equal(result.ok,true);
 assert.equal(result.fields.decaffeination_method,'Sugar Process');
 assert.equal(result.fields.process,'Washed','green-coffee washed processing must remain distinct');
 assert.ok(result.source_facts?.some(f=>f.field==='decaffeination_method'&&/Washed • EA Sugarcane Decaffeination/.test(f.value)));
 assert.match(coffeeUrlPreviewMarkup(result),/Sugar Process/);
});
test('a competing product H1 cannot donate a selected decaf caption',()=>{
 const name='Selected Decaf';
 const result=parseEditorial(name,'<h1>Other Coffee Guatemala</h1>'+
  '<p>Process: Sugarcane EA Decaffeination</p>');
 assert.equal(result.fields.decaffeination_method,undefined);
});
test('selected-product editorial H1 does not turn FAQ examples into published specs',()=>{
 const name='Selected Decaf';
 const result=parseEditorial(name,'<h1>Frequently Asked Questions</h1>'+
  '<p>Process: Sugarcane EA Decaffeination</p>');
 assert.equal(result.fields.decaffeination_method,undefined);
});
test('opposing exact current printed decaf method captions remain unfilled',()=>{
 const name='Selected Decaf';
 const result=parseEditorial(name,'<h1>Tasting Notes</h1>'+
  '<p>PROCESS: Washed • EA Sugarcane Decaffeination<br>'+
  'Decaffeination Method: Swiss Water Decaf</p>');
 assert.equal(result.fields.decaffeination_method,undefined);
 assert.ok(result.source_facts?.filter(f=>f.field==='decaffeination_method').every(f=>f.conflicting===true));
});


// Original603 #126 live current raw HTML: product-only strong label and
// <br>-separated value lack the colon normally expected after Processing.
const fosterExact='https://fostercoffee.co/products/yes-its-decaf-decaf';
const strongSpec=(value)=>'<p><strong>Country </strong>Mexico<strong><br>'+
 'Region </strong>Amatenago<strong><br>Producer </strong>Smallholder Farms'+
 '<strong><br>Processing </strong>'+value+'</p>';
const parseFoster=(name,body)=>extractPublicCoffeeFacts(
 '<html><head><meta property="og:type" content="product"></head><body><main><h1>'+name+'</h1>'+body+'</main></body></html>',
 {source_url:fosterExact});
test('original603 #126 current strong-labeled Processing spec splits washed and mountain-water decaf',()=>{
 const result=parseFoster('Yes It&#39;s Decaf (Decaf)',strongSpec('Washed: Mountain Water Decaf'));
 assert.equal(result.ok,true);
 assert.equal(result.fields.process,'Washed');
 assert.equal(result.fields.decaffeination_method,'Water Process');
 assert.ok(result.source_facts?.some(f=>f.field==='decaffeination_method'&&
  /Processing: Washed: Mountain Water Decaf/.test(f.value)));
});
test('current selected strong decaf source must not donate to regular or half-caf',()=>{
 for(const name of ['Regular Coffee','Half-Caf Blend']){
  const result=parseFoster(name,strongSpec('Washed: Mountain Water Decaf'));
  assert.equal(result.fields.decaffeination_method,undefined,name);
 }
});
test('selected strong-labeled decaf contradictory methods remain review-only',()=>{
 const result=parseFoster('Selected Decaf',strongSpec('Washed: Mountain Water Decaf')+
  '<p><strong>Decaffeination Method</strong>Swiss Water Decaf.</p>'+
  '<p><strong>Decaffeination Method</strong>Sugar Cane EA Decaf.</p>');
 assert.equal(result.fields.decaffeination_method,undefined);
 assert.ok(result.source_facts?.some(f=>f.field==='decaffeination_method'&&f.conflicting));
});
test('related recommendation and educational sections cannot supply strong decaf specs',()=>{
 const result=parseFoster('Selected Decaf','<p>Selected decaf.</p>'+
  '<section class="product-recommendations"><h2>Recommended coffees</h2>'+strongSpec('Washed: Mountain Water Decaf')+'</section>'+
  '<section><h2>Decaf Process Education</h2>'+strongSpec('Washed: Swiss Water Decaf')+'</section>');
 assert.equal(result.fields.decaffeination_method,undefined);
});
test('unsupported or ambiguous processing spec must not invent decaf method',()=>{
 for(const value of ['Washed: Unspecified Decaf','Washed: Mountain Water or Sugar Cane Decaf']){
  const result=parseFoster('Selected Decaf',strongSpec(value));
  assert.equal(result.fields.decaffeination_method,undefined,value);
 }
});

// Original603 #302 exact 2026-11-07 Broad Porch selected HTML: a product's
// explicit "Decaf Process" caption is decaffeination, never green processing.
// Reproduced from official read-only case-302.html SHA256
// 05a139285cac5e384403cd0fc021bcc98e54a9803cfffa9042841bc363954646.
const broadPorch='https://shop.broadporchcoffee.com/products/decaf';
const bpName='Decaf - Colombian Water Process';
const bpSpec='<p><strong>Tasting Notes:</strong> Dark Chocolate · Hazelnut<br>'+
 '<strong>Coffee Type:</strong> Single Origin Decaf<br>'+
 '<strong>Origin:</strong> Colombia<br>'+
 '<strong>Decaf Process:</strong> Mountain Water Process</p>';
const bpPage=(name=bpName,body=bpSpec)=>extractPublicCoffeeFacts(
 '<html><head><meta property="og:type" content="product"></head><body>'+
 '<main class="product"><h1>'+name+'</h1><div class="product__description">'+body+
 '</div></main></body></html>',{source_url:broadPorch});
test('current chosen product Decaf Process caption restores separate Water Process method and provenance',()=>{
 const r=bpPage(bpName,bpSpec+'<h3>Mountain Water Process Decaf</h3>'+
 '<p>Our Colombia is decaffeinated using the Mountain Water Process, a water-based method.</p>');
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,bpName);
 assert.equal(r.fields.origin,'Colombia');
 assert.equal(r.fields.decaffeination_method,'Water Process',JSON.stringify(r.fields));
 assert.equal(r.fields.process,undefined,'Water decaffeination is not green processing');
 assert.ok(r.source_facts?.some(f=>f.field==='decaffeination_method'&&
  /Decaf Process: Mountain Water Process/i.test(f.value)&&!f.conflicting));
 assert.match(coffeeUrlPreviewMarkup(r),/Water Process/);
});
test('Decaf Process caption rejects unspecified, regular and half-caf source identities',()=>{
 for(const name of ['Regular Colombia','Colombian Half-Caf','Coffee Collection']){
  assert.equal(bpPage(name).fields.decaffeination_method,undefined,name);
 }
 for(const value of ['Mountain water used to rinse green beans','Decaf Process not published']){
  const r=bpPage(bpName,bpSpec.replace('Mountain Water Process',value));
  assert.equal(r.fields.decaffeination_method,undefined,value);
 }
});
test('competing current decaf captions preserve opposing source facts but withhold autofill',()=>{
 const r=bpPage(bpName,bpSpec+
  '<p><strong>Decaffeination Method:</strong> Sugar Cane EA Decaf</p>');
 assert.equal(r.fields.decaffeination_method,undefined);
 assert.ok(r.source_facts?.some(f=>f.field==='decaffeination_method'&&f.conflicting));
});
test('historical, FAQ, and recommended-coffee Decaf Process captions are not selected method',()=>{
 for(const body of [
  '<section><h2>Decaf Process Education</h2>'+bpSpec+'</section>',
  '<section class="product-recommendations"><h2>Other coffees</h2>'+bpSpec+'</section>',
  '<section><h2>Frequently Asked Questions</h2><p><strong>Decaf Process:</strong> Mountain Water Process</p></section>',
  '<p>Previously the selected coffee used Mountain Water Process, now decaf method unlisted.</p>'
 ]){
  const r=bpPage(bpName,body);
  assert.equal(r.fields.decaffeination_method,undefined,body);
 }
});
test('distinct selected Washed green processing remains separate from exact labeled decaf treatment',()=>{
 const r=bpPage(bpName,bpSpec+'<p><strong>Process:</strong> Washed</p>');
 assert.equal(r.fields.decaffeination_method,'Water Process');
 assert.equal(r.fields.process,'Washed');
});
