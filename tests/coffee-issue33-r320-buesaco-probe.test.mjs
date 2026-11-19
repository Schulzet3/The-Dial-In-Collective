// Issue33 R320 first-party diagnostic does not replace official original603 selected-source gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {routes,ownWooIdentity,selectedBuesacoEvidence} from '../scripts/audit/issue33-r320-buesaco-probe.mjs';
import {isCoffeeSourceAccessChallenge} from '../src/server/coffee-url-guard.mjs';
const page=(name,body)=>'<html><body><main><article class="product"><h1>'+name+'</h1>'+body+'</article></main></body></html>';
test('R320 only three bounded original same-host/canonical Woo public probes',()=>{
 assert.deepEqual(routes.map(r=>new URL(r.url).hostname),['novocoffee.com','novocoffee.com','novocoffee.com']);
 assert.equal(routes[0].url,'https://novocoffee.com/product/buesaco');
 assert.equal(routes[1].url,'https://novocoffee.com/product/buesaco/');
 assert.equal(new URL(routes[2].url).searchParams.get('slug'),'buesaco');
});
test('R320 a scripted One moment 200 is not current selected coffee',()=>{
 const h='<html><head><title>One moment, please...</title></head><script>window.location.reload()</script></html>';
 assert.equal(isCoffeeSourceAccessChallenge(h),true);
 assert.equal(selectedBuesacoEvidence(h).selected_identity,false);
});
test('R320 recycled H1, sibling SEO and wrong product are not selected original',()=>{
 const h=page('Different Coffee','<p>Tangerine, Maple, Hazelnut.</p><aside><h1>Buesaco</h1></aside>');
 assert.equal(selectedBuesacoEvidence(h).verified_selected_pipeline,false);
});
test('R320 contradictory direct literal sensory sources remain independently reviewable',()=>{
 const h=page('Buesaco','<p>Tangerine, Maple, Hazelnut</p><p>TASTING NOTES Cherry, Tangerine, Nougat</p>');
 assert.equal(selectedBuesacoEvidence(h).distinct_selected_flavor_lists,true);
});
test('R320 first-party Woo JSON product must have own matching current name, slug, unique ID',()=>{
 const good={id:12345,slug:'buesaco',name:'Buesaco'};
 assert.equal(ownWooIdentity([good]),true);
 for(const bad of [[],[good,good],[{...good,slug:'other'}],[{...good,name:'Ethiopia'}],[{...good,id:null}]])
  assert.equal(ownWooIdentity(bad),false);
});
