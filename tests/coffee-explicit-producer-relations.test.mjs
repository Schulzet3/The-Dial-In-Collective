import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractShopifyAjaxData} from '../src/server/coffee-shopify-ajax.mjs';

const source_url='https://roaster.example/products/current-coffee';
const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const parse=(name,body)=>extractPublicCoffeeFacts('<main><h1>'+escape(name)+'</h1>'+body+'</main>',{source_url});
const selectedJson=(name,description)=>parse(name,'<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name,url:source_url,description})+'</script>');
const otherJson=(name,description)=>parse(name,'<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:'Another Coffee',url:'https://roaster.example/products/another-coffee',description})+'</script>');
const retained=(result,quote)=>result.source_facts?.some(row=>String(row.value).includes(quote));
const composition='Your coffee is comprised of three different farms spread across the Minas Gerais region of Brazil. The small variations in flavor from the Fazenda Furnas, Apostolo Simao, and Boa Vista farms combine to create a cup that is consistently clean and delicious.';
const factory='Our Kenya AA Ndaroini comes to us from the dedicated farmers of the Ndaroini Factory.';
const formation='Over 2,300 small-scale farmers have joined together to create the Central Multiple Service Cooperative, better known as PRODECOOP.';
const oversight='PRODECOOP carefully supervises all phases of the coffee production and processing in order to ensure strict quality control.';
const cooperative=formation+' The initial coffee processing takes place on the individual farms. Sun-drying and final processing takes place at the coop’s dry mill, Las Segovias, located in the town of Palacaguina. '+oversight;
const operator='Kamwangi is one of three washing stations managed by the New Ngariama Farmers’ Cooperative Society (a prominent producer of high-quality Arabica coffee).';

// Literal excerpts come from the unchanged original frozen captures; these
// focused fixtures supplement, and do not replace, the full603 replay.
test('literal farm designators in selected Location and Origin values keep independent geography',()=>{
 for(const [name,body,producer,origin] of [
  ['Brazil','<p>Location: Fazenda Dutra (organically grown)</p>','Fazenda Dutra','Brazil'],
  ['Uganda AA - Lifesong','<p>Origin: Lifesong Farms | Mt. Elgon, Uganda</p>','Lifesong Farms','Mt. Elgon, Uganda']
 ]){
  for(const result of [parse(name,body),selectedJson(name,body)]){
   assert.equal(result.ok,true);
   assert.equal(result.fields.producer,producer);
   assert.equal(result.fields.origin,origin);
   assert.equal(result.roaster_details.farm,producer);
  }
  assert.ok(retained(parse(name,body),producer));
 }
 assert.ok(retained(parse('Brazil','<p>Location: Fazenda Dutra (organically grown)</p>'),'organically grown'));
 assert.ok(retained(parse('Uganda AA - Lifesong','<p>Origin: Lifesong Farms | Mt. Elgon, Uganda</p>'),'Lifesong Farms | Mt. Elgon, Uganda'));
});

test('an explicit named producer keeps priority over the complementary farm location',()=>{
 const result=parse('Brazil','<p>Location: Fazenda Dutra (organically grown)</p><p>Producer: Ana Torres</p>');
 assert.equal(result.fields.producer,'Ana Torres');
 assert.equal(result.roaster_details.farm,'Fazenda Dutra');
 assert.equal(result.fields.origin,'Brazil');
});

test('distinct literal farm locations remain unresolved and do not invent a producer',()=>{
 const result=parse('Brazil','<p>Location: Fazenda Dutra</p><p>Location: Fazenda Esperanza</p>');
 assert.equal(result.fields.producer,undefined);
 assert.equal(result.roaster_details?.farm,undefined);
 assert.equal(result.fields.origin,'Brazil');
 const conflict=parse('Uganda','<p>Origin: Lifesong Farms | Mt. Elgon, Uganda</p><p>Country: Kenya</p>');
 assert.equal(conflict.fields.origin,undefined);
 assert.ok(conflict.conflicts?.includes('origin'));
 assert.equal(conflict.fields.producer,'Lifesong Farms');
});

test('ordinary places and untyped people under a geographic label are not farm credits',()=>{
 for(const value of ['Huila, Colombia','Ana Torres','Mountain Valley','Lifesong','Fazenda District, Brazil','Lifesong Farms | Ana Torres','Lifesong Farms | Mt. Elgon','Fazenda Dutra (previous owner)','not Fazenda Dutra','Fazenda Dutra If Available','Fazenda Dutra Or Fazenda Esperanza'])
  assert.equal(parse('Current Coffee','<p>Location: '+value+'</p>').fields.producer,undefined,value);
});

test('conditions and alternatives in a farm label geography suffix cannot create a farm credit',()=>{
 for(const value of [
  'Lifesong Farms | If Available, Uganda',
  'Lifesong Farms | Mt. Elgon Or Another Place, Uganda'
 ]){
  for(const result of [parse('Current Coffee','<p>Origin: '+value+'</p>'),selectedJson('Current Coffee','<p>Origin: '+value+'</p>')])
   assert.equal(result.fields.producer,undefined,value);
 }
});

test('farm location credits remain selected and current instead of borrowing educational or other Product labels',()=>{
 const body='<p>Location: Fazenda Dutra (organically grown)</p>';
 for(const result of [
  parse('Current Coffee','<h2>Learn about origins</h2>'+body),
  parse('Current Coffee','<section class="related products">'+body+'</section>'),
  otherJson('Current Coffee',body),
  parse('Current Coffee','<p>Previous Location: Fazenda Dutra</p>'),
  parse('Current Coffee','<p>Location: formerly Fazenda Dutra</p>')
 ])assert.equal(result.fields.producer,undefined);
});

test('an explicitly counted complete current farm list preserves every literal farm',()=>{
 const result=parse('GET RIGHT | MEDIUM ROAST | BRAZIL','<p>Hey! '+composition+'</p>');
 assert.equal(result.fields.producer,'Fazenda Furnas; Apostolo Simao; Boa Vista');
 assert.ok(retained(result,'Fazenda Furnas, Apostolo Simao, and Boa Vista farms'));
 const changed=composition.replace('Fazenda Furnas','Finca Esperanza').replace('Apostolo Simao','Santa Elena').replace('Boa Vista','Las Flores');
 assert.equal(parse('Current Coffee','<p>'+changed+'</p>').fields.producer,'Finca Esperanza; Santa Elena; Las Flores');
});

test('a partial, duplicate or inconsistent farm enumeration is not a complete farm credit',()=>{
 for(const quote of [
  composition.replace('three different','four different'),
  composition.replace('Fazenda Furnas, Apostolo Simao, and Boa Vista','Fazenda Furnas and Boa Vista'),
  composition.replace('Apostolo Simao','Fazenda Furnas'),
  composition.replace('Your coffee is comprised of three different farms spread across the Minas Gerais region of Brazil. ',''),
  'Last year '+composition,
  composition.replace('farms combine','farms do not combine'),
  'For example, '+composition
 ])assert.equal(parse('Current Coffee','<p>'+quote+'</p>').fields.producer,undefined,quote);
});

test('competing complete farm lists and explicit producer contradictions are withheld',()=>{
 const other=composition.replace('Boa Vista','Santa Elena');
 const result=parse('Current Coffee','<p>'+composition+'</p><p>'+other+'</p>');
 assert.equal(result.fields.producer,undefined);
 const denied=parse('Current Coffee','<p>Producer: Ana Torres</p><p>Producer: Maria Lopez</p><p>'+composition+'</p>');
 assert.equal(denied.fields.producer,undefined);
 assert.ok(denied.conflicts?.includes('producer'));
});

test('literal farmer factory sourcing must name this selected coffee or a current coffee subject',()=>{
 const result=parse('Kenya AA - Ndaroini Estate','<p>'+factory+'</p>');
 assert.equal(result.fields.producer,'dedicated farmers of the Ndaroini Factory');
 assert.ok(retained(result,factory));
 const generic=parse('Current Coffee','<p>This coffee comes to us from the dedicated farmers of the Sunrise Factory.</p>');
 assert.equal(generic.fields.producer,'dedicated farmers of the Sunrise Factory');
});

test('an affirmative current factory credit survives a separate imaginative introduction',()=>{
 const result=parse('Kenya AA - Ndaroini Estate','<p>Imagine standing on the slopes of Mount Kenya, the air crisp and clear. This is where your coffee begins. '+factory+'</p>');
 assert.equal(result.fields.producer,'dedicated farmers of the Ndaroini Factory');
 assert.equal(parse('Kenya AA - Ndaroini Estate','<p>Imagine '+factory+'</p>').fields.producer,undefined);
});

test('a different named coffee, a denied group or a non-farmer factory role cannot donate this producer',()=>{
 for(const quote of [
  factory.replace('Our Kenya AA Ndaroini','Our Kenya AA Different'),
  factory.replace('Our Kenya AA Ndaroini','Our Kenya AA Ndaroini Decaf'),
  factory.replace('farmers','buyers'),
  factory.replace('comes to us','does not come to us'),
  'Previously '+factory,
  'Last year '+factory,
  'For example, '+factory
 ])assert.equal(parse('Kenya AA - Ndaroini Estate','<p>'+quote+'</p>').fields.producer,undefined,quote);
});

test('two distinct current factory source groups remain unresolved',()=>{
 const result=parse('Kenya AA - Ndaroini Estate','<p>'+factory+'</p><p>'+factory.replace('Ndaroini Factory','Sunrise Factory')+'</p>');
 assert.equal(result.fields.producer,undefined);
});

test('a literal cooperative alias requires present coffee-production oversight by that same alias',()=>{
 const result=parse('Nicaragua Segovia','<p>'+cooperative+'</p>');
 assert.equal(result.fields.producer,'PRODECOOP');
 assert.ok(retained(result,'Central Multiple Service Cooperative'));
 assert.ok(retained(result,oversight));
 const separated=parse('Current Coffee','<p>'+formation+'</p><p>'+oversight+'</p>');
 assert.equal(separated.fields.producer,'PRODECOOP');
 const alternate=cooperative.replaceAll('PRODECOOP','CAFECOL').replace('Central Multiple Service Cooperative','Regional Coffee Growers Cooperative');
 assert.equal(parse('Current Coffee','<p>'+alternate+'</p>').fields.producer,'CAFECOL');
});

test('formation alone, an unknown alias and historical or denied oversight remain insufficient',()=>{
 for(const quote of [
  formation,oversight,
  formation+' '+oversight.replace('PRODECOOP','OTHERCOOP'),
  formation+' '+oversight.replace('carefully supervises','does not supervise'),
  formation+' Previously '+oversight,
  'Last year '+formation+' '+oversight,
  'For example, '+formation+' '+oversight
 ])assert.equal(parse('Current Coffee','<p>'+quote+'</p>').fields.producer,undefined,quote);
});

test('conflicting current cooperative credits and ambiguous alias definitions are withheld',()=>{
 const other=cooperative.replaceAll('PRODECOOP','CAFECOL').replace('Central Multiple Service Cooperative','Regional Coffee Growers Cooperative');
 assert.equal(parse('Current Coffee','<p>'+cooperative+'</p><p>'+other+'</p>').fields.producer,undefined);
 const ambiguous=formation.replace('Central Multiple Service Cooperative','Regional Coffee Growers Cooperative');
 assert.equal(parse('Current Coffee','<p>'+cooperative+'</p><p>'+ambiguous+'</p>').fields.producer,undefined);
});

test('the selected named station and its explicit operator are complementary literal credits',()=>{
 const result=parse('Kamwangi - Kenya','<p>'+operator+'</p>');
 assert.equal(result.fields.producer,'Kamwangi washing station; New Ngariama Farmers’ Cooperative Society');
 assert.ok(retained(result,'a prominent producer of high-quality Arabica coffee'));
 const alias=operator.replace('(a prominent producer of high-quality Arabica coffee)','(FCS) in Kirinyaga');
 assert.equal(parse('Kamwangi - Kenya','<p>'+alias+'</p>').fields.producer,'Kamwangi washing station; New Ngariama Farmers’ Cooperative Society (FCS)');
 const unnamed=parse('Current Coffee','<p>'+operator+'</p>');
 assert.equal(unnamed.fields.producer,'New Ngariama Farmers’ Cooperative Society');
});

test('an operator acronym stays in the name while its location stays in the retained source',()=>{
 const statement='The washing stations are run by the Kibugu Farmers Cooperative Society (FCS) in Embu County.';
 const result=parse('Embu Kenya','<p>PRODUCER /// Kibugu FCS, Gikirima Factory</p><p>'+statement+'</p>');
 assert.equal(result.fields.producer,'Kibugu FCS, Gikirima Factory');
 assert.equal(result.roaster_details.named_producer,'Kibugu Farmers Cooperative Society (FCS)');
 assert.ok(retained(result,statement));
 const aliasOnly=parse('Current Coffee','<p>The washing stations are run by the Kibugu Farmers Cooperative Society (FCS).</p>');
 assert.equal(aliasOnly.fields.producer,'Kibugu Farmers Cooperative Society (FCS)');
});

test('new narrative relations preserve educational, other Product, historical and explicit contradiction boundaries',()=>{
 for(const [name,quote] of [
  ['Current Coffee',composition],
  ['Kenya AA - Ndaroini Estate',factory],
  ['Current Coffee',cooperative],
  ['Kamwangi - Kenya',operator]
 ]){
  for(const result of [
   parse(name,'<h2>Learn about producers</h2><p>'+quote+'</p>'),
   parse(name,'<section class="related products"><p>'+quote+'</p></section>'),
   otherJson(name,'<p>'+quote+'</p>'),
   parse(name,'<p>Producer: Ana Torres</p><p>Producer: Maria Lopez</p><p>'+quote+'</p>')
  ])assert.equal(result.fields.producer,undefined,quote);
 }
 for(const quote of ['Last year '+operator,operator.replace('managed by','not managed by')])
  assert.equal(parse('Kamwangi - Kenya','<p>'+quote+'</p>').fields.producer,undefined,quote);
});

test('the exact selected Shopify description keeps new credits and original endpoint source attribution',()=>{
 const request={handle:'current-coffee',sourceUrl:source_url,url:source_url+'.js'};
 for(const [title,description,producer] of [
  ['GET RIGHT | MEDIUM ROAST | BRAZIL','<p>'+composition+'</p>','Fazenda Furnas; Apostolo Simao; Boa Vista'],
  ['Kenya AA - Ndaroini Estate','<p>'+factory+'</p>','dedicated farmers of the Ndaroini Factory'],
  ['Nicaragua Segovia','<p>'+cooperative+'</p>','PRODECOOP'],
  ['Brazil','<p>Location: Fazenda Dutra (organically grown)</p>','Fazenda Dutra'],
  ['Uganda AA - Lifesong','<p>Origin: Lifesong Farms | Mt. Elgon, Uganda</p>','Lifesong Farms'],
  ['Kamwangi - Kenya','<p>'+operator+'</p>','Kamwangi washing station; New Ngariama Farmers’ Cooperative Society']
 ]){
  const result=extractShopifyAjaxData({title,handle:'current-coffee',description},request);
  assert.equal(result.fields.producer,producer,title);
  assert.ok(result.source_facts.some(fact=>fact.source_type==='product_json'&&fact.source_url===request.url));
  assert.equal(extractShopifyAjaxData({title,handle:'another-coffee',description},request),null);
 }
});

test('trailing conditions cannot turn proposed farm composition, sourcing or oversight into a current producer',()=>{
 const conditionalList=[
  composition.replace('farms spread across the Minas Gerais region of Brazil.','farms if harvest availability permits.'),
  composition.replace('farms combine to create a cup that is consistently clean and delicious.','farms combine only if this composition is selected.'),
  composition.replace('farms combine to create a cup that is consistently clean and delicious.','farms combine when this composition is selected.'),
  composition.replace('is comprised','may be comprised')
 ];
 for(const quote of conditionalList)
  assert.equal(parse('Current Coffee','<p>'+quote+'</p>').fields.producer,undefined,quote);
 for(const ending of [' if we buy from this cooperative.',' unless we buy elsewhere.',' when this batch is selected.']){
  const quote=formation+' '+oversight.replace(/\.$/,ending);
  assert.equal(parse('Current Coffee','<p>'+quote+'</p>').fields.producer,undefined,quote);
 }
 for(const quote of [
  operator.replace(/\.$/,' if this batch comes from Kenya.'),
  operator.replace(/\.$/,' unless this batch comes from another area.'),
  operator.replace(/\.$/,' when we select this batch.'),
  factory.replace(/\.$/,' if this factory is selected.'),
  factory.replace(/\.$/,' unless another factory is selected.')
 ]){
  const name=quote.includes('Kamwangi')?'Kamwangi - Kenya':'Kenya AA - Ndaroini Estate';
  assert.equal(parse(name,'<p>'+quote+'</p>').fields.producer,undefined,quote);
 }
});
