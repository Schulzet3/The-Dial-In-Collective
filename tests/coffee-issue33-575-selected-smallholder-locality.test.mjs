// Original603 #575: selected contributing farmers' actual growing locality.
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCountrySmallholderGrowingLocality as refine} from '../src/server/coffee-title-region-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const name='Indonesia Bies Penantan';
const source_url='https://www.stumptowncoffee.com/products/indonesia-bies-penantan';
const lot='Bies Penantan refers to a specific group of highland villages where the smallholder farmers who contribute to this lot grow their coffee. The farmers cultivate their coffee organically on small farms around Takengon, Aceh, Indonesia, where steady rainfall allows for an almost year-round harvest.';
const blocks=(story=lot)=>[{tag:'h1',text:name},{tag:'p',text:story,section:'The Story'}];
function parse({title=name,story=lot,related='',direct=''}={}){
 const html='<html><head><meta property="og:type" content="product"></head><body>'+
  '<main><article class="product"><h1>'+title+'</h1><div class="product-description">'+
  '<h2>The Story</h2><p>'+story+'</p><p>'+direct+'</p></div></article></main>'+related+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url});
}
test('current selected contributing farmers produce in literal town/region/country',()=>{
 const q=refine({name,country:'Indonesia',origin:'Indonesia',blocks:blocks()});
 assert.equal(q?.value,'Takengon, Aceh, Indonesia');
 assert.match(q.quote,/farmers who contribute to this lot/);
});
test('actual parser and Add Coffee preserve the direct selected origin',()=>{
 const q=parse();assert.equal(q.ok,true,JSON.stringify(q));
 assert.equal(q.fields.origin,'Takengon, Aceh, Indonesia',JSON.stringify(q));
 assert.ok(!q.conflicts?.includes('origin'),JSON.stringify(q.conflicts));
 assert.match(coffeeUrlPreviewMarkup(q),/Takengon, Aceh, Indonesia/);
 assert.ok(coffeeSourceReviewSnapshot({...q,source_url}));
 assert.equal(q.fields.roast_level,undefined);
});
test('prior lot, hypothetical, absent link, and other country fail closed',()=>{
 for(const story of [
  lot.replace('who contribute to this lot','who contributed to a previous lot'),
  lot.replace('The farmers cultivate','Previously the farmers cultivated'),
  lot.replace('Takengon, Aceh, Indonesia','Takengon, Aceh, Colombia'),
  lot.replace('who contribute to this lot','who may contribute to this lot'),
  'A guide discusses coffee grown by farmers around Takengon, Aceh, Indonesia.'
 ])assert.equal(refine({name,country:'Indonesia',origin:'Indonesia',blocks:blocks(story)}),null,story);
});
test('specific or contradictory existing origin and wrong H1 cannot be overwritten',()=>{
 for(const origin of ['Colombia','Aceh, Indonesia','Sumatra, Indonesia','Takengon, Aceh, Indonesia'])
  assert.equal(refine({name,country:'Indonesia',origin,blocks:blocks()}),null,origin);
 assert.equal(refine({name:'Indonesia Other Coffee',country:'Indonesia',origin:'Indonesia',blocks:blocks()}),null);
 assert.equal(refine({name,country:'Indonesia',origin:'Indonesia',blocks:[...blocks(),{tag:'h1',text:'Another Coffee'}]}),null);
});
test('related SKU and education cannot donate a selected origin',()=>{
 assert.equal(refine({name,country:'Indonesia',origin:'Indonesia',blocks:[{tag:'h1',text:name},{tag:'p',text:lot,educational:true}]}),null);
 const q=parse({story:'A balanced cup.',related:'<aside class="related-products"><h3>Other Coffee</h3><p>'+lot+'</p></aside>'});
 assert.notEqual(q.fields.origin,'Takengon, Aceh, Indonesia');
});
test('two conflicting direct selected growing areas remain unresolved',()=>{
 const text=lot+' '+lot.replace('Takengon, Aceh','Otherplace, Differentplace');
 assert.equal(refine({name,country:'Indonesia',origin:'Indonesia',blocks:blocks(text)}),null);
});
