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
