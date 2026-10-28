import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractRoastVisualEvidence} from '../src/server/roast-level-evidence.mjs';
const url='https://roaster.example.test/products/selected';
const parse=html=>extractPublicCoffeeFacts('<main>'+html+'</main>',{source_url:url});
const tag=(v,cl='pdp__tag')=>'<span class="'+cl+'">'+v+'</span>';
const selected=v=>'<div class="pdp__info">'+tag(v)+'<h1>Costa Rica Guanacaste</h1></div>';

test('only the current product tag directly beside H1 yields a literal roast category',()=>{
 for(const tier of ['Light','Medium','Medium-Light','Medium-Dark','Dark']){
  assert.equal(extractRoastVisualEvidence('<main>'+selected(tier)+'</main>').value,tier);
  assert.equal(parse(selected(tier)).fields.roast_level,tier);
 }
});
test('reject unrelated, unsupported, unscoped or ambiguous roast tags',()=>{
 for(const source of [
  tag('Medium','catalog__tag')+'<h1>Costa Rica Guanacaste</h1>',
  '<div>'+tag('Medium')+'</div><h1>Costa Rica Guanacaste</h1>',
  '<div>'+tag('Medium')+'<p>Offer</p><h1>Costa Rica Guanacaste</h1></div>',
  '<div>'+tag('Medium')+'<h1>Other Coffee</h1></div><h1>Costa Rica Guanacaste</h1>',
  tag('Medium+')+'<h1>Costa Rica Guanacaste</h1>',
  '<div class="related-products">'+tag('Medium')+'<h2>Other Coffee</h2></div><h1>Costa Rica Guanacaste</h1>'
 ])assert.equal(parse(source).fields?.roast_level,undefined,source);
});
test('genuinely contradictory roast facts remain withheld for review',()=>{
 const result=parse(selected('Medium')+'<p>Roast Level: Dark</p>');
 assert.notEqual(result.fields?.roast_level,'Medium');
 assert.ok(result.conflicts?.includes('roast_level'));
});

test('owner-approved exact selected product Full City tag is Medium-Dark',()=>{
 assert.equal(parse(tag('Full City')+'<h1>Costa Rica Guanacaste</h1>').fields.roast_level,'Medium-Dark');
});
