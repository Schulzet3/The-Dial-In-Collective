import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

// Source: exact selected Fazenda Colombia Decaf, official public page, original603
// #485, GitHub run42258308816, HTML SHA256
// 3a5bf9c44cfab0fa9f7db793ddd751aca232bcc47dd7d33f1dba3a2b6b782145.
// Compact selected-source fixtures, not the original captured page.
const url='https://www.fazendacoffee.com/products/colombia-decaf-sugar-process';
const facility='The coffee is then decaffeinated at Descafecol, the only decaffeination plant in the Andean region of Colombia. The plant relies entirely on the pure water from the Navado el Ruis (a snow-capped volcano on the border of the departments of Caldas and Tolima) and natural ethyl acetate from sugar cane plants in Palmira, Colombia. Natural ethyl acetate is created during fermentation and contributes to what’s often described as the fruitiness in a young wine.';
const parse=(body,name='Colombia Decaf')=>extractPublicCoffeeFacts('<main><h1>'+name+'</h1>'+body+'</main>',{source_url:url});

test('current same-paragraph selected facility decaffeination + sugar-cane EA is Sugar Process, not Water Process',()=>{
 const p=parse('<p>'+facility+'</p>');
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,'Colombia Decaf');
 assert.equal(p.fields.decaffeination_method,'Sugar Process');
 assert.notEqual(p.fields.process,'Water Process');
 assert.ok((p.source_facts||[]).some(f=>f.field==='decaffeination_method'&&String(f.value).includes('natural ethyl acetate')));
});

test('a water-supplied plant without a stated current EA decaf treatment is not a method',()=>{
 const p=parse('<p>The coffee is then decaffeinated at Descafecol, a plant in Colombia. The plant relies entirely on pure mountain water for operation.</p>');
 assert.equal(p.fields.decaffeination_method,undefined);
});

test('different coffee description cannot lend the selected product a method',()=>{
 const p=parse('<p>Another coffee is then decaffeinated at Descafecol, the only decaffeination plant in Colombia. The plant relies on natural ethyl acetate from sugar cane.</p>');
 assert.equal(p.fields.decaffeination_method,undefined);
});

test('old rather than current production does not supply a selected treatment',()=>{
 const p=parse('<p>Previously, '+facility+'</p>');
 assert.equal(p.fields.decaffeination_method,undefined);
});

test('related product facility evidence cannot cross into the chosen decaf',()=>{
 const p=parse('<section class="related-products"><h2>You may also like</h2><p>'+facility+'</p><h3>Another Decaf</h3></section>');
 assert.equal(p.fields.decaffeination_method,undefined);
});

test('an explicit contrary water method alongside this facility paragraph blocks an unsupported winner',()=>{
 const p=parse('<p>'+facility+' This coffee is decaffeinated using Swiss Water.</p>');
 assert.equal(p.fields.decaffeination_method,undefined);
});

test('a regular coffee does not inherit a decaf facility method',()=>{
 const p=parse('<p>'+facility+'</p>','Regular Colombia');
 assert.equal(p.fields.decaffeination_method,undefined);
});
