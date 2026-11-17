import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {entry,selectedEvidence,selectedFields} from '../scripts/audit/issue33-r261-501-check.mjs';
const copy='<p>Ki-Saya, our organic gem from Chiapas, blends two Mayan words: "Ki" (tasty) and "Saayab" (nature). Coffee runs deep here; growers are indigenous, mainly Tzotzil and Tzeltal.</p>'+
 '<p>This lot hails from Tenejapa—a high-altitude spot where rich volcanic soil and ideal climate make magic happen.</p>'+
 '<p>Notes Of: Chocolate, creamy caramel, honey, hazelnut</p>';
const page=(desc=copy,sibling='')=>'<html><body><main><article class="product"><h1>'+entry.name+
 '</h1><div class="product__description">'+desc+'</div></article></main>'+sibling+'</body></html>';
const parse=(desc=copy,sibling='')=>extractPublicCoffeeFacts(page(desc,sibling),{source_url:entry.url});
test('#501 exact selected official identity and literal own-product evidence, no URL/SEO substitution',()=>{
 const markup=productMarkup(page()),proof=selectedEvidence(markup,selectedProductHeadings(markup));
 assert.equal(proof.identity,true);assert.equal(proof.direct,true);
 for(const wrong of [[],['Another Coffee'],[entry.name,entry.name]])
  assert.equal(selectedEvidence(markup,wrong).identity,false);
 assert.equal(selectedEvidence(productMarkup(page(copy.replace('Chiapas','Oaxaca'))),[entry.name]).direct,false);
});
test('#501 seller-owned direct notes and locality; high altitude is NOT a numeric elevation or a Medium roast',()=>{
 const p=parse();assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,entry.name,JSON.stringify(p.fields));
 const checks=selectedFields(p.fields);delete checks.roaster; // Synthetic markup has no seller branding.
 for(const [field,ok] of Object.entries(checks))assert.equal(ok,true,field+' '+JSON.stringify(p.fields));
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:entry.url}));
});
test('#501 do not leak medium Grind, navigation Dark Roast, sibling Peru or customer review flavors',()=>{
 const unrelated='<nav>Dark Roast | Medium Roast | Ethiopia</nav>'+
  '<aside class="related-products"><h2>Different Coffee</h2><p>Peru, Natural, Gesha, 2100 masl, Banana, Medium</p></aside>'+
  '<section id="reviews"><p>My espresso grind is Medium and I taste tobacco.</p></section>';
 const p=parse(copy,unrelated);assert.equal(p.ok,true,JSON.stringify(p));
 assert.doesNotMatch(JSON.stringify(p.fields||{}),/banana|gesha|tobacco|2100|peru/i);
 assert.equal(p.fields.roast_level,undefined);assert.ok(!p.fields.elevation_m&&!p.fields.process);
});
test('no official #501 fetch remains a review case, not a passed 603 certification',()=>{
 const failures=requiredFocusedSourceFailures([501],[{number:501,status:'UNAVAILABLE',parser_ok:false}]);
 assert.equal(failures.filter(x=>x.reason==='required_official_source_not_fetched').length,1);
});