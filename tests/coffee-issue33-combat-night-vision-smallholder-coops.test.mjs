// Issue #33 original603 #65. Synthetic fixtures, not a raw official HTML replay.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://combatcoffeetea.com/products/night-vision-medium-roast-kenya';
const intro="Mt. Kenya's southern slopes are home to thousands of small coffee shambas, or gardens. Shambas are nurtured by smallholder farmers, who deliver freshly picked, ripe cherries to their cooperative pulping factories.";
const selected="This coffee, crafted from fully traceable sources of supply in Embu, Kirinyaga and Nyeri counties, epitomizes a typical. great Kenyan coffee.";
const growers='Smallholder farmers, each with around 200 trees, work together in co-ops.';
const process='Each co-op owns wet mills to process their cherries and receives freshly picked ripe cherries from their member farmers throughout the harvest season.';
const page=(name,paragraphs,extra='')=>'<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>'+name+'</h1><div itemprop="description">'+paragraphs.map(p=>'<p>'+p+'</p>').join('')+'</div></article></main>'+extra+'</body></html>';
const parse=(name,paragraphs,extra)=>extractPublicCoffeeFacts(page(name,paragraphs,extra),{source_url:url});
test('#65 selected Kenyan coffee credits literal co-op smallholder growers, not an invented cooperative name',()=>{
 const r=parse('NIGHT VISION - MEDIUM ROAST - KENYA',[intro,selected+' '+growers+' '+process]);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.match(r.fields.producer||'',/^Smallholder farmers$/i,JSON.stringify(r.fields));
 assert.equal(r.fields.name,'NIGHT VISION - MEDIUM ROAST - KENYA');
});
test('#65 generic regional smallholders without selected traceable supply cannot be promoted',()=>{
 const r=parse('NIGHT VISION - MEDIUM ROAST - KENYA',[intro,growers+' '+process]);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.notMatch(r.fields.producer||'',/^Smallholder farmers$/i,JSON.stringify(r.fields));
});
test('#65 prior coffee or incompatible selected country cannot inherit co-op grower credit',()=>{
 const prior=parse('NIGHT VISION - MEDIUM ROAST - KENYA',[intro,'Previously, '+selected+' '+growers]);
 assert.equal(prior.ok,true,JSON.stringify(prior));
 assert.notMatch(prior.fields.producer||'',/^Smallholder farmers$/i,JSON.stringify(prior.fields));
 const wrong=parse('NIGHT VISION - MEDIUM ROAST - COLOMBIA',[intro,selected+' '+growers]);
 assert.equal(wrong.ok,true,JSON.stringify(wrong));
 assert.notMatch(wrong.fields.producer||'',/^Smallholder farmers$/i,JSON.stringify(wrong.fields));
});
test('#65 selected blend and unrelated product card cannot supply whole-product growers',()=>{
 const blend=parse('KENYA AND COLOMBIA BLEND',[intro,selected+' '+growers]);
 assert.equal(blend.ok,true,JSON.stringify(blend));
 assert.notMatch(blend.fields.producer||'',/^Smallholder farmers$/i,JSON.stringify(blend.fields));
 const related=parse('NIGHT VISION - MEDIUM ROAST - KENYA',[intro,selected],
  '<aside class="related-products"><h2>Other coffee</h2><p>'+growers+'</p></aside>');
 assert.equal(related.ok,true,JSON.stringify(related));
 assert.notMatch(related.fields.producer||'',/^Smallholder farmers$/i,JSON.stringify(related.fields));
});
