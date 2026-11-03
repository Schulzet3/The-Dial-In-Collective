// Issue #33 owner77 #23. Official selected H1/body verified by public web read;
// synthetic adversarial fixtures, NOT DNS-pinned raw HTML or real member acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://favor.coffee/products/the-token-dark-blend';
const selected='<article class="product"><h1>The Token Dark Blend</h1><div itemprop="description">'+
 '<p>Producer: Miriam Monteiro de Aguiar: Fazenda Cachoeira</p>'+
 '<p>Origin: Santo Antônio do Amparo, Minas Gerais, Brazil</p>'+
 '<p>We Taste: Hazelnut, Toffee, Milk Chocolate, Praline, Golden Raisin</p>'+
 '<p>Process: Natural</p><p>Altitude: 1000 masl</p>'+
 '<p>Our year-round Token Dark Roast features coffee from Miriam Monteiro de Aguiar.</p>'+
 '<p>This medium-dark roast emphasizes sweetness with a hint of dried fruit brightness.</p>'+
 '</div></article>';
const page=(head='',after='')=>'<html><head><meta property="og:type" content="product">'+head+
 '</head><body><main>'+selected+after+'</main></body></html>';
const parse=(head='',after='')=>extractPublicCoffeeFacts(page(head,after),{source_url:url});

test('Favor current Token Dark selected prose outranks Dark branding with literal Medium-Dark',()=>{
 const result=parse();
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.fields.name,'The Token Dark Blend');
 assert.equal(result.fields.roast_level,'Medium-Dark');
 assert.ok(!result.conflicts?.includes('roast_level'),JSON.stringify(result.conflicts));
 assert.equal(result.fields.process,'Natural');
 assert.match(result.fields.origin||'',/Santo Ant[oô]nio do Amparo.*Brazil/i);
 assert.match(result.fields.tasting_notes||'',/Hazelnut/i);
 assert.match(result.fields.tasting_notes||'',/Golden Raisin/i);
});

test('related Dark coffee, stale Dark SEO and Medium grind option do not override selected roast',()=>{
 const head='<title>Token Dark Roast | Favor Coffee</title>'+
  '<meta property="og:title" content="Token Dark Roast">'+
  '<meta property="og:description" content="A dark roast coffee">';
 const unrelated='<aside class="related-products"><h2>Related Products</h2>'+
  '<h3>Other Dark Roast</h3><p>Roast: Dark</p></aside>'+
  '<form><label for="grind">Grind Preference</label><select id="grind" name="grind">'+
  '<option selected>Medium (Drip)</option><option>Whole Bean</option></select></form>';
 const result=parse(head,unrelated);
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.fields.name,'The Token Dark Blend');
 assert.equal(result.fields.roast_level,'Medium-Dark');
 assert.ok(!result.conflicts?.includes('roast_level'),JSON.stringify(result.conflicts));
 assert.doesNotMatch(JSON.stringify(result.fields),/Other Dark Roast|Medium \(Drip\)/i);
});
