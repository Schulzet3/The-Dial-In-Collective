import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const page=(name,section,prose)=>'<main><h1>'+name+'</h1><h2>'+section+
 '</h2><p>'+prose+'</p></main>';
const own='We use all natural beans for this roast, no chemicals. '+
 'The beans are processed using Swiss Water Process to remove the caffeine. '+
 'They are 99.9% caffeine free!';
const method=html=>extractPublicCoffeeFacts(html,{
 source_url:'https://example-roaster.test/products/great-plains-decaf'
}).fields?.decaffeination_method;
test('direct selected decaf roast with same-paragraph beans antecedent maps to Water Process',()=>{
 assert.equal(method(page('Great Plains Decaf','Great Plains Decaf',own)),'Water Process');
});
for(const [title,name,section,prose] of [
 ['ordinary selected coffee is not fully decaf','Great Plains Regular','Great Plains Regular',own],
 ['half-caf product is not full decaf','Great Plains Half-Caf','Great Plains Half-Caf',own],
 ['FAQ is not selected product prose','Great Plains Decaf','What is Swiss Water?',own],
 ['different product subsection is not selected coffee','Great Plains Decaf','Other Coffee Decaf',own],
 ['missing selected roast antecedent','Great Plains Decaf','Great Plains Decaf','The beans are processed using Swiss Water Process to remove the caffeine.'],
 ['bare method tagline is not a treatment claim','Great Plains Decaf','Great Plains Decaf','Swiss Water Processed.'],
 ['negated treatment is not admitted','Great Plains Decaf','Great Plains Decaf','These are the beans for this roast, rather than Swiss Water Process. The beans are processed using Swiss Water Process to remove the caffeine.'],
 ['historical treatment is not current','Great Plains Decaf','Great Plains Decaf','Previously, we used all natural beans for this roast. The beans are processed using Swiss Water Process to remove the caffeine.'],
 ['green process is distinct from caffeine removal','Great Plains Decaf','Great Plains Decaf','We use beans for this roast. The beans are washed before roasting.']
])test('reject '+title,()=>{
 assert.equal(method(page(name,section,prose)),undefined);
});
