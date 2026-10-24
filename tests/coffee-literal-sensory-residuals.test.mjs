import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractProductFlavorEvidence} from '../src/server/coffee-flavor-evidence.mjs';
import {extractShopifyAjaxData,shopifyProductRequest} from '../src/server/coffee-shopify-ajax.mjs';

const source_url='https://roaster.examplecoffee.com/products/current-coffee';
const other_url='https://roaster.examplecoffee.com/products/another-coffee';
const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const clean=(value,max=6000)=>String(value).replace(/<[^<>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().slice(0,max);
const page=(name,body,head='')=>head+'<main><h1>'+escape(name)+'</h1>'+body+'</main>';
const parse=(name,body,head='')=>extractPublicCoffeeFacts(page(name,body,head),{source_url});
const product=data=>'<script type="application/ld+json">'+JSON.stringify(data).replace(/</g,'\\u003c')+'</script>';
const retained=(result,text,type)=>result.source_facts?.some(fact=>(!type||fact.source_type===type)&&String(fact.value).includes(text));
const fragancia='This Washed Fragancia is a very light, soft and elegant cup, with dragonfruit, starfruit, and hints of fresh basil in the finish.';
const extraction='Pushing your extraction can bring out more of a stonefruit tone with hints of citrus in the finish like candied tangerine peel.';
const turbo='Turbos are light and lovely with stonefruit tones and citrus notes in the finish.';
const decaf='Our Decaf Honduras is citrus forward, a fruity sweetness with a syrup-y body!';
const characteristics='Characteristics - Hints of dark roast, and caramel sweetness Origin - Americas Roast - Dark Body - Full Acidity - Low';
const cases=[
 {name:'Colombia Camacho Fragancia',
  source:'Our second offering from our new partners, LaREB in Colombia!'+fragancia+' '+extraction+' Personally, I pick up a few Mejorado notes in this one. This is a stellar megalight roast.Will it Spro? '+turbo,
  notes:'dragonfruit, starfruit, and hints of fresh basil in the finish',quote:fragancia},
 {name:'Honduran Decaf | Swiss Water® Processed',
  source:'The region of Copan lies in a fertile valley, known for its cool temperatures, and as a result is a perfect location for green coffee production. '+decaf+' Well balanced and delicious, this coffee is sure to impress.',
  notes:'citrus forward, fruity sweetness',quote:decaf},
 {name:'Vienna Roast',
  source:'This popular favorite is roasted a tad bit darker than our High Altitude roasts, but not as dark and bittersweet as our French Roast coffee lending to a round caramelly, sweetness. Vienna Roast is the coffee served at most of our prestigious wholesale accounts. '+characteristics,
  notes:'caramel sweetness',quote:characteristics}
];

// Literal original frozen public sources, with their original selected names:
// www-swroasting-coffee__XOJGV4EZXCTPBXV6RSP4SGVF-fe2617be (page);
// www-woodshedroast-com__decaf-honduran-swiss-water--process-copy-535a0b51 (page/product-endpoint);
// shop-inkcoffee-com__vienna-d3ba19e6 (page/product-endpoint).
// No frozen expected result, capture, scorer or product decision is edited.
for(const entry of cases)test('selected literal sensory relationship: '+entry.name,()=>{
 const visible=parse(entry.name,'<p>'+escape(entry.source)+'</p>');
 const structured=parse(entry.name,'',product({'@type':'Product',name:entry.name,url:source_url,description:entry.source}));
 const request=shopifyProductRequest(source_url);
 assert.ok(request,'The public-shaped synthetic Shopify URL must pass the real URL guard; no request is fetched.');
 const endpoint=extractShopifyAjaxData({title:entry.name,handle:'current-coffee',description:'<p>'+escape(entry.source)+'</p>'},request);
 for(const result of [visible,structured,endpoint]){
  assert.equal(result?.ok,true);
  assert.equal(result.fields.tasting_notes,entry.notes);
  assert.ok(!result.conflicts?.includes('tasting_notes'));
  assert.ok(retained(result,entry.quote),entry.name);
 }
 assert.ok(retained(structured,entry.quote,'product_json'));
 assert.ok(retained(endpoint,entry.quote,'product_json'));
});

test('a current cup statement survives later extraction and turbo qualifiers without promoting their flavors',()=>{
 const result=parse(cases[0].name,'<p>'+escape(cases[0].source)+'</p>');
 assert.equal(result.fields.tasting_notes,cases[0].notes);
 for(const text of [extraction,turbo])assert.ok(retained(result,text));
 for(const word of ['stonefruit','citrus','tangerine','Mejorado'])assert.ok(!result.fields.tasting_notes.includes(word));
 for(const sentence of [
  extraction,turbo,
  'Adjusting your extraction brings notes of plum and honey.',
  'Increasing the extraction yields notes of plum and honey.',
  'Turbo shots have notes of plum and honey.'
 ])assert.equal(parse('Current Coffee','<p>'+sentence+'</p>').fields.tasting_notes,undefined,sentence);
});

test('literal subject and sweetness grammar is generic and keeps modifiers instead of guessing flavor tokens',()=>{
 for(const [name,source,expected] of [
  ['Rwanda Sample Bourbon','This Washed Bourbon is a soft and elegant cup, with ripe pear, honey, and hints of lime in the finish.','ripe pear, honey, and hints of lime in the finish'],
  ['Peruvian Decaf','Our Decaf Peru is pomelo forward, a brown sugar sweetness with a silky body!','pomelo forward, brown sugar sweetness'],
  ['Current Coffee','Characteristics - Hints of medium roast, and cocoa sweetness Body - Full Acidity - Low','cocoa sweetness']
 ]){
  const result=parse(name,'<p>'+source+'</p>');
  assert.equal(result.fields.tasting_notes,expected,source);
  assert.ok(retained(result,source));
 }
});

test('named cup and decaf subjects must agree with the selected identity and explicit process',()=>{
 for(const [name,source] of [
  ['Colombia Camacho Fragancia','This Washed Otherlot is a soft and elegant cup, with dragonfruit and starfruit.'],
  ['Colombia Natural Fragancia','This Washed Fragancia is a soft and elegant cup, with dragonfruit and starfruit.'],
  ['Colombia Camacho Fragancia','This Natural Bourbon is a soft and elegant cup, with dragonfruit and starfruit.'],
  ['Honduran Decaf | Swiss Water® Processed','Our Decaf Guatemala is citrus forward, a fruity sweetness with a syrup-y body!'],
  ['Honduran Coffee',decaf],
  ['Current Coffee','Our Decaf Honduras is citrus forward, a fruity sweetness with a syrup-y body!']
 ])assert.equal(parse(name,'<p>'+source+'</p>').fields.tasting_notes,undefined,source);
 const body='<p>This Washed Fragancia is a soft and elegant cup, with dragonfruit and starfruit.</p>';
 assert.equal(extractProductFlavorEvidence(body,{clean}),'');
 assert.equal(extractProductFlavorEvidence('<h1>Colombia Camacho Fragancia</h1><h1>Other Coffee</h1>'+body,{clean}),'');
});

test('denial, history, examples, hypothetical, regional and preparation prose cannot create current named notes',()=>{
 const plain='This Washed Fragancia is a soft and elegant cup, with dragonfruit and starfruit.';
 for(const source of [
  plain.replace(' is ',' is not '),
  'Previously, '+plain,
  'Last season, '+plain,
  'For example, '+plain,
  plain.replace('a soft and elegant','a hypothetical'),
  plain.replace('a soft and elegant','a fictional'),
  plain.replace(' is ',' could be '),
  plain.replace('dragonfruit and starfruit','dragonfruit or starfruit'),
  'When served with milk, '+plain,
  "When it's brewed with milk, "+plain,
  'If you add milk, '+plain,
  'Coffees from this region are soft and elegant cups, with dragonfruit and starfruit.'
 ])assert.equal(parse(cases[0].name,'<p>'+source+'</p>').fields.tasting_notes,undefined,source);
 for(const heading of ['Brewing guide','About the Region','Regional characteristics'])
  assert.equal(parse(cases[0].name,'<h2>'+heading+'</h2><p>'+plain+'</p>').fields.tasting_notes,undefined,heading);
});

test('conditional, historical and denied named decaf claims stay out of canonical notes',()=>{
 for(const source of [
  decaf.replace(' is ',' is not '),
  decaf.replace(' is ',' was '),
  'Previously, '+decaf,
  'For example, '+decaf,
  'When served with milk, '+decaf,
  decaf.replace('citrus forward','citrus forward or berry forward'),
  decaf.replace('a fruity sweetness','a hypothetical fruity sweetness')
 ])assert.equal(parse(cases[1].name,'<p>'+source+'</p>').fields.tasting_notes,undefined,source);
});

test('mixed Characteristics accepts only its explicit sweetness role and stops at neighboring fields',()=>{
 for(const source of [
  'Characteristics - Hints of dark roast, and syrup-y body Origin - Americas',
  'Characteristics - Hints of dark roast, and low acidity Origin - Americas',
  'Characteristics - Hints of dark roast, and no caramel sweetness Origin - Americas',
  'Characteristics - Hints of dark roast, and caramel sweetness or honey sweetness Origin - Americas',
  'Characteristics - Hints of dark roast, and hypothetical caramel sweetness Origin - Americas',
  'Previously, Characteristics - Hints of dark roast, and caramel sweetness Origin - Americas',
  'For example, Characteristics - Hints of dark roast, and caramel sweetness Origin - Americas'
 ])assert.equal(parse('Vienna Roast','<p>'+source+'</p>').fields.tasting_notes,undefined,source);
 for(const heading of ['Roast profiles explained','About the Region'])
  assert.equal(parse('Vienna Roast','<h2>'+heading+'</h2><p>'+characteristics+'</p>').fields.tasting_notes,undefined,heading);
 const result=parse('Vienna Roast','<p>'+characteristics+'</p>');
 assert.equal(result.fields.tasting_notes,'caramel sweetness');
 assert.ok(!/\b(?:dark roast|Americas|body|acidity)\b/i.test(result.fields.tasting_notes));
});

test('body and acidity are not converted to notes merely because a cup is named',()=>{
 for(const source of [
  'This Washed Fragancia is a soft and elegant cup, with rich body and bright acidity.',
  'This Washed Fragancia is a soft and elegant cup, with sweet mouthfeel and full body.'
 ])assert.equal(parse(cases[0].name,'<p>'+source+'</p>').fields.tasting_notes,undefined,source);
});

test('independent unqualified narrative profiles remain unresolved and printed tasting notes keep precedence',()=>{
 for(const entry of cases.slice(0,2)){
  const current='<p>'+escape(entry.source)+'</p>';
  const conflict=parse(entry.name,current+'<p>This coffee has notes of plum and honey.</p>');
  assert.equal(conflict.fields.tasting_notes,undefined);
  const explicit=parse(entry.name,current+'<p>Tasting Notes: plum, honey</p>');
  assert.equal(explicit.fields.tasting_notes,'plum, honey');
  assert.ok(retained(explicit,entry.quote));
 }
 const conflict=parse('Vienna Roast','<p>'+characteristics+'</p><p>Characteristics - Hints of light roast, and honey sweetness Origin - Americas</p>');
 assert.equal(conflict.fields.tasting_notes,undefined);
 const explicit=parse('Vienna Roast','<p>'+characteristics+'</p><p>Tasting Notes: plum, honey</p>');
 assert.equal(explicit.fields.tasting_notes,'plum, honey');
});

test('related product cards and unrelated Product JSON cannot supply the selected sensory profile',()=>{
 for(const entry of cases){
  const body='<p>A current coffee.</p><section class="related-products"><h2>'+escape(entry.name)+'</h2><p>'+escape(entry.source)+'</p></section>';
  assert.equal(parse('Current Coffee',body).fields.tasting_notes,undefined);
  const unrelated=product({'@type':'Product',name:entry.name,url:other_url,description:entry.source});
  assert.equal(parse('Current Coffee','<p>A current coffee.</p>',unrelated).fields.tasting_notes,undefined);
  const pair=product([{'@type':'Product',name:'Current Coffee',url:source_url,description:'A current coffee.'},
   {'@type':'Product',name:entry.name,url:other_url,description:entry.source}]);
  assert.equal(parse('Current Coffee','',pair).fields.tasting_notes,undefined);
 }
});

test('multiple explicit roast alternatives cannot make the new unlabeled relationship unconditional',()=>{
 const options='<p>As a light roast, this coffee has floral notes.</p><p>As a dark roast, this coffee has smoky notes.</p>';
 assert.equal(parse(cases[0].name,'<p>'+escape(fragancia)+'</p>'+options).fields.tasting_notes,undefined);
 assert.equal(parse(cases[1].name,'<p>'+escape(decaf)+'</p>'+options).fields.tasting_notes,undefined);
});

test('earlier additive and milk-chocolate boundaries remain intact',()=>{
 for(const ending of ['if blended with tea','when served with milk','after adding tea','only when mixed with tea','with milk','or mint']){
  const source='This coffee has notes of plum with additional notes of hibiscus '+ending+'.';
  assert.equal(parse('Current Coffee','<p>'+source+'</p>').fields.tasting_notes,'plum',ending);
 }
 assert.equal(parse('Current Coffee','<p>Jammy blueberry notes of our natural Ethiopia are layered with milk chocolate from our Sumatra.</p>').fields.tasting_notes,'Jammy blueberry, milk chocolate');
 assert.equal(parse('Current Coffee','<p>This coffee has notes of plum; when served with milk, the finish has notes of strawberry.</p>').fields.tasting_notes,'plum');
});

test('a selected blend cannot inherit a partial named component profile',()=>{
 const component='This Washed Fragancia is a smooth cup, with dragonfruit and starfruit.';
 for(const [name,body] of [
  ['Fragancia and Gesha Blend','<p>'+component+'</p>'],
  ['Fragancia and Gesha Blend','<p>This blend combines two varieties. '+component+'</p>'],
  ['Fragancia and Gesha','<p>This blend combines two varieties. '+component+'</p>'],
  ['Fragancia and Gesha','<p>This blend combines two varieties.</p><p>'+component+'</p>']
 ]){
  assert.equal(parse(name,body).fields.tasting_notes,undefined,name);
  assert.equal(parse(name,'',product({'@type':'Product',name,url:source_url,description:body})).fields.tasting_notes,undefined,name);
 }
});

test('generic current coffee or blend subjects and the exact whole selected blend name remain valid',()=>{
 for(const name of ['Fragancia and Gesha Blend','Fragancia and Gesha']){
  for(const subject of ['coffee','blend',name]){
   const body='<p>This blend combines two varieties. This '+subject+' is a smooth cup, with dragonfruit and starfruit.</p>';
   assert.equal(parse(name,body).fields.tasting_notes,'dragonfruit and starfruit',name+': '+subject);
   assert.equal(parse(name,'',product({'@type':'Product',name,url:source_url,description:body})).fields.tasting_notes,'dragonfruit and starfruit',name+': '+subject);
  }
 }
});

test('unrelated, regional, historical or hypothetical blend discussion does not change a current single-coffee subject',()=>{
 for(const prefix of [
  '<p>Last year, this blend combined two varieties.</p>',
  '<p>Previously, this blend combined two varieties.</p>',
  '<p>This blend could combine two varieties.</p>',
  '<p>This blend is a hypothetical example.</p>',
  '<p>Another coffee is a blend of two varieties.</p>',
  '<h2>About the Region</h2><p>This blend combines two varieties.</p><h2>Product description</h2>',
  '<h2>Understanding coffee blends</h2><p>This blend combines two varieties.</p><h2>Product description</h2>'
 ]){
  const result=parse(cases[0].name,prefix+'<p>'+fragancia+'</p>');
  assert.equal(result.fields.tasting_notes,cases[0].notes,prefix);
 }
});

test('explicit current-coffee blend predicates also exclude a partial named component',()=>{
 const name='Fragancia and Gesha',component='This Washed Fragancia is a smooth cup, with dragonfruit and starfruit.';
 for(const intro of [
  'This coffee is a blend of Fragancia and Gesha.',
  'Our coffee blends Fragancia and Gesha.',
  'We blend Fragancia with Gesha for this coffee.'
 ]){
  const body='<p>'+intro+'</p><p>'+component+'</p>';
  assert.equal(parse(name,body).fields.tasting_notes,undefined,intro);
  assert.equal(parse(name,'',product({'@type':'Product',name,url:source_url,description:body})).fields.tasting_notes,undefined,intro);
  for(const subject of ['coffee','blend',name]){
   const whole='<p>'+intro+'</p><p>This '+subject+' is a smooth cup, with dragonfruit and starfruit.</p>';
   assert.equal(parse(name,whole).fields.tasting_notes,'dragonfruit and starfruit',intro+': '+subject);
  }
 }
 for(const intro of [
  'Previously, this coffee was a blend of Fragancia and Gesha.',
  'This coffee is a hypothetical blend of Fragancia and Gesha.',
  'Our coffee could blend Fragancia and Gesha.',
  'We blend Fragancia with Gesha for this coffee if the components are available.',
  'Another coffee is a blend of Fragancia and Gesha.'
 ])assert.equal(parse(cases[0].name,'<p>'+intro+'</p><p>'+fragancia+'</p>').fields.tasting_notes,cases[0].notes,intro);
});
