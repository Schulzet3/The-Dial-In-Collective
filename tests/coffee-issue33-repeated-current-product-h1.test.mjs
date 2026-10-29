// Issue #33: responsive current-product duplicates must not suppress exact source facts.
// Current selected-product heading is an identity guard, not a uniqueness constraint.
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedDirectProductCredits} from '../src/server/coffee-direct-product-prose.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

const name='Mountain Bloom';
const source_url='https://roaster.example/products/mountain-bloom';
const clean=value=>String(value??'').replace(/<[^<>]{0,2000}>/g,' ')
 .replace(/\s+/g,' ').trim();
const page=(titles,body)=>'<html><head><meta property="og:type" content="product"></head>'+
 '<body><main>'+titles.map(title=>'<h1>'+title+'</h1>').join('')+
 body+'</main></body></html>';
const prose='<p>Mountain Bloom is roasted Medium.</p>'+
 '<p>Tastes like: Cherry, Cacao Nibs</p>';

test('two identical selected current H1 headings preserve literal roast and sensory evidence',()=>{
 const html=page([name,name],prose);
 const direct=selectedDirectProductCredits(html,{name,clean});
 assert.equal(direct.roast_level,'Medium');
 assert.equal(direct.explicit_tastes_like,'Cherry, Cacao Nibs');
 const actual=extractPublicCoffeeFacts(html,{source_url});
 assert.equal(actual.ok,true);
 assert.equal(actual.fields.name,name);
 assert.equal(actual.fields.roast_level,'Medium');
 assert.match(coffeeUrlPreviewMarkup(actual),/Medium/);
});

test('three identical selected H1 headings are the same product, not a competing identity',()=>{
 const direct=selectedDirectProductCredits(page([name,name,name],prose),{name,clean});
 assert.equal(direct.roast_level,'Medium');
 assert.equal(direct.explicit_tastes_like,'Cherry, Cacao Nibs');
});

test('case and accent spelling normalization still identifies the same selected coffee',()=>{
 const html=page(['Café Luna','Cafe Luna'],'<p>Café Luna is roasted Medium.</p>');
 const direct=selectedDirectProductCredits(html,{name:'Café Luna',clean});
 assert.equal(direct.roast_level,'Medium');
});

test('different second H1 cannot donate direct roast, flavor, producer or release facts',()=>{
 const html=page([name,'Other Coffee'],prose+
 '<p>LIMITED RELEASE | WHOLE BEAN ONLY</p><p>Our coffee is from SEEDS in Ethiopia.</p>');
 assert.deepEqual(selectedDirectProductCredits(html,{name,clean}),{});
});

test('missing selected H1 cannot authorize direct current product facts',()=>{
 assert.deepEqual(selectedDirectProductCredits(page([],prose),{name,clean}),{});
});

test('single selected H1 remains supported without changing existing extraction',()=>{
 const direct=selectedDirectProductCredits(page([name],prose),{name,clean});
 assert.equal(direct.roast_level,'Medium');
 assert.equal(direct.explicit_tastes_like,'Cherry, Cacao Nibs');
});
