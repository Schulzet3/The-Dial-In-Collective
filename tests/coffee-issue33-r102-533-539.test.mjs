import test from 'node:test';
import assert from 'node:assert/strict';
import {cases,selectedProof} from '../scripts/audit/issue33-r102-533-539-check.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const markup=(e,own,neighbor='')=>'<html><head><meta property="og:type" content="product"></head><body>'+
 '<main><article class="product"><h1>'+e.name+'</h1><div class="product__description"><p>'+own+'</p></div></article>'+
 neighbor+'</main></body></html>';
test('selected source evidence demands unique current H1 and every direct own literal',()=>{
 for(const e of cases){const html=productMarkup(markup(e,e.own.join('. ')));
  assert.deepEqual(selectedProof(html,selectedProductHeadings(html),e),{uniqueH1:true,direct:e.own.map(()=>true)});}
});
test('missing, changed, duplicated selected headings never certify identity',()=>{
 for(const e of cases)for(const headings of [[],['Different product'],[e.name,e.name]])
  assert.equal(selectedProof(markup(e,e.own.join(' ')),headings,e).uniqueH1,false);
});
test('neighbor/SEO/navigation/footer facts cannot satisfy selected direct source proof',()=>{
 for(const e of cases){
  const html=productMarkup(markup(e,'There are no printed source details here.',
   '<nav>'+e.own.join(' ')+'</nav><aside>'+e.own.join(' ')+'</aside><footer>'+e.own.join(' ')+'</footer>'));
  assert.deepEqual(selectedProof(html,selectedProductHeadings(html),e).direct,e.own.map(()=>false));
 }
});
test('a revised or omitted direct current claim must fail instead of consulting archived expectations',()=>{
 for(const e of cases){
  const html=productMarkup(markup(e,e.own.slice(0,-1).join(' ')));
  assert.equal(selectedProof(html,selectedProductHeadings(html),e).direct.at(-1),false);
 }
});
test('Early Bird own regional blend cannot acquire a guessed country, farm or precise roast from unrelated product',()=>{
 const e=cases[0],p=extractPublicCoffeeFacts(markup(e,
  'Thoughtfully chosen beans from Central and South America are roasted to produce flavors of orange, brown sugar and medjool dates.',
  '<aside>Other product Guatemala Huehuetenango washed Caturra medium-dark 1850 masl.</aside>'),
  {source_url:'https://'+e.host+e.path});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,e.name);
 assert.doesNotMatch(JSON.stringify(p.fields),/Huehuetenango|Caturra|1850 masl/i);
 assert.ok(!p.fields.roast_level&&!p.fields.producer,JSON.stringify(p.fields));
});
test('Cosa Nueva chosen medium-light washed notes cannot borrow related specialty identity',()=>{
 const e=cases[1],p=extractPublicCoffeeFacts(markup(e,
  'Washed Process. Medium Light Roast. Its milk chocolate base is complemented with notes of stone fruit and honey, culminating in sweet acidity.',
  '<aside><h2>Guatemala Pablo Eva Del Cid</h2>Natural anaerobic Geisha 1900 masl strawberry jasmine.</aside>'),
  {source_url:'https://'+e.host+e.path});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,e.name);
 assert.doesNotMatch(JSON.stringify(p.fields),/Pablo Eva|Geisha|strawberry|jasmine|1900 masl/i);
});


