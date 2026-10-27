import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const source_url='https://coffee.example/products/current';
const parse=(body,name='Current Coffee')=>extractPublicCoffeeFacts('<main><h1>'+name+'</h1>'+body+'</main>',{source_url});

test('current-coffee geographic sentences preserve their literal region and country',()=>{
 for(const [sentence,expected] of [
  ['This coffee comes from Chiapas, Mexico.','Chiapas, Mexico'],
  ['Finca Costa Rica is located in Santa María, Huila, Colombia.','Santa María, Huila, Colombia'],
  ["This coffee is grown in Costa Rica’s Central Valley.",'Central Valley, Costa Rica'],
  ['Our coffee grows in the Jimma Zone of western Ethiopia.','Jimma, Ethiopia'],
  ['Our coffee is produced in the Tarrazu region of Costa Rica.','Tarrazu, Costa Rica'],
  ['The farm is in the mountains of Anzá, Antioquia, Colombia.','Anzá, Antioquia, Colombia'],
  ['Our Colombian coffee comes from Huila, Colombia.','Huila, Colombia']
 ])assert.equal(parse('<p>'+sentence+'</p>').fields.origin,expected,sentence);
});

test('literal region evidence can complete a separately printed country without a place dictionary',()=>{
 const result=parse('<p>Country: Honduras</p><p>This coffee is grown in the Copan region.</p>');
 assert.equal(result.fields.origin,'Copan, Honduras');
 assert.equal(parse('<p>Country: Peru</p><p>This coffee is grown in the Imaginary Mountain region.</p>').fields.origin,'Imaginary Mountain, Peru');
});

test('separately typed current-product administrative levels retain their own names',()=>{
 for(const body of [
  '<p>Country: Guatemala</p><p>Region: Cobán</p><p>Department: Alta Verapaz</p><p>Municipality: San Cristóbal</p>',
  '<p>Municipality: San Cristóbal</p><p>Department: Alta Verapaz</p><p>Region: Cobán</p><p>Country: Guatemala</p>'
 ])assert.equal(parse(body).fields.origin,'San Cristóbal, Cobán, Alta Verapaz, Guatemala');
 const conflict=parse('<p>Country: Colombia</p><p>Region: Huila</p><p>Region: Cauca</p>');
 assert.equal(conflict.fields.origin,undefined);assert.ok(conflict.conflicts.includes('origin'));
 const wrong=parse('<p>Origin: Huila, Colombia</p><p>Region: Cauca</p>');
 assert.equal(wrong.fields.origin,undefined);assert.ok(wrong.conflicts.includes('origin'));
});

test('one compact geographic row retains separately captioned administrative levels',()=>{
 for(const body of ['<p>Region: Antioquia   Municipality: Caramanta</p>',
  '<p>Municipality: Caramanta Region: Antioquia</p>']){
  const result=parse('<p>Country: Colombia</p>'+body);
  assert.equal(result.fields.origin,'Caramanta, Antioquia, Colombia');
  assert.ok(!result.conflicts?.includes('origin'));
 }
 const conflict=parse('<p>Country: Colombia</p><p>Region: Huila Region: Cauca</p>');
 assert.equal(conflict.fields.origin,undefined);assert.ok(conflict.conflicts.includes('origin'));
 for(const body of ['<p>This story discusses the Region: Unknown Municipality: Imaginary</p>',
  '<p>Origin: This story discusses the Region: Unknown</p>'])
  assert.ok(!/Unknown|Imaginary/.test(parse(body).fields.origin||''));
});

test('a farm, a visit, an address and a region lesson cannot donate current-coffee geography',()=>{
 for(const sentence of [
  'The producer was born in Antigua, Guatemala.',
  'Our staff visited a farm in Antigua, Guatemala.',
  'This coffee is roasted in Austin, United States.',
  'Other coffees are grown in the Tarrazu region of Costa Rica.',
  'Farmers usually grow coffee in the Huila region of Colombia.',
  'This coffee comes from Finca Costa Rica.'
 ])assert.equal(parse('<p>'+sentence+'</p>').fields.origin,undefined,sentence);
 assert.equal(parse('<h2>What is an origin?</h2><p>Coffee is grown in the Huila region of Colombia.</p>').fields.origin,undefined);
});

test('competing narrative regions do not silently choose the first location',()=>{
 const result=parse('<p>Country: Colombia</p><p>This coffee comes from Huila, Colombia.</p>'+
  '<p>This coffee comes from Cauca, Colombia.</p>');
 assert.equal(result.fields.origin,'Colombia');
});

