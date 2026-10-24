import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractShopifyAjaxData,shopifyProductRequest} from '../src/server/coffee-shopify-ajax.mjs';

// Original retained product-endpoint facts; these focused controls do not
// replace the unchanged complete frozen corpus or its expected answers.
const stories=[
  {
    "case_id": "pinewoodcoffeeco-com__hacienda-rio-negro-7dec66a2",
    "name": "Hacienda Rio Negro",
    "source": "In Costa Rica’s southern Coto Brus region, just beside the vast forests of Parque Nacional La Amistad, Hacienda Río Negro thrives under the same stewardship as Hacienda La Minita. Grown between 1,000 and 1,300 meters and processed at the farm’s own Beneficio Río Negro mill, this washed coffee reflects the same devotion to quality, sustainability, and community care that defines its sister estate. In the cup, gentle sweetness meets milky texture—cantelope and brown sugar layered with notes of toffee. Río Negro is a softer expression of Costa Rica’s craft, rooted in the same tradition of excellence that began at La Minita.",
    "producer": "Hacienda Río Negro"
  },
  {
    "case_id": "www-ghosttowncoffee-com__rwanda-sholi-coop-natural-copy-b877526a",
    "name": "Rwanda - Sholi Cooperative - Washed",
    "source": "Abateraninkunga ba Sholi (\"Sholi\") means “Mutual Assistance.” This Coop is located in the Muhanga District near Lake Kiva, where they have been producing coffee for a decade. It focuses heavily on community support and nearly half of the members are women. The Coop has also completed their Organic Certification and is now a Certified Organic offering from us. Tasting Notes: Baker's Chocolate, Raspberry, Toasted Coconut, Vanilla Altitude: 1800-2000 masl Varietal: Bourbon Process: Washed Farm/Region: Muganga District, Southern Province Certified Organic by the Montana Department of Agriculture.",
    "producer": "Abateraninkunga ba Sholi"
  },
  {
    "case_id": "www-sidecarcoffee-com__uganda-rwenzori-d90536fa",
    "name": "Uganda Rwenzori Natural",
    "source": "This natural-process coffee comes from the Rwenzori region of Uganda, a collection from smallholder producers. Cherries are selectively picked and brought to the processing station the same day, separated by flotation, and dried on tables for 21 to 35 days. Dried cherries then go to Kampala for milling and export. Coffee is typically harvested here from September to December. The cup: dried berry, caramel, and fresh berry flavors, with winey lactic acidity and fruit-like sweetness.",
    "producer": "smallholder producers"
  },
  {
    "case_id": "vtartisan-com__sumatra-gayo-2f774ec2",
    "name": "Sumatra Gayo",
    "source": "This popular Indonesian coffee is from a Co-op we have worked with for years, and is in the Gayo mountain region of Aceh. The beans are wet hulled just for us producing beautifully rich, full bodied coffee that is chocolaty, licorice-like with bold, earthy undertones. Notes: Farm Direct Roast: Medium",
    "producer": "Co-op"
  }
];

const source_url='https://roaster.examplecoffee.com/products/current-coffee';
const other_url='https://roaster.examplecoffee.com/products/another-coffee';
const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const paragraph=value=>'<p>'+escape(value)+'</p>';
const parse=(name,body)=>extractPublicCoffeeFacts('<main><h1>'+escape(name)+'</h1>'+body+'</main>',{source_url});
const endpoint=(name,body)=>{
 const request=shopifyProductRequest(source_url);
 assert.ok(request,'public fixture URL must reach the real selected-product endpoint parser');
 return extractShopifyAjaxData({title:name,handle:'current-coffee',description:body},request);
};
const retained=(result,value)=>result.source_facts?.some(fact=>String(fact.value).includes(value));
const [pinewood,sholi,sidecar,artisan]=stories;
for(const story of stories)test('literal selected source recovers '+story.case_id,()=>{
 for(const result of [parse(story.name,paragraph(story.source)),endpoint(story.name,paragraph(story.source))]){
  assert.equal(result.fields.producer,story.producer);
  assert.equal(result.roaster_details.named_producer,story.producer);
  assert.ok(retained(result,story.producer));
 }
 const selectedEndpoint=endpoint(story.name,paragraph(story.source));
 assert.ok(selectedEndpoint.source_facts.some(fact=>fact.source_type==='product_json'&&fact.source_url===source_url+'.js'));
});

