import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts as extract} from '../src/server/coffee-page-metadata.mjs';

const source_url='https://roaster.example/products/current';
const main=body=>'<main><h1>Current Coffee</h1>'+body+'</main>';
const json=data=>'<script type="application/ld+json">'+JSON.stringify(data)+'</script>';
const product=extra=>({'@type':'Product',name:'Current Coffee',url:source_url,...extra});
const parse=(body='',extra={})=>extract(json(product(extra))+main(body),{source_url});
const values=(result,label)=>result.source_facts?.filter(fact=>fact.label.toLowerCase()===label.toLowerCase()).map(fact=>fact.value)||[];

test('an unrelated unlinked Product cannot replace the visible current coffee or donate its facts',()=>{
 const result=extract(json({'@type':'Product',name:'Other Coffee',additionalProperty:[{name:'Variety',value:'Robusta'}]})+main(''),{source_url});
 assert.equal(result.ok,true);assert.equal(result.fields.name,'Current Coffee');
 assert.equal(result.fields.variety,undefined);assert.ok(!JSON.stringify(result.source_facts||[]).includes('Robusta'));
});

test('same-name unlinked structured evidence can enrich a linked current Product',()=>{
 const result=extract(json([product({}),{'@type':'Product',name:'Current Coffee',additionalProperty:[{name:'Variety',value:'Chiroso'}]}])+main(''),{source_url});
 assert.equal(result.fields.variety,'Chiroso');assert.deepEqual(values(result,'Variety'),['Chiroso']);
});

test('query product identifiers remain identity-sensitive while tracking parameters do not',()=>{
 const url='https://roaster.example/coffee?id=current';
 const other=product({name:'Other Coffee',url:'https://roaster.example/coffee?id=other',additionalProperty:[{name:'Variety',value:'Robusta'}]});
 const result=extract(json(other)+main(''),{source_url:url});
 assert.ok(!result.ok||!result.fields.variety);
 const tracked=extract(json(product({additionalProperty:[{name:'Variety',value:'Chiroso'}]}))+main(''),{source_url:source_url+'?srsltid=abc&utm_source=search'});
 assert.equal(tracked.fields.variety,'Chiroso');
});

test('ListItem-wrapped Products and their explicit URL-like @id remain readable',()=>{
 const result=extract(json({'@type':'ItemList',itemListElement:[{'@type':'ListItem',item:{...product({}),url:undefined,'@id':source_url+'#product',additionalProperty:{name:'Variety',value:'Chiroso'}}}]}),{source_url});
 assert.equal(result.ok,true);assert.equal(result.fields.variety,'Chiroso');
});

test('a later exact-page Product is not lost behind thirty unrelated recommendations',()=>{
 const recommendations=Array.from({length:35},(_,i)=>product({name:'Other '+i,url:'https://roaster.example/products/other-'+i}));
 const result=extract(json([...recommendations,product({additionalProperty:[{name:'Variety',value:'Bourbon Ají'}]})])+main(''),{source_url});
 assert.equal(result.fields.variety,'Bourbon Ají');
});

test('all structured containers contribute and empty metafields cannot shadow attributes',()=>{
 const data={title:'Current Coffee',handle:'current',metafields:{},metadata:{origin:'Colombia'},
  attributes:[{name:'Variety',options:['Chiroso','Bourbon Ají']}],options:[{name:'Process',values:['Washed']}]};
 const result=extract('<script type="application/json" id="product-data">'+JSON.stringify(data)+'</script>'+main(''),{source_url});
 assert.equal(result.fields.variety,'Chiroso, Bourbon Ají');assert.equal(result.fields.origin,'Colombia');assert.equal(result.fields.process,'Washed');
});

