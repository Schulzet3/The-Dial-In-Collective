import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedVtDarkDecaf} from '../scripts/audit/issue33-r85-vtartisan-400-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://vtartisan.com/products/dark-decaf';
const story="These Central American &amp; African beans are naturally decaffeinated using the 'Mountain Water' process. The benefit is not only a delicious decaf coffee, but no toxic chemicals or environmentally damaging materials were used in the process. This coffee, perfect to follow an evening meal, is 97 - 99% caffeine free.";
const page=(name='Dark Decaf',prose=story,tail='<p>Notes: Farm-Direct</p><p>Roast: Medium Dark</p>')=>'<main><article class="product"><h1>'+name+'</h1><p>'+prose+'</p>'+tail+'</article></main>';
const selected=(html,heads=['Dark Decaf'])=>selectedVtDarkDecaf(html,heads);
test('selected direct source facts and unique H1',()=>assert.deepEqual(Object.values(selected(page())),Array(6).fill(true)));
test('missing, duplicate and other product heading fail',()=>{
 assert.equal(selected(page(),[]).uniqueSelected,false);
 assert.equal(selected(page(),['Dark Decaf','Dark Decaf']).uniqueSelected,false);
 assert.equal(selected(page('Mayan Decaf'),['Mayan Decaf']).uniqueSelected,false);
});
test('navigation, script and sidebar never supply own source assertions',()=>{
 const x=page('Dark Decaf','', '<p>Roast: Medium Dark</p>')+'<nav>'+story+'</nav><script>'+story+'</script><aside>'+story+'</aside><footer>'+story+'</footer>';
 assert.equal(selected(x).ownWaterDecaf,false);assert.equal(selected(x).sameProductRegions,false);
});
test('different decaf method cannot qualify as selected Mountain Water',()=>assert.equal(selected(page('Dark Decaf',story.replace('Mountain Water','Swiss Water'))).ownWaterDecaf,false));
test('chemical-free marketing alone is not direct named water method',()=>assert.equal(selected(page('Dark Decaf','Naturally decaffeinated without chemicals')).ownWaterDecaf,false));
test('neighboring origin cannot replace selected two source regions',()=>assert.equal(selected(page('Dark Decaf',story.replace('Central American &amp; African','Guatemalan'))).sameProductRegions,false));
test('published caffeine range must be present in own product prose',()=>assert.equal(selected(page('Dark Decaf',story.replace('97 - 99%','some'))).ownCaffeineRange,false));
test('roast in H1 alone is not a separate product-spec roast claim',()=>assert.equal(selected(page('Dark Decaf Medium Dark',story,'<p>Notes: Farm-Direct</p>')).directRoast,false));
test('Farm Direct does not become a tasting note',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(r.ok,true);assert.ok(!/farm.direct/i.test(r.fields.tasting_notes||''),JSON.stringify(r.fields));
});
test('named Mountain Water is decaf treatment, not Natural green processing',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(r.ok,true);assert.equal(r.fields.decaffeination_method,'Water Process',JSON.stringify(r.fields));
 assert.equal(r.fields.process,undefined,JSON.stringify(r.fields));
});
test('regular and half-caf cannot inherit complete decaffeination method',()=>{
 for(const name of ['Regular Blend','Half-Caf Blend']){
  const r=extractPublicCoffeeFacts(page(name),{source_url:url});
  assert.equal(r.fields.decaffeination_method,undefined,JSON.stringify(r.fields));
 }
});


import {selectedLiteralBroadBlendRegions} from '../src/server/coffee-selected-broad-blend-regions.mjs';
test('both explicitly named selected broad regions survive, not a fabricated country',()=>{
 const direct=[{text:'These Central American & African beans are naturally decaffeinated.',section:'Dark Decaf'}];
 assert.deepEqual(selectedLiteralBroadBlendRegions(direct,{origin:'Central America'}),
  {value:'Central America, Africa',quote:'These Central American & African beans'});
});
test('nonselected, educational, contradictory and precise-country sources cannot be enriched',()=>{
 const own={text:'These Central American & African beans.',section:'Dark Decaf'};
 for(const [blocks,origin] of [
  [[{text:'These Central American beans. Our African coffee is different.'}],'Central America'],
  [[own],'Guatemala'],[[{...own,educational:true}],'Central America'],
  [[{...own,section:'Related Products'}],'Central America'],
  [[{text:'Another coffee uses these Central American & African beans.'}],'Central America']
 ])assert.equal(selectedLiteralBroadBlendRegions(blocks,{origin}),null);
});
test('real selected direct mixed broad regions extend one-region parser evidence',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.origin,'Central America, Africa',JSON.stringify(r.fields));
 assert.equal(r.fields.process,undefined);
});
