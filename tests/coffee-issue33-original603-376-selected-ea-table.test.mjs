// Issue #33 R24 official exact current selected #376 Tenfold Meseta de Popayan
// 2026-11-08 public HTML SHA256 972616e90fb7bb692d135cb6dc1e47a78e50aa29fc673418251c52c44a3cc8b9.
// Exact merged public pre-fix run 42445506490, artifact 13603610729.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {selectedCurrentDecafSpecMethodEvidence} from '../src/server/coffee-direct-product-prose.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {productCoffeeProse} from '../src/server/coffee-product-prose.mjs';
import {coffeeHtmlElements} from '../src/server/coffee-html-structure.mjs';

const url='https://tenfoldcoffee.com/products/meseta-de-popayan-decaf-colombia';
const row=(key,value)=>'<tr><td style="height: 19px;"><span>'+key+'</span></td>'+
 '<td><meta charset="utf-8"><meta charset="utf-8">'+value+'<br></td></tr>';
const selected=(name,inside,other='',seo='')=>'<html><head><meta property="og:type" content="product">'+seo+
 '</head><body><main><article class="product"><h1>'+name+'</h1>'+
 '<div class="product__description rte"><h2>About This Coffee</h2><table><tbody>'+
 inside+'</tbody></table></div></article>'+other+'</main></body></html>';
const method=row('Processing Method','Ethyl Acetate Decaffeination');
const parse=(name,body=method,other='',seo='')=>
 extractPublicCoffeeFacts(selected(name,body,other,seo),{source_url:url});

test('real-shaped exact selected EA processing table is a Sugar Process decaf treatment, not green processing',()=>{
 const name='Meseta de Popayan DECAF - Colombia';
 const result=parse(name,
  row('Country','Colombia')+row('Producer','65 small holders')+
  row('Processing Method','Ethyl Acetate Decaffeination')+
  row('Elevation','1500-2070 masl'));
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.fields.name,name);
 const tableSpec=selectedCurrentDecafSpecMethodEvidence(productMarkup(selected(name,
  row('Country','Colombia')+row('Producer','65 small holders')+
  row('Processing Method','Ethyl Acetate Decaffeination')+
  row('Elevation','1500-2070 masl'))),{name,clean:(v,n=1000)=>String(v||'').replace(/<[^<>]{0,2000}>/g,' ').replace(/\\s+/g,' ').trim().slice(0,n)});
 const tableMarkup=productMarkup(selected(name,
   row('Country','Colombia')+row('Producer','65 small holders')+
   row('Processing Method','Ethyl Acetate Decaffeination')+
   row('Elevation','1500-2070 masl')));
 const cleanProbe=(v,n=200)=>String(v||'').replace(/<[^<>]{0,2000}>/g,' ').replace(/\\s+/g,' ').trim().slice(0,n);
 const structure=coffeeHtmlElements(tableMarkup);
 const allBlocks=productCoffeeProse(tableMarkup,cleanProbe);
 const rows=structure.nodes.map((n,i)=>({i,n})).filter(x=>x.n.tag==='tr');
 const diag={headings:allBlocks.filter(b=>/^h[1-3]$/.test(b.tag)).map(b=>({tag:b.tag,start:b.start,text:b.text})),
  rows:rows.map(({i,n})=>({rowStart:n.start,cellNodes:structure.nodes.filter(d=>d.parent===i).map(c=>({tag:c.tag,text:cleanProbe(tableMarkup.slice(c.headEnd,c.contentEnd))}))})),markupLength:tableMarkup.length};
 assert.equal(result.fields.decaffeination_method,'Sugar Process',JSON.stringify({
  fields:result.fields,spec:tableSpec,structure:diag,roaster_details:result.roaster_details,
  source_facts:result.source_facts?.filter(f=>/process|decaf/i.test(f.field||''))}));
 assert.equal(result.fields.process,undefined,JSON.stringify(result.fields));
 assert.match(coffeeUrlPreviewMarkup(result),/Sugar Process/);
 assert.ok(coffeeSourceReviewSnapshot({...result,source_url:url}));
 assert.ok(result.source_facts.some(f=>f.field==='decaffeination_method'&&
  /Processing Method: Ethyl Acetate Decaffeination/.test(f.value)),
  JSON.stringify(result.source_facts));
});

test('standalone selected decaffeination table identifies Swiss Water; contradictory generic green layout stays reviewable',()=>{
 const exact=parse('Decaf Colombia',row('Decaffeination Method','Swiss Water Process'));
 assert.equal(exact.fields.decaffeination_method,'Water Process',JSON.stringify(exact.fields));
 assert.equal(exact.fields.process,undefined);
 const mixed=parse('Decaf Colombia',row('Process','Washed')+
  row('Decaffeination Method','Swiss Water Process'));
 // Legacy cross-row generic Process reader emits a conflicting adjacent
 // source value on this synthetic layout. Do NOT bypass that conflict here.
 assert.equal(mixed.fields.decaffeination_method,undefined,JSON.stringify(mixed.fields));
 assert.ok(mixed.source_facts.some(f=>f.field==='decaffeination_method'&&f.conflicting));
});

test('regular/half-caf, merely washed/rinsed, history, negated and unrelated product table cannot supply treatment',()=>{
 for(const name of ['Colombia Regular','Colombia Half-Caf']){
  assert.equal(parse(name).fields.decaffeination_method,undefined,name);
 }
 for(const value of ['Washed','Wet Process','Water rinsing','Ethyl Acetate is not used',
  'Formerly Ethyl Acetate Decaffeination','Other coffee: Ethyl Acetate Decaffeination',
  'EA equipment rinse']){
  assert.equal(parse('Decaf Colombia',row('Processing Method',value)).fields.decaffeination_method,
   undefined,value);
 }
 const unrelated=parse('Decaf Colombia',row('Process','Washed'),
  '<section class="product-recommendations">'+
  '<div class="product__description"><table>'+method+'</table></div></section>',
  '<meta name="description" content="Processing Method: Ethyl Acetate Decaffeination">');
 assert.equal(unrelated.fields.decaffeination_method,undefined,JSON.stringify(unrelated.fields));
 const noSelectedH1=selected('Decaf Colombia',method).replace('<h1>Decaf Colombia</h1>','');
 assert.equal(extractPublicCoffeeFacts(noSelectedH1,{source_url:url}).fields?.decaffeination_method,undefined);
});

test('FAQ table and nonselected old coffee table never supply selected treatment',()=>{
 const faq='<h2>Common Questions</h2><table>'+method+'</table>';
 const r=parse('Decaf Colombia',row('Process','Washed')+'</tbody></table>'+faq);
 assert.equal(r.fields.decaffeination_method,undefined,JSON.stringify(r.fields));
 const unrelated=parse('Decaf Colombia',row('Process','Washed')+
  '<tr><td>Product</td><td>Another Decaf</td></tr>');
 assert.equal(unrelated.fields.decaffeination_method,undefined);
});

test('two contradictory selected decaf method table rows remain unfilled and reviewable',()=>{
 const r=parse('Decaf Colombia',
  method+row('Decaffeination Method','Swiss Water Process'));
 assert.equal(r.fields.decaffeination_method,undefined,JSON.stringify(r.fields));
 assert.ok(r.source_facts.some(f=>f.field==='decaffeination_method'&&f.conflicting),
  JSON.stringify(r.source_facts));
});