test('the same literal producer relationships work with independent names and roles',()=>{
 const replacements=[
  {name:'Hacienda Cedro',source:pinewood.source.replaceAll('Hacienda Río Negro','Hacienda Cedro').replaceAll('Hacienda La Minita','Hacienda Luna'),producer:'Hacienda Cedro'},
  {name:'Rwanda - Cedro Cooperative - Washed',source:sholi.source.replaceAll('Abateraninkunga ba Sholi','Solidaridad de Cedro').replaceAll('"Sholi"','"Cedro"'),producer:'Solidaridad de Cedro'},
  {name:'Current Coffee',source:sidecar.source.replace('smallholder producers','local farmers'),producer:'local farmers'},
  {name:'Current Coffee',source:artisan.source.replace('a Co-op','a Cooperative'),producer:'Cooperative'}
 ];
 for(const row of replacements)assert.equal(parse(row.name,paragraph(row.source)).fields.producer,row.producer);
});

test('a quoted cooperative alias needs the immediate current producing role and selected identity',()=>{
 const definition='Abateraninkunga ba Sholi ("Sholi") means “Mutual Assistance.”';
 const role='This Coop is located in the Muhanga District near Lake Kiva, where they have been producing coffee for a decade.';
 assert.equal(parse(sholi.name,paragraph(definition)+paragraph(role)).fields.producer,sholi.producer);
 for(const source of [
  definition,
  definition+' This Coop is located in the Muhanga District near Lake Kiva.',
  definition+' '+role.replace('producing coffee','exporting pottery'),
  definition+' Another cooperative operates nearby. '+role,
  role
 ])assert.equal(parse(sholi.name,paragraph(source)).fields.producer,undefined,source);
 for(const name of ['Rwanda - Other Cooperative - Washed','Sholi and Cedro Cooperative','Sholi Cooperative Decaf'])
  assert.equal(parse(name,paragraph(sholi.source)).fields.producer,undefined,name);
});

test('ambiguous definitions of the same selected cooperative alias stay unresolved',()=>{
 const other=sholi.source.replace('Abateraninkunga ba Sholi','Solidaridad de Cedro');
 const result=parse(sholi.name,paragraph(sholi.source)+paragraph(other));
 assert.equal(result.fields.producer,undefined);
 assert.ok(retained(result,'Abateraninkunga ba Sholi'));
 assert.ok(retained(result,'Solidaridad de Cedro'));
});

test('historical denied conditional and educational cooperative relations are not current credits',()=>{
 for(const source of [
  'Previously '+sholi.source,
  'For example, '+sholi.source,
  sholi.source.replace('This Coop is located','This Coop was located'),
  sholi.source.replace('have been producing coffee for a decade','do not produce coffee'),
  sholi.source.replace('have been producing coffee for a decade','have been producing coffee if we buy from this cooperative'),
  sholi.source.replace('have been producing coffee for a decade','have been producing coffee when this source is selected')
 ])assert.equal(parse(sholi.name,paragraph(source)).fields.producer,undefined,source);
});

test('selected farm corroboration keeps the original name and excludes its sister estate',()=>{
 const result=parse(pinewood.name,paragraph(pinewood.source));
 assert.equal(result.fields.producer,'Hacienda Río Negro');
 assert.ok(retained(result,'Hacienda La Minita'));
 for(const name of ['Hacienda La Minita','Hacienda Otro','Hacienda Rio Negro Decaf'])
  assert.equal(parse(name,paragraph(pinewood.source)).fields.producer,undefined,name);
 const separated=pinewood.source.replace('La Minita. Grown','La Minita.</p><p>Grown');
 assert.equal(parse(pinewood.name,'<p>'+separated+'</p>').fields.producer,'Hacienda Río Negro');
});

