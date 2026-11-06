// Issue33 original603 #193: exact selected product, current family-farm cooperative place.
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedCountryCooperativeGrowingArea as refine} from '../src/server/coffee-title-region-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const name='Brazil Natural Processed Coffee';
const producer='Café do Vale Coop composed of 15 family farms';
const url='https://leapcoffeeroasters.com/products/brazil-organic-coffee';
const quote='This natural processed Brazilian is produced by the Café do Vale Coop composed of 15 family farms in the high altitude Sul de Minas area of the Minas Gerais region in Eastern Brazil.';
const blocks=(prose=quote,heading=name)=>[{tag:'h1',text:heading},{tag:'p',text:prose,section:'Selected description'}];
const probe=({prose=quote,title=name,extra='',country='Brazil'}={})=>extractPublicCoffeeFacts(
 '<html><head><link rel="canonical" href="'+url+'"></head><body><main><article class="product"><h1>'+title+
 '</h1><div class="product-description rte"><p>Country: '+country+'</p><p>Producer: '+producer+
 '</p><p>'+prose+'</p></div></article></main>'+extra+'</body></html>',{source_url:url});
const selected=opts=>refine({name,country:'Brazil',demonym:'Brazilian',origin:'Brazil',producer,blocks:blocks(opts?.prose,opts?.heading)});

test('real #193 cooperative-linked current producing farms carry explicitly printed area, region, country',()=>{
 const actual=selected();
 assert.equal(actual?.value,'Sul de Minas, Minas Gerais, Brazil');
 assert.match(actual.quote,/15 family farms in the high altitude Sul de Minas/);
});
test('generic different-coffee current farmer cooperative and unknown literal area work without lookup',()=>{
 const q=refine({name:'Colombia Washed Coffee',country:'Colombia',demonym:'Colombian',origin:'Colombia',
  producer:'Flor Cooperative composed of 24 family farms',blocks:[{tag:'h1',text:'Colombia Washed Coffee'},
   {tag:'p',text:'Our washed Colombian is produced by the Flor Cooperative composed of 24 family farms in the Grand Valle area of the Rosado Norte region in Western Colombia.'}]});
 assert.equal(q?.value,'Grand Valle, Rosado Norte, Colombia');
});
test('full selected parser, member Add Coffee preview and source review receive direct cooperative grown origin',()=>{
 const q=probe(); assert.equal(q.ok,true,JSON.stringify(q));
 assert.equal(q.fields.origin,'Sul de Minas, Minas Gerais, Brazil',JSON.stringify(q.fields));
 assert.ok(!q.conflicts?.includes('origin'));
 assert.match(coffeeUrlPreviewMarkup(q),/Sul de Minas, Minas Gerais, Brazil/);
 assert.ok(coffeeSourceReviewSnapshot({...q,source_url:url}));
});
test('historical, alternative, importer, SEO and unrelated product descriptions cannot supply region',()=>{
 for(const altered of [
  quote.replace('This natural processed Brazilian','Previously this natural processed Brazilian'),
  quote.replace('This natural processed Brazilian','Another natural processed Brazilian'),
  quote.replace('is produced by','was once produced by'),
  quote.replace('15 family farms in','15 family farms imported from'),
  quote.replace('in Eastern Brazil','in Eastern Colombia'),
  quote.replace('composed of 15 family farms','whose office is located'),
  'And imported to Oklahoma by Bertagna Coffee Co.'
 ])assert.equal(selected({prose:altered}),null,altered);
 const unrelated=probe({prose:'The current coffee is bright and sweet.',extra:'<aside class="related-products"><h2>Another coffee</h2><p>'+quote+'</p></aside>'});
 assert.notEqual(unrelated.fields.origin,'Sul de Minas, Minas Gerais, Brazil');
});
test('current selected coffee identity, cooperative, country and existing precise location must match',()=>{
 assert.equal(selected({heading:'Colombia Natural Processed Coffee'}),null);
 for(const opts of [{origin:'Minas Gerais, Brazil'},{origin:'Peru'},{origin:'Sul de Minas, Minas Gerais, Brazil'},
  {producer:'Unrelated Coffee Cooperative composed of 15 family farms'},
  {name:'Brazil Other Coffee'}]){
  assert.equal(refine({name,country:'Brazil',demonym:'Brazilian',origin:'Brazil',producer,
   blocks:blocks(),...opts}),null,JSON.stringify(opts));
 }
 assert.equal(refine({name,country:'Brazil',demonym:'Brazilian',origin:'Brazil',producer,
  blocks:[...blocks(),{tag:'p',text:quote.replace('Sul de Minas','Vale Verde')}] }),null);
});
test('one different selected country label is contradictory, never silently overwritten',()=>{
 const q=probe({country:'Peru'});
 assert.ok(q.fields.origin!=='Sul de Minas, Minas Gerais, Brazil');
 assert.ok(q.conflicts?.includes('origin')||q.fields.origin==='Peru',JSON.stringify(q));
});
