import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
const url='https://www.lilrhodycoffee.com/products/rhode-scholar-dark-roast';
const name='Rhode Scholar - Dark Roast';
const actual='<h3>Coffee Info</h3><p>Current Coffee: Nicaragua Diamente</p><p>Rhode Scholar is a seasonal dark roast that currently showcases the rich potential of single-origin Nicaraguan coffee. This robust, full-bodied selection features distinct notes of baker\'s chocolate and toffee.</p>';
const container=(description,side='')=>'<html><body><header><span>Add description and links to your promotion</span><p>Your product\'s name</p><p>ngchjndfgs</p></header><main><article class="product"><h1>'+name+'</h1><div class="product__description">'+description+'</div></article></main>'+side+'</body></html>';
const parse=(s,side='')=>extractPublicCoffeeFacts(container(s,side),{source_url:url});
test('current selected original515 identity is not the merchant template product',()=>{
 const own=productMarkup(container(actual));
 assert.deepEqual(selectedProductHeadings(own),[name]);
 const p=parse(actual);assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,name,JSON.stringify(p.fields));
 assert.doesNotMatch(JSON.stringify(p.fields),/ngchjndfgs|your product.s name/i);
});
test('selected dark roast and own notes must not inherit grind options or unrelated product',()=>{
 const p=parse(actual,'<aside class="related-products"><h2>You May Also Like</h2><p>Other Coffee, Kenya Natural Light, strawberry and blueberry, Geisha</p></aside><select name="Grind"><option>Medium</option></select>');
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.doesNotMatch(JSON.stringify(p.fields),/strawberry|blueberry|geisha|kenya/i);
 assert.ok(!p.fields.producer&&!p.fields.elevation_m&&!p.fields.decaffeination_method,JSON.stringify(p.fields));
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:url}));
});
test('unpublished selected flavor does not inherit next product flavor',()=>{
 const p=parse('<h3>Coffee Info</h3><p>Roast level Dark.</p>','<aside class="related-products">Another product tasting notes: mango, lime, cranberry</aside>');
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.doesNotMatch(p.fields.tasting_notes||'',/mango|lime|cranberry/i);
});
test('original515 unavailable official URL is not a valid semantic certificate',()=>{
 const failures=requiredFocusedSourceFailures([515],[{number:515,status:'UNAVAILABLE',parser_ok:false}]);
 assert.ok(failures.some(x=>x.reason==='required_official_source_not_fetched'),JSON.stringify(failures));
});
