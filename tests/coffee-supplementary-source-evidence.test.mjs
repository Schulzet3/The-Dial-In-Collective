import test from 'node:test';
import assert from 'node:assert/strict';
import {collectSupplementaryCoffeePageFacts,collectSupplementaryStructuredCoffeeFacts} from '../src/server/coffee-supplementary-source-evidence.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {mergeCoffeeSourceFacts} from '../src/server/coffee-source-facts.mjs';
import {coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const source_url='https://roaster.example/products/current-coffee';
const target='mf-7026630721694-0';
// Reduced original Thrive markup; all field values are literal captured text.
const preview=`<div class="mf-preview-block" id="${target}-preview"><h3 class="mf-meet-kicker"><span>MEET</span> Marta Solares</h3><button type="button" class="mf-open-btn" data-mf-open="${target}">Learn More</button></div>`;
const modal=`<div id="${target}-modal" class="mf-modal" aria-hidden="true"><aside class="mf-dialog" role="dialog"><h2>Marta Solares</h2><div class="mf-fields-panel"><div class="mf-item"><h3>FARM:</h3><p>La Esperanza</p></div><div class="mf-item"><h3>PROCESSING METHODS:</h3><p>Washed</p></div><div class="mf-item"><h3>REGION:</h3><p>El Sombrerito, San Jose Pinula,Guatemala</p></div><div class="mf-item"><h3>VARIETIES:</h3><p>Catuai, Caturra, Bourbon</p></div><div class="mf-item"><h3>COFFEE PRODUCTION:</h3><p>2.10 hectares</p></div></div><details class="mf-acc"><summary>How We Met Marta</summary><div class="mf-acc-body"><p>Marta is the matriarch of coffee farming in Concepcion Pinula.</p></div></details></aside></div>`;
const profile=(body=preview+modal)=>'<main><h1>Current Coffee</h1><div id="meet-farmers-inline">'+body+'</div></main>';
const collect=html=>collectSupplementaryCoffeePageFacts(html,{selected_html:productMarkup(html),source_url});
const range=(heading='Experience',level='4',left='Comfort',right='Adventure')=>`<div class="product-ranges__item"><h2>${heading}</h2><div class="product-ranges__slider"><p class="product-ranges__left">${left}</p><div class="product-ranges__middle" style="--level: ${level};"><svg><circle /></svg></div><p class="product-ranges__right">${right}</p></div></div>`;
const indicator=position=>`<div class="absolute rounded-full -translate-x-1/2" style="left: ${position}"><div class="rounded-full"></div></div>`;
const chart=(marker=indicator('20%'),left='Light Roast',right='Dark Roast')=>`<div class="product-block-comparative-scale"><div class="comparison-chart"><div><div>${left}<span class="sr-only">20%</span></div><div>${right}<span class="sr-only">80%</span></div></div><div class="chart"><div class="absolute left-[20%] w-0"></div><div class="absolute left-[40%] w-0"></div>${marker}</div></div></div>`;

test('a selected visible farmer trigger resolves only its exact matching public profile',()=>{
 const result=collect(profile());
 assert.equal(result.facts.length,7);assert.equal(result.facts.truncated,false);
 for(const value of ['Marta Solares','La Esperanza','Washed','El Sombrerito, San Jose Pinula,Guatemala','Catuai, Caturra, Bourbon','2.10 hectares'])
  assert.ok(result.facts.some(fact=>fact.value===value),value);
 assert.ok(result.facts.every(fact=>fact.source_url===source_url&&fact.source_type==='html'&&!fact.field));
 assert.ok(result.facts.every(fact=>fact.section==='Supplementary page panel / Linked farmer profile / Marta Solares'));
 assert.equal(result.roast_hint,'');
});
test('linked farmer details are review evidence and cannot populate canonical profile fields',()=>{
 const result=collect(profile());
 const snapshot=coffeeSourceReviewSnapshot({ok:true,source_url,fields:{name:'Current Coffee'},source_facts:mergeCoffeeSourceFacts(result.facts)});
 assert.deepEqual(snapshot.field_suggestions,{name:'Current Coffee'});
 assert.ok(snapshot.published_source_information.some(fact=>fact.value==='Catuai, Caturra, Bourbon'));
});
for(const [label,body] of [
 ['missing trigger',preview.replace(/<button[^>]*>[^<]*<\/button>/,'')+modal],
 ['hidden trigger',preview.replace('<button ','<button hidden ')+modal],
 ['CSS hidden trigger',preview.replace('<button ','<button style="display: none !important" ')+modal],
 ['mismatched preview name',preview.replace('Marta Solares','Another Farmer')+modal],
 ['mismatched dialog heading',preview+modal.replace('<h2>Marta Solares</h2>','<h2>Another Farmer</h2>')],
 ['duplicate target ID',preview+modal+modal],
 ['duplicate preview ID',preview+preview+modal],
 ['duplicate wrapper ID',preview+modal+'<div id="meet-farmers-inline"></div>'],
 ['ambiguous trigger attributes',preview.replace('data-mf-open=',`data-mf-open="${target}" data-mf-open=`)+modal],
 ['extra dialog heading',preview+modal.replace('</h2>','</h2><h2>Marta Solares</h2>')],
 ['hidden target ancestor',preview+'<div hidden>'+modal+'</div>'],
 ['CSS hidden target ancestor',preview+'<div style="visibility:hidden">'+modal+'</div>'],
 ['unrelated target ancestor',preview+'<div class="related-products">'+modal+'</div>'],
 ['hidden inner dialog',preview+modal.replace('<aside ','<aside hidden ')],
 ['wrong dialog role',preview+modal.replace('role="dialog"','role="complementary"')],
 ['script-only trigger','<script>'+preview+'</script>'+modal],
 ['comment-only trigger','<!--'+preview+'-->'+modal],
 ['form trigger','<form>'+preview+'</form>'+modal]
])test('farmer link rejects '+label,()=>assert.equal(collect(profile(body)).facts.length,0));

test('an unrelated raw profile cannot be linked by an absent selected-scope trigger',()=>{
 const raw=profile();
 assert.equal(collectSupplementaryCoffeePageFacts(raw,{selected_html:'<main><h1>Current Coffee</h1></main>',source_url}).facts.length,0);
 assert.equal(collect(profile('<div class="product-recommendations">'+preview+'</div>'+modal)).facts.length,0);
});
test('a target outside the exact farmer wrapper is excluded',()=>{
 const raw=profile(preview)+modal;
 assert.equal(collect(raw).facts.length,0);
});
test('opening one linked outer wrapper does not expose nested hidden, script or form content',()=>{
 const insert='<p hidden>secret hidden</p><p style="display:none">secret style</p><p aria-hidden="true">secret aria</p><script>secret script</script><form><p>secret form</p><input value="secret input"></form>';
 const raw=profile(preview+modal.replace('La Esperanza</p>','La Esperanza'+insert+'</p>'));
 const facts=collect(raw).facts;
 assert.ok(facts.some(fact=>fact.value==='La Esperanza'));assert.doesNotMatch(JSON.stringify(facts),/secret/);
});
test('oversized profile panels are withheld with an explicit truncation flag',()=>{
 const result=collect(profile(preview+modal.replace('La Esperanza','x'.repeat(33_000))));
 assert.equal(result.facts.length,0);assert.equal(result.facts.truncated,true);
});
test('only four distinct linked profiles are considered and additional profiles are marked truncated',()=>{
 const raw=profile(Array.from({length:5},(_,i)=>(preview+modal).replaceAll(target,'mf-1234-'+i)).join(''));
 const result=collect(raw);
 assert.equal(result.facts.filter(fact=>fact.label==='Farmer profile name').length,4);
 assert.equal(result.facts.truncated,true);
});
test('profile text is bounded, Unicode safe and retained across complete ordered chunks',()=>{
 const value='Source biography 👩🏽‍🌾 '.repeat(150).trim();
 const result=collect(profile(preview+modal.replace('Marta is the matriarch of coffee farming in Concepcion Pinula.',value)));
 const chunks=result.facts.filter(fact=>fact.label.startsWith('How We Met Marta'));
 assert.equal(chunks.map(fact=>fact.value).join(' '),value);
 const exported=coffeeSourceReviewSnapshot({ok:true,source_url,source_facts:mergeCoffeeSourceFacts(result.facts)}).published_source_information;
 assert.equal(exported.filter(fact=>fact.label.startsWith('How We Met Marta')).map(fact=>fact.value).join(' '),value);
 assert.ok(chunks.every(fact=>fact.value.length<=1600&&fact.value.isWellFormed()));
 assert.equal(result.facts.truncated,false);
});

test('Sweet Bloom-style markers retain distinct exact property values and printed endpoints only',()=>{
 const result=collect('<main><h1>Current Coffee</h1>'+range()+range('Roast Level','2','Light','Medium')+'</main>');
 assert.deepEqual(result.facts.map(({label,value})=>({label,value})),[
  {label:'Experience graphic marker',value:'--level: 4; printed endpoints: Comfort / Adventure'},
  {label:'Roast Level graphic marker',value:'--level: 2; printed endpoints: Light / Medium'}
 ]);
 assert.ok(result.facts.every(fact=>!fact.field));assert.equal(result.roast_hint,'');
});
test('CSS variable values do not infer a scale maximum or canonical roast category',()=>{
 const result=collect('<main>'+range('Roast Level','2','Light','Medium')+'</main>');
 assert.doesNotMatch(JSON.stringify(result),/Light-Medium|Medium-Light|out of|maximum|"field"/);
});
for(const [label,fragment] of [
 ['unrelated chart heading',range('Acidity')],
 ['hidden range',range().replace('<div ','<div hidden ')],
 ['other-product range','<section class="related-products">'+range()+'</section>'],
 ['style in another attribute',range().replace('style="--level: 4;"',"title='style=\"--level: 4;\"'")],
 ['duplicate CSS level',range().replace('--level: 4;','--level: 4; --level: 2;')],
 ['duplicate style attributes',range().replace('style="--level: 4;"','style="--level: 4;" style="--level: 2;"')],
 ['missing endpoint',range().replace('<p class="product-ranges__right">Adventure</p>','')],
 ['conflicting markers',range().replace('</svg></div>','</svg></div><div class="product-ranges__middle" style="--level:2"></div>')]
])test('graphic variable reader rejects '+label,()=>assert.equal(collect(fragment).facts.length,0));

test('a real selected Be Bright-style indicator preserves 20% and literal Light/Dark endpoints',()=>{
 const result=collect(chart());
 assert.equal(result.facts.length,1);
 assert.equal(result.facts[0].value,'left: 20%; printed endpoints: Light Roast / Dark Roast');
 assert.match(result.roast_hint,/left: 20%/);assert.match(result.roast_hint,/not a supported roast category/);
 assert.equal(result.facts[0].field,undefined);
});
test('literal graphic hint survives alongside an existing explicit roast description',()=>{
 const result=collect('<main><h1>Current Coffee</h1><p>Roast Level: Light</p>'+chart()+'</main>');
 assert.match(result.roast_hint,/20%/);assert.equal(result.facts.length,1);
});
for(const [label,fragment] of [
 ['screen-reader percentages and decorative ticks only',chart('')],
 ['other-product chart','<section class="product-recommendations">'+chart()+'</section>'],
 ['non-roast endpoints',chart(indicator('20%'),'Comfort','Adventure')],
 ['conflicting selected markers',chart(indicator('20%')+indicator('80%'))],
 ['style text inside another attribute',chart(indicator('20%').replace('style="left: 20%"',"title='style=\"left: 20%\"'"))],
 ['out-of-range position',chart(indicator('101%'))],
 ['negative position',chart(indicator('-20%'))],
 ['duplicate CSS position',chart(indicator('20%;left:80%'))],
 ['duplicate style attribute',chart(indicator('20%').replace('style="left: 20%"','style="left:20%" style="left:80%"'))],
 ['CSS-hidden indicator',chart(indicator('20%; display: none'))],
 ['inaccessible indicator',chart(indicator('20%').replace('<div ','<div aria-hidden="true" '))],
 ['reversed endpoints',chart(indicator('20%'),'Dark Roast','Light Roast')],
 ['decorative zero-width tick',chart('<div class="marker w-0" style="left:20%"></div>')]
])test('roast position reader rejects '+label,()=>{
 const result=collect(fragment);assert.equal(result.facts.length,0);assert.equal(result.roast_hint,'');
});
test('different selected roast charts retain conflicting literal facts without a single hint',()=>{
 const result=collect(chart()+chart(indicator('80%')));
 assert.equal(result.facts.length,2);assert.ok(result.facts.every(fact=>fact.conflicting));assert.equal(result.roast_hint,'');
});
test('malformed or oversized HTML is bounded and credential-bearing URLs never become provenance',()=>{
 const result=collectSupplementaryCoffeePageFacts('x'.repeat(2_000_001),{selected_html:chart(),source_url});
 assert.equal(result.facts.length,0);assert.equal(result.facts.truncated,true);
 for(const url of ['http://roaster.example/products/a','https://name:secret@roaster.example/products/a','not a url']){
  assert.equal(collectSupplementaryCoffeePageFacts(chart(),{selected_html:chart(),source_url:url}).facts.length,0);
  assert.equal(collectSupplementaryStructuredCoffeeFacts({gtin14:'00850085566263'},{source_url:url}).length,0);
 }
});

test('GTIN-8, GTIN-12 and GTIN-14 preserve exact string identifiers with leading zeroes',()=>{
 const facts=collectSupplementaryStructuredCoffeeFacts({gtin8:'01234567',gtin12:'001234567890',gtin14:'00850085566263'},{source_url});
 assert.deepEqual(facts.map(fact=>[fact.label,fact.value,fact.source_path]),[
  ['GTIN-8','01234567','/gtin8'],['GTIN-12','001234567890','/gtin12'],['GTIN-14','00850085566263','/gtin14']
 ]);
 assert.ok(facts.every(fact=>fact.source_url===source_url&&!fact.field));
});
test('GTINs are not manufactured from numbers, mismatched widths or unrelated identifiers',()=>{
 const facts=collectSupplementaryStructuredCoffeeFacts({gtin8:1234567,gtin12:'1234',gtin14:' 00850085566263 ',isbn:'00850085566263'},{source_url});
 assert.equal(facts.length,0);
});
test('catalog type is literal review evidence and cannot become a caffeine or processing assertion',()=>{
 const facts=collectSupplementaryStructuredCoffeeFacts({type:'Decaf & Half Caff',product_type:'Signature blends',tags:['Cloudhopper','Coffee']},{source_url:source_url+'.js'});
 assert.deepEqual(facts.map(fact=>[fact.label,fact.value,fact.source_path]),[
  ['Published catalog category (type)','Decaf & Half Caff','/type'],
  ['Published catalog category (product_type)','Signature blends','/product_type']
 ]);
 assert.ok(facts.every(fact=>!fact.field));
 const exported=coffeeSourceReviewSnapshot({ok:true,source_url,fields:{name:'Current Coffee'},source_facts:mergeCoffeeSourceFacts(facts)});
 assert.deepEqual(exported.field_suggestions,{name:'Current Coffee'});
 assert.equal(exported.published_source_information.length,2);
});
test('structured helper ignores schemas, inherited keys, markup and secret fields',()=>{
 const data=Object.assign(Object.create({gtin14:'00850085566263'}),{'@type':'Product',type:'<script>secret</script>',csrf_token:'secret'});
 assert.equal(collectSupplementaryStructuredCoffeeFacts(data,{source_url}).length,0);
 const oversized=collectSupplementaryStructuredCoffeeFacts({type:'x'.repeat(1601)},{source_url});
 assert.equal(oversized.length,0);assert.equal(oversized.truncated,true);
});
