import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const url='https://roaster.example/products/selected';
const page=(name,body,extra='')=>'<html><head>'+extra+'</head><body><main><h1>'+name+'</h1>'+body+'</main></body></html>';
const parse=(name,body='',extra='')=>extractPublicCoffeeFacts(page(name,body,extra),{source_url:url});
for(const [name,tier] of [['Rise and Shine – Medium','Medium'],['Traders Blend – Medium Dark','Medium-Dark']]){
 test('selected current title supports roast: '+name,()=>{
  const x=parse(name,'<p>Roasted fresh weekly with a classic, approachable cup.</p>');
  assert.equal(x.ok,true);
  assert.equal(x.fields.roast_level,tier);
  assert.match(coffeeUrlPreviewMarkup(x),new RegExp(tier));
 });
}
for(const [name,tier] of [['Ambition','Medium-Light'],['Dark Raine','Dark']]){
 test('single fixed current Coffee roast variant: '+name,()=>{
  const raw=tier==='Medium-Light'?'Medium-light':tier;
  const opts='<form><label>Coffee roast</label><select name="options[Coffee roast]"><option value="'+raw+'" selected="selected">'+raw+'</option></select></form><p>Specialty coffee roasted every week.</p>';
  const x=parse(name,opts);
  assert.equal(x.ok,true);assert.equal(x.fields.roast_level,tier);
  assert.match(coffeeUrlPreviewMarkup(x),new RegExp(tier));
 });
}
test('direct current selected Limited Release banner is recovered in the Add Coffee preview',()=>{
 const p=parse('Costa Rica Perla Negra Peaberry','<p>Unique coffee from Costa Rica with fresh selected product notes.</p><p><strong>LIMITED RELEASE | WHOLE BEAN ONLY</strong></p>');
 assert.equal(p.ok,true);assert.equal(p.fields.release_label,'LIMITED RELEASE');
 assert.match(coffeeUrlPreviewMarkup(p),/LIMITED RELEASE/);
});
test('multiple current roast variants must not imply a fixed tier',()=>{
 const p=parse('Ambition','<form><label>Coffee roast</label><select name="options[Coffee roast]"><option value="Light" selected>Light</option><option value="Dark">Dark</option></select></form>');
 assert.equal(p.fields.roast_level,undefined);
});
test('recommendations, site navigation and other coffees cannot donate roast',()=>{
 const p=parse('Ambition','<nav>All medium coffees</nav><p>Our other coffee named Dark Raine is roasted Dark.</p><section class="product-recommendations"><label>Coffee roast</label><select name="options[Coffee roast]"><option value="Dark" selected>Dark</option></select></section>');
 assert.notEqual(p.fields.roast_level,'Dark');
});
test('ambiguous, relative, retired White tier and compound labels stay unnormalized',()=>{
 for(const label of ['White Coffee','Light/Medium','Medium/Medium-Dark','Lighter']){
  const p=parse('Test Coffee','<select name="options[Coffee roast]"><option value="'+label+'" selected>'+label+'</option></select>');
  assert.equal(p.fields.roast_level,undefined,label);
 }
});
test('collection and navigation headings cannot invent a current release',()=>{
 const p=parse('Test Coffee','<nav>LIMITED RELEASES</nav><h2>Limited Releases Collection</h2><p>Our limited releases are listed elsewhere.</p>');
 assert.equal(p.fields.release_label,undefined);
});
test('old limited-release language cannot be treated as current',()=>{
 const p=parse('Test Coffee','<p>Last year this coffee was a LIMITED RELEASE for the holiday season.</p>');
 assert.equal(p.fields.release_label,undefined);
});
test('related product card limited label cannot be selected product release',()=>{
 const p=parse('Everyday Blend','<p>This is our regular blend.</p><section class="product-recommendations"><p><strong>LIMITED RELEASE | WHOLE BEAN ONLY</strong></p></section>');
 assert.equal(p.fields.release_label,undefined);
});
test('duplicate unrelated option cannot contradict a single selected roast',()=>{
 const p=parse('Ambition','<form><select name="options[Coffee roast]"><option value="Light" selected>Light</option></select></form><section class="product-recommendations"><select name="options[Coffee roast]"><option value="Dark" selected>Dark</option></select></section>');
 assert.equal(p.fields.roast_level,'Light');
});
test('current named release outranks generic product banner',()=>{
 const p=parse('Holy Grail No. 2: Strawberry Jam','<p><strong>LIMITED RELEASE | WHOLE BEAN ONLY</strong></p><p>Release: Holy Grail No. 2</p>');
 assert.equal(p.fields.release_label,'Holy Grail No. 2');
});