test('shared stewardship or a processing site alone does not establish the selected farm producer',()=>{
 const first=pinewood.source.split('. ')[0]+'.';
 for(const source of [
  first,
  pinewood.source.replace('Grown between 1,000 and 1,300 meters and processed','Processed'),
  pinewood.source.replace('Grown between 1,000 and 1,300 meters','Grown at Finca Other'),
  pinewood.source.replace('at the farm’s own','at another farm’s'),
  pinewood.source.replace('La Minita. Grown','La Minita. Another farm is nearby. Grown'),
  pinewood.source.replace('this washed coffee','another washed coffee')
 ])assert.equal(parse(pinewood.name,paragraph(source)).fields.producer,undefined,source);
});

test('conditional historical and denied farm relationships remain withheld',()=>{
 for(const source of [
  'Previously '+pinewood.source,
  'For example, '+pinewood.source,
  pinewood.source.replace('thrives under','does not thrive under'),
  pinewood.source.replace('Hacienda La Minita.','Hacienda La Minita if this farm is selected.'),
  pinewood.source.replace('this washed coffee reflects','this washed coffee might reflect'),
  pinewood.source.replace('its sister estate.','its sister estate if harvest availability permits.')
 ])assert.equal(parse(pinewood.name,paragraph(source)).fields.producer,undefined,source);
});

test('the anonymous collection remains literal without invented regional or organizational naming',()=>{
 const result=parse(sidecar.name,paragraph(sidecar.source));
 assert.equal(result.fields.producer,'smallholder producers');
 assert.equal(result.fields.origin,'Rwenzori, Uganda');
 assert.ok(retained(result,'the Rwenzori region of Uganda, a collection from smallholder producers'));
 const other=sidecar.source.replace('smallholder producers','local farmers');
 assert.equal(parse(sidecar.name,paragraph(sidecar.source)+paragraph(other)).fields.producer,undefined);
});

test('an anonymous collection requires an unconditional current coffee source',()=>{
 for(const source of [
  sidecar.source.replace('This natural-process coffee','Another natural-process coffee'),
  sidecar.source.replace('This natural-process coffee','A typical natural-process coffee'),
  'Previously '+sidecar.source,
  'For example, '+sidecar.source,
  sidecar.source.replace('comes from','might come from'),
  sidecar.source.replace('smallholder producers.','smallholder producers if they supply this batch.'),
  sidecar.source.replace('smallholder producers.','smallholder producers or independent farmers.'),
  sidecar.source.replace('smallholder producers','collectors')
 ])assert.equal(parse(sidecar.name,paragraph(source)).fields.producer,undefined,source);
});

test('a literal anonymous cooperative reaches producer only through its proved current relation',()=>{
 const result=parse(artisan.name,paragraph(artisan.source));
 assert.equal(result.fields.producer,'Co-op');
 assert.equal(Object.hasOwn(result,'literal_anonymous_producer'),false);
 assert.ok(retained(result,'a Co-op we have worked with for years'));
 for(const body of [
  '<p>Producer: Co-op</p>',
  '<p>Co-op</p>',
  '<table><tr><th>Producer</th><td>Co-op</td></tr></table>',
  '<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:artisan.name,url:source_url,additionalProperty:[{name:'Producer',value:'Co-op'}]})+'</script>',
  paragraph('We have worked with a Co-op for years.')
 ])assert.equal(parse(artisan.name,body).fields.producer,undefined,body);
});

test('historical denied possible and differently scoped anonymous cooperative relations stay blank',()=>{
 for(const source of [
  artisan.source.replace('This popular Indonesian coffee','Another popular Indonesian coffee'),
  artisan.source.replace('This popular Indonesian coffee','A typical Indonesian coffee'),
  'Previously '+artisan.source,
  'For example, '+artisan.source,
  artisan.source.replace('is from','is not from'),
  artisan.source.replace('is from','might be from'),
  artisan.source.replace('for years,','for years if we select this source,'),
  artisan.source.replace('we have worked','we have never worked'),
  artisan.source.replace('Co-op','collector'),
  artisan.source.replace('for years, and is in the Gayo mountain region of Aceh.','for years and another cooperative supplying this batch.'),
  artisan.source.replace('for years, and is in the Gayo mountain region of Aceh.','for years, and is in Aceh or another source region.')
 ])assert.equal(parse(artisan.name,paragraph(source)).fields.producer,undefined,source);
});

