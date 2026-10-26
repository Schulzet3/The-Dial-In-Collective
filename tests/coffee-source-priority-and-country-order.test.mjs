import test from 'node:test';
import assert from 'node:assert/strict';
import {
 extractPublicCoffeeFacts,isCoarseCoffeeFlavorTaxonomy,
 isMetricOnlyCoffeeTastingPanel,isCollapsedSelectedTastesLikePrefix
} from '../src/server/coffee-page-metadata.mjs';
import {orderExplicitCoffeeOriginTuple} from '../src/server/coffee-fact-compatibility.mjs';
const url='https://roaster.examplecoffee.com/products/current';
const parse=(name,body)=>extractPublicCoffeeFacts('<main><h1>'+name+'</h1>'+body+'</main>',{source_url:url});
const full='Cherry, apple, red wine, grilled pineapple';
const flavorTags='<div class="tc-specs-container"><div class="tc-card">'+
 '<p class="tc-card__title">Flavor Notes</p><div class="tc-tags__row">'+
 '<span class="tc-tags__pill">Berry</span><span class="tc-tags__pill">Tropical</span>'+
 '<span class="tc-tags__pill">Wine</span></div></div></div>';

test('selected explicit tasting list outranks coarse flavor chips in both display orders',()=>{
 for(const body of ['<p>Tasting Notes: '+full+'</p>'+flavorTags,flavorTags+'<p>Tasting Notes: '+full+'</p>']){
  const result=parse('Current Coffee',body);
  assert.equal(result.fields.tasting_notes,full);
  assert.ok(!result.conflicts?.includes('tasting_notes'));
  assert.ok(result.source_facts?.some(f=>f.label==='Flavor Notes'&&String(f.value).includes('Tropical')));
 }
 assert.equal(isCoarseCoffeeFlavorTaxonomy('Flavor Notes','BerryTropicalWine',full),true);
 for(const value of ['Mango, Strawberry, Cocoa','Flavor of fruit, chocolate, citrus, and tea'])
  assert.equal(isCoarseCoffeeFlavorTaxonomy('Flavor Notes',value,full),false);
});

test('two independent contradictory explicit flavor lists remain a flagged conflict',()=>{
 const result=parse('Current Coffee','<p>Tasting Notes: Cherry, apple, red wine</p>'+
  '<p>Flavor Notes: Mango, Strawberry, Cocoa</p>');
 assert.equal(result.fields.tasting_notes,undefined);
 assert.ok(result.conflicts?.includes('tasting_notes'));
});

test('acidity and body alone are not a literal tasting note profile',()=>{
 const metric='<p>Tasting Notes: Acidity: Bright and lively, Body: Full bodied, smooth</p>';
 const flavor='<p>Flavor: Strawberry, wine, and floral notes</p>';
 for(const body of [metric+flavor,flavor+metric]){
  const result=parse('Current Coffee',body);
  assert.equal(result.fields.tasting_notes,'Strawberry, wine, and floral notes');
  assert.ok(!result.conflicts?.includes('tasting_notes'));
  assert.ok(result.source_facts?.some(f=>f.label==='Tasting Notes'&&String(f.value).includes('Body: Full bodied')));
 }
 assert.equal(isMetricOnlyCoffeeTastingPanel('Tasting Notes','Acidity: Bright, Body: Smooth'),true);
 assert.equal(isMetricOnlyCoffeeTastingPanel('Tasting Notes','Cherry, milk chocolate'),false);
 assert.equal(isMetricOnlyCoffeeTastingPanel('Flavor','Acidity: Bright, Body: Smooth'),false);
});

test('shorter exactly matching generic Notes are compatible with full explicit note lists',()=>{
 const complete='Milk chocolate, toasted almond, brown sugar, gentle citrus';
 const result=parse('Current Coffee','<p>Tasting Notes: '+complete+'</p>'+
  '<p>Notes: Milk chocolate, Toasted almond, Brown sugar</p>');
 assert.equal(result.fields.tasting_notes,complete);
 assert.ok(!result.conflicts?.includes('tasting_notes'));
 const negative=parse('Current Coffee','<p>Tasting Notes: '+complete+'</p>'+
  '<p>Notes: hazelnut, lime, plum</p>');
 assert.equal(negative.fields.tasting_notes,undefined);
 assert.ok(negative.conflicts?.includes('tasting_notes'));
 assert.equal(isCollapsedSelectedTastesLikePrefix('Milk chocolateToasted almondBrown sugar, Best forEvening cups',complete),true);
 assert.equal(isCollapsedSelectedTastesLikePrefix('Milk chocolateToasted almondLime, Best forEvening cups',complete),false);
});

test('explicit country-first dot caption is ordered without adding geography or suppressing conflicts',()=>{
 for(const [given,expected] of [
  ['Burundi · Gatara, Kayanza','Gatara, Kayanza, Burundi'],
  ['Ecuador · Pichincha','Pichincha, Ecuador'],
  ['El Salvador · Concepción de Ataco','Concepción de Ataco, El Salvador']
 ]){
  const out=parse('Current Coffee','<p>Origin: '+given+'</p>');
  assert.equal(out.fields.origin,expected);
  assert.ok(out.source_facts?.some(f=>String(f.value).includes(given)));
 }
 for(const invalid of ['Kenya / Nyeri','Brazil · Kenya','Burundi · 3 packages','Burundi · Espresso Roast'])
  assert.equal(orderExplicitCoffeeOriginTuple(invalid),invalid);
 const conflict=parse('Current Coffee','<p>Origin: Burundi · Gatara, Kayanza</p><p>Country: Peru</p>');
 assert.equal(conflict.fields.origin,undefined);
 assert.ok(conflict.conflicts?.includes('origin'));
});
