// Issue33 original603 #23: direct selected current decaf conflicting origins.
// Source-text fixtures, not independent current raw official HTML replay.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://blackriverroasters.com/products/organic-specialty-decaf';
function selected({offer='Peru',location='Mexico',name='Organic Specialty Decaf',related='',doubleTitle=false,inline=false}={}){
 const story=offer?'<p>Our decaf coffee rotates throughout the year. The current offering from '+offer+' is no different—rich, chocolaty and nutty.</p>':'';
 const spec=location?(inline?'<p>Current Decaf Coffee<br>Location: '+location+'</p>':'<h3>Current Decaf Coffee</h3><p>Location: '+location+'</p>')+
  '<p>Altitude: 1000–1500 masl</p><p>Process: Washed, Water-Process Decaffeinated</p>':'';
 const html='<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>'+name+'</h1>'+
  '<div class="product__description"><p>A decadent cup with notes of raisin, chocolate and caramel.</p>'+story+spec+
  '</div></article>'+(doubleTitle?'<h1>Another Coffee</h1>':'')+
  (related?'<section><h2>Other Coffees</h2><p>'+related+'</p></section>':'')+'</main></body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('contradictory direct current offering and labeled current Location are review-only',()=>{
 const r=selected();
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.origin,undefined,JSON.stringify(r.fields));
 assert.ok(r.conflicts?.includes('origin'),JSON.stringify(r));
 assert.ok(r.source_facts?.some(f=>f.field==='origin'&&f.value==='Peru'&&f.conflicting),JSON.stringify(r));
 assert.ok(r.source_facts?.some(f=>f.field==='origin'&&f.value==='Mexico'&&f.conflicting),JSON.stringify(r));
 assert.equal(r.fields.roast_level,undefined,'Do not turn Medium grind menu/historic value into roast');
});
test('same present-lot country stays eligible without false conflict',()=>{
 const r=selected({offer:'Mexico'});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.origin,'Mexico',JSON.stringify(r));
 assert.ok(!r.conflicts?.includes('origin'));
});
test('current location alone and unrelated old offer are not a contradiction',()=>{
 for(const r of [selected({offer:''}),selected({offer:'',related:'The current offering from Peru is no different.'})]){
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.ok(!r.conflicts?.includes('origin'),JSON.stringify(r));
 }
});
test('unknown country and missing current spec cannot supply a contradictory selected origin',()=>{
 for(const r of [selected({offer:'Outer Space'}),selected({location:''})]){
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.ok(!r.conflicts?.includes('origin'),JSON.stringify(r));
 }
});
test('single HTML block for current spec and multiple product H1s fail closed',()=>{
 const inline=selected({inline:true});
 assert.equal(inline.ok,true,JSON.stringify(inline));
 assert.ok(inline.conflicts?.includes('origin'),JSON.stringify(inline));
 const other=selected({doubleTitle:true});
 assert.ok(!other.conflicts?.includes('origin'),JSON.stringify(other));
});
