// Issue33 original603 #64: current selected literal shares use a decimal comma, not a list comma.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

const url='https://combatcoffeetea.com/products/narino-dark-roast-single-origin-fair-trade';
const html=varieties=>'<html><head><meta property="og:type" content="product"></head>'+
 '<body><main><article class="product"><h1>Riveter - Medium Roast - Colombian</h1>'+
 '<p>Location: Huila</p><p>Processing: fully washed, hand picked, fully sun dried</p>'+
 '<p>Flavors: Chocolate, Dried Fruit, Citrus, Almond</p>'+
 '<p>Varieties: '+varieties+'</p></article></main></body></html>';
const parse=value=>extractPublicCoffeeFacts(html(value),{source_url:url});

test('original603 #64 exact current product composition preserves 46,3% decimal comma',()=>{
 const literal='Castillo/Colombia (46,3%) Caturra (53.7%)';
 const r=parse(literal);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,'Riveter - Medium Roast - Colombian');
 assert.equal(r.fields.variety,literal,'do not misread a decimal 46.3 percent as list elements 46 and 3');
 assert.equal(r.fields.origin,'Huila, Colombia','selected Huila and named Colombia remain canonical');
 assert.ok(!r.conflicts?.includes('variety'),JSON.stringify(r.conflicts));
 assert.match(coffeeUrlPreviewMarkup(r),/46,3%/,'Add Coffee retains literal cultivar composition');
 assert.ok((r.source_facts||[]).some(f=>String(f.value).includes('46,3%')),
  'source fact retains the real roaster quotation');
});

test('variety list separator still normalizes and dot-decimal proportions remain unchanged',()=>{
 const r=parse('Bourbon,Caturra,Typica');
 assert.equal(r.fields.variety,'Bourbon, Caturra, Typica');
 const v=parse('Castillo/Colombia (46.3%) Caturra (53.7%)');
 assert.equal(v.fields.variety,'Castillo/Colombia (46.3%) Caturra (53.7%)');
});

test('do not silently reinterpret source already spaced or unbounded numeric commas',()=>{
 const spaced=parse('Castillo/Colombia (46, 3%) Caturra (53.7%)');
 assert.equal(spaced.fields.variety,'Castillo/Colombia (46, 3%) Caturra (53.7%)');
 const list=parse('Bourbon 46,3% and Caturra 53.7%');
 assert.equal(list.fields.variety,'Bourbon 46, 3% and Caturra 53.7%',
  'unbounded percentage formatting is not a certified decimal share');
});