test('contradictory structured containers withhold the field and retain both original values',()=>{
 const result=parse('',{metafields:{variety:'Chiroso'},attributes:{variety:'Robusta'}});
 assert.equal(result.fields.variety,undefined);assert.ok(result.conflicts.includes('variety'));
 assert.deepEqual(new Set(values(result,'variety')),new Set(['Chiroso','Robusta']));
 assert.ok(result.source_facts.filter(fact=>fact.field==='variety').every(fact=>fact.conflicting));
});

test('structured cultivar arrays preserve six or more entries without a five-value cutoff',()=>{
 const all=['Cultivar A','Cultivar B','Cultivar C','Cultivar D','Cultivar E','Cultivar F','Cultivar G'];
 const result=parse('',{additionalProperty:[{name:'Varieties',value:all}]});
 assert.equal(result.fields.variety,all.join(', '));
});

test('overlong cultivar arrays are retained for review without a truncated canonical subset',()=>{
 const all=Array.from({length:30},(_,i)=>'Explicit cultivar '+i);
 const result=parse('',{additionalProperty:[{name:'Varieties',value:all}]});
 assert.equal(result.fields.variety,undefined);assert.equal(values(result,'Varieties')[0],all.join(', '));
});

test('soft 404 and challenge headings cannot become fallback coffee names',()=>{
 for(const title of ['Page not found','404 Not Found','Access denied','Just a moment...','Please enable JavaScript']){
  const result=extract('<main><h1>'+title+'</h1></main>',{source_url});assert.equal(result.ok,false,title);
 }
});

test('hidden generic content and named unrelated components cannot supply coffee facts',()=>{
 for(const body of [
  '<div hidden><p>Variety: Robusta</p></div>',
  '<div aria-hidden="true"><p>Variety: Robusta</p></div>',
  '<div class="recommendations"><p>Variety: Robusta</p></div>',
  '<section><h2>You might also like</h2><p>Variety: Robusta</p></section>',
  '<div class="complementary-products"><p>Variety: Robusta</p></div>',
  '<textarea><p>Variety: Robusta</p></textarea>'
 ]){
  const result=parse(body);assert.equal(result.fields.variety,undefined,body);
  assert.ok(!JSON.stringify(result.source_facts||[]).includes('Robusta'));
 }
});

test('controlled hidden product panels retain facts and a hidden unrelated control cannot grant scope',()=>{
 const result=parse('<button aria-controls="specs">Coffee details</button><div hidden id="specs"><p>Variety: Chiroso</p></div>');
 assert.equal(result.fields.variety,'Chiroso');assert.deepEqual(values(result,'Variety'),['Chiroso']);
 const hiddenControl=parse('<div hidden><button aria-controls="unowned">Coffee details</button></div><div hidden id="unowned"><p>Variety: Robusta</p></div>');
 assert.equal(hiddenControl.fields.variety,undefined);
 const quoted=parse('<div title="aria-hidden=\'true\'"><p>Variety: Chiroso</p></div>');
 assert.equal(quoted.fields.variety,'Chiroso');
});

test('quoted angle brackets cannot break structural card ownership or numeric cultivar labels',()=>{
 const result=parse('<div title="this > stays in the attribute"><h3>74158</h3><p>Variety</p></div>');
 assert.equal(result.fields.variety,'74158');
 const late=parse('<svg><path d="'+'M0 0 '.repeat(15000)+'"/></svg><div><h3>74110, 74112</h3><p>Cultivars</p></div>');
 assert.equal(late.fields.variety,'74110, 74112');
});

test('a more specific compatible Origin enriches Country without requiring a Region label',()=>{
 for(const [properties,body] of [
  [[{name:'Country',value:'Colombia'}],'<p>Origin: Huila, Colombia</p>'],
  [[{name:'Origin',value:'Huila, Colombia'}],'<p>Country: Colombia</p>']
 ]){
  const result=parse(body,{additionalProperty:properties});assert.equal(result.fields.origin,'Huila, Colombia');assert.equal(result.conflicts,undefined);
 }
});

