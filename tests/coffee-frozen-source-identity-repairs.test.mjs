import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractCoffeeBlendEvidence} from '../src/server/coffee-blend-evidence.mjs';

const source_url='https://roaster.example/products/current-coffee';
const other_url='https://roaster.example/products/other-coffee';
const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const page=(name,body,head='')=>head+'<main><h1>'+escape(name)+'</h1>'+body+'</main>';
const parse=(name,body,head='')=>extractPublicCoffeeFacts(page(name,body,head),{source_url});
const productScript=value=>'<script type="application/ld+json">'+JSON.stringify(value)+'</script>';
const retained=(result,text)=>result.source_facts?.some(fact=>String(fact.value).includes(text));
const fullRegions='Minas Gerais, Brazil & Pitalito, Huila, Colombia';
const partialBlend='Our Brazil Diamond roasted lightly and our Caturra Syrup coffees are blended together, resulting in a delicious cup of coffee with tasting notes of caramel, peanut and red fruits.';

// Literal source fragments independently retained by the original frozen603
// replay and pre-output oracle. These focused fixtures do not claim to replace
// complete original captures or their unchanged full-corpus verification.
test('plural Regions supplies the complete selected blend geography across visible and structured specifications',()=>{
 const body='<p>Regions: '+escape(fullRegions)+'</p><p>Processes: Natural &amp; anaerobic washed</p>';
 const forms=[
  {body},
  {body:'',head:productScript({'@type':'Product',name:'Current Blend',url:source_url,description:body})},
  {body:'',head:productScript({'@type':'Product',name:'Current Blend',url:source_url,additionalProperty:[
   {name:'Regions',value:fullRegions},{name:'Processes',value:'Natural & anaerobic washed'}
  ]})}
 ];
 for(const form of forms){
  const result=parse('Current Blend',form.body,form.head||'');
  assert.equal(result.ok,true);
  assert.equal(result.fields.origin,fullRegions);
  assert.equal(result.fields.process,'Other/Unknown');
  assert.ok(!result.conflicts?.includes('origin'));
  assert.ok(retained(result,'Minas Gerais'));
 }
});

test('plural and singular region labels reconcile country but still withhold genuine same-level or country conflicts',()=>{
 const compatible=parse('Current Coffee','<p>Regions: Huila, Tolima</p><p>Country: Colombia</p>');
 assert.equal(compatible.fields.origin,'Huila, Tolima, Colombia');
 for(const body of [
  '<p>Regions: Nyeri</p><p>Region: Kirinyaga</p><p>Country: Kenya</p>',
  '<p>Regions: Nyeri, Kenya</p><p>Country: Colombia</p>'
 ]){
  const result=parse('Current Coffee',body);
  assert.equal(result.fields.origin,undefined);
  assert.ok(result.conflicts?.includes('origin'));
  assert.ok(!result.available.includes('origin'));
  assert.ok(retained(result,'Nyeri'));
 }
});

test('educational geographic captions stay review evidence and a later current section still supplies origin',()=>{
 for(const label of ['Region','Regions']){
  const lesson='<h2>Origins explained</h2><p>'+label+': Nyeri, Kenya</p>';
  const alone=parse('Current Coffee',lesson);
  assert.equal(alone.fields.origin,undefined,label);
  assert.ok(retained(alone,'Nyeri, Kenya'),label);
  const current=parse('Current Coffee',lesson+'<h2>Current coffee</h2><p>Origin: Brazil</p>');
  assert.equal(current.fields.origin,'Brazil',label);
  assert.ok(!current.conflicts?.includes('origin'),label);
  assert.ok(retained(current,'Nyeri, Kenya'),label);
 }
});

test('new regional labels cannot borrow recommendation, other-product or unrelated-label values',()=>{
 const selected={'@type':'Product',name:'Current Coffee',url:source_url,
  additionalProperty:[{name:'Regions',value:'Huila, Colombia'}]};
 const unrelated={'@type':'Product',name:'Other Coffee',url:other_url,description:'<p>Regions: Nyeri, Kenya</p>'};
 const result=parse('Current Coffee',
  '<section class="related products"><h2>Related coffees</h2><p>Regions: Tolima, Colombia</p></section>'+
  '<p>Operating Regions: Kirinyaga, Kenya</p>',productScript([selected,unrelated]));
 assert.equal(result.fields.origin,'Huila, Colombia');
 assert.ok(!result.conflicts?.includes('origin'));
});

