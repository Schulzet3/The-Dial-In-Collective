import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const parsed=(name,body,url)=>extractPublicCoffeeFacts('<main><h1>'+name+'</h1>'+body+'</main>',{source_url:url});
test('selected Liliana Tres Cochadas current lot washed after fermentation is washed processing',()=>{
 const r=parsed('Liliana Ramírez // Colombia',
  '<p>This lot is 100% Chiroso and is processed using the traditional Tres Cochadas method.</p>'+
  '<p>Each day’s coffee is pulped after floating and combined, fermented together, and then washed together on the fourth day.</p>',
  'https://queencitycollectivecoffee.com/products/liliana-ramirez-colombia');
 assert.equal(r.ok,true);assert.equal(r.fields.process,'Washed');
 assert.match(r.roaster_details.processing_detail,/Tres Cochadas.*washed/i);
});
test('named method alone, different coffee or generally washed association cannot force Process',()=>{
 const url='https://queencitycollectivecoffee.com/products/liliana-ramirez-colombia';
 for(const body of [
  '<p>This lot is processed using the traditional Tres Cochadas method.</p><p>Other coffees are washed.</p>',
  '<p>Another coffee is processed using the traditional Tres Cochadas method.</p><p>Each day’s coffee is pulped, fermented together, and then washed together.</p>',
  '<p>These coffees are generally washed two or three times.</p>'
 ]){
  const r=parsed('Liliana Ramírez // Colombia',body,url);
  assert.equal(r.fields.process,undefined);
 }
});
test('only matching selected Karumandi factory with complete wet-ferment/dry sequence yields Washed',()=>{
 const story='<p>The Karumandi Coffee Factory sits just south of Mount Kenya.</p>'+
  '<p>Cherries are delivered and meticulously sorted at the mill, then undergo de-pulping and the wet fermentation process.</p>'+
  '<p>Once the process is complete, the coffee is laid to dry on a raised bed.</p>';
 assert.equal(parsed('Kenya Karumandi',story,'https://www.stumptowncoffee.com/products/kenya-karumandi').fields.process,'Washed');
 assert.equal(parsed('Kenya Kamwangi',story,'https://www.stumptowncoffee.com/products/kenya-kamwangi').fields.process,undefined);
});
test('selected Kona Espresso roast comparison keeps its own cupping notes, never other roast flavor claims',()=>{
 const r=parsed('100% Kona Espresso Roast Coffee 16oz',
  '<h2>Cupping Notes on Mountain Thunder’s Coffee:</h2>'+
  '<p>American - Floral. Vienna - Nutty. French - Bittersweet chocolate. Espresso - Smokey with caramel notes. Black and Tan - Orange.</p>'+
  '<p>Our Espresso Roast has noticeable chocolate overtones.</p>',
  'https://mountainthunder.com/products/espresso16');
 assert.equal(r.fields.tasting_notes,'Smokey, Caramel, Chocolate');
 assert.doesNotMatch(r.fields.tasting_notes,/Floral|Nutty|Orange/);
});
test('no selected named roast variation means no other roasted coffee notes',()=>{
 const r=parsed('100% Kona Peaberry',
  '<h2>Cupping Notes on Mountain Thunder’s Coffee:</h2><p>Espresso - Smokey with caramel notes. Vienna - Nutty.</p>',
  'https://mountainthunder.com/products/peaberry');
 assert.equal(r.fields.tasting_notes,undefined);
});
