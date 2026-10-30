// Issue33 original603 #14: real exact selected station/village/district/region
// prose must refine only its own coffee, not unrelated products or biographies.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://beanstockcoffee.com/products/ethiopia-ayla-bombe-g1-natural';
const sentence='This coffee comes from the Chelchele washing station, which is in the kebele, or village, of Chelchele, in the words, or district, of Kochere, in the Yirgacheffe region.';
const html=(name,description)=>'<html><head><meta property="og:type" content="product"></head>'+
 '<body><main><article class="product"><h1>'+name+'</h1><div class="product__description">'+
 '<p>'+description+'</p></div></article></main></body></html>';
const parse=(name,description)=>extractPublicCoffeeFacts(html(name,description),{source_url:url});

test('selected Beanstock Chelchele direct three-level geography is retained, not only Yirgacheffe',()=>{
 const result=parse('New!! Ethiopia Chelchele G1 Natural',sentence);
 assert.equal(result.ok,true);
 assert.equal(result.fields.name,'New!! Ethiopia Chelchele G1 Natural');
 assert.equal(result.fields.origin,'Chelchele, Kochere, Yirgacheffe, Ethiopia');
 assert.equal(result.fields.process,'Natural');
 assert.ok(!result.conflicts?.includes('origin'));
});

test('same selected coffee with an unaliased village and district hierarchy stays generic',()=>{
 const claim='Our coffee comes from the Ambo washing station, which is located in the village of Berta, in the district of Wondo, in the Sidama region.';
 const result=parse('Ethiopia Berta Natural',claim);
 assert.equal(result.ok,true);
 assert.equal(result.fields.origin,'Berta, Wondo, Sidama, Ethiopia');
 assert.ok(!result.conflicts?.includes('origin'));
});

test('the original selected title must corroborate the named village, no rotated story donation',()=>{
 const result=parse('Ethiopia Guji Natural',sentence);
 assert.equal(result.ok,true);
 assert.ok(!String(result.fields.origin||'').includes('Chelchele'));
 assert.ok(!String(result.fields.origin||'').includes('Kochere'));
});

test('farmer or nearby-site history never supplies a current coffee village tuple',()=>{
 const offProduct='A former farmer once sourced beans from the Chelchele washing station, which is in the village of Chelchele, in the district of Kochere, in the Yirgacheffe region.';
 const result=parse('Ethiopia Chelchele Natural',offProduct);
 assert.equal(result.ok,true);
 assert.ok(!String(result.fields.origin||'').includes('Kochere'));
});

test('a generic regional sentence without an explicit current-coffee station cannot invent a full hierarchy',()=>{
 const result=parse('Ethiopia Chelchele Natural','People from the village of Chelchele, in the district of Kochere, in the Yirgacheffe region often work with coffee.');
 assert.equal(result.ok,true);
 assert.ok(!String(result.fields.origin||'').includes('Kochere'));
});

test('no selected-title producing country means no fabricated country from a station locality',()=>{
 const result=parse('Chelchele G1 Natural',sentence);
 assert.equal(result.ok,true);
 assert.ok(!String(result.fields.origin||'').includes('Ethiopia'));
});
