import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedWebeChecks} from '../scripts/audit/issue33-r88-webe-406-408-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const names={406:'Guatemala Los Volcanes',408:'Holy Grail No. 2: Strawberry Jam'};
const urls={406:'https://webe.coffee/products/guatemala-los-volcanes',408:'https://webe.coffee/products/strawberry-jam-colombia-santa-monica'};
const stories={
 406:'Our Alta Verapaz Guatemala Smallholder families grow organically; the coffee is fully washed. Tasting notes: Brown Sugar, Red Apple, Milk Chocolate, Orange. Roast: Light.',
 408:'Jairo Arcila grows Castillo at Santa Mónica in Quindío, Colombia. This is a 72-hour fermentation with strawberries and wine yeast, then honey processed. Tasting notes: Ripe Strawberry, Tangerine, Caramel, Chocolate. Roast: Light.'
};
const page=(n,story=stories[n],extra='')=>'<main><article class="product"><h1>'+names[n]+'</h1><div class="product__description">'+story+'</div></article></main>'+extra;
for(const n of [406,408]){
 test('#'+n+' exact selected H1 and own body evidence',()=>{
  const r=selectedWebeChecks(n,page(n),[names[n]]);
  assert.equal(r.uniqueSelected,true);assert.equal(r.ownDescription,true);assert.ok(r.ownSourcePhrases.every(Boolean));
 });
 test('#'+n+' missing, duplicated or swapped H1 must fail',()=>{
  for(const headings of [[],[names[n],names[n]],['Unrelated Coffee']])assert.equal(selectedWebeChecks(n,page(n),headings).uniqueSelected,false);
 });
 test('#'+n+' nav, reviews, and unrelated suggestions cannot supply missing selected evidence',()=>{
  const external='<nav>'+stories[n]+'</nav><aside>'+stories[n]+'</aside><footer>'+stories[n]+'</footer><script>'+stories[n]+'</script>';
  assert.equal(selectedWebeChecks(n,page(n,'',external),[names[n]]).ownDescription,false);
 });
 test('#'+n+' loss of selected official identity phrase fails closed',()=>{
  const story=stories[n].replace(n===406?'Alta Verapaz':'Santa Mónica','RETRACTED');
  assert.equal(selectedWebeChecks(n,page(n,story),[names[n]]).ownDescription,false);
 });
 test('#'+n+' parser accepts own selected source with no unrelated neighboring region',()=>{
  const other=n===406?stories[408]:stories[406];
  const r=extractPublicCoffeeFacts(page(n,stories[n],'<aside>'+other+'</aside>'),{source_url:urls[n]});
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.ok(!/strawberry|tangerine/i.test(n===406?(r.fields.tasting_notes||''):''));
  assert.ok(!/guatemala|alta verapaz/i.test(n===408?(r.fields.origin||''):''));
 });
}
test('title-only selected coffee never supplies unpublished farm or variety',()=>{
 const html='<main><article class="product"><h1>Guatemala Los Volcanes</h1><p>Our regular morning coffee.</p></article></main>';
 const r=extractPublicCoffeeFacts(html,{source_url:urls[406]});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.ok(!/los volcanes/i.test(r.fields.producer||''));
});
test('not every strawberry co-ferment is a tasting-note license without selected literal notes',()=>{
 const s=stories[408].replace('Tasting notes: Ripe Strawberry, Tangerine, Caramel, Chocolate.','');
 const r=extractPublicCoffeeFacts(page(408,s),{source_url:urls[408]});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.ok(!/tangerine|caramel/i.test(r.fields.tasting_notes||''));
});