test('an explicit producer retains priority and genuine labeled contradictions stay conflicts',()=>{
 for(const story of stories){
  const selected=parse(story.name,'<p>Producer: Ana Torres</p>'+paragraph(story.source));
  assert.equal(selected.fields.producer,'Ana Torres');
  const conflict=parse(story.name,'<p>Producer: Ana Torres</p><p>Producer: Maria Lopez</p>'+paragraph(story.source));
  assert.equal(conflict.fields.producer,undefined,story.case_id);
  assert.ok(conflict.conflicts?.includes('producer'),story.case_id);
 }
});

test('related cards education and a different selected endpoint cannot supply the new producer',()=>{
 for(const story of stories){
  for(const body of [
   '<aside class="related-products">'+paragraph(story.source)+'</aside>',
   '<section><h2>Coffee Education</h2>'+paragraph(story.source)+'</section>',
   '<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:story.name,url:other_url,description:story.source})+'</script>'
  ])assert.equal(parse(story.name,body).fields.producer,undefined,story.case_id);
  const request=shopifyProductRequest(source_url);
  assert.equal(extractShopifyAjaxData({title:story.name,handle:'another-coffee',description:paragraph(story.source)},request),null);
 }
});

test('a partial single-source relationship is not the complete producer of a current blend',()=>{
 for(const story of stories){
  for(const introduction of [
   'This coffee is a blend of two components.',
   'This coffee blends two different components.',
   'Our current offering is a blend.'
  ])assert.equal(parse(story.name,paragraph(introduction)+paragraph(story.source)).fields.producer,undefined,story.case_id+': '+introduction);
  assert.equal(parse(story.name+' Blend',paragraph(story.source)).fields.producer,undefined,story.case_id);
 }
});

test('ordinary selected product-story headings keep all four literal producer relations',()=>{
 for(const story of stories){
  for(const heading of ['Coffee Details','Our Coffee','Producer Story'])
   assert.equal(parse(story.name,'<section><h2>'+heading+'</h2>'+paragraph(story.source)+'</section>').fields.producer,story.producer,story.case_id+': '+heading);
 }
});

test('a new cooperative pronoun cannot cross an intervening heading',()=>{
 const definition='Abateraninkunga ba Sholi ("Sholi") means “Mutual Assistance.”';
 const role='This Coop is located in the Muhanga District, where they have been producing coffee for a decade.';
 for(const tag of ['h2','h3'])for(const heading of ['Other Cooperative','Cooperative Details'])
  assert.equal(parse(sholi.name,paragraph(definition)+'<'+tag+'>'+heading+'</'+tag+'>'+paragraph(role)).fields.producer,undefined,tag+' '+heading);
 assert.equal(parse(sholi.name,'<h2>Producer Story</h2>'+paragraph(definition)+paragraph(role)).fields.producer,sholi.producer);
});

test('a selected farm relationship cannot cross an intervening product or detail heading',()=>{
 const first=pinewood.source.split('. ')[0]+'.';
 const rest=pinewood.source.slice(first.length).trim();
 for(const tag of ['h2','h3'])for(const heading of ['Other coffee','Processing Details'])
  assert.equal(parse(pinewood.name,paragraph(first)+'<'+tag+'>'+heading+'</'+tag+'>'+paragraph(rest)).fields.producer,undefined,tag+' '+heading);
 assert.equal(parse(pinewood.name,'<h2>Farm Story</h2>'+paragraph(first)+paragraph(rest)).fields.producer,pinewood.producer);
});

