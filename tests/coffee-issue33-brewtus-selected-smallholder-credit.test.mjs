// Issue #33 original603 #38. Synthetic fixtures, not raw official HTML replay.
import test from 'node:test';
import assert from 'node:assert/strict';
import {isPublishedNarrativeRestored} from './helpers/release-published-restoration.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://brewtusroasting.com/products/ethiopia-natural';
const intro='Discover an extraordinary coffee experience with our latest natural lot from the renowned Shantawane Washing Station in Sidama, Ethiopia. Nestled between 2000 and 2200 meters above sea level, near the majestic Bombe Mountain, this coffee embodies the rich terroir of southern Ethiopia.';
const credit='The Shantawane Washing Station is committed to excellence, paying premiums to smallholder farmers for their dedication to delivering only the highest quality, freshly picked cherries.';
const finish='This natural lot is lightly roasted, revealing vibrant tasting notes of strawberry, peach, and brown sugar.';
const page=(name,paragraphs,tail='')=>'<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>'+name+'</h1><div itemprop="description">'+paragraphs.map(p=>'<p>'+p+'</p>').join('')+'</div></article></main>'+tail+'</body></html>';
const parse=(name,paragraphs,tail)=>extractPublicCoffeeFacts(page(name,paragraphs,tail),{source_url:url});
test('#38 selected Shantawane lot credits literal smallholder farmers, not station as grower',()=>{
 const r=parse('Ethiopia Natural',[intro,credit,finish]);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields.name,'Ethiopia Natural');
 assert.match(r.fields.origin||'',/Ethiopia/);
 assert.equal(r.fields.process,'Natural');
 assert.equal(r.fields.roast_level,'Light');
 assert.match(r.fields.tasting_notes||'',/strawberry.*peach.*brown sugar/i);
 if(isPublishedNarrativeRestored()){
  assert.ok(!r.fields.producer,'exact published baseline must not invent selected grower credit');
 }else assert.match(r.fields.producer||'',/^smallholder farmers$/i,JSON.stringify(r.fields));
});
test('#38 different station and historical premium narrative cannot supply selected producer',()=>{
 const mismatch=parse('Ethiopia Natural',[intro,credit.replaceAll('Shantawane','Bombe'),finish]);
 assert.equal(mismatch.ok,true,JSON.stringify(mismatch));
 assert.notEqual(mismatch.fields.producer,'smallholder farmers',JSON.stringify(mismatch.fields));
 const old=parse('Ethiopia Natural',[intro,'Previously, '+credit,finish]);
 assert.equal(old.ok,true,JSON.stringify(old));
 assert.notEqual(old.fields.producer,'smallholder farmers',JSON.stringify(old.fields));
});
test('#38 growers of one component or related coffee cannot become selected producer',()=>{
 const blend=parse('Ethiopia and Colombia Blend',[intro,credit,finish]);
 assert.equal(blend.ok,true,JSON.stringify(blend));
 assert.notEqual(blend.fields.producer,'smallholder farmers',JSON.stringify(blend.fields));
 const related=parse('Ethiopia Natural',[intro,finish],'<aside class="related-products"><h3>Other coffee</h3><p>'+credit+'</p></aside>');
 assert.equal(related.ok,true,JSON.stringify(related));
 assert.notEqual(related.fields.producer,'smallholder farmers',JSON.stringify(related.fields));
});
