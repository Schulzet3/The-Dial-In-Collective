// Source-bound Issue33 original603 #502: selected-current product sensory
// grammar; fixtures are synthetic, not fresh current official HTTP.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://www.kamiakcoffeeco.com/products/brazil-single-estate';
const page=(body,other='')=>'<html><head><meta property="og:type" content="product"></head><body><main>'+
 '<article class="product"><h1>Brazil - Fazenda Samambaia</h1><div itemprop="description">'+body+'</div></article>'+
 other+'</main></body></html>';
const parse=(body,other='')=>extractPublicCoffeeFacts(page(body,other),{source_url:url});
const named='<p>This delightful Brazil Single estate coffee has notes of mellow cocoa and roasted peanut with an unrefined panela sweetness.</p>';
test('selected Brazilian estate sensory narrative preserves all three literal notes',()=>{
 const r=parse(named+'<p>Origin: Brazil</p><p>Region: Campos das Vertentes</p>');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,'Brazil - Fazenda Samambaia');
 assert.match(r.fields.tasting_notes||'',/mellow cocoa/i);
 assert.match(r.fields.tasting_notes||'',/roasted peanut/i);
 assert.match(r.fields.tasting_notes||'',/unrefined panela sweetness/i);
 assert.ok(!r.conflicts?.includes('tasting_notes'),JSON.stringify(r.conflicts));
});
test('conditional milk sweetness must not become unconditional notes',()=>{
 const r=parse('<p>This coffee has notes of cocoa and roasted peanut.</p>'+
  '<p>When served with milk, this coffee has notes of cocoa and roasted peanut with an unrefined panela sweetness.</p>');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.doesNotMatch(r.fields.tasting_notes||'',/panela/i);
});
test('related product sugar note cannot contaminate selected current product',()=>{
 const r=parse('<p>Origin: Brazil</p><p>Profile: Hazelnut, Cinnamon</p>',
  '<aside class="related-products"><h2>Other Coffee</h2>'+named+'</aside>');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.doesNotMatch(r.fields.tasting_notes||'',/panela/i);
});
test('plain sugar-processing description is not a sensory label',()=>{
 const r=parse('<p>Origin: Brazil</p><p>Processed using unrefined panela sugar to prepare a beverage.</p>');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.doesNotMatch(r.fields.tasting_notes||'',/panela/i);
});
