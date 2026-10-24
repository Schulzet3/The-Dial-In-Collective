// Post-oracle diagnostics: literal source attribution, not an independent
// evaluation oracle and never an excuse to infer a grower from a country.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractNarrativeCoffeeEvidence} from '../src/server/coffee-narrative-evidence.mjs';

const source_url='https://roaster.example/products/current';
function parse(body,{name='Current Coffee'}={}){
 return extractPublicCoffeeFacts('<script type="application/ld+json">'+JSON.stringify({
  '@type':'Product',name,url:source_url,brand:'Example Coffee'
 })+'</script><main><h1>'+name+'</h1>'+body+'</main>',{source_url});
}

test('ordinary articles, named farm leadership and quoted nicknames retain exact producer attribution',()=>{
 for(const [story,producer] of [
  ['Ramza Daher is an entrepreneurial farmer who found financial independence through coffee.','Ramza Daher'],
  ['Finca Santa Cruz is a family-operated farm led by José “Pepe” Argüello, a third-generation coffee producer.','José “Pepe” Argüello'],
  ["Mauricio Rosales' farm, La Maravilla, is not one you stumble upon accidentally.",'Mauricio Rosales']
 ]){
  const result=parse('<p>'+story+'</p>');assert.equal(result.fields.producer,producer,story);
  assert.equal(result.producer_source,'narrative');
 }
});

test('a named current-coffee introduction needs its farming sentence, not a location or exporter mention',()=>{
 assert.equal(parse('<p>We introduce our first coffee from Liliana Ramírez. She farms El Yolombo, a small finca.</p>').fields.producer,'Liliana Ramírez');
 for(const story of ['This coffee comes from New York.','Our first coffee from Export Partners. They ship coffee to us.',
  'Our first coffee from Liliana Ramírez. She is a photographer.'])
  assert.equal(parse('<p>'+story+'</p>').fields.producer,undefined,story);
});

test('source-defined farm/cooperative roles may fill a missing producer while named growers take priority',()=>{
 assert.equal(parse('<p>La Prosperidad de Chirinos is a cooperative long known for producing exceptional quality coffee.</p>').fields.producer,'La Prosperidad de Chirinos');
 assert.equal(parse('<p>Hacienda La Amistad is a farm growing this coffee.</p><p>Grown by Maria Perez.</p>').fields.producer,'Maria Perez');
 assert.equal(parse('<section><h2>What is a cooperative?</h2><p>La Prosperidad de Chirinos is a cooperative producing coffee.</p></section>').fields.producer,undefined);
});

test('two literal Farm/Region captions align with exactly two slash-separated values',()=>{
 for(const body of ['<p>Farm/Region: Machoruso / Caramanta</p>',
  '<p>Region / Farm: Caramanta / Machoruso</p>',
  '<dl><dt>Farm/Region</dt><dd>Machoruso / Caramanta</dd></dl>']){
  const result=parse(body);
  assert.equal(result.fields.producer,'Machoruso');assert.equal(result.roaster_details.farm,'Machoruso');
  assert.equal(result.fields.origin,'Caramanta');assert.ok(!result.conflicts?.length);
 }
 const named=parse('<p>Farm/Region: Machoruso / Caramanta</p><p>Producer: Ana Torres</p>');
 assert.equal(named.fields.producer,'Ana Torres');assert.equal(named.roaster_details.farm,'Machoruso');
 for(const value of ['Muganga District, Southern Province','Machoruso / Caramanta / Other']){
  const result=parse('<p>Farm/Region: '+value+'</p>');
  assert.equal(result.fields.producer,undefined,value);assert.equal(result.fields.origin,undefined,value);
  assert.ok(result.source_facts.some(fact=>fact.value.includes(value)));
 }
});

