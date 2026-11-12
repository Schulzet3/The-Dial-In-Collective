import test from 'node:test';
import assert from 'node:assert/strict';
import {cases,ownSelectedProof} from '../scripts/audit/issue33-r95-blackhills-436-438-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const c=n=>cases.find(x=>x.number===n);
const markup=(entry,body,extra='')=>'<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>'+
 entry.name+'</h1><div class="product__description"><p>'+body+'</p></div></article>'+extra+'</main></body></html>';
const parse=(entry,body,extra='')=>extractPublicCoffeeFacts(markup(entry,body,extra),{
 source_url:'https://www.blackhillscoffee.com'+entry.path});
test('original #436 current exact House Blend sentence and mixed component roasts are witnessed',()=>{
 const e=c(436),html=markup(e,e.own.join('. ')),scope=productMarkup(html);
 assert.deepEqual(ownSelectedProof(scope,selectedProductHeadings(scope),e),{uniqueH1:true,direct:[true,true]});
});
test('original #438 current exact Washington description explicitly says roasted light',()=>{
 const e=c(438),html=markup(e,e.own[0]),scope=productMarkup(html);
 assert.deepEqual(ownSelectedProof(scope,selectedProductHeadings(scope),e),{uniqueH1:true,direct:[true]});
});
test('stale or unrelated sidebar/nav must not constitute selected direct sentence',()=>{
 for(const e of cases){
  const x=markup(e,'Unspecified current blend.', '<aside>'+e.own.join(' ')+'</aside><nav>'+e.own.join(' ')+'</nav>');
  const scope=productMarkup(x);
  assert.ok(ownSelectedProof(scope,selectedProductHeadings(scope),e).direct.every(v=>v===false));
 }
});
test('absent, wrong or repeated H1 fails exact selected identity, including genuine description',()=>{
 for(const e of cases)for(const headings of [[],['Other Coffee'],[e.name,e.name]]){
  assert.equal(ownSelectedProof(markup(e,e.own.join(' ')),headings,e).uniqueH1,false);
 }
});
test('House Blend component City + Full City cannot be converted to one roast tier or medium grind',()=>{
 const e=c(436),p=parse(e,e.own.join('. '));
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,e.name);
 assert.ok(!p.fields.roast_level,JSON.stringify(p.fields));
 assert.match(p.fields.origin||'',/South America/i);
 assert.match(p.fields.origin||'',/Central America/i);
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:'https://www.blackhillscoffee.com'+e.path}));
});
test("Washington's exact selected light roast outranks Medium grind selection",()=>{
 const e=c(438),p=parse(e,e.own.join(' '),'<aside><label>Grind</label><option>Medium</option></aside>');
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,e.name);
 assert.equal(p.fields.roast_level,'Light',JSON.stringify(p.fields));
 assert.match(p.fields.origin||'',/South America/i);
 assert.match(p.fields.origin||'',/Central America/i);
});
test('no adjacent coffee or low-priority generic product cards donate flavor, country or roast',()=>{
 const e=c(436),related='<aside><h2>Other Coffee</h2><p>Ethiopia, blueberries, Gesha, Natural, Dark</p></aside>';
 const p=parse(e,e.own.join('. '),related);
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.ok(!/ethiopia|blueberr|gesha/i.test(JSON.stringify(p.fields)),JSON.stringify(p.fields));
 assert.ok(!p.fields.process&&!p.fields.producer&&!p.fields.decaffeination_method);
});
