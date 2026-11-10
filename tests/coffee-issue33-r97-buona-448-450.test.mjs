import test from 'node:test';
import assert from 'node:assert/strict';
import {cases,ownSelectedProof} from '../scripts/audit/issue33-r97-buona-448-450-check.mjs';
import {selectedCurrentNamedGrowingValley} from '../src/server/coffee-selected-growing-valley-origin.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const c=n=>cases.find(x=>x.number===n);
const markup=(entry,body,extra='')=>'<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>'+
 entry.name+'</h1><div class="product__description"><p>'+body+'</p></div></article>'+extra+'</main></body></html>';
const parse=(entry,body,extra='')=>extractPublicCoffeeFacts(markup(entry,body,extra),{source_url:'https://www.buonacaffe.com'+entry.path});
test('three original selected URL names and direct product facts are individually witnessed',()=>{
 for(const entry of cases){
  const scoped=productMarkup(markup(entry,entry.own.join('. ')));
  assert.deepEqual(ownSelectedProof(scoped,selectedProductHeadings(scoped),entry),{
   uniqueH1:true,direct:entry.own.map(()=>true)});
 }
});
test('menu, related card and footer are never selected product description evidence',()=>{
 for(const entry of cases){
  const scoped=productMarkup(markup(entry,'This coffee has no published details.',
    '<aside>'+entry.own.join(' ')+'</aside><nav>'+entry.own.join(' ')+'</nav><footer>'+entry.own.join(' ')+'</footer>'));
  assert.deepEqual(ownSelectedProof(scoped,selectedProductHeadings(scoped),entry).direct,entry.own.map(()=>false));
 }
});
test('missing, changed or duplicated H1 cannot certify selected official identity',()=>{
 for(const entry of cases)for(const headings of [[],['Different Coffee'],[entry.name,entry.name]]){
  assert.equal(ownSelectedProof(markup(entry,entry.own.join(' ')),headings,entry).uniqueH1,false);
 }
});
test('current selected #448 has two separately printed variety lists, not a single unambiguous list',()=>{
 const entry=c(448);const scope=productMarkup(markup(entry,entry.own.join('. ')));
 const proof=ownSelectedProof(scope,selectedProductHeadings(scope),entry);
 assert.ok(proof.direct[0]&&proof.direct[1]);
 assert.ok(!/variety/i.test(entry.name));
});
test('Buona #449 direct own Aceh Sumatra location and Dark Roast are bounded to chosen SKU',()=>{
 const entry=c(449),p=parse(entry,entry.own.join('. '),
  '<aside><h2>Other Coffee</h2>Ethiopia blueberry natural Caturra washed</aside>');
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,entry.name);
 assert.equal(p.fields.roast_level,'Dark',JSON.stringify(p.fields));
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:'https://www.buonacaffe.com'+entry.path}));
 assert.doesNotMatch(JSON.stringify(p.fields),/Ethiopia|blueberry|Caturra/);
});
test('Buona #450 Dark selected identity does not borrow adjacent coffee processing',()=>{
 const entry=c(450),p=parse(entry,entry.own.join('. '),
  '<aside><h2>Other Coffee</h2>Ethiopia blueberry natural washed</aside>');
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,entry.name);
 assert.equal(p.fields.roast_level,'Dark',JSON.stringify(p.fields));
 assert.doesNotMatch(JSON.stringify(p.fields),/Ethiopia|blueberry|washed/);
});

test('selected own current Huehuetenango valley refines only proven Guatemala country',()=>{
 const e=c(448),p=parse(e,'Guatemala Huehuetenango Los Laureles Variety: Bourbon, Caturra, Processing: Fully washed, Altitudes: 1350-1550m, Grade: SHB, Variety: Caturra, Pache, Maragogype, others. This is located in one of most impresive valleys of Huehuetenango, surrounded by tall mountains and a unique landscape. The farm was established in 1966.');
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.origin,'Huehuetenango, Guatemala',JSON.stringify(p.fields));
 assert.ok(!p.fields.variety||(p.conflicts||[]).includes('variety'));
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:'https://www.buonacaffe.com'+e.path}));
});
test('standalone current valley only when exact H1 and accepted country match direct own claim',()=>{
 const e=c(448),quote='This is located in one of most impresive valleys of Huehuetenango, surrounded by tall mountains and a unique landscape';
 const blocks=[{tag:'h1',text:e.name},{tag:'p',text:quote,educational:false,section:''}];
 assert.equal(selectedCurrentNamedGrowingValley({name:e.name,origin:'Guatemala',blocks})?.value,'Huehuetenango, Guatemala');
 for(const args of [
  {name:e.name,origin:'Honduras',blocks},
  {name:e.name,origin:'Guatemala',blocks:[{tag:'h1',text:'Different Coffee'},blocks[1]]},
  {name:e.name,origin:'Guatemala',blocks:[blocks[0],{...blocks[1],text:'Previously '+quote}]},
  {name:e.name,origin:'Guatemala',blocks:[blocks[0],{...blocks[1],section:'Related coffees'}]},
  {name:e.name,origin:'Guatemala',blocks:[blocks[0],{...blocks[1],text:'We once enjoyed the valleys of Huehuetenango'}]},
  {name:e.name,origin:'Guatemala',blocks:[blocks[0],{...blocks[1],text:'This is located in valleys of Xela'}]},
 ])assert.equal(selectedCurrentNamedGrowingValley(args),null,JSON.stringify(args));
});
test('competing current growing-valley claims cannot fabricate single origin',()=>{
 const e=c(448),b=[{tag:'h1',text:e.name}, {tag:'p',text:'This is located in valleys of Huehuetenango. This is located in valleys of Atitlan.'}];
 assert.equal(selectedCurrentNamedGrowingValley({name:e.name,origin:'Guatemala',blocks:b}),null);
});
test('other coffee selected full claim in aside is never a valley origin for this product',()=>{
 const e=c(448),p=parse(e,'Organic washed Guatemala, country only.','<aside>This is located in valleys of Huehuetenango.</aside>');
 assert.ok(p.ok);
 assert.notEqual(p.fields.origin,'Huehuetenango, Guatemala');
});