test('same-country conflicting regions and explicit producers are withheld with review alternatives',()=>{
 for(const [label,field,first,last] of [['Origin','origin','Huila, Colombia','Cauca, Colombia'],['Producer','producer','Ana Torres','Beatriz Morales']]){
  const result=parse('<p>'+label+': '+last+'</p>',{additionalProperty:[{name:label,value:first}]});
  assert.equal(result.fields[field],undefined);assert.ok(result.conflicts.includes(field));
  assert.deepEqual(new Set(values(result,label)),new Set([first,last]));
 }
});

test('harvest and lot are complementary while contradictions within either label stay final',()=>{
 const result=parse('<p>Harvest: 2026</p><p>Lot: 7</p>');
 assert.equal(result.fields.release_label,'Harvest 2026; Lot 7');assert.equal(result.conflicts,undefined);
 const conflict=parse('<p>Harvest: 2026</p><p>Lot: 7</p><p>Harvest: 2025</p><p>Lot: 7</p>');
 assert.equal(conflict.fields.release_label,undefined);assert.ok(conflict.conflicts.includes('release_label'));
});

test('explicit altitude conflicts do not survive through later direct fallbacks',()=>{
 const result=parse('<p>Elevation: 1800m</p><p>Elevation: 1900 meters</p><p>This coffee is grown at 1800 meters.</p>');
 assert.equal(result.fields.elevation_m,undefined);assert.ok(result.conflicts.includes('elevation_m'));
 const equivalent=parse('<p>Elevation: 1,900 masl</p><p>Altitude: 1900 meters</p>');
 assert.equal(equivalent.fields.elevation_m,'1,900 masl');assert.equal(equivalent.conflicts,undefined);
});

test('conflicting farm and rest details remain reviewable without a misleading first-value summary',()=>{
 const result=parse('<p>Farm: Finca Aurora</p><p>Farm: Finca Luna</p><p>Recommended Rest: 7 days</p><p>Recommended Rest: 21 days</p>');
 assert.equal(result.fields.producer,undefined);assert.equal(result.roaster_details?.farm,undefined);assert.equal(result.roaster_details?.recommended_rest,undefined);
 assert.deepEqual(new Set(values(result,'Farm')),new Set(['Finca Aurora','Finca Luna']));
 assert.ok(result.source_facts.filter(fact=>/^(?:Farm|Recommended Rest)$/i.test(fact.label)).every(fact=>fact.conflicting));
 const named=parse('<p>Farm: Finca Aurora</p><p>Farm: Finca Luna</p><p>Producer: Ana Torres</p><p>Recommended Rest: 2–3 weeks</p>');
 assert.equal(named.fields.producer,'Ana Torres');assert.equal(named.roaster_details?.farm,undefined);assert.equal(named.roaster_details.recommended_rest,'2–3 weeks');
});

test('legacy nearby and story paths cannot resurrect negated techniques or general growing altitudes',()=>{
 const result=parse('<h2>The Story</h2><p>This coffee was not an anaerobic natural. It was not a natural process. Coffee is generally grown at 1800 meters.</p>');
 assert.equal(result.fields.process,undefined);assert.equal(result.fields.elevation_m,undefined);
 assert.equal(result.roaster_details?.processing_detail,undefined);
 assert.ok(result.source_facts.some(fact=>fact.value.includes('not an anaerobic natural')));
});

test('long review evidence exposes truncation while preserving canonical source scope',()=>{
 const result=parse('<p>'+('This is a source-published lot description. '.repeat(1800))+'</p>',{description:'Published description. '.repeat(5000)});
 assert.equal(result.source_facts_truncated,true);assert.ok(result.source_facts.length<=128);
 assert.ok(result.source_facts.every(fact=>fact.value.length<=1600));
 const structural=parse('<p>Variety: Chiroso</p>'+'<div>'.repeat(180)+'<p>Process: Robusta</p>');
 assert.equal(structural.source_facts_truncated,true);assert.equal(structural.fields.variety,'Chiroso');
});