test('direct chosen flavor base recovers milk chocolate without treating milk as preparation',()=>{
 const e=cases[1],quote='Its milk chocolate base is complemented with notes of stone fruit and honey, culminating in a refreshing, sweet acidity.';
 const p=extractPublicCoffeeFacts(markup(e,'Washed Process. Medium Light Roast. '+quote),
  {source_url:'https://'+e.host+e.path});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.match(p.fields.tasting_notes||'',/milk chocolate/i,JSON.stringify(p.fields));
 assert.match(p.fields.tasting_notes||'',/stone fruit/i,JSON.stringify(p.fields));
 assert.match(p.fields.tasting_notes||'',/honey/i,JSON.stringify(p.fields));
 assert.equal(p.fields.name,e.name);
});
test('selected flavor base cannot come from unrelated coffee, historical lot or conditional milk service',()=>{
 const e=cases[1],base='Its milk chocolate base is complemented with notes of stone fruit and honey.';
 for(const variation of [
  {own:'Washed Process. Medium Light Roast. Notes of stone fruit and honey.',neighbor:'<aside>'+base+'</aside>'},
  {own:'Washed Process. Medium Light Roast. Notes of stone fruit and honey. Previously, '+base,neighbor:''},
  {own:'Washed Process. Medium Light Roast. Notes of stone fruit and honey. When prepared with milk, '+base,neighbor:''},
  {own:'Washed Process. Medium Light Roast. Notes of stone fruit and honey. Its milk chocolate base is complemented with notes of blueberry and honey.',neighbor:''}
 ]){
  const p=extractPublicCoffeeFacts(markup(e,variation.own,variation.neighbor),{source_url:'https://'+e.host+e.path});
  assert.equal(p.ok,true,JSON.stringify(p));
  assert.doesNotMatch(p.fields.tasting_notes||'',/milk chocolate/i,variation.own);
 }
});
test('helper rejects duplicated identity, altered selected notes and milk-as-ingredient',async()=>{
 const {refineSelectedCurrentFlavorBase}=await import('../src/server/coffee-selected-description-sensory.mjs');
 const e=cases[1],body='<p>Its milk chocolate base is complemented with notes of stone fruit and honey.</p>';
 const clean=html=>String(html).replace(/<[^<>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
 const single=markup(e,body),duplicate=single.replace('<h1>'+e.name+'</h1>','<h1>'+e.name+'</h1><h1>Different product</h1>');
 assert.match(refineSelectedCurrentFlavorBase(single,{clean,notes:'stone fruit and honey'}),/milk chocolate/i);
 assert.equal(refineSelectedCurrentFlavorBase(duplicate,{clean,notes:'stone fruit and honey'}),'');
 assert.equal(refineSelectedCurrentFlavorBase(single,{clean,notes:'orange and honey'}),'');
 assert.equal(refineSelectedCurrentFlavorBase(markup(e,'When served with milk, Its milk chocolate base is complemented with notes of stone fruit and honey.'),{clean,notes:'stone fruit and honey'}),'');
});


test('selected original product paragraph with nonflavor trailing comma still adds exact intrinsic base',async()=>{
 const {refineSelectedCurrentFlavorBase}=await import('../src/server/coffee-selected-description-sensory.mjs');
 const e=cases[1],prose='Washed Process. Medium Light Roast. Its milk chocolate base is complemented with notes of stone fruit and honey, culminating in a refreshing, sweet acidity.';
 const html=markup(e,prose);
 const clean=value=>String(value).replace(/<[^<>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
 const a=refineSelectedCurrentFlavorBase(html,{clean,notes:'stone fruit and honey'});
 const b=refineSelectedCurrentFlavorBase(productMarkup(html),{clean,notes:'stone fruit and honey'});
 const p=extractPublicCoffeeFacts(html,{source_url:'https://'+e.host+e.path});
 assert.match(p.fields.tasting_notes||'',/milk chocolate/i,JSON.stringify(p.fields));
 assert.match(a,/milk chocolate/i);
 assert.match(b,/milk chocolate/i);
});


test('a related non-selected section cannot supply the missing flavor base',async()=>{
 const {refineSelectedCurrentFlavorBase}=await import('../src/server/coffee-selected-description-sensory.mjs');
 const e=cases[1],clean=value=>String(value).replace(/<[^<>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
 const html=markup(e,'Notes of stone fruit and honey.',
   '<section><h2>Different Coffee</h2><p>Its milk chocolate base is complemented with notes of stone fruit and honey.</p></section>');
 assert.equal(refineSelectedCurrentFlavorBase(html,{clean,notes:'stone fruit and honey'}),'');
});
