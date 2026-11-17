import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {entries,selectedEvidence,selectedFieldChecks} from '../scripts/audit/issue33-r263-502-504-check.mjs';
const [brazil,tanzania]=entries;
const html=(entry,copy,sibling='')=>'<html><head><meta property="og:site_name" content="Kamiak Coffee Company"></head><body>'+
 '<main><article class="product"><h1>'+entry.name+'</h1><div class="product__description">'+copy+
 '</div></article></main>'+sibling+'</body></html>';
const brazilCopy='<h2>Tasting Notes</h2><p>This delightful Brazil Single estate coffee has notes of mellow cocoa and roasted peanut with an unrefined panela sweetness.</p>'+
 '<h2>About the Farm</h2><p>Fazenda Samambaia in Campos das Vertentes is led today by Henrique Dias Cambraia.</p>'+
 '<p>Origin: Brazil</p><p>Region: Campos das Vertentes</p><p>Farm: Fazenda Samambaia</p>'+
 '<p>Variety: Yellow Bourbon</p><p>Altitude: 1,100 masl</p><p>Proc. Method: Pulped Natural</p><p>Roast Level: Medium</p>';
const tanzaniaCopy='<h2>Tasting Notes</h2><p>Very clean profile with subtle notes of honeydew, agave sweetness, and a mild peatiness.</p>'+
 '<h2>About the Farm</h2><p>AMCOS connects smallholder farmers.</p>'+
 '<p>Country: Tanzania</p><p>Region: Mbeya</p><p>Farm: AMCOS Cooperative</p>'+
 '<p>Variety: Bourbon Derivatitves</p><p>Altitude: 1870 masl</p><p>Proc. Method: Washed</p><p>Roast Level: Light</p>';
test('original603 #502 and #504 require distinct exact selected H1 and own product literals',()=>{
 for(const [entry,copy] of [[brazil,brazilCopy],[tanzania,tanzaniaCopy]]){
  const own=productMarkup(html(entry,copy)),heads=selectedProductHeadings(own);
  assert.deepEqual(selectedEvidence(own,heads,entry),{identity:true,direct:true});
  assert.equal(selectedEvidence(own,[],entry).identity,false);
  assert.equal(selectedEvidence(own,[entry.name,entry.name],entry).identity,false);
  assert.equal(selectedEvidence(own,[entry.name+' copy'],entry).identity,false);
  const missing=entry.number===502?copy.replace('Henrique Dias Cambraia','Unknown owner'):copy.replace('honeydew','No direct sensory');
  assert.equal(selectedEvidence(productMarkup(html(entry,missing)),[entry.name],entry).direct,false);
 }
});
test('selected parser and explicit Add Coffee/Source Review UI are distinct from unrelated SEO/reviews',()=>{
 for(const [entry,copy] of [[brazil,brazilCopy],[tanzania,tanzaniaCopy]]){
  const adjacent='<nav>Dark Roast Kenya</nav><aside><h2>Different coffee</h2><p>Strawberry, banana, farmer Alice 2500 masl</p></aside>';
  const p=extractPublicCoffeeFacts(html(entry,copy,adjacent),{source_url:entry.url});
  assert.equal(p?.ok,true,JSON.stringify(p));
  assert.equal(p.fields?.name,entry.name,JSON.stringify(p.fields));
  assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
  assert.ok(coffeeSourceReviewSnapshot({...p,source_url:entry.url}));
  assert.doesNotMatch(JSON.stringify(p.fields||{}),/strawberry|banana|farmer Alice|2500|Kenya/i);
 }
});
test('source fields are withheld absent matching seller evidence, not guessed from old oracle',()=>{
 for(const [entry,copy] of [[brazil,brazilCopy],[tanzania,tanzaniaCopy]]){
  const p=extractPublicCoffeeFacts(html(entry,copy),{source_url:entry.url});
  assert.equal(p?.ok,true,JSON.stringify(p));
  assert.equal(selectedFieldChecks(entry,{name:entry.name,roaster:'Kamiak',origin:'',tasting_notes:''}).exact_origin,false);
 }
});
test('unavailable official original603 selected pages are never source accepted',()=>{
 assert.deepEqual(requiredFocusedSourceFailures([502,504],
  [{number:502,status:'UNAVAILABLE',parser_ok:false},{number:504,status:'UNAVAILABLE',parser_ok:false}])
  .map(x=>x.reason),['required_official_source_not_fetched','required_official_source_not_fetched']);
});
