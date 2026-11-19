import test from 'node:test';
import assert from 'node:assert/strict';
import {selected157} from '../scripts/audit/issue33-r332-original157-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
const url='https://idyllcoffeeroasters.com/products/colombia-narino-buesaco-copy';
const name='Colombia Buesaco, Nariño';
const facts='<p>Elevation: 2000-2100 meters above sea level</p><p>Varietals: Caturra, Castillo and Colombia</p><h3>Specifications</h3><p>Origin: Colombia</p><p>Region: Buesaco, Nariño</p><p>Process: Washed</p><h3>Flavor Notes</h3><p>Juicy tropical fruit, amaretto, syrupy body and vibrant acidity</p>';
const page=(body=facts,h=name,outside='')=>'<html><main><article class="product"><h1>'+h+'</h1><div class="product__description">'+body+'</div></article>'+outside+'</main></html>';
const parse=s=>extractPublicCoffeeFacts(s,{source_url:url});
test('R332 original157 exact selected title and labeled specifications',()=>{
 const v=selected157(page());assert.equal(v.exact,true);
 for(const k of ['ownElevation','ownVarieties','ownCountry','ownRegion','ownWashed','ownFlavor'])assert.equal(v[k],true,k);
});
test('R332 reused slug cannot inherit former H1 or product identity',()=>{
 assert.equal(selected157(page(facts,'Colombia Another Lot')).exact,false);
});
test('R332 non-selected aside footer and navigation cannot source own details',()=>{
 const v=selected157(page('<p>Origin: Colombia</p>',name,'<aside>'+facts+'</aside><nav>'+facts+'</nav><footer>'+facts+'</footer>'));
 assert.equal(v.ownFlavor,false);assert.equal(v.ownWashed,false);assert.equal(v.ownVarieties,false);
});
test('R332 generic natural education cannot override explicit selected washed processing',()=>{
 const p=parse(page(facts+'<p>Other coffees use natural anaerobic processing.</p>'));
 assert.equal(p.ok,true);assert.notEqual(p.fields?.process,'Natural');assert.notEqual(p.fields?.process,'Anaerobic');
});
test('R332 industry introduction cannot invent a grower or roast',()=>{
 const p=parse(page(facts+'<p>Colombia has a deep and well-established coffee tradition.</p>'));
 assert.equal(p.ok,true);assert.ok(!p.fields?.producer);assert.ok(!p.fields?.roast_level);
});
test('R332 subscription shipping copy is not sensory evidence',()=>{
 const p=parse(page(facts+'<p>Recurring Purchase Includes Free Standard Shipping $24.00 USD</p>'));
 assert.equal(p.ok,true);assert.doesNotMatch(String(p.fields?.tasting_notes||''),/subscription|shipping|24\.00/i);
});
test('R332 selected notes cannot imply decaffeination method',()=>{
 const p=parse(page(facts));assert.equal(p.ok,true);
 assert.ok(!p.fields?.decaffeination_method);assert.notEqual(p.fields?.process,'Sugar Process');
});
test('R332 Add Coffee and Source Review render without automatic save',()=>{
 const p=parse(page());assert.equal(p.ok,true);assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R332 official source, heading, and UI gates all fail closed',()=>{
 const ok={number:157,status:'FETCHED',archived_coffee:name,parser_ok:true,selected_h1:[name],
  selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([157],[ok]),[]);
 for(const bad of [{...ok,status:'UNAVAILABLE'},{...ok,selected_heading_identity_verified:false},
  {...ok,source_review_rendered:false},{...ok,add_coffee_ui_rendered:false}])
  assert.ok(requiredFocusedSourceFailures([157],[bad]).length);
});
