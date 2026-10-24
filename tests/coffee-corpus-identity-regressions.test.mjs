// Reconstructed and extended after the executor rollback. These are regression
// tests written after output review, not the frozen independent 603-case oracle.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractCoffeeBlendEvidence} from '../src/server/coffee-blend-evidence.mjs';
import {mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';
import {compatibleCoffeeOrigins} from '../src/server/coffee-fact-compatibility.mjs';
import {coffeeHtmlElements} from '../src/server/coffee-html-structure.mjs';

const source_url='https://roaster.example/products/current-coffee';
const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function parse(body,{name='Current Coffee',description='',properties=[],before='',main=true}={}){
 const product={'@type':'Product',name,url:source_url,brand:'Example Coffee',description,
  additionalProperty:properties.map(([name,value])=>({name,value}))};
 const content='<h1>'+escape(name)+'</h1>'+body;
 return extractPublicCoffeeFacts('<script type="application/ld+json">'+JSON.stringify(product)+'</script>'+before+
  (main?'<main>'+content+'</main>':content),{source_url});
}
const noConflict=(result,field)=>assert.ok(!result.conflicts?.includes(field),JSON.stringify(result.conflicts));
const preview=(fields,extra={})=>({ok:true,fields:{name:'Current Coffee',...fields},...extra});

test('explicit variety education cannot refine a selected generic metric and current sections can resume',()=>{
 const metrics='<div class="a-stat" data-name="roast-level"><p>Light<br><label>ROAST LEVEL</label></p></div>'+
  '<div class="a-stat" data-name="variety"><p>Mixed<br><label>VARIETY</label></p></div>';
 for(const heading of ['Variety education','Cultivars explained','Processing guide']){
  const education='<h2>'+heading+'</h2><p>Bourbon Ají variety</p>';
  assert.equal(parse(metrics+education).fields.variety,'Mixed',heading);
  const current=parse(metrics+education+'<h2>About this coffee</h2><p>This coffee is 100% Typica.</p>');
  assert.equal(current.fields.variety,'Typica',heading);
 }
 const examples='<p>One excellent example is the SL28 variety. Originally designed by Scott Laboratories in Kenya, the SL28 cultivar has been successfully transplanted.</p>';
 assert.equal(parse(metrics+examples).fields.variety,'Mixed');
 assert.equal(parse('<p>Our favorite Colombia varietal "Chiroso" creates a pleasant cup.</p>').fields.variety,'Chiroso');
 assert.equal(parse('<p>This coffee uses Castillo, Caturra, and Colombia varieties.</p>').fields.variety,'Castillo, Caturra, and Colombia');
 assert.equal(parse('<p>This lot is 100% Chiroso, one of Colombia’s most exciting varieties, and it is processed using the Tres Cochadas method.</p>').fields.variety,'Chiroso');
 assert.equal(parse('<p>This coffee is Typica, which has a delicate cup profile.</p>').fields.variety,'Typica');
 assert.equal(parse('<p>This lot uses Chiroso, Experimental X.</p>').fields.variety,undefined);
});

test('unknown emphasized product captions terminate preceding note rows',()=>{
 const result=parse('<p><strong>Tasting Notes</strong></p><p><span>Mild cherry, milk chocolate, balanced.</span></p>'+
  '<p><strong>Certifications</strong></p><p><span>Rainforest Alliance</span></p>');
 assert.equal(result.fields.tasting_notes,'Mild cherry, milk chocolate, balanced.');
 assert.ok(result.source_facts.some(fact=>fact.value.includes('Rainforest Alliance')));
 const varieties=parse('<p><strong>Variety</strong></p><p>Caturra</p><p>Castillo</p>'+
  '<p><strong>Packaging</strong></p><p>Compostable paper</p>');
 assert.equal(varieties.fields.variety,'Caturra, Castillo');
 const emphasized=parse('<p><strong>Tasting Notes</strong></p><p><strong>Blueberry</strong></p>'+
  '<p><strong>Chocolate</strong></p>');
 assert.equal(emphasized.fields.tasting_notes,'Blueberry, Chocolate');
 const grouped=parse('<h3>Tasting Notes</h3><p>Acidity: Bright and lively</p><p>Body: Full bodied, smooth</p>'+
  '<p>Flavor: Strawberry, wine, and floral notes</p>');
 assert.equal(grouped.fields.tasting_notes,'Strawberry, wine, and floral notes');
 assert.ok(!grouped.conflicts?.includes('tasting_notes'));
 assert.equal(parse('<h3>Flavor Profile</h3><p>Aroma: Fruity</p>').fields.tasting_notes,undefined);
});

test('inline typography cannot insert invented spaces inside an explicit flavor word',()=>{
 const result=parse('<p><strong>Flavor Notes: r</strong><span>ed currant, star anise, satiny</span></p>');
 assert.equal(result.fields.tasting_notes,'red currant, star anise, satiny');
 assert.ok(!result.conflicts?.includes('tasting_notes'));
});

test('a future farm production goal cannot become this coffee harvest label',()=>{
 const goal='The farmers are working to double their crop by the 2025–2026 harvest.';
 for(const result of [parse('<p>'+goal+'</p>'),parse('',{description:goal})])
  assert.equal(result.fields.release_label,undefined);
 for(const sentence of ['For the 2026 harvest, Liliana selected this lot.',
  'This coffee comes from the 2025–2026 harvest.',
  'Preorder this coffee from the 2026 harvest.'])
  assert.equal(parse('<p>'+sentence+'</p>').fields.release_label,sentence.includes('2025')?'2025–2026':'2026');
});

test('a dated current offering or explicitly dated harvest period is preserved as release evidence',()=>{
 for(const [sentence,value] of [
  ['Our last washed selection from Ethiopia for 2026 comes from the Wuri washing station.','2026'],
  ['Our first natural offering from Ethiopia of 2026 is this lovely gem.','2026'],
  ['We offer this coffee as our last rotating single origin of 2026.','2026'],
  ['We are excited to bring you the 2026 lot.','2026'],
  ['Here is what you can expect from this coffee in 2023/24.','2023/24'],
  ['Yukro will be a cornerstone of our 2026 summer coffee program.','Summer 2026']
 ])assert.equal(parse('<p>'+sentence+'</p>').fields.release_label,value,sentence);
 assert.equal(parse('<dl><dt>Harvest Season</dt><dd>2020/21</dd></dl>').fields.release_label,'2020/21');
 assert.equal(parse('<p>Harvest Period: January 2024–June 2024</p>').fields.release_label,'January 2024–June 2024');
 for(const phrase of ['Our last delivery for 2026 is in December.','Our Coffee Collection was founded in 2026.',
  'We generally bring you the 2026 lot as an example.','Our Gold Collection is a limited reserve offering.'])
  assert.equal(parse('<p>'+phrase+'</p>').fields.release_label,undefined,phrase);
});

test('a numbered selected release needs an independent declaration of its series',()=>{
 const name='Holy Grail No. 2: Strawberry Jam';
 const result=parse('<p>Those become Holy Grail releases. Each one is different. No. 1 was a Pink Bourbon. No. 2 is this one.</p>',{name});
 assert.equal(result.fields.release_label,'Holy Grail No. 2');
 for(const [name,story] of [
  ['Farm No. 2: Current Coffee','This is our coffee grown at Farm No. 2.'],
  ['Collection No. 3: Current Coffee','Other coffees become Collection releases.'],
  ['Collection No. 3: Current Coffee','These never become Collection releases.'],
  ['Collection No. 3: Current Coffee','Our farm collection has excellent coffees.']
 ])assert.equal(parse('<p>'+story+'</p>',{name}).fields.release_label,undefined,story);
});

test('generic variety captions cannot mask a specific literal current-coffee cultivar',()=>{
 for(const [caption,story,expected] of [
  ['mix','Castillo, Caturra, and Colombia varieties are grown between 1400 and 2000 meters.','Castillo, Caturra, and Colombia'],
  ['Heirloom','Produced by smallholding farmers from trees of the rare indigenous Ethiopia Wush Wush variety of Arabica.','Wush Wush'],
  ['Native Heirloom','Cultivated by Asnake Kassa, this heirloom Wush Wush variety is naturally processed.','Wush Wush'],
  ['Heirloom','This is a fairly rare variety called Wush Wush, which is an Ethiopian native variety.','Wush Wush'],
  ['heirloom','100% Typica (an heirloom variety of the Arabica species), it boasts caramel notes.','100% Typica']
 ]){
  const result=parse('<p>Variety: '+caption+'</p><p>'+story+'</p>');
  assert.equal(result.fields.variety,expected,story);noConflict(result,'variety');
  for(const pair of [[preview({variety:caption}),preview({variety:expected},{variety_source:'narrative'})],
   [preview({variety:expected},{variety_source:'narrative'}),preview({variety:caption})]])
   assert.equal(mergePublicProductPreview(...pair).fields.variety,expected);
 }
 for(const body of ['<p>Country: Colombia</p>', '<h2>Colombia</h2>',
  '<p>Variety: Heirloom</p><p>Other coffees use Wush Wush varieties.</p>',
  '<p>Variety: Heirloom</p><p>A genetic cross between Bourbon and Typica created this plant.</p>']){
  const result=parse(body,{name:'Colombia Current Coffee'});
  assert.ok(!/Colombia|Bourbon|Typica|Wush/.test(result.fields.variety||''));
 }
});

test('explicit current-crop composition refines a published subset without unioning unrelated lists',()=>{
 const mix=parse('<p>Variety: SL28, SL34, Ruiru 11</p>'+
  '<p>SL28 and SL34 dominate the variety mix, with minor inputs from Batian and Ruiru 11.</p>');
 assert.equal(mix.fields.variety,'SL28 and SL34, Batian and Ruiru 11');noConflict(mix,'variety');
 const crop=parse('<p>Variety: Pacamara, Geisha, Pacas, Bourbon</p>'+
  '<p>This crop of Manzano natural features Pacamara, Gesha, Pacas, and Red Bourbon.</p>');
 assert.equal(crop.fields.variety,'Pacamara, Gesha, Pacas, and Red Bourbon');noConflict(crop,'variety');
 const exclusive=parse('<p>Variety: 100% Caturra</p><p>This coffee features Caturra and Castillo.</p>');
 assert.equal(exclusive.fields.variety,undefined);assert.ok(exclusive.conflicts.includes('variety'));
 const differing=parse('<p>Variety: Caturra</p><p>Variety: Castillo</p>');
 assert.equal(differing.fields.variety,undefined);assert.ok(differing.conflicts.includes('variety'));
});

test('a producer farm inventory cannot add other varieties to the selected named lot',()=>{
 const result=parse('<p>You asked and we answered, a Gesha from our producer, Lisandro Cardenas.</p>'+
  '<p>In additional to Caturra, Don Lisandro grows Gesha and Pink Bourbon varieties.</p>',{name:'Colombia Gesha Natural'});
 assert.equal(result.fields.variety,'Gesha');
 const generic=parse('<p>Variety: Heirloom</p><p>The farm also grows Wush Wush varieties.</p>');
 assert.equal(generic.fields.variety,'Heirloom');
});

test('explicit unsupported or mixed treatment labels do not collapse to one known component',()=>{
 const fermented=parse('<p>Process: Co-ferment</p><p>The original strawberry-cofermented coffee was blended with a traditional washed lot.</p>');
 assert.equal(fermented.fields.process,'Other/Unknown');
 const osmotic=parse('<p>Processing: Osmotic Dehydration / Washed</p>',{name:'Vanilla Coconut Blend'});
 assert.equal(osmotic.fields.process,'Other/Unknown');
 assert.equal(osmotic.roaster_details.processing_detail,'Osmotic Dehydration / Washed');
 // A named primary wash plus an additional flavor treatment is still read
 // exactly as published. The new alternative-label rule is not global prose.
 assert.equal(parse('<p>Process: Adv Washed Co-ferment</p>').fields.process,'Washed');
 assert.equal(parse('<p>Process: Washed</p><p>The coffee undergoes anaerobic fermentation.</p>').fields.process,'Washed');
});

test('inert inline metadata cannot truncate a multi-line process caption',()=>{
 const result=parse('<p><strong>ORIGIN</strong><br>COLOMBIA<br><meta charset="utf-8">'+
  '<strong>PROCESS METHOD</strong><br><span>NATURAL,</span><br><span>ANAEROBIC FERMENTATION</span></p>');
 assert.equal(result.fields.process,'Anaerobic');
 assert.equal(result.roaster_details.processing_detail,'NATURAL, ANAEROBIC FERMENTATION');
 assert.equal(parse('<p>Process: Washed, Natural</p>').fields.process,'Other/Unknown');
});

test('a same-URL and same-title SEO description still cannot donate a different coffee cohort',()=>{
 const name='Honduras Current Coffee';
 const stale='Our first offering from El Salvador features a fruity cup from producer Nelson Flores. This coffee is grown at 1700 meters.';
 const head='<meta property="og:url" content="'+source_url+'"><meta property="og:title" content="'+name+'">'+
  '<meta property="og:description" content="'+escape(stale)+'">';
 const result=extractPublicCoffeeFacts(head+'<main><h1>'+name+'</h1><p>Country: Honduras</p></main>',{source_url});
 assert.equal(result.fields.origin,'Honduras');assert.equal(result.fields.producer,undefined);assert.equal(result.fields.elevation_m,undefined);
 assert.ok(result.source_facts.some(fact=>fact.value?.includes('Nelson Flores')));
 const current=extractPublicCoffeeFacts(head.replaceAll('El Salvador','Honduras')+'<main><h1>'+name+'</h1></main>',{source_url});
 assert.equal(current.fields.producer,'Nelson Flores');assert.match(current.fields.elevation_m||'',/1700/);
});

test('entities and cultivar list semicolons cannot truncate a selected description',()=>{
 for(const variety of ['Caturra &amp; Castillo','Arabica; Castillo, Catimor 129, F6']){
  const result=parse('<p>Variety: '+variety+'</p>',{description:'Variety: '+variety+'; Process: Washed'});
  assert.equal(result.fields.variety,variety.replace(/&amp;/g,'&'));assert.equal(result.fields.process,'Washed');noConflict(result,'variety');
 }
 const conflict=parse('<p>Variety: Caturra &amp; Castillo</p>',{description:'Variety: Geisha'});
 assert.equal(conflict.fields.variety,undefined);assert.ok(conflict.conflicts.includes('variety'));
});

test('a multi-column specification header cannot be mistaken for a key-value row',()=>{
 const table='<table><tbody><tr><td>Origin</td><td>Process</td><td>Variety</td><td>Flavor</td></tr>'+
  '<tr><td>Cajamarca Peru</td><td>Swiss Water - Washed</td><td>Various</td><td>Chocolate, cherry</td></tr></tbody></table>';
 for(const result of [parse(table),parse('',{description:table})]){
  assert.equal(result.fields.origin,'Cajamarca Peru');assert.equal(result.fields.process,'Washed');
  assert.equal(result.fields.variety,'Various');assert.equal(result.fields.tasting_notes,'Chocolate, cherry');
  noConflict(result,'origin');
 }
 assert.equal(parse('<table><tr><th>Origin</th><td>Colombia</td></tr></table>').fields.origin,'Colombia');
});

test('stacked table captions align with their values instead of a neighboring commerce label',()=>{
 const body='<table><tr><td><div><p><strong>PRODUCER</strong></p></div><div><p><strong>AMOUNT</strong></p></div></td>'+
  '<td><div><p>Anasora Farm Site</p></div><div><p>12 oz. retail bag, 2 lb. bag</p></div></td></tr></table>';
 for(const result of [parse(body),parse('',{description:body})]){
  assert.equal(result.fields.producer,'Anasora Farm Site');noConflict(result,'producer');
 }
 assert.equal(parse('<p>Producer</p><p>AMOUNT</p>').fields.producer,undefined);
});

test('generic cultivar categories and explicit Arabica-variety captions retain the published value',()=>{
 assert.equal(parse('<span>Regional Varieties</span>').fields.variety,'Regional Varieties');
 assert.equal(parse('<p>Arabica Varieties: Heirloom</p>').fields.variety,'Heirloom');
 assert.equal(parse('<p>The Bean: 100% Gesha, celebrated globally for exceptional quality</p>').fields.variety,'Gesha');
 assert.equal(parse('<p>The Bean: Caturra, Bourbon, celebrated globally for quality</p>').fields.variety,'Caturra, Bourbon');
 assert.equal(parse('<p>Producer: The Ketiara Cooperative Read More</p>').fields.producer,'The Ketiara Cooperative');
});

test('generic cultivar suffixes stay within their explicit complete value',()=>{
 for(const value of ['Local Cultivars','Mixed Varieties','Heirloom Ethiopian Varieties','Common Costa Rican Varieties']){
  const result=parse('<p>Variety: '+value+'</p>');assert.equal(result.fields.variety,value);noConflict(result,'variety');
 }
 assert.equal(parse('<p>Bourbon Ají Variety</p>').fields.variety,'Bourbon Ají');
 assert.equal(parse('<p>Heirloom Variety</p>').fields.variety,'Heirloom');
});

test('a farm assortment does not assert that every cultivar belongs to the selected lot',()=>{
 const range='This family farm produces an assortment of shade grown Bourbon, Catuai and Caturra varietals.';
 assert.equal(parse('<p>'+range+'</p>').fields.variety,undefined);
 assert.equal(parse('<p>Variety: Caturra</p><p>'+range+'</p>').fields.variety,'Caturra');
 assert.equal(parse('<p>This coffee contains Bourbon and Caturra varieties.</p>').fields.variety,'Bourbon and Caturra');
});

test('punctuated farm captions remain complementary to the separately named producer',()=>{
 for(const body of ['<p>Farm: Nkumari.</p><p>Producer: Naman Meme.</p>',
  '<p>Producer: Naman Meme.</p><p>Farm: Nkumari.</p>']){
  const result=parse(body,{description:body});assert.equal(result.fields.producer,'Naman Meme');noConflict(result,'producer');
 }
 const conflict=parse('<p>Producer: Naman Meme.</p><p>Producer: Another Person.</p>');
 assert.equal(conflict.fields.producer,undefined);assert.ok(conflict.conflicts.includes('producer'));
});

test('explicit multi-slash, repeated-dash and equals captions retain all supported facts in HTML and selected descriptions',()=>{
 for(const separator of [' /// ',' // ',' -- ',' --- ',' = ']){
  const lines=['Producer'+separator+'Wilder Garcia','Country'+separator+'Peru','Region'+separator+'Cajamarca',
   'Variety'+separator+'SL 34, SL 28','Process'+separator+'Washed','Harvest'+separator+'2026'];
  for(const result of [parse(lines.map(line=>'<p><span>'+line+'</span></p>').join('')),
   parse('',{description:lines.join('\n')})]){
   assert.equal(result.fields.producer,'Wilder Garcia',separator);
   assert.equal(result.fields.origin,'Cajamarca, Peru',separator);
   assert.equal(result.fields.variety,'SL 34, SL 28',separator);
   assert.equal(result.fields.process,'Washed',separator);
   assert.equal(result.fields.release_label,'2026',separator);
  }
 }
 assert.equal(parse('<p>Our story /// Wilder Garcia</p>').fields.producer,undefined);
 assert.equal(parse('<p>Variety: SL 34 / SL 28</p>').fields.variety,'SL 34 / SL 28');
 const comma=parse('<p>Variety: Caturra, Bourbon, Processing: Washed, Altitudes: 1350-1550m</p>');
 assert.equal(comma.fields.variety,'Caturra, Bourbon');assert.equal(comma.fields.process,'Washed');
 assert.equal(comma.fields.elevation_m,'1350-1550m');
});

test('explicit smallholder and farm-holder producer counts are groups while nearby relationship metrics remain excluded',()=>{
 for(const value of ['65 small holders','850 smallholder farmers','300 farm holders'])
  assert.equal(parse('<p>Producer: '+value+'</p>').fields.producer,value);
 for(const value of ['208 contributing','2026','Since 2015'])
  assert.equal(parse('<p>Producer: '+value+'</p>').fields.producer,undefined);
});

test('Country and Region retain explicit hierarchy in either order and reject unrelated regions',()=>{
 for(const properties of [[['Origin','Honduras'],['Region','Chinacla, La Paz']],[['Region','Chinacla, La Paz'],['Origin','Honduras']]]){
  const result=parse('',{properties});assert.equal(result.fields.origin,'Chinacla, La Paz, Honduras');noConflict(result,'origin');
 }
 const finer=parse('<p>Country: Colombia</p>',{properties:[['Origin','Huila']]});assert.equal(finer.fields.origin,'Huila, Colombia');
 const wrong=parse('<p>Region: Cauca</p>',{properties:[['Origin','Huila, Colombia']]});
 assert.equal(wrong.fields.origin,undefined);assert.ok(wrong.conflicts.includes('origin'));
});

test('comparison-only place punctuation, leading marketing and directional precision do not weaken contradictions',()=>{
 assert.equal(compatibleCoffeeOrigins('Burundi','Burundi · Gatara, Kayanza'),'Burundi · Gatara, Kayanza');
 assert.equal(compatibleCoffeeOrigins('Kona','Award-winning 100% Kona, Hawaii'),'Award-winning 100% Kona, Hawaii');
 assert.equal(compatibleCoffeeOrigins('Kona','Central Kona, Hawai’i'),'Central Kona, Hawai’i');
 for(const [a,b] of [['North Kona, Hawaii','South Kona, Hawaii'],['Huila, Colombia','Cauca, Colombia'],['Kona','Konaka'],['Cauca','Cauca Valley']])
  assert.equal(compatibleCoffeeOrigins(a,b),null);
});

test('broad printed places agree with explicit countries but not wrong continents',()=>{
 const africa=parse('<p>Origin: Africa</p><p>Region: Yirgacheffe</p>',{name:'Ethiopia Yirgacheffe'});
 assert.equal(africa.fields.origin,'Yirgacheffe, Ethiopia');noConflict(africa,'origin');
 const wrong=parse('<p>Origin: South America</p>',{name:'Kenya Current Coffee'});
 assert.equal(wrong.fields.origin,undefined);assert.ok(wrong.conflicts.includes('origin'));
 assert.equal(parse('<p>A blend of Central and South American coffees.</p>').fields.origin,'Central America, South America');
 assert.equal(parse('',{name:'Sumatra Mandheling'}).fields.origin,'Sumatra');
});

test('literal source tuples corroborate geography but repeated product names cannot invent regions',()=>{
 const joined=parse('<h2>GRAPOS Cooperative – El Soconusco, Chiapas, Mexico</h2><p>Origin: Chiapas, Mexico</p><p>Region: El Soconusco</p>');
 assert.equal(joined.fields.origin,'El Soconusco, Chiapas, Mexico');noConflict(joined,'origin');
 const dueling=parse('<h2>Burundi - Amasho</h2><p>Origin: Burundi · Gatara, Kayanza</p>',{name:'Burundi - Amasho'});
 assert.equal(dueling.fields.origin,'Burundi · Gatara, Kayanza');noConflict(dueling,'origin');
 const title=parse('<p>Origin: Joyabaj</p><p>Country: Guatemala</p>',{name:'TRES CRUCES, HONEY PROCESSED, GUATEMALA'});
 assert.equal(title.fields.origin,'Joyabaj, Guatemala');noConflict(title,'origin');
});

test('an explicitly joined current region-country sentence can complete a labeled region',()=>{
 for(const [region,country,sentence] of [['Huila','Colombia',"It comes from Huila, one of Colombia's most decorated coffee regions."],
  ['Copan','Honduras','Finca Terrerito is a farm in Copan, Honduras.']]){
  const result=parse('<p>Region: '+region+'</p><p>'+sentence+'</p>');
  assert.equal(result.fields.origin,region+', '+country);noConflict(result,'origin');
 }
 const unrelated=parse('<p>Region: Huila</p><p>We roast this coffee in Colombia.</p>');assert.equal(unrelated.fields.origin,'Huila');
});

test('an independently named cooperative prefix can reconcile selected product geography without discarding raw evidence',()=>{
 const role='La Prosperidad de Chirinos is a cooperative long known for producing exceptional quality coffee.';
 const region='La Prosperidad de Chirinos Cajamarca, San Ignacio Province';
 const result=parse('<p>Origin: Peru</p><p>Region: '+region+'</p><p>'+role+'</p>',{
  description:'<p>Origin: Peru</p><p>Region: Cajamarca, San Ignacio Province</p><p>'+role+'</p>'
 });
 assert.equal(result.fields.origin,'Cajamarca, San Ignacio Province, Peru');noConflict(result,'origin');
 assert.ok(result.source_facts.some(fact=>fact.value?.includes(region)),'The published prefixed caption is retained for review');
 const structured=parse('',{properties:[['Origin','Peru'],['Region',region]],description:role});
 assert.equal(structured.fields.origin,'Cajamarca, San Ignacio Province, Peru');
});

test('unknown or explicitly comma-delimited entities cannot be removed from a conflicting place caption',()=>{
 const role='La Prosperidad de Chirinos is a cooperative producing this coffee.';
 for(const [region,proof] of [
  ['La Prosperidad de Chirinos Cajamarca, San Ignacio Province',''],
  ['Other Cooperative Cajamarca, San Ignacio Province',role],
  ['La Prosperidad de Chirinos, Cajamarca, San Ignacio Province',role]
 ]){
  const result=parse('<p>Region: '+region+'</p><p>'+proof+'</p>',{
   description:'<p>Country: Peru</p><p>Region: Cajamarca, San Ignacio Province</p>'
  });
  if(region.includes('Chirinos,'))assert.equal(result.fields.origin,'La Prosperidad de Chirinos, Cajamarca, San Ignacio Province, Peru');
  else{assert.equal(result.fields.origin,undefined);assert.ok(result.conflicts.includes('origin'));}
 }
 const related=parse('<p>Origin: Peru</p><p>Region: La Prosperidad de Chirinos Cajamarca, San Ignacio Province</p>'+
  '<section class="related-products"><p>'+role+'</p></section>',{
   description:'<p>Country: Peru</p><p>Region: Cajamarca, San Ignacio Province</p>'
  });
 assert.equal(related.fields.origin,undefined);assert.ok(related.conflicts.includes('origin'));
});

test('separate producer and geography BR lines cannot fabricate a location',()=>{
 const result=parse('<h5>SMALLHOLDER FARMS<br>BUESACO, COLOMBIA</h5>');assert.equal(result.fields.origin,'BUESACO, COLOMBIA');
 const named=parse('<h5>NEGUESSE DEBELA<br>GEDEB, ETHIOPIA</h5>');assert.equal(named.fields.origin,'GEDEB, ETHIOPIA');
});

test('a country inside a farm name is not an extra blend country',()=>{
 const result=parse('<p>Finca Costa Rica is located in Santa María, Huila, Colombia and is owned and run by Faver Ninco and his family.</p>'+
  '<p>This is a blend of coffee varieties from Finca Costa Rica in Huila, Colombia.</p><div>Huila, Colombia</div>',{name:'Finca Costa Rica'});
 assert.equal(result.fields.origin,'Santa María, Huila, Colombia');assert.equal(result.fields.producer,'Faver Ninco');noConflict(result,'origin');
 assert.equal(parse('<p>This coffee is grown on a farm in Costa Rica.</p>').fields.origin,'Costa Rica');
});

test('national coffee culture and roast styles cannot supply an unstated cultivation country',()=>{
 const result=parse('<p>This is our Vietnamese-style roast with Robusta and Arabica beans.</p>'+
  '<p>Vietnamese coffee culture took root during French colonial rule in the 1800s, when coffee trees were first planted.</p>',{name:'Peace, Love & Caffeine'});
 assert.equal(result.fields.origin,undefined);
 assert.equal(parse('<p>This dark roast uses Robusta beans.</p>',{name:'Vietnamese Roast'}).fields.origin,undefined);
 assert.equal(parse('<p>This Vietnamese coffee is grown in Da Lat.</p>').fields.origin,'Vietnam');
});

test('national cultivar labels in a product title cannot invent where the current lot was grown',()=>{
 for(const suffix of ['Ethiopian Landrace - Washed','Ethiopian Heirloom','Colombian Cultivars']){
  const result=parse('<p>Region: Current Region</p>',{name:'Current Coffee '+suffix});
  assert.equal(result.fields.origin,'Current Region');noConflict(result,'origin');
 }
 const elsewhere=parse('<p>Country: Colombia</p><p>Region: Huila</p>',{name:'Current Coffee Ethiopian Landrace - Washed'});
 assert.equal(elsewhere.fields.origin,'Huila, Colombia');noConflict(elsewhere,'origin');
 const explicit=parse('<p>Region: Gedeb</p>',{name:'Ethiopia Chorso Bule Ethiopian Landrace - Washed'});
 assert.equal(explicit.fields.origin,'Gedeb, Ethiopia');noConflict(explicit,'origin');
});

test('tree-variety aliases and terminal-period factual lists retain complete cultivar evidence',()=>{
 assert.equal(parse('<p>Tree variety: Predominantly Typica</p>').fields.variety,'Predominantly Typica');
 assert.equal(parse('<h3>Varietals</h3><p>Caturra, Colombia, and Castillo.</p>').fields.variety,'Caturra, Colombia, and Castillo');
 assert.equal(parse('<h3>Variety</h3><p>This is generally a description of how different trees grow.</p>').fields.variety,undefined);
 assert.equal(parse('<p>The Bean: '+('This coffee has a long story. '.repeat(30))+'</p>').fields.variety,undefined);
});

test('a bounded composite origin/process caption separates only a complete recognized process qualifier',()=>{
 const result=parse('<div><div>Origin &amp; process</div><p>Sumatra (wet hulled)</p></div><dl><dt>Country</dt><dd>Indonesia</dd></dl>',{name:'Sumatra'});
 assert.equal(result.fields.origin,'Sumatra, Indonesia');assert.equal(result.fields.process,'Other/Unknown');noConflict(result,'origin');
 const bad=parse('<div><div>Origin &amp; process</div><p>Sumatra (our newest roast)</p></div>');
 assert.equal(bad.fields.origin,undefined);assert.equal(bad.fields.process,undefined);
});

test('exact current prose process grammar excludes natural flavor and decaf adjectives',()=>{
 for(const [text,expected] of [['This is a washed-process coffee.','Washed'],['This coffee is wet processed.','Washed'],
  ['These beans are dry processed.','Natural'],['Our coffee is processed using the washed method.','Washed'],
  ['The coffee cherries are fermented in tanks without oxygen.','Anaerobic'],['The beans are washed and dried in the sun.','Washed']])
  assert.equal(parse('<p>'+text+'</p>').fields.process,expected,text);
 for(const text of ['The coffee has natural sweetness and honey notes.','We prefer a natural sugarcane decaf process.'])
  assert.equal(parse('<p>'+text+'</p>').fields.process,undefined,text);
 assert.equal(parse('<p>Process: Natural Sugar Cane EA Decaf</p>').fields.process,undefined);
});

test('explicit mixtures preserve Other/Unknown while anaerobic subtype is one method',()=>{
 for(const value of ['Washed & Natural','Pulped Natural & Natural','Natural & Anaerobic Washed'])
  assert.equal(parse('<p>Process: '+value+'</p>').fields.process,'Other/Unknown',value);
 for(const value of ['Anaerobic Honey','Anaerobic Washed','Washed Anaerobic'])
  assert.equal(parse('<p>Process: '+value+'</p>').fields.process,'Anaerobic',value);
});

test('parenthesized and Oxford-comma cultivar claims remain complete',()=>{
 assert.equal(parse('<p>This coffee contains the varietals (SL28, SL34, and Ruiru11).</p>').fields.variety,'SL28, SL34, and Ruiru11');
 const result=parse('<p>Bourbon, Caturra, and Catuai varietals grown by Mujeres Luchando por un Mejor Futuro—a collective of 276 women farmers.</p>');
 assert.equal(result.fields.variety,'Bourbon, Caturra, and Catuai');assert.equal(result.fields.producer,'Mujeres Luchando por un Mejor Futuro');
});

test('a current processed-cultivar phrase and cultivar-led process-specific title supply literal variety',()=>{
 const result=parse('<p>This coffee is a natural processed Caturra, carrying notes of star fruit and guava.</p>');
 assert.equal(result.fields.variety,'Caturra');assert.equal(result.fields.process,'Natural');
 const title=parse('<p>Process: Honey</p>',{name:'Caturra The Journey'});assert.equal(title.fields.variety,'Caturra');
 const street=parse('<p>Process: Washed</p>',{name:'Bourbon Street Blend'});assert.equal(street.fields.variety,undefined);
});

test('complete percentage composition prose preserves both cultivars and a real process mixture',()=>{
 const result=parse('<p>The Dulce Signature is made up of a 50% naturally processed yellow catuai cherries and 50% honey processed mondo novo cherries.</p>',{name:'Brazil Current Blend'});
 assert.equal(result.fields.variety,'yellow catuai, mondo novo');assert.equal(result.fields.process,'Other/Unknown');
 assert.match(result.roaster_details.blend_components,/50% naturally processed/);
 const partial=parse('<p>This coffee is composed of 50% natural processed Caturra cherries and 20% honey processed Bourbon cherries.</p>');
 assert.equal(partial.fields.variety,undefined);assert.equal(partial.roaster_details?.blend_components,undefined);
});

test('named farmers outrank vague narrative collectives and general sourcing definitions are not producers',()=>{
 const result=parse('<p>This coffee is grown by the local farmers. The farm is owned by Rosa Martínez.</p>');assert.equal(result.fields.producer,'Rosa Martínez');
 for(const text of ['Sourced from organic Mexican farms, this single-origin coffee is sweet.',
  'This coffee comes from a specific region or farm, with unique flavors and characteristics.',
  'This coffee is sourced from many areas of the estate.'])assert.equal(parse('<p>'+text+'</p>').fields.producer,undefined,text);
 assert.equal(parse('<p>This coffee is grown by smallholder farmers.</p>').fields.producer,'smallholder farmers');
 const counts=parse('<p>Producer: Smallholder producer group</p><p>Producers: 208 contributing in 2024</p>');
 assert.equal(counts.fields.producer,'Smallholder producer group');noConflict(counts,'producer');
});

const rows=[['Country','Mexico'],['Farm','Finca Sol'],['Cultivar','Mixed'],['Process','Washed'],
 ['Country','El Salvador'],['Mill','Cafe Tuxpal'],['Cultivar','Bourbon & Pacas'],['Process','Washed']];
const componentHtml=rows.map(([label,value])=>'<div><span><em>'+label+': '+escape(value)+'</em></span></div>').join('');
test('complete explicit blend cohorts aggregate before field conflict checks in HTML and flat schema',()=>{
 for(const description of [rows.map(([label,value])=>label+': '+escape(value)).join('\n'),rows.map(([label,value])=>label+': '+escape(value)).join('')]){
  const result=parse(componentHtml,{name:'Seasonal Blend',description});
  assert.equal(result.fields.origin,'Mexico, El Salvador');assert.equal(result.fields.producer,'Finca Sol, Cafe Tuxpal');
  assert.equal(result.fields.variety,'Mixed, Bourbon & Pacas');assert.equal(result.fields.process,'Washed');assert.equal(result.conflicts,undefined);
  assert.ok(result.source_facts.some(f=>f.value.includes('Bourbon & Pacas')));
 }
});

test('blend grouping cannot erase independent whole-product contradictions or invent unnamed producers',()=>{
 const unmarked=parse(componentHtml);assert.equal(unmarked.fields.origin,undefined);assert.ok(unmarked.conflicts.includes('origin'));
 const wrong=parse(componentHtml,{name:'Seasonal Blend',properties:[['Origin','Ethiopia'],['Variety','Geisha']]});
 assert.equal(wrong.fields.origin,undefined);assert.equal(wrong.fields.variety,undefined);
 const partial='<p>This blend contains two origins.</p><p>Country: Mexico</p><p>Process: Washed</p><p>Country: Colombia</p>';
 assert.equal(extractCoffeeBlendEvidence(partial),null);
 const missing=parse('<p>This blend pairs two coffees.</p><p>Country: Nicaragua<br>Cultivar: Catuai<br>Process: Washed<br>'+
  'Country: El Salvador<br>Mill: Cafe Tuxpal<br>Cultivar: Bourbon &amp; Pacas<br>Process: Washed</p>');
 assert.equal(missing.fields.producer,undefined);
});

test('complete country-and-process component lists never read hidden attribute strings',()=>{
 const result=parse('<h3 data-sheets-value="Brazil Natural">Guatemala - Ceiba (Washed Process), Colombia - Kumanday (Natural Process), and Ethiopia - Koke (Honey Process)</h3>');
 assert.equal(result.fields.origin,'Guatemala, Colombia, Ethiopia');assert.equal(result.fields.process,'Other/Unknown');
 assert.doesNotMatch(result.fields.origin,/Brazil/);
});

test('one-product column tables bind each heading to its value and exclude multiple product rows',()=>{
 const table='<table><tr><th>Origin</th><th>Process</th><th>Variety</th><th>Flavor</th></tr>'+
  '<tr><td>Aceh, Indonesia</td><td>Anaerobic</td><td>Catimor</td><td>Raspberry, Chocolate, Apple</td></tr></table>';
 const result=parse(table);assert.equal(result.fields.origin,'Aceh, Indonesia');assert.equal(result.fields.variety,'Catimor');assert.equal(result.fields.process,'Anaerobic');
 const many=parse(table.replace('</table>','<tr><td>Kenya</td><td>Washed</td><td>SL28</td><td>Lime, Pear, Tea</td></tr></table>'));
 assert.equal(many.fields.origin,undefined);assert.equal(many.fields.variety,undefined);
});

test('recommendation and Woo review scopes cannot donate facts but later current story can',()=>{
 for(const heading of ['More Coffee','Keep Exploring','3 reviews for Current Coffee']){
  const result=parse('<p>Variety: Bourbon</p><h2>'+heading+'</h2><p>Variety: Geisha</p><p>Process: Natural</p>'+
   '<h2>About this coffee</h2><p>Process: Washed</p>');
  assert.equal(result.fields.variety,'Bourbon');assert.equal(result.fields.process,'Washed');
 }
 const result=parse('<p>Variety: Bourbon</p><div id="reviews" class="woocommerce-Reviews"><p>Variety: Geisha</p></div>');
 assert.equal(result.fields.variety,'Bourbon');noConflict(result,'variety');
});

test('script and attribute pseudo-elements cannot donate canonical facts',()=>{
 const fake='<script>const x=`<meta name="product:process" content="Natural">`;</script>';
 const result=parse('<div title="<p>Variety: Geisha</p>">Label</div><p>Variety: Bourbon</p><p>Process: Washed</p>',{before:fake});
 assert.equal(result.fields.variety,'Bourbon');assert.equal(result.fields.process,'Washed');assert.equal(result.conflicts,undefined);
});

test('malformed missing angle after a completed quoted attribute recovers within original ancestry only',()=>{
 const html='<header><a href="/about"\n <span>About</span></a></header><main><h1>Current Coffee</h1><p>Variety: Parainema</p></main>';
 const scan=coffeeHtmlElements(html);assert.equal(scan.truncated,false);assert.equal(scan.recoveredMalformedTags,1);
 assert.equal(scan.nodes.find(n=>n.tag==='span').parent,1);
 const result=parse('<p>Variety: Parainema</p>',{before:'<header><a href="/about"\n <span>About</span></a></header>'});assert.equal(result.fields.variety,'Parainema');
 for(const invalid of ['<a href="unclosed <p>Variety: Geisha</p>','<a href="x"<p>Variety: Geisha</p>'])assert.equal(coffeeHtmlElements(invalid).truncated,true);
});

test('release labels exclude harvesting instructions and generic lot categories',()=>{
 assert.equal(parse('<p>Lot: Single Origin</p><p>Harvest: Handpicked at peak ripeness</p>').fields.release_label,undefined);
 assert.equal(parse('<p>This coffee is from the 2026 harvest.</p>').fields.release_label,'2026');
 const old=parse('<p>Our previous lot was produced by Juan Torres in the 2023 harvest.</p>');
 assert.equal(old.fields.release_label,undefined);assert.equal(old.fields.producer,undefined);
});

test('a long meta description requires exact product URL and branded title before filling absent identity fields',()=>{
 const description='This coffee is grown in Colombia. '+('A carefully selected current coffee. '.repeat(70))+
  'Fragancia varietal grown by Luis Édgar Camacho in Huila. Fully Washed Process. This is the 2026 harvest.';
 const meta=(url=source_url,title='Current Coffee | Example Coffee')=>'<meta property="og:url" content="'+escape(url)+'">'+
  '<meta property="og:title" content="'+escape(title)+'"><meta property="og:description" content="'+escape(description)+'">';
 const result=parse('',{before:meta()});assert.equal(result.fields.origin,'Colombia');assert.equal(result.fields.variety,'Fragancia');
 assert.equal(result.fields.process,'Washed');assert.equal(result.fields.producer,'Luis Édgar Camacho');assert.equal(result.fields.release_label,'2026');
 assert.equal(result.producer_source,'narrative');assert.ok(result.source_facts.some(f=>f.value.includes('Fragancia varietal grown by Luis Édgar Camacho')));
 for(const before of [meta('https://roaster.example/products/other'),meta(source_url,'Another Coffee | Example Coffee')]){
  const wrong=parse('',{before});assert.equal(wrong.fields.variety,undefined);assert.equal(wrong.fields.producer,undefined);
 }
 const explicit=parse('<p>Variety: Caturra</p><p>Producer: Rosa Martínez</p>',{before:meta()});
 assert.equal(explicit.fields.variety,'Caturra');assert.equal(explicit.fields.producer,'Rosa Martínez');assert.equal(explicit.producer_source,undefined);
});

test('explicit producer/process/cultivar captions retain precedence over same-product prose fallbacks',()=>{
 for(const key of ['producer','process','variety']){
  const pair=key==='producer'?['Mujeres Cooperative','local farmers']:key==='process'?['Honey','Anaerobic']:['Ruiru11, SL28, Batian','SL28'];
  for(const reverse of [false,true]){
   const explicit=preview({[key]:pair[0]}),fallback=preview({[key]:pair[1]},{[key+'_source']:'narrative'});
   const merged=mergePublicProductPreview(...(reverse?[fallback,explicit]:[explicit,fallback]));
   assert.equal(merged.fields[key],pair[0]);assert.equal(merged[key+'_source'],undefined);noConflict(merged,key);
   assert.equal(merged.source_facts.filter(f=>f.field===key&&f.conflicting).length,2);
  }
  const conflict=mergePublicProductPreview(preview({[key]:pair[0]}),preview({[key]:pair[1]}));
  assert.equal(conflict.fields[key],undefined);assert.ok(conflict.conflicts.includes(key));
  const confirmed=mergePublicProductPreview(preview({[key]:pair[0]},{[key+'_source']:'narrative'}),preview({[key]:pair[0]}));
  assert.equal(confirmed[key+'_source'],undefined);
 }
 const prior=mergePublicProductPreview(preview({},{conflicts:['variety']}),preview({variety:'Bourbon'},{variety_source:'narrative'}));
 assert.equal(prior.fields.variety,undefined);assert.equal(prior.variety_source,undefined);
});

test('positively identified foreign coffee cohort is excluded canonically and kept as disputed source evidence',()=>{
 const intro='<p>This ethically sourced blend has multiple origins: Colombia, Ethiopia, Honduras, Mexico and Indonesia.</p><p>Roast: Medium</p><p>Producer: Current Growers</p>';
 const foreign='<p>Our Kenya AB coffee has a bright cup.</p><p>Producer: Small Farm Holders</p><p>Region: Mt. Kenya, Central Kenya</p>'+
  '<p>Variety: Mixed Varietals</p><p>Processing: Washed</p><p>Altitude: 1400-2000m</p><p>Roast: Dark</p>';
 const result=parse(intro+foreign,{name:'Decaf Blend',description:intro+foreign});
 assert.equal(result.fields.origin,'Colombia, Ethiopia, Honduras, Mexico and Indonesia');assert.equal(result.fields.roast_level,'Medium');
 assert.equal(result.fields.producer,'Current Growers');for(const key of ['variety','process','elevation_m'])assert.equal(result.fields[key],undefined,key);
 assert.ok(result.source_facts.some(f=>f.conflicting&&f.section==='Different coffee in the source'&&/Mt\. Kenya/.test(f.value)));
});