test('literal collective credits cover small farms, delivered crops and station attribution without manufacturing names',()=>{
 for(const [story,producer] of [
  ['This coffee comes from small family farms.','small family farms'],
  ['This coffee is grown on small holder farms.','small holder farms'],
  ['Smallholder farmers cultivate this organic lot.','Smallholder farmers'],
  ['Approximately 300 smallholder farmers deliver cherry yearly to the local mill.','Approximately 300 smallholder farmers'],
  ['Brought to us from the privately owned Worka Chelbessa washing station.','privately owned Worka Chelbessa washing station'],
  ['These beans are collected from small farmers.','small farmers']
 ])assert.equal(parse('<p>'+story+'</p>').fields.producer,producer,story);
 for(const story of ['This coffee comes from a specific region or farm.',
  'This coffee comes from many areas of the estate.',
  'For another coffee, smallholder farmers cultivate the beans.',
  'This coffee is not grown on small family farms.',
  'These beans are produced by traditional methods.'])
  assert.equal(parse('<p>'+story+'</p>').fields.producer,undefined,story);
});

test('explicit joint named producers preserve the source list without inventing a shared surname',()=>{
 const couple='Doña Francisca and her husband, Oscar Chacón, are third-generation coffee producers.';
 assert.equal(parse('<p>'+couple+'</p>').fields.producer,'Doña Francisca and Oscar Chacón');
 const list='Julia Vega Rodríguez, Olman Cruz Vega, Ricardo Chávez Garita, and Juan Bautista Mejia Rojas';
 assert.equal(parse('<p>This coffee is grown by dedicated producers '+list+'.</p>').fields.producer,list);
 assert.equal(parse('<p>Grown by Alexander and Arley Vargas.</p>').fields.producer,'Alexander and Arley Vargas');
});

test('separate ambiguous current grower claims remain withheld and explicit captions outrank fallback prose',()=>{
 assert.equal(extractNarrativeCoffeeEvidence('<p>Grown by Maria Perez.</p><p>Grown by Oscar Perez.</p>',{name:'Current Coffee'}).fields.producer,undefined);
 const result=parse('<p>Producer: Cooperative Sol</p><p>Grown by Maria Perez.</p>');
 assert.equal(result.fields.producer,'Cooperative Sol');assert.equal(result.producer_source,undefined);
});

test('compact producer captions may end with punctuation without becoming unbounded narrative',()=>{
 const r=parse('<div><span>FARM/MILL</span><p>Busambo, various smallholders producers.</p></div>');
 assert.equal(r.fields.producer,'Busambo, various smallholders producers');
 assert.equal(parse('<div><span>Producer</span><p>This is a story about farmers in many areas.</p></div>').fields.producer,undefined);
});

test('literal producer credits stop at cultivation prose and support explicitly introduced pairs',()=>{
 for(const [story,producer] of [
  ['Grown by Wilton Benitez high in the Andes, the micro-climate shapes this coffee.','Wilton Benitez'],
  ['This coffee is produced by the Gelgelu Edema Farm on the slopes of the Mendebo Mountains of Ethiopia.','Gelgelu Edema Farm'],
  ['Father and son duo, Alexander and Arley Vargas, bring us this complex and unique coffee from Huila, Colombia.','Alexander and Arley Vargas'],
  ['High-grown by female coffee pioneer Carmen Montoya, this variety was cultivated from hand-selected seed.','Carmen Montoya'],
  ['Abiyot Ageze, a producer who grew up in Yirgacheffe and continues the tradition of producing naturals.','Abiyot Ageze'],
  ['A Gesha from our 2026 Good Food Awards producer, Lisandro Cardenas!','Lisandro Cardenas'],
  ['This coffee comes from small family farms rooted in rich volcanic soil at elevations around 3,200 feet.','small family farms'],
  ['Sourced from family-owned farms at altitudes up to 1,800 meters, these beans are a blend of SL28 and SL34.','family-owned farms'],
  ['This bean comes from small farms using minimal mechanical processing.','small farms'],
  ['This coffee is grown on small holder farms, less than a few acres, and is certified organic.','small holder farms'],
  ['This single-origin coffee without caffeine comes from lots grown by smallholder producers throughout Guatemala.','smallholder producers'],
  ['Approximately 300 small farm holders deliver cherry yearly to the local mill.','Approximately 300 small farm holders'],
  ['There are around 850 smallholder farmers who tender cherry to the Jigesa Washing Station.','around 850 smallholder farmers'],
  ['Fourth generation Cecilia Genis runs Zalmari Coffee Estate with her mother, Marigold Murray.','Cecilia Genis and Marigold Murray'],
  ['This coffee comes from the Centra Cooperativa Indígena del Cauca, which was founded in 1980.','Centra Cooperativa Indígena del Cauca'],
  ['The coffee itself comes from Finca Las Flores, part of a group of five farms.','Finca Las Flores'],
  ['This coffee comes to us from the La Bastilla farm located in the Jinotega region of Nicaragua.','La Bastilla farm'],
  ['This coffee is from Muungano’s resilient women producer group within the cooperative.','Muungano’s resilient women producer group'],
  ['After a number of years without a featured coffee from Zambia, we offer this anaerobic natural lot from Kateshi Estate.','Kateshi Estate'],
  ['The coffee we get from Abana Estate is that they grow and process their coffee on their farm.','Abana Estate'],
  ['Grown by the Asociación de Agricultores y Productores Orgánicos de Atitlán (AAPOSA) on shade-grown farms, this coffee shines.','Asociación de Agricultores y Productores Orgánicos de Atitlán (AAPOSA)'],
  ['This coffee is sourced directly from local farmers through the receiving stations.','local farmers'],
  ['Another beautiful washed Ethiopian coffee from Negusse Debla, same producer of our previous Worka Sakaro lot.','Negusse Debla'],
  ['This Single Estate coffee is cultivated with over 200 years of expertise by the renowned Fincá Volcán Azul.','Fincá Volcán Azul'],
  ['Producer Info: Hacienda La Amistad is a third-generation, family-run estate located in the highlands of Costa Rica.','Hacienda La Amistad']
 ])assert.equal(parse('<p>'+story+'</p>').fields.producer,producer,story);
});

