import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {entry,selectedEvidence} from '../scripts/audit/issue33-r262-503-check.mjs';
const desc='<h2>Tasting Notes</h2><p>Very sweet with juicy fruit acidity and a creamy mouthfeel; lots of fruity and floral flavors with blackberry, vanilla bean creaminess, and botanical notes.</p>'+
 '<h2>About the Farm</h2><p>Grade 1 Natural, hand sorted ripe cherries.</p>'+
 '<p>Country: Ethiopia</p><p>Region: Guji</p><p>Farm: Various smallholder farmers delivering to the Guracho Washing Station</p>'+
 '<p>Variety: Typica</p><p>Altitude: 1900–2100 masl</p><p>Proc. Method: Natural</p>';
const page=(copy=desc,sibling='')=>'<html><head><meta property="og:site_name" content="Kamiak Coffee Company"></head><body>'+
 '<main><article class="product"><h1>'+entry.name+'</h1><div class="product__description">'+copy+
 '</div></article></main>'+sibling+'</body></html>';
const parse=(copy=desc,sibling='')=>extractPublicCoffeeFacts(page(copy,sibling),{source_url:entry.url});
test('#503 product-scoped exact identity and direct source are necessary, not SEO or adjacent product',()=>{
 const own=productMarkup(page());
 assert.deepEqual(selectedEvidence(own,selectedProductHeadings(own)),{identity:true,direct:true});
 for(const wrong of [[],['Ethiopia - Washed Sidama'],[entry.name,entry.name]])
  assert.equal(selectedEvidence(own,wrong).identity,false);
 assert.equal(selectedEvidence(productMarkup(page(desc.replace('Guracho','Unrelated'))),[entry.name]).direct,false);
});
test('#503 structured direct seller attributes parse into Add Coffee and Source Review without saving',()=>{
 const p=parse();assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields?.name,entry.name,JSON.stringify(p.fields));
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:entry.url}));
});
test('#503 selected sensory text does not borrow another product or reviewer specifics',()=>{
 const unrelated='<nav>Dark Roast, Kenya</nav><aside><h2>Kenya Washed Coffee</h2>'+
  '<p>Strawberry, banana, cocoa, 2300 masl, producer Another Farm</p></aside>'+
  '<section id="reviews">I taste strawberry and tobacco.</section>';
 const p=parse(desc,unrelated);assert.equal(p.ok,true,JSON.stringify(p));
 assert.doesNotMatch(JSON.stringify(p.fields||{}),/banana|strawberry|tobacco|2300|another farm|kenya/i);
});
test('no #503 official source does not count as a semantic PASS',()=>{
 assert.deepEqual(requiredFocusedSourceFailures([503],[{number:503,status:'UNAVAILABLE',parser_ok:false}])
  .map(x=>x.reason),['required_official_source_not_fetched']);
});

// R262: actual current #503 seller printed a marketing recommendation
// after a genuine tasting paragraph; canonical sensory must not contain it.
test('#503 direct selected tasting prose excludes a separate generic sales invitation',()=>{
 const sensory='Very sweet with juicy fruit acidity and a creamy mouthfeel; lots of fruity and floral flavors with blackberry, vanilla bean creaminess, and botanical notes.';
 const pitch=' If you love Ethiopian or African coffee in general, this is a great coffee for you.';
 const p=parse(desc.replace(sensory,sensory+pitch));
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.match(p.fields.tasting_notes||'',/blackberry.*vanilla bean.*botanical notes/i);
 assert.doesNotMatch(p.fields.tasting_notes||'',/If you love.*coffee in general/i);
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:entry.url}));
});