test('a partial prose place cannot contradict a complete caption or duplicate its possessive country',()=>{
 for(const [caption,sentence] of [
  ['Gedeb, Yirgacheffe, Gedeo Zone, Ethiopia','The washing station is high in the Gedeo Zone.'],
  ['Antigua, Guatemala','Finca El Tempixque is nestled in Guatemala’s Antigua Valley.'],
  ['Montecillos, La Paz, Honduras','The farm is in the municipality of Villa de San Antonio.'],
  ['Central Valley (Valle Central), Costa Rica','The producers in the Central Valley cultivate this coffee.']
 ]){
  const result=parse('<p>Origin: '+caption+'</p><p>'+sentence+'</p>');
  assert.equal(result.fields.origin,caption);assert.ok(!result.conflicts?.includes('origin'));
 }
 const possessive=parse('<p>Origin: Guji, Ethiopia</p><p>This coffee is grown in the high-altitude hills of Ethiopia’s Guji zone.</p>');
 assert.equal(possessive.fields.origin,'Guji, Ethiopia');
 const differentCountry=parse('<p>Origin: Huila, Colombia</p><p>This coffee is grown in Tarrazu, Costa Rica.</p>');
 assert.equal(differentCountry.fields.origin,undefined);assert.ok(differentCountry.conflicts.includes('origin'));
});

test('certification agencies, historical stations and cultivar geography do not refine a published country',()=>{
 for(const sentence of ['This coffee is certified Organic by the Montana Department of Agriculture.',
  'In those days, he used a hand operated washing station in Yirgachefe town located in Ethiopia.',
  'The water used is sourced from the coastal mountains of British Colombia, which produces a clean coffee bean.',
  'Chiroso is a new variety being grown primarily in the region of Antioquia, Colombia.']){
  const result=parse('<p>Country: Guatemala</p><p>'+sentence+'</p>');
  assert.equal(result.fields.origin,'Guatemala');assert.ok(!result.conflicts?.includes('origin'));
 }
});

test('literal large-area captions compose with typed regions and countries without inventing a country',()=>{
 const result=parse('<p>Country: Indonesia</p><p>Region/City: Aceh Province, Bener Meriah District</p>'+
  '<p>Origin: Sumatra</p>');
 assert.equal(result.fields.origin,'Aceh Province, Bener Meriah District, Sumatra, Indonesia');
 const named=parse('<p>This premium Sumatra is grown in the Jegarang region.</p>','Sumatra');
 assert.equal(named.fields.origin,'Jegarang, Sumatra');assert.ok(!named.fields.origin.includes('Indonesia'));
 const explicit=parse('<p>Region: Jegarang</p><p>Origin: Sumatra</p>');
 assert.equal(explicit.fields.origin,'Jegarang, Sumatra');
 const tuple=parse('<p>Origin: Aceh, Gayo, Indonesia</p><p>Origin: Sumatra</p>');
 assert.equal(tuple.fields.origin,'Aceh, Gayo, Sumatra, Indonesia');
 const reiterated=parse('<p>Origin: Aceh, Gayo, Indonesia</p><p>Origin: Sumatra</p><p>Country: Indonesia</p>');
 assert.equal(reiterated.fields.origin,'Aceh, Gayo, Sumatra, Indonesia');
 const contradiction=parse('<p>Region: Aceh</p><p>Origin: Sumatra</p><p>Country: Indonesia</p><p>Origin: A Different Region, Indonesia</p>');
 assert.equal(contradiction.fields.origin,undefined);assert.ok(contradiction.conflicts.includes('origin'));
});

test('a compatible prose subset keeps the fuller caption instead of replacing its regional level',()=>{
 const result=parse('<p>Origin: Buku Sayasa, Hambela, Guji, Oromia, Ethiopia</p>'+
  '<p>Region: Hambela, Guji, Oromia</p><p>The coffee comes from farmers in the Buku Sayasa community of Hambela, Guji.</p>');
 assert.equal(result.fields.origin,'Buku Sayasa, Hambela, Guji, Oromia, Ethiopia');assert.ok(!result.conflicts?.includes('origin'));
});

test('current geographic clauses can corroborate two printed locality levels',()=>{
 const result=parse('<p>Region: Uraga Woreda, Ethiopia</p><p>Located in northern Uraga in the Guji zone of Ethiopia, the cooperative grows this coffee.</p>');
 assert.equal(result.fields.origin,'Uraga, Guji, Ethiopia');assert.ok(!result.conflicts?.includes('origin'));
 const town=parse('<p>Origin: Huila, Colombia</p><p>This Colombian coffee comes from the small town of Salado Blanco and is distinct to the Huila region.</p>');
 assert.equal(town.fields.origin,'Salado Blanco, Huila, Colombia');
});