test('dash-delimited grower lists preserve every explicitly credited person',()=>{
 const list='Julia Vega Rodríguez, Olman Cruz Vega, Ricardo Chávez Garita, and Juan Bautista Mejia Rojas';
 const story='Sourced exclusively from a small group of family-owned farms—cultivated by dedicated producers '+list+'—this coffee is a testament to craftsmanship.';
 assert.equal(parse('<p>'+story+'</p>').fields.producer,list);
});

test('expanded attribution grammar still rejects negation, unrelated products and non-growing roles',()=>{
 for(const story of [
  'This coffee is not grown by Wilton Benitez high in the Andes.',
  'Another coffee is grown by Wilton Benitez high in the Andes.',
  'Last year we had coffee from Negusse Debla, same producer of our previous Worka Sakaro lot.',
  'This coffee is not cultivated by the renowned Fincá Volcán Azul.',
  'Last year this coffee came from family-owned farms at altitudes up to 1,800 meters.',
  'Father and son duo, Alexander and Arley Vargas, bring us photographs from Huila, Colombia.',
  'Abiyot Ageze, an exporter who sells coffee to our roaster.',
  'Sebastian Mejia comes from a coffee-growing family with deep roots in conventional coffee production.',
  'Our photographer comes from a family of local farmers.',
  'Roasted by Maria Perez and shipped by Oscar Perez.',
  'This coffee is produced by traditional methods.'
 ])assert.equal(parse('<p>'+story+'</p>').fields.producer,undefined,story);
 assert.equal(parse('<p>Kibaya comes from smallholder farmers near Kigali, Rwanda.</p>',{name:'Kibaya'}).fields.producer,'smallholder farmers');
});

