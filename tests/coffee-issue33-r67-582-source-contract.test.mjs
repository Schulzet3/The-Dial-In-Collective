import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedOneskaEmbuEvidence as evidence} from '../scripts/audit/issue33-r67-582-source-contract.mjs';
const story='Oneska is the small estate farm of Onesmus Njagi, a retired schoolteacher, and his wife, Karen, on the slopes of Mount Kenya in Embu County.';
const doc=({title='Oneska - Kenya',hero='Embu Kenya',prose=story,producer='Onesmus and Karen Njagi',processing='Washed',tail=''}={})=>
 '<html><head><title>Past Kenyan lot | search metadata</title></head><body><article class="product">'+
 '<h1>'+title+'</h1><div class="product-subtitle">'+hero+'</div><h2>Description</h2><p>'+prose+'</p>'+
 '<h2>Details</h2><dl><dt>Producer</dt><dd>'+producer+'</dd><dt>Processing</dt><dd>'+processing+'</dd></dl>'+
 tail+'</article></body></html>';
test('exact selected Oneska H1 plus Embu hero plus farm-location and typed roles source qualifies',()=>{
 assert.deepEqual(evidence(doc()),{hero:true,currentEstate:true,producer:true,process:true});
});
test('historic SEO, changed identity, wrong hero, related coffee and duplicate H1 cannot qualify',()=>{
 for(const html of [
  doc({title:'Kambarare - Kenya'}),
  doc({hero:'Kirinyaga Kenya'}),
  doc({hero:'Last year Embu Kenya'}),
  doc({hero:'Other lot',tail:'<h2>Related products</h2><p>Embu Kenya</p>'}),
  doc({tail:'<h1>Other product</h1>'}),
  doc({prose:'Another coffee was grown in Embu County, Kenya.'}),
  doc({prose:story.replace('Oneska is','Previously Oneska was')}),
  doc({producer:'Different estate manager'}),
  doc({processing:'Natural'})
 ])assert.notDeepEqual(evidence(html),{hero:true,currentEstate:true,producer:true,process:true},html.slice(0,160));
});
test('country-like menu or SEO cannot replace the actual chosen product primary hero',()=>{
 const html=doc({hero:'Kenya'})+'<aside><h2>Popular coffees</h2><p>Embu Kenya</p></aside>';
 assert.equal(evidence(html).hero,false);
 assert.equal(evidence('<meta content="Embu Kenya"><h1>Other coffee</h1>'+story).hero,false);
});

test('related heading and aside cannot launder farm, producer or processing into current coffee',()=>{
 const related='<p>'+story+'</p><dl><dt>Producer</dt><dd>Onesmus and Karen Njagi</dd><dt>Processing</dt><dd>Washed</dd></dl>';
 const unproven={prose:'Current selected product has no named estate here.',producer:'Another producer',processing:'Natural'};
 for(const tail of ['<h2>Related products</h2>'+related,'<aside>'+related+'</aside>']){
  assert.deepEqual(evidence(doc({...unproven,tail})),
   {hero:true,currentEstate:false,producer:false,process:false});
  assert.deepEqual(evidence(doc({tail})),
   {hero:true,currentEstate:true,producer:true,process:true});
 }
});