test('caption prefixes and country-farm headings cannot masquerade as regional geography',()=>{
 const result=parse('<p>Geography --Antioquia, Colombia</p>');
 assert.equal(result.fields.origin,'Antioquia, Colombia');assert.ok(!result.conflicts?.includes('origin'));
 const farm=parse('<h2>Honduras - Finca La Fortuna</h2><p>The coffee farm is in the Ocotopeque Region of Honduras.</p>','Honduras Current');
 assert.equal(farm.fields.origin,'Ocotopeque, Honduras');assert.ok(!farm.conflicts?.includes('origin'));
});

test('a preposition inside a place word cannot donate a second partial locality',()=>{
 const result=parse('<p>Origin: Coto Brus, Costa Rica</p>'+
  '<p>In Costa Rica’s southern Coto Brus region, Hacienda Río Negro grows this coffee.</p>');
 assert.equal(result.fields.origin,'Coto Brus, Costa Rica');
 assert.ok(!result.conflicts?.includes('origin'));
 const real=parse('<p>The coffee is grown close to Brus region in Costa Rica.</p>');
 assert.equal(real.fields.origin,'Brus, Costa Rica');
});

test('explicit single-origin source phrases survive roast and decaf adjectives',()=>{
 for(const [sentence,expected] of [
  ['Fireworks is a micro-batch, craft-roasted single-origin dark roast from Brazil.','Brazil'],
  ['Micro-Batch, Craft-Roasted, Single-Origin from Uganda- A Dark Roast.','Uganda'],
  ['This single-origin roast is from the highlands of Mexico.','Mexico'],
  ["Bellevue is a single-origin mountain water decaf from Colombia that doesn't compromise on flavor.",'Colombia'],
  ['Our Dark Raine is a single origin Sumatra Mandheling wet hulled process coffee.','Sumatra Mandheling']
 ])assert.equal(parse('<p>'+sentence+'</p>').fields.origin,expected,sentence);
 for(const sentence of [
  'This coffee is roasted in Brazil.',
  'This single-origin dark roast is not from Brazil.',
  'Other coffees are single-origin dark roast from Brazil.',
  'Last year this was a single-origin dark roast from Brazil.',
  'A hypothetical single-origin dark roast from Brazil could taste different.',
  'A single origin Pacamara washed coffee is an example of a cultivar.'
 ])assert.equal(parse('<p>'+sentence+'</p>').fields.origin,undefined,sentence);
 const conflict=parse('<p>Origin: Guatemala</p><p>This single-origin roast is from Mexico.</p>');
 assert.equal(conflict.fields.origin,undefined);assert.ok(conflict.conflicts.includes('origin'));
});

test('complete current blend-source lists retain literal broad areas and countries',()=>{
 for(const [sentence,expected] of [
  ['Latin American, Indonesian and African Blend','Latin America, Indonesia, Africa'],
  ['Blend: Colombia , Guatemala','Colombia, Guatemala'],
  ['Not for the fainthearted coffee drinker, this bold blend of dark roasted African and Central American coffees was developed for the outdoors-lover.','Africa, Central America']
 ])assert.equal(parse('<p>'+sentence+'</p>','Current Blend').fields.origin,expected,sentence);
 for(const sentence of [
  'Another coffee is a blend of dark roasted African and Central American coffees.',
  'This is not a blend of dark roasted African and Central American coffees.',
  'Latin American, Indonesian and chocolate Blend',
  'Blend: Colombia, Unnamed Farm, Robusta',
  'We ship this blend from the United States.'
 ])assert.equal(parse('<p>'+sentence+'</p>','Current Blend').fields.origin,undefined,sentence);
});

test('an explicit current lot hailing from a named place retains exactly that place',()=>{
 assert.equal(parse('<p>This lot hails from Tenejapa—a high-altitude spot where rich volcanic soil is ideal.</p>').fields.origin,'Tenejapa');
 for(const sentence of ['Our founder hails from Tenejapa.','Another lot hails from Tenejapa.',
  'This lot does not hail from Tenejapa.','Last year our lot hailed from Tenejapa.',
  'This lot hails from Finca Costa Rica.'])
  assert.equal(parse('<p>'+sentence+'</p>').fields.origin,undefined,sentence);
});

test('coordinated broad origin nouns retain both explicitly published areas',()=>{
 for(const story of ['These are beans from Central and South America.',
  'A blend of Central and South Americas.',
  'This blend combines coffees from Central & South America.'])
  assert.equal(parse('<p>'+story+'</p>','Current Blend').fields.origin,'Central America, South America',story);
 for(const story of ['Our staff visited Central and South America.',
  'Other coffees are from Central and South America.',
  'This coffee is not from Central and South America.'])
  assert.equal(parse('<p>'+story+'</p>').fields.origin,undefined,story);
});
