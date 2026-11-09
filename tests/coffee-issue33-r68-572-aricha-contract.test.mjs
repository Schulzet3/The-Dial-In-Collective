import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedArichaDirectFacts} from '../scripts/audit/issue33-r68-572-aricha-contract.mjs';
const direct = `<article><p>Abiyot Ageze grows naturals here.</p><p>Region: Gedeb, Yirgacheffe</p><p>Elevation: 1950-2300 MASL</p><p>Variety: JARC 74112, JARC 74110</p><p>Process: Natural</p><h1>Ethiopia Aricha Natural</h1></article>`;
test('chosen Wix product direct fields, rather than reused URL slug', () => {
  const p=selectedArichaDirectFacts(direct, ['Ethiopia Aricha Natural']);
  assert.deepEqual(p,{selectedIdentity:true,region:true,elevation:true,variety:true,process:true,namedProducer:true});
});
test('different/current heading cannot certify historical Aricha facts', () => {
  assert.equal(selectedArichaDirectFacts(direct,['Ethiopia Abiyot Ageze Natural']).selectedIdentity,false);
  assert.equal(selectedArichaDirectFacts(direct,['Ethiopia Aricha Natural','Other Coffee']).selectedIdentity,false);
});
test('unrelated related-product card never supplies missing fields', () => {
  const related=`<h1>Ethiopia Aricha Natural</h1><h2>Related Products</h2>${direct}`;
  const p=selectedArichaDirectFacts(related,['Ethiopia Aricha Natural']);
  assert.equal(p.selectedIdentity,true);
  for(const k of ['region','elevation','variety','process','namedProducer'])assert.equal(p[k],false,k);
});
test('script-only SEO data never supplies direct selected evidence', () => {
  const p=selectedArichaDirectFacts(`<h1>Ethiopia Aricha Natural</h1><script type="application/ld+json">${direct}</script>`,['Ethiopia Aricha Natural']);
  assert.equal(p.selectedIdentity,true);
  for(const k of ['region','elevation','variety','process','namedProducer'])assert.equal(p[k],false,k);
});
test('unpublished/contradictory selected direct fields fail closed', () => {
  const p=selectedArichaDirectFacts(direct.replace('Process: Natural','Process: Washed').replace('Region: Gedeb, Yirgacheffe','Region: Guji'),['Ethiopia Aricha Natural']);
  assert.equal(p.process,false);assert.equal(p.region,false);
});
