import test from 'node:test';
import assert from 'node:assert/strict';
import {exactNovo241Url,evaluateSelected241,original,canonical,storeApi} from '../scripts/audit/issue33-r335-novo-241-transport.mjs';
import {isCoffeeSourceAccessChallenge} from '../src/server/coffee-url-guard.mjs';

const selected={fetched:true,source_url:canonical,html_bytes:1040,html_sha256:'a'.repeat(64),h1:['Buesaco'],
 parsed:{name:'Buesaco',process:'Washed'},parser_ok:true,add_coffee_ui:true,
 source_review_ui:true,conflicts_count:0,conflicts:[]};
const sensoryEvidence={
 selected_notes_source_facts:[
  {label:'TASTING NOTES',value:'Cherry, Tangerine, Nougat',section:'Description / Harvest Details',conflicting:true},
  {label:'Current selected directly corroborated prose flavor conflict',value:'Tangerine, Maple, Hazelnut',
   section:'Exact selected H1 and own-product paragraphs',conflicting:true}],
 conflict_options:{tasting_notes:[
  {value:'Cherry, Tangerine, Nougat',label:'TASTING NOTES'},
  {value:'Tangerine, Maple, Hazelnut',label:'Selected current hero and named narrative'}]}
};
test('R335 only exact official original/canonical routes are selected',()=>{
 assert.equal(exactNovo241Url(original),true);assert.equal(exactNovo241Url(canonical),true);
 for(const url of [storeApi,'https://another-coffee.com/product/buesaco/','https://novocoffee.com/product/other/','https://novocoffee.com/product/buesaco/?x=1','http://novocoffee.com/product/buesaco/'])
  assert.equal(exactNovo241Url(url),false,url);
});
test('R335 exact bounded source H1 parser and Add Coffee afterproof required',()=>{
 assert.equal(evaluateSelected241(selected).accepted,true);
 for(const x of [{...selected,fetched:false},{...selected,h1:[]},{...selected,h1:['Another Coffee']},
  {...selected,parsed:{name:'Another Coffee'}},{...selected,parser_ok:false},
  {...selected,html_bytes:0},{...selected,conflicts:['origin'],conflicts_count:1},
  {...selected,add_coffee_ui:false},{...selected,source_review_ui:false}])
  assert.equal(evaluateSelected241(x).accepted,false);
});
test('R335 Store API data never substitutes for exact HTML/H1 proof',()=>{
 const r=evaluateSelected241({fetched:false,store_api_diagnostic_only:{exact_slug_count:1}});
 assert.equal(r.accepted,false);assert.equal(r.classification,'UNAVAILABLE');
});
test('R335 current official source may be inaccessible without invented success',()=>{
 assert.deepEqual(evaluateSelected241({fetched:false,reason:'source_access_challenge'}),
  {accepted:false,classification:'UNAVAILABLE',manual_semantic_certified:false});
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

test('R335 selected hero versus harvest notes remain BLANK and reviewable, not a field PASS',()=>{
 const selectedConflict={...selected,...sensoryEvidence,conflicts:['tasting_notes'],conflicts_count:1,
  parsed:{name:'Buesaco',origin:'Buesaco, Colombia',process:'Washed',tasting_notes:undefined}};
 const report=evaluateSelected241(selectedConflict);
 assert.equal(report.accepted,true);assert.equal(report.classification,'EXACT_SELECTED_SOURCE_TASTING_CONFLICT_REVIEW');
 assert.equal(report.manual_semantic_certified,false);
 assert.equal(evaluateSelected241({...selectedConflict,parsed:{...selectedConflict.parsed,tasting_notes:'Cherry, Tangerine, Nougat'}}).accepted,false);
 assert.equal(evaluateSelected241({...selectedConflict,conflicts:['tasting_notes','producer']}).accepted,false);
});

test('R370 missing, duplicate or unsupported selected sensory provenance never false-certifies a conflict flag',()=>{
 const base={...selected,...sensoryEvidence,conflicts:['tasting_notes'],conflicts_count:1,
  parsed:{name:'Buesaco',process:'Washed'}};
 assert.equal(evaluateSelected241(base).accepted,true);
 for(const negative of [
  {selected_notes_source_facts:undefined},
  {selected_notes_source_facts:[sensoryEvidence.selected_notes_source_facts[0]]},
  {selected_notes_source_facts:[sensoryEvidence.selected_notes_source_facts[0],sensoryEvidence.selected_notes_source_facts[0]]},
  {selected_notes_source_facts:[sensoryEvidence.selected_notes_source_facts[0],
    {...sensoryEvidence.selected_notes_source_facts[1],conflicting:false}]},
  {selected_notes_source_facts:[sensoryEvidence.selected_notes_source_facts[0],
    {...sensoryEvidence.selected_notes_source_facts[1],section:''}]},
  {conflict_options:{tasting_notes:[sensoryEvidence.conflict_options.tasting_notes[0]]}},
  {conflict_options:{}}
 ])assert.equal(evaluateSelected241({...base,...negative}).accepted,false,JSON.stringify(negative));
});
test('R370 two current competing selected lists cannot silently PASS with omitted conflict or canonical taste',()=>{
 const base={...selected,...sensoryEvidence,conflicts:['tasting_notes'],conflicts_count:1,
  parsed:{name:'Buesaco',process:'Washed'}};
 for(const bad of [{conflicts:[],conflicts_count:0},
  {parsed:{...base.parsed,tasting_notes:'Cherry, Tangerine, Nougat'}},
  {conflicts:['origin'],conflicts_count:1}])
  assert.equal(evaluateSelected241({...base,...bad}).accepted,false,JSON.stringify(bad));
});
