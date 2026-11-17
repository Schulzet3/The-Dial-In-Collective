import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const cases=[
 {n:538,name:'Guatemala — Pablo & Eva Del Cid',url:'https://www.radialcoffee.com/products/colombia-pablo-eva-del-cid',country:'Guatemala',wrong:'Colombia',body:'Washed Process. Light Roast. Pablo Del Cid and Eva produce coffee in Santa Elena Barillas, Guatemala. Notes of praline, nougat and a hint of raspberry fruitiness.'},
 {n:540,name:'Colombia — Inza Decaf',url:'https://www.radialcoffee.com/products/guatemala',country:'Colombia',wrong:'Guatemala',body:'Washed Process. Medium Roast. Coffee from a collective of smallholder farms in Inza, Colombia, imported by Red Fox Coffee Importers. Notes of sweet dark chocolate, juicy cherries and rich raisins.'}
];
const page=(name,body,other='')=>'<html><head><title>Archived catalog title</title></head><body><main><article class="product"><h1>'+name+'</h1><div class="description">'+body+'</div></article></main>'+other+'</body></html>';
const row=c=>({number:c.n,archived_coffee:c.name,status:'FETCHED',parser_ok:true,selected_h1:[c.name],selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name:c.name},add_coffee_ui_rendered:true,source_review_rendered:true});
test('both original selected identities and Add Coffee Source Review fail closed for absent or invalid evidence',()=>{
 const records=cases.map(row);
 assert.deepEqual(requiredFocusedSourceFailures([538,540],records),[]);
 assert.ok(requiredFocusedSourceFailures([538,540],[records[0]]).length);
 assert.ok(requiredFocusedSourceFailures([538,540],[records[0],records[0]]).length);
 for(const change of [{status:'UNAVAILABLE'},{parser_ok:false},{selected_heading_identity_verified:false},{add_coffee_ui_rendered:false},{source_review_rendered:false}])
  assert.ok(requiredFocusedSourceFailures([538,540],[records[0],{...records[1],...change}]).length);
});
test('selected visible H1/direct country outranks contradictory old URL handle, SEO and related product',()=>{
 for(const c of cases){
  const html=page(c.name,c.body,'<aside class="related-products"><h2>'+c.wrong+' Espresso</h2><p>Natural, mango, hibiscus, Swiss Water.</p></aside>');
  assert.deepEqual(selectedProductHeadings(productMarkup(html)),[c.name]);
  const result=extractPublicCoffeeFacts(html,{source_url:c.url});
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(result.fields.name,c.name);
  assert.doesNotMatch(String(result.fields.origin||''),new RegExp(c.wrong,'i'));
  assert.doesNotMatch(String(result.fields.tasting_notes||''),/mango|hibiscus/i);
  assert.ok(coffeeUrlPreviewMarkup(result).includes('coffee-url-preview'));
  assert.ok(coffeeSourceReviewSnapshot({...result,source_url:c.url}));
 }
});
test('decaf method and importer-as-producer are never fabricated from name or sibling',()=>{
 const c=cases[1],html=page(c.name,c.body,'<aside class="related-products">Swiss Water Decaf, water process</aside>');
 const r=extractPublicCoffeeFacts(html,{source_url:c.url});
 assert.equal(r.ok,true);
 assert.ok(!r.fields.decaffeination_method);
 assert.doesNotMatch(String(r.fields.producer||''),/Red Fox/i);
});
test('an unrelated H1 cannot establish the selected original by its path',()=>{
 for(const c of cases){
  const html=page(c.wrong+' House Blend',c.body);
  const p=extractPublicCoffeeFacts(html,{source_url:c.url});
  assert.equal(p.ok,true);
  assert.notEqual(p.fields.name,c.name);
 }
});