test('an incompletely located named blend pair cannot assert its one known country as the whole origin',()=>{
 const evidence=extractCoffeeBlendEvidence('<p>'+partialBlend+'</p>',{name:'Current Blend',scoped:true});
 assert.equal(evidence.complete_origins,false);
 assert.equal(evidence.incomplete_component_origins,true);
 assert.deepEqual(evidence.origins,['Brazil']);
 const partial=parse('Current Blend','<p>'+partialBlend+'</p>');
 assert.equal(partial.fields.origin,undefined);
 assert.ok(retained(partial,'Brazil Diamond'));
 const complete=parse('Current Blend','<p>'+partialBlend+'</p><p>Regions: '+escape(fullRegions)+'</p><p>Processes: Natural &amp; anaerobic washed</p>');
 assert.equal(complete.fields.origin,fullRegions);
 assert.equal(complete.fields.process,'Other/Unknown');
 assert.ok(!complete.conflicts?.includes('origin'));
 const both=parse('Current Blend','<p>Our Brazil Diamond and our Colombia Caturra coffees are blended together.</p>');
 assert.equal(both.fields.origin,'Brazil, Colombia');
});

test('a literal selected title location is preserved while a coffee screen grade cannot become its region',()=>{
 const name='Kirima Batian - Othaya, Nyeri, Kenya - 12oz Bag';
 const grade='Later, at the dry mill, the parchment is hulled and graded by screen size — this lot is 17/18, Kenya’s AA, the top size grade.';
 const geography='Nyeri sits in the saddle between Mount Kenya and the Aberdare Range, on deep volcanic soil, with coffee planted roughly between 1,600 and 2,100 meters. This lot comes in at 1,847m from Kiaguthu Washing Station in Othaya — was built in 1964 on the land between the Rwarai and Chinga rivers, high enough that the fields around it begin trading coffee for tea.';
 const result=parse(name,'<p>'+geography+'</p><p>'+grade+'</p>');
 assert.equal(result.fields.origin,'Othaya, Nyeri, Kenya');
 assert.ok(!result.conflicts?.includes('origin'));
 assert.ok(retained(result,'Kenya’s AA'));
 assert.equal(parse(name,'<p>'+grade+'</p>').fields.origin,'Kenya');
 for(const context of ['<h2>Learn about origins</h2><p>'+geography+'</p>', '<p>Last year '+geography+'</p>']){
  const ambiguous=parse(name,context+'<p>'+grade+'</p>');
  assert.doesNotMatch(ambiguous.fields.origin||'',/Othaya, Nyeri/,context);
 }
 for(const misleading of [
  'Current Coffee - Chocolate, Caramel, Colombia - 12oz Bag',
  'Current Coffee - Ana Torres, Maria Lopez, Colombia',
  'Current Coffee - Caturra, Typica, Colombia',
  'Current Coffee - Finca Las Flores, Huila, Colombia',
  'Current Coffee - Cup of Excellence, Awards, Mexico'
 ]){
  const value=parse(misleading,'<p>A selected coffee.</p>').fields.origin||'';
  assert.doesNotMatch(value,/Chocolate|Caramel|Ana Torres|Maria Lopez|Caturra|Typica|Finca|Cup of Excellence|Awards/,misleading);
 }
});

test('a country closes the growing location before a named farm and an award stays contextual',()=>{
 const origin='Located in the mountains of Chiapas, Mexico, Finca Santa Cruz is a family-operated farm led by José “Pepe” Argüello, a third-generation coffee producer with a remarkable commitment to quality.';
 const award='Situated near the biodiverse El Triunfo Biosphere Reserve, the farm has earned international recognition for its exceptional coffees, including multiple first-place finishes in Mexico\'s Cup of Excellence.';
 const result=parse('Mexico Finca Santa Cruz Gesha','<p>Origin: Mexico</p><p>'+origin+'</p><p>'+award+'</p>');
 assert.equal(result.fields.origin,'Chiapas, Mexico');
 assert.equal(result.fields.producer,'José “Pepe” Argüello');
 assert.ok(retained(result,"Mexico's Cup of Excellence"));
 assert.ok(!result.conflicts?.includes('origin'));
});

