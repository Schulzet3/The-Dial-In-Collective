import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedKarumandi576DirectFacts as audit} from '../scripts/audit/issue33-r71-576-selected-contract.mjs';
const story='The Karumandi Coffee Factory sits just south of Mount Kenya amid emerald green fields. Coffee thrives in this region of Kenya. Members of the Baragwi Farmer’s Cooperative Society, Karumandi purchases coffee from a network of approximately 3,000 smallholder producers. Agronomist Nicasius Ndambiri manages Karumandi and lends technical support for Karumandi’s many producers. Cherries are delivered and undergo de-pulping and the wet fermentation process. The coffee is laid to dry on a raised bed.';
const page=(heading='Kenya Karumandi',body=story,notes='Red Currant Blackberry Dark Chocolate')=>'<main><h1>'+heading+'</h1><section><h2>The Flavor Profile</h2><h3>Tasting Notes</h3><p>'+notes+'</p><h3>Roast</h3><p>Light &amp; Bright Dark &amp; Bittersweet</p></section><section><h2>The Story</h2><p>'+body+'</p></section></main>';
test('direct selected notes, factory and 3,000 smallholder roles',()=>{
 const found=audit(page(),['Kenya Karumandi']);
 assert.ok(Object.values(found).every(Boolean),JSON.stringify(found));
});
test('factory manager cannot be promoted to single current grower',()=>{
 assert.equal(audit(page(undefined,story.replace('Agronomist Nicasius Ndambiri manages Karumandi','Grower Nicasius Ndambiri owns Karumandi')),['Kenya Karumandi']).managerNotSingleFarmer,false);
 assert.equal(audit(page(undefined,story.replace('approximately 3,000 smallholder producers','one estate farmer')),['Kenya Karumandi']).cooperativeSmallholders,false);
});
test('factory locality alone does not establish supply farms',()=>{
 const r=audit(page(undefined,'The Karumandi Coffee Factory sits just south of Mount Kenya. Coffee thrives in this region of Kenya.'),['Kenya Karumandi']);
 assert.equal(r.currentFactoryLocation,true);
 assert.equal(r.cooperativeSmallholders,false);
});
test('unrelated recommendation cannot fill current notes or processing',()=>{
 const r=audit(page(undefined,'Short selected description','Red Currant')+'<aside>'+story+' Blackberry Dark Chocolate</aside>',['Kenya Karumandi']);
 assert.equal(r.ownTastingNotes,false);
 assert.equal(r.currentFactoryLocation,false);
});
test('script or metadata is not selected tasting evidence',()=>{
 const notes='<script>Red Currant Blackberry Dark Chocolate</script><span data-seo="Red Currant Blackberry Dark Chocolate"></span>';
 assert.equal(audit(page(undefined,story,notes),['Kenya Karumandi']).ownTastingNotes,false);
});
test('changed coffee and duplicated H1 fail closed',()=>{
 assert.equal(audit(page('Kenya Kirinyaga'),['Kenya Kirinyaga']).selectedIdentity,false);
 assert.equal(audit(page(),['Kenya Karumandi','Kenya Karumandi']).selectedIdentity,false);
 assert.equal(audit(page(),[]).selectedIdentity,false);
});
