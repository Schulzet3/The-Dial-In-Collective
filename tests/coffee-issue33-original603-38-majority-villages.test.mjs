// Issue #33 original603 #38: current exact-lot station + majority villages.
// Bounded source-backed synthetic HTML; official raw replay is separate.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://brewtusroasting.com/products/ethiopia-natural';
const lead='Discover an extraordinary coffee experience with our latest natural lot from the renowned Shantawane Washing Station in Sidama, Ethiopia.';
const credit='The Shantawane Washing Station is committed to excellence, paying premiums to smallholder farmers. This commitment ensures that the majority of the coffee arrives swiftly from the nearby villages of Shantawene and Bombe, preserving its peak freshness.';
const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function selected({name='Ethiopia Natural',intro=lead,source=credit,related=''}={}){
 const html='<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>'+escape(name)+'</h1>'+
 '<div class="product__description"><p>'+escape(intro)+'</p><p>'+escape(source)+'</p>'+
 '<p>This natural lot is lightly roasted, revealing tasting notes of strawberry, peach, and brown sugar.</p></div></article>'+
 (related?'<section><h2>Other Coffees</h2><p>'+escape(related)+'</p></section>':'')+
 '</main></body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('selected current station and linked majority villages refine source origin',()=>{
 const r=selected();
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.origin,'Shantawene and Bombe, Sidama, Ethiopia',JSON.stringify(r.fields));
 assert.equal(r.fields.process,'Natural');
 assert.equal(r.fields.roast_level,'Light');
 assert.ok(!r.conflicts?.includes('origin'),JSON.stringify(r.conflicts));
});
test('current station alone does not manufacture two source villages',()=>{
 const r=selected({source:'The Shantawane Washing Station is committed to excellence.'});
 assert.equal(r.ok,true);
 assert.ok(!/Shantawene and Bombe/i.test(r.fields.origin||''),JSON.stringify(r.fields));
});
test('villages belonging to a different named station cannot be donated',()=>{
 const r=selected({source:credit.replace('The Shantawane Washing Station','The Other Washing Station')});
 assert.equal(r.ok,true);
 assert.ok(!/Shantawene and Bombe/i.test(r.fields.origin||''),JSON.stringify(r.fields));
});
test('historical or noncurrent lot never claims present villages',()=>{
 for(const intro of [
  lead.replace('our latest natural lot','our previous natural lot'),
  lead.replace('our latest natural lot','another coffee lot')
 ]){
  const r=selected({intro});
  assert.equal(r.ok,true);
  assert.ok(!/Shantawene and Bombe/i.test(r.fields.origin||''),JSON.stringify(r.fields));
 }
});
test('another selected country and other-coffee text cannot claim village origin',()=>{
 const wrong=selected({name:'Colombia Natural'});
 assert.equal(wrong.ok,true);
 assert.ok(!/Shantawene and Bombe/i.test(wrong.fields.origin||''),JSON.stringify(wrong.fields));
 const other=selected({source:'The Shantawane Washing Station is committed to excellence.',related:credit});
 assert.equal(other.ok,true);
 assert.ok(!/Shantawene and Bombe/i.test(other.fields.origin||''),JSON.stringify(other.fields));
});

test('single actual-style Shopify paragraph does not absorb preceding sentence into station identity',()=>{
 const preceding='Nestled between 2000 and 2200 meters above sea level, near the majestic Bombe Mountain, this coffee embodies the rich terroir of southern Ethiopia.';
 const story='<p>'+escape(lead)+' '+escape(preceding)+' <br><br> '+escape(credit)+' <br><br> This natural lot is lightly roasted.</p>';
 const html='<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>Ethiopia Natural</h1><div class="product__description">'+story+'</div></article></main></body></html>';
 const r=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(r.ok,true);
 assert.equal(r.fields.origin,'Shantawene and Bombe, Sidama, Ethiopia',JSON.stringify(r.fields));
 assert.ok(!r.conflicts?.includes('origin'));
});