test('the current mountain-range origin is not replaced by a neighboring social-program region',()=>{
 const current='Nevado Gona is grown organically high in the Sierra Nevada de Santa Marta, Colombia\'s isolated coastal mountain range — the tallest of its kind on Earth, rising from Caribbean shoreline to snow-capped peaks in a matter of miles.';
 const neighbor='Beyond the cup, the coffee carries a story of resilience: nearby in the San José de Oriente region, former combatants of the Colombian armed conflict have gone through social reintegration programs, and participating farmers have used the resulting premium pricing and market access to improve their livelihoods.';
 const result=parse('Nevado Gona - Colombia - Organic - 12oz Bag','<p>'+current+'</p><p>'+neighbor+'</p>');
 assert.equal(result.fields.origin,'Sierra Nevada de Santa Marta, Colombia');
 assert.ok(retained(result,'San José de Oriente'));
 assert.ok(!result.conflicts?.includes('origin'));
 const direct=parse('Current Coffee','<p>This coffee is grown in Huila, Colombia; nearby in the Tolima region, farmers participate in social reintegration programs.</p>');
 assert.equal(direct.fields.origin,'Huila, Colombia');
});

test('current country-first locality prose keeps the literal town and all explicitly credited producers',()=>{
 const body='<p>Origin: Honduras</p>'+
  '<p>These beans come from the western part of Honduras, Pacavita, which is surrounded by biological reserves and mountain ranges.</p>'+
  '<p>Two primary producers contributed to this lot, Silvestre Vasquez and Joel Lopez.</p>'+
  '<p>Joel Lopez is a fourth-generation coffee producer.</p>';
 const result=parse('Scarlet Macaw',body);
 assert.equal(result.fields.origin,'Pacavita, Honduras');
 assert.equal(result.fields.producer,'Silvestre Vasquez and Joel Lopez');
 assert.ok(retained(result,'Silvestre Vasquez and Joel Lopez'));
 assert.ok(!result.conflicts?.includes('producer'));
});

test('a current-lot producer list cannot absorb another independently credited person or a mismatched count',()=>{
 const credit='<p>Two primary producers contributed to this lot, Silvestre Vasquez and Joel Lopez.</p>';
 const conflict=parse('Current Coffee',credit+'<p>Ana Torres is a coffee producer.</p>');
 assert.equal(conflict.fields.producer,undefined);
 assert.ok(retained(conflict,'Ana Torres'));
 const count=parse('Current Coffee','<p>Three primary producers contributed to this lot, Silvestre Vasquez and Joel Lopez.</p>');
 assert.equal(count.fields.producer,undefined);
});

test('producer and current-country-first extensions reject denied, historical and educational claims',()=>{
 const origin='These beans come from the western part of Honduras, Pacavita, which is surrounded by mountains.';
 const credit='Two primary producers contributed to this lot, Silvestre Vasquez and Joel Lopez.';
 for(const body of [
  '<p>Last year '+origin+'</p><p>Last year '+credit+'</p>',
  '<p>This is not true: '+origin+'</p><p>This is not true: '+credit+'</p>',
  '<h2>Origins explained</h2><p>'+origin+'</p><p>'+credit+'</p>'
 ]){
  const result=parse('Current Coffee',body);
  assert.equal(result.fields.origin,undefined,body);
  assert.equal(result.fields.producer,undefined,body);
 }
});

test('a current washing-station operator is an explicit cooperative producer credit',()=>{
 const current='Kiaguthu is one of seventeen washing stations run by the Othaya Farmers Cooperative Society, operating since the 1960s and representing around 11,000 farming families.';
 const result=parse('Current Coffee','<p>'+current+'</p>');
 assert.equal(result.fields.producer,'Othaya Farmers Cooperative Society');
 for(const text of ['Previously '+current,'This is not true: '+current]){
  assert.equal(parse('Current Coffee','<p>'+text+'</p>').fields.producer,undefined,text);
 }
 const lesson=parse('Current Coffee','<h2>Learn about producers</h2><p>'+current+'</p>');
 assert.equal(lesson.fields.producer,undefined);
});

