// Issue33 original603 #586 current selected "What You'll Taste" vs "The Cup":
// two directly published, incompatible literal lists must remain reviewable.
// Synthetic selected page fixtures; actual official source separately SHA-bound.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractProductFlavorProfiles} from '../src/server/coffee-flavor-evidence.mjs';

const sourceUrl='https://www.unlockedcoffee.com/products/dedication-costa-rica';
const notesA='Cooked Cranberry • Toffee • Spices • Fresh Watermelon';
const notesB='peach, clementine, honey, lemon, strawberry and brown sugar';
const selectedHeader='<h3>What You\'ll Taste</h3><p>Expect an unforgettable combination of:</p><p>'+notesA+'</p>';
const staleDetail='<h3>The Cup</h3><p>Notes: '+notesB+'.</p>';
const clean=(value,max=6001)=>String(value).replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
function html(selected,related=''){
 return '<html><head><meta property="og:type" content="product"/><link rel="canonical" href="'+sourceUrl+'"/></head><body>'+
  '<main><article class="product"><h1>Dedication- Costa Rica</h1><div class="product__description">'+selected+'</div></article></main>'+
  related+'</body></html>';
}
test('#586 exact current selected What You\'ll Taste multi-note list retains complete literal descriptors',()=>{
 const profiles=extractProductFlavorProfiles(html(selectedHeader),{clean});
 assert.ok(profiles.some(v=>/Cooked Cranberry/i.test(v)&&/Fresh Watermelon/i.test(v)),JSON.stringify(profiles));
});
test('#586 two incompatible direct selected sensory labels do not silently choose the stale lower one',()=>{
 const parsed=extractPublicCoffeeFacts(html(selectedHeader+staleDetail),{source_url:sourceUrl});
 assert.equal(parsed.ok,true,JSON.stringify(parsed));
 assert.ok((parsed.conflicts||[]).includes('tasting_notes'),JSON.stringify(parsed));
 assert.equal(parsed.fields.tasting_notes,undefined,JSON.stringify(parsed.fields));
});
test('#586 duplicate equivalent selected labels and an unrelated related-coffee list are not false contradictions',()=>{
 const repeated=extractPublicCoffeeFacts(html(selectedHeader+'<h3>The Cup</h3><p>Notes: Cooked Cranberry, Toffee, Spices, Fresh Watermelon.</p>'),{source_url:sourceUrl});
 assert.equal(repeated.ok,true,JSON.stringify(repeated));
 assert.ok(!(repeated.conflicts||[]).includes('tasting_notes'),JSON.stringify(repeated));
 const other=extractPublicCoffeeFacts(html(selectedHeader,
  '<aside class="related-products"><h3>The Cup</h3><p>Notes: '+notesB+'</p></aside>'),{source_url:sourceUrl});
 assert.equal(other.ok,true,JSON.stringify(other));
 assert.ok(!(other.conflicts||[]).includes('tasting_notes'),JSON.stringify(other));
 assert.doesNotMatch(other.fields.tasting_notes||'',/peach/i);
});
