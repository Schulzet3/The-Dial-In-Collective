import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractCoffeeBlendEvidence} from '../src/server/coffee-blend-evidence.mjs';
const source_url='https://roaster.example/products/current';
const parse=(body,name='House Blend')=>extractPublicCoffeeFacts('<main><h1>'+name+'</h1>'+body+'</main>',{source_url});

test('literal blend geography includes broad regions and national adjectives',()=>{
 for(const [sentence,expected] of [
  ['Crafted with coffee from South America and Ethiopia.','South America, Ethiopia'],
  ['A fusion of high-altitude Guatemalan, Mexican, and Colombian coffee.','Guatemala, Mexico, Colombia'],
  ['We combine South American, African and Indonesian beans.','South America, Africa, Indonesia'],
  ['A blend of Central and South American coffees.','Central America, South America'],
  ['This 100% Central/South American Arabica is blended for a medium roast.','Central America, South America'],
  ['A rich blend of our Latin American favorites.','Latin America'],
  ['This blend uses coffees sourced from Latin America, East Africa and Colombia.','Latin America, East Africa, Colombia']
 ])assert.equal(parse('<p>'+sentence+'</p>').fields.origin,expected,sentence);
});

test('one known component method cannot represent the entire blend',()=>{
 const body='<p>Jammy blueberry notes of our natural Ethiopia are intricately layered with the sweet pepper from our Sumatra. Proudly hand blended.</p>';
 const result=parse(body,'Wild');assert.equal(result.fields.origin,'Ethiopia, Sumatra');assert.equal(result.fields.process,undefined);
 assert.ok(result.roaster_details?.blend_components.includes('natural Ethiopia'));
 const explicit=parse('<p>Process: Washed</p>'+body,'Wild');assert.equal(explicit.fields.process,'Washed');
});

test('an explicit complete process mixture keeps Other/Unknown and all literal origin evidence',()=>{
 for(const sentence of ['Our espresso features a blend of washed and natural process coffees.',
  'This coffee is a blend of pulped natural and natural beans.'])
  assert.equal(parse('<p>'+sentence+'</p>').fields.process,'Other/Unknown',sentence);
 const full=parse('<p>A blend of coffees from Brazil and Ethiopia.</p><p>This is a blend of washed coffees.</p>');
 assert.equal(full.fields.process,'Washed');assert.equal(full.fields.origin,'Brazil, Ethiopia');
 const source=extractCoffeeBlendEvidence('<p>A blend of pulped natural and natural beans.</p>',{name:'Current Blend'});
 assert.deepEqual(source.processes,['Honey','Natural']);
 const complete=parse('<p>The blend is currently made up of washed process Guatemalan and Colombian coffees.</p>');
 assert.equal(complete.fields.origin,'Guatemala, Colombia');assert.equal(complete.fields.process,'Washed');
});

test('visits, examples, and cultivar genetics cannot invent a coffee blend',()=>{
 for(const body of ['<p>Our staff visited farms in Ethiopia and Colombia.</p>',
  '<p>Other coffees are a blend of washed and natural process beans.</p>',
  '<p>A blend of Ethiopian landrace cultivars grown at Finca Costa Rica in Colombia.</p>']){
  const result=parse(body,'Current Coffee');assert.notEqual(result.fields.process,'Other/Unknown');
  assert.ok(!result.fields.origin?.includes('Ethiopia'));
 }
});

test('cultivar history and field-blend vocabulary cannot invent component countries',()=>{
 for(const body of [
  '<p>Origin: Chiapas, Mexico</p><p>The variety was collected from Ethiopian coffee forests and perfected in Panama, and is now grown throughout Central and South America.</p>',
  '<p>Origin: West Java, Indonesia</p><p>Variety: Field Blend</p><p>Indonesia’s coffee industry is different from the development of specialty coffee in Africa and Latin America.</p>',
  '<p>Origin: Peru</p><p>Peru is a country in South America known for coffee.</p>'
 ]){
  const result=parse(body,'Current Coffee');assert.ok(!result.conflicts?.includes('origin'));
  assert.ok(!result.fields.origin?.includes('Africa'));assert.ok(!result.fields.origin?.includes('South America'));
 }
});

test('a comparison coffee does not donate its country to the new blend',()=>{
 const result=parse('<p>Origin: Santa Ana, El Salvador</p><p>We select coffees to match the flavor profile of the EA Colombia decaf by blending in a naturally processed coffee with a washed lot from Ayutepeque.</p>','Santa Ana Decaf');
 assert.equal(result.fields.origin,'Santa Ana, El Salvador');assert.ok(!result.conflicts?.includes('origin'));
});

test('a partial component origin cannot preempt the full published blend countries',()=>{
 const result=parse('<p>The strawberry component comes from a farm in Tolima, Colombia.</p>'+
  '<p>This season’s base is Santa Maria from Costa Rica’s Tarrazu region.</p><p>Origin: Colombia &amp; Costa Rica</p>','Seasonal Blend');
 assert.equal(result.fields.origin,'Colombia & Costa Rica');assert.ok(!result.conflicts?.includes('origin'));
});

test('an explicitly complete blend composition retains both countries despite a component-only summary',()=>{
 const composition='<p>For this coffee we used a blend of beans from Mexico and Colombia.</p>';
 const result=parse(composition+'<p>Origin: Colombia</p>','Current Blend');
 assert.equal(result.fields.origin,'Mexico, Colombia');assert.ok(!result.conflicts?.includes('origin'));
 const conflict=parse(composition+'<p>Origin: Guatemala</p>','Current Blend');
 assert.equal(conflict.fields.origin,undefined);assert.ok(conflict.conflicts.includes('origin'));
});

test('distinct current-coffee process expressions are retained as a mixture',()=>{
 const body='<p>Current Coffee brings together three distinct expressions of this Parainema harvest from Finca Elizabeth in Honduras. '+
  'Washed processing delivers clarity. Dry process adds viscosity. Honey carbonic maceration turns up the complexity.</p>'+
  '<p>Blended together, these individual tracks form this single origin blend.</p>';
 const result=parse(body,'Current Coffee');
 assert.equal(result.fields.process,'Other/Unknown');
 assert.match(result.roaster_details.processing_detail,/Washed/);assert.match(result.roaster_details.processing_detail,/Natural/);
 assert.match(result.roaster_details.processing_detail,/Honey/);
});