test('literal farm ownership keeps honorific abbreviations, dimensions and explicit family credits',()=>{
 for(const [story,producer] of [
  ['This Ethiopian coffee comes from Mr. Mengeche Derso’s 15-hectare farm in Halo Beriti.','Mengeche Derso'],
  ['Recently Mario Jr. got charge of the farm and improved production.','Mario Jr.'],
  ['Our women produce world-class coffee. – Katia Duke, Farm Owner','Katia Duke'],
  ['Juan Hernandez Aguilar is a small indigenous Mayan producer who speaks Mam.','Juan Hernandez Aguilar'],
  ["Tzunwitz is the name of Victoriana Ramírez Vargas De Salucio & family's farm.",'Victoriana Ramírez Vargas De Salucio & family'],
  ['Karumandi purchases coffee from a network of approximately 3,000 smallholder producers.','approximately 3,000 smallholder producers'],
  ['The coffee is a collection of the efforts of 498 smallholder farmers.','498 smallholder farmers']
 ])assert.equal(parse('<p>'+story+'</p>').fields.producer,producer,story);
 assert.equal(parse('<h2>Meet the Farm Behind the Coffee</h2><h3>Permata Gayo</h3>').fields.producer,'Permata Gayo');
 assert.equal(parse('<p><span>J</span><span>uan Hernandez Aguilar is a small indigenous Mayan producer who speaks Mam.</span></p>').fields.producer,'Juan Hernandez Aguilar');
 assert.equal(parse('<p><span>Juan Hernandez Aguilar is a small indigenous Mayan producer.</span></p><p><span>Hernandez Aguilar is a small indigenous Mayan producer.</span></p>').fields.producer,undefined);
 assert.equal(parse('<p>Another coffee: <span>Juan Hernandez Aguilar is a small indigenous Mayan producer.</span></p>').fields.producer,undefined);
 for(const story of ['Imagine a fictional producer, Maria Perez.',
  'This is not Mr. Mengeche Derso’s 15-hectare farm.',
  'Another coffee comes from a network of 300 smallholder producers.'])
  assert.equal(parse('<p>'+story+'</p>').fields.producer,undefined,story);
});

test('current named supplier and family production sentences preserve their literal credited identities',()=>{
 for(const [story,producer] of [
  ['“Manos de Mujer” is a group of female coffee producers within the COMSA organization located in Marcala.','Manos de Mujer'],
  ['ASOPCE (Association of Specialty Coffee Producers of Huehuetenango) is a smallholder farmers’ association working across the remote mountain communities.','ASOPCE'],
  ['Sourced through the Comon Yaj Noptic cooperative, a group of smallholder farmers founded in 1995, this lot reflects careful producer commitment.','Comon Yaj Noptic cooperative'],
  ['Our only Caribbean coffee, this limited offering from a family-owned farm is shade-grown and harvested at a high altitude.','family-owned farm'],
  ["The Caturra Nitro from Café UBA's Finca Milán in Pereira, Colombia is an expressive cup.",'Café UBA'],
  ['After years away from coffee, Sebastian Mejia and his family returned with a new focus on specialty production at Finca Gonzalo.','Sebastian Mejia'],
  ['Today, the Dutra family combines deep agronomic knowledge, artisanal processing, and sustainable farming practices to produce coffees consistently recognized for quality.','Dutra family'],
  ['This Black Honey Processed Coffee series from Dona Francisca and her husband, Oscar Chacon.','Dona Francisca and Oscar Chacon'],
  ['Pablo Del Cid, along with his wife Eva have committed to producing exceptional coffees in Guatemala.','Pablo Del Cid and Eva'],
  ['This may not be our first time working with Michael and Abana Coffee, but it is our first time featuring a naturally processed Anderacha lot from Abana Estate.','Abana Estate']
 ])assert.equal(parse('<p>'+story+'</p>').fields.producer,producer,story);
 assert.equal(parse('<p>Our Kenya AA Ndaroini comes to us from the dedicated farmers of the Ndaroini Factory.</p>',{name:'Kenya AA Ndaroini'}).fields.producer,'dedicated farmers of the Ndaroini Factory');
 for(const story of [
  'Another coffee is sourced through the Comon Yaj Noptic cooperative, a group of smallholder farmers.',
  'This coffee is not sourced through the Comon Yaj Noptic cooperative.',
  'Our photographer is from a family-owned farm.',
  'Last year we worked with a producer, but it is our first time featuring a lot from Abana Estate.',
  'Café UBA imported coffee from Finca Milán.',
  'Manos de Mujer is a group of female coffee roasters.',
  'The Dutra family combines hospitality and skill to roast coffee.',
  'Sebastian Mejia and his family returned with a focus on coffee marketing at the farm.'
 ])assert.equal(parse('<p>'+story+'</p>').fields.producer,undefined,story);
});
