import test from 'node:test';
import assert from 'node:assert/strict';
import {exactNovo241Url,evaluateSelected241,original,canonical,storeApi} from '../scripts/audit/issue33-r335-novo-241-transport.mjs';
import {isCoffeeSourceAccessChallenge} from '../src/server/coffee-url-guard.mjs';

const selected={fetched:true,source_url:canonical,html_bytes:1040,html_sha256:'a'.repeat(64),h1:['Buesaco'],
 parsed:{name:'Buesaco',process:'Washed'},parser_ok:true,add_coffee_ui:true,
 source_review_ui:true,conflicts_count:0};
test('R335 only exact official original/canonical routes are selected',()=>{
 assert.equal(exactNovo241Url(original),true);assert.equal(exactNovo241Url(canonical),true);
 for(const url of [storeApi,'https://another-coffee.com/product/buesaco/','https://novocoffee.com/product/other/','https://novocoffee.com/product/buesaco/?x=1','http://novocoffee.com/product/buesaco/'])
  assert.equal(exactNovo241Url(url),false,url);
});
test('R335 exact bounded source H1 parser and Add Coffee afterproof required',()=>{
 assert.equal(evaluateSelected241(selected).accepted,true);
 for(const x of [{...selected,fetched:false},{...selected,h1:[]},{...selected,h1:['Another Coffee']},
  {...selected,parsed:{name:'Another Coffee'}},{...selected,parser_ok:false},
  {...selected,html_bytes:0},{...selected,conflicts_count:1},
  {...selected,add_coffee_ui:false},{...selected,source_review_ui:false}])
  assert.equal(evaluateSelected241(x).accepted,false);
});
test('R335 Store API data never substitutes for exact HTML/H1 proof',()=>{
 const r=evaluateSelected241({fetched:false,store_api_diagnostic_only:{exact_slug_count:1}});
 assert.equal(r.accepted,false);assert.equal(r.classification,'UNAVAILABLE');
});
test('R335 current official source may be inaccessible without invented success',()=>{
 assert.deepEqual(evaluateSelected241({fetched:false,reason:'source_access_challenge'}),
  {accepted:false,classification:'UNAVAILABLE'});
});
test('R335 challenge interstitial is a failure, not fetched selected HTML',()=>{
 const challenge='<html><head><title>One moment, please...</title></head><script>location.reload()</script></html>';
 assert.equal(isCoffeeSourceAccessChallenge(challenge),true);
 assert.equal(evaluateSelected241({fetched:false,reason:'source_access_challenge'}).accepted,false);
});
test('R335 source with unrelated footer H1 or contradictory selected H1 cannot pass',()=>{
 assert.equal(evaluateSelected241({...selected,h1:['Buesaco','Another Coffee']}).accepted,false);
 assert.equal(evaluateSelected241({...selected,h1:['Other coffee']}).accepted,false);
});