test('historical and other-source headings keep new producer relationships out of current fields',()=>{
 for(const story of stories)for(const heading of ['Previous year','Last harvest','Farm history','Other coffee']){
  assert.equal(parse(story.name,'<h2>'+heading+'</h2>'+paragraph(story.source)).fields.producer,undefined,story.case_id+' '+heading);
  assert.equal(parse(story.name,'<h2>'+heading+'</h2><h3>Producer Story</h3>'+paragraph(story.source)).fields.producer,undefined,story.case_id+' nested '+heading);
 }
});

test('a later current section can establish its own complete producer relation',()=>{
 for(const story of stories){
  const body='<h2>Previous year</h2><p>A former offering.</p><h2>Current Producer</h2>'+paragraph(story.source);
  assert.equal(parse(story.name,body).fields.producer,story.producer,story.case_id);
 }
});

test('an explicit anonymous source cannot contradict the selected literal country',()=>{
 for(const story of [sidecar,artisan]){
  assert.equal(parse('Guatemala Coffee',paragraph(story.source)).fields.producer,undefined,story.case_id+' title');
  assert.equal(parse('Current Coffee','<p>Origin: Guatemala</p>'+paragraph(story.source)).fields.producer,undefined,story.case_id+' origin');
  assert.equal(parse('Current Coffee','<p>Country: Guatemala</p>'+paragraph(story.source)).fields.producer,undefined,story.case_id+' country');
 }
 assert.equal(parse('Current Coffee','<p>Origin: Uganda</p>'+paragraph(sidecar.source)).fields.producer,'smallholder producers');
 assert.equal(parse('Current Coffee','<p>Origin: Indonesia</p>'+paragraph(artisan.source)).fields.producer,'Co-op');
});

test('the selected farm relationship preserves a contradictory explicit country as unresolved source',()=>{
 const result=parse(pinewood.name,'<p>Country: Guatemala</p>'+paragraph(pinewood.source));
 assert.equal(result.fields.producer,undefined);
 assert.ok(retained(result,'Costa Rica'));
 assert.ok(retained(result,'Guatemala'));
});

test('a branded selected product cannot accept a country-qualified new producer after origin conflict',()=>{
 const labels='<p>Origin: Kenya</p><p>Origin: Peru</p>';
 const quote='This popular Indonesian coffee is from a Co-op we have worked with for years.';
 for(const body of [labels+paragraph(quote),paragraph(quote)+labels]){
  for(const result of [parse('Summer Joy',body),endpoint('Summer Joy',body)]){
   assert.equal(result.fields.producer,undefined);
   assert.equal(result.fields.origin,undefined);
   assert.ok(result.conflicts?.includes('origin'));
   assert.ok(retained(result,quote));
   assert.ok(retained(result,'Kenya'));
   assert.ok(retained(result,'Peru'));
  }
 }
});

test('an early selected Product description cannot bypass later visible origin contradictions',()=>{
 const quote='This popular Indonesian coffee is from a Co-op we have worked with for years.';
 const json='<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:'Summer Joy',url:source_url,description:quote})+'</script>';
 const result=parse('Summer Joy',json+'<p>Origin: Kenya</p><p>Origin: Peru</p>');
 assert.equal(result.fields.producer,undefined);
 assert.ok(result.conflicts?.includes('origin'));
 assert.ok(retained(result,quote));
});

test('independent producer evidence without a country assertion survives an unrelated origin conflict',()=>{
 const labels='<p>Origin: Kenya</p><p>Origin: Peru</p>';
 const quote='This coffee is from a Co-op we have worked with for years.';
 for(const result of [parse('Summer Joy',labels+paragraph(quote)),endpoint('Summer Joy',labels+paragraph(quote))]){
  assert.equal(result.fields.producer,'Co-op');
  assert.ok(result.conflicts?.includes('origin'));
 }
 const explicit=parse('Summer Joy',labels+'<p>Producer: Ana Torres</p>'+paragraph(artisan.source));
 assert.equal(explicit.fields.producer,'Ana Torres');
 assert.ok(explicit.conflicts?.includes('origin'));
});