const vailName='Ethiopian Guji Buku Sayasa Grade 1 - SUPERNATURAL';
const vailRegion='Buku Sayasa community, Hambela District, Guji Zone, Oromia Region, Ethiopia';
const stale='Ethiopia Yirgacheffe Kochere Grade 1 is sourced from small family owned farms organized around the Chelelektu mill located in the Kochere district.';
const metaFor=description=>'<meta property="og:url" content="'+source_url+'"><meta property="og:title" content="'+escape(vailName)+'"><meta property="og:description" content="'+escape(description)+'">';

test('a named current washing station is retained and stale same-country SEO remains review-only',()=>{
 const station='Buku Sayisa, located in West Guji, is a washing station that specializes in natural processing.';
 const result=parse(vailName,'<p>Region: '+vailRegion+'</p><p>'+station+'</p>',metaFor(stale));
 assert.equal(result.fields.producer,'Buku Sayisa washing station');
 assert.equal(result.fields.origin,vailRegion);
 assert.ok(retained(result,'Yirgacheffe Kochere'));
 assert.ok(retained(result,'Buku Sayisa'));
 assert.ok(!result.conflicts?.includes('producer'));
});

test('a different named coffee in SEO cannot fill a blank producer but compatible current metadata still can',()=>{
 const body='<p>Region: '+vailRegion+'</p>';
 const staleResult=parse(vailName,body,metaFor(stale));
 assert.equal(staleResult.fields.producer,undefined);
 assert.ok(retained(staleResult,'Chelelektu'));
 const same='Ethiopia Guji Buku Sayasa Grade 1 is sourced from small family owned farms.';
 const current=parse(vailName,body,metaFor(same));
 assert.equal(current.fields.producer,'small family owned farms');
 const marketed='Summer Joy';
 const sameRegion='Ethiopia Guji Buku is sourced from small family owned farms.';
 const head='<meta property="og:url" content="'+source_url+'"><meta property="og:title" content="'+marketed+'"><meta property="og:description" content="'+sameRegion+'">';
 const corroborated=parse(marketed,'<p>Region: Guji Buku, Ethiopia</p>',head);
 assert.equal(corroborated.fields.producer,'small family owned farms');
 assert.equal(corroborated.fields.origin,'Guji Buku, Ethiopia');
 const otherRegion='Ethiopia Yirgacheffe Kochere Region is sourced from small family owned farms.';
 const otherHead='<meta property="og:url" content="'+source_url+'"><meta property="og:title" content="'+marketed+'"><meta property="og:description" content="'+otherRegion+'">';
 const sameRole=parse(marketed,'<p>Region: Guji Buku Region, Ethiopia</p>',otherHead);
 assert.equal(sameRole.fields.producer,undefined);
 assert.ok(retained(sameRole,'Yirgacheffe Kochere Region'));
 const withSeo=(origin,description)=>parse(marketed,'<p>Region: '+origin+'</p>',
  '<meta property="og:url" content="'+source_url+'"><meta property="og:title" content="'+marketed+'"><meta property="og:description" content="'+description+'">');
 const otherDistrict=withSeo('Guji District, Ethiopia','Ethiopia Yirgacheffe District is sourced from small family owned farms.');
 assert.equal(otherDistrict.fields.producer,undefined);
 const sameDistrict=withSeo('Guji District, Ethiopia','Ethiopia Guji District is sourced from small family owned farms.');
 assert.equal(sameDistrict.fields.producer,'small family owned farms');
 const homonym=withSeo('San Jose, Costa Rica','Colombia San Jose is sourced from small family owned farms.');
 assert.equal(homonym.fields.producer,undefined);
 assert.equal(homonym.fields.origin,'San Jose, Costa Rica');
});

test('named station declarations reject denied and historical statements and preserve an explicit producer conflict',()=>{
 const station='Buku Sayisa, located in West Guji, is a washing station that specializes in natural processing.';
 for(const body of [
  '<p>Last year '+station+'</p>',
  '<p>This is not true: '+station+'</p>',
  '<h2>Learn about processing</h2><p>'+station+'</p>'
 ])assert.equal(parse('Current Coffee',body).fields.producer,undefined,body);
 const conflicted=parse('Current Coffee','<p>Producer: Ana Torres</p><p>Producer: Maria Lopez</p><p>'+station+'</p>');
 assert.equal(conflicted.fields.producer,undefined);
 assert.ok(conflicted.conflicts?.includes('producer'));
});
