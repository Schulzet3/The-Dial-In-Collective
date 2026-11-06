import test from 'node:test';
import assert from 'node:assert/strict';
import {refineSelectedDescriptionSensory} from '../src/server/coffee-selected-description-sensory.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';

const url='https://localroasters.com/products/brazil-natural-12-oz';
const title='Brazil Cerrado Natural 12 Oz.';
const compact='Golden Raisin, Pecan, & Honey Grahams';
const literal='On the front end, you get notes of caramel and a touch of fruity sweetness. Soon after, you pick up on rich notes of pecan. These notes accompany a juicy, lighter body, alongside a very creamy mouthfeel. It finishes incredibly smooth, with lingering notes of honey and cookies alongside the sweeter notes mentioned earlier.';
const cleaner=(s,n=6001)=>String(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const page=(description=literal,{name=title,extra='',notes=compact}={})=>'<html><head><link rel="canonical" href="'+url+'"></head><body><main><article class="product"><h1>'+name+'</h1><div class="product-description rte"><p>Roast Level: Light Medium</p><p>Region: Cerrado Mineiro</p><p>Process: Natural</p><p>Tasting Notes: '+notes+'</p><p>Description: '+description+'</p></div></article></main>'+extra+'</body></html>';
const refine=(html,notes=compact)=>refineSelectedDescriptionSensory(html,{clean:cleaner,notes});
const parse=html=>extractPublicCoffeeFacts(html,{source_url:url});

test('original603 #199 same-selected direct description recovers caramel, honey and cookies beyond literal compact label',()=>{
 const found=refine(page());
 assert.match(found,/Golden Raisin/i);assert.match(found,/Pecan/i);assert.match(found,/Honey Grahams/i);
 assert.match(found,/caramel/i);assert.match(found,/\bhoney\b/i);assert.match(found,/cookies/i);
 assert.doesNotMatch(found,/fruity sweetness/i);
});
test('current Add Coffee preview remains selected, with all direct description notes and no invented roast or process',()=>{
 const r=parse(page());
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.fields?.name,title);
 for(const term of ['Golden Raisin','Pecan','Honey Grahams','caramel','honey','cookies'])
  assert.match(r.fields?.tasting_notes||'',new RegExp(term,'i'),term);
 assert.equal(r.fields?.process,'Natural');
 assert.equal(r.fields?.roast_level,'Medium-Light');
 assert.ok(!r.conflicts?.includes('tasting_notes'),JSON.stringify(r.conflicts));
 assert.match(coffeeUrlPreviewMarkup(r),/caramel/i);
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url:url}));
});
test('generic exact selected coffee with one corroborating labeled note may add literal standalone descriptors',()=>{
 const p=page('This cup has notes of cocoa. The long finish carries notes of vanilla and cookies.',{name:'New Single-Origin Coffee',notes:'Cocoa, Almond'});
 assert.match(refine(p,'Cocoa, Almond'),/vanilla, cookies/i);
});
test('no unrelated related product, metadata, unlabelled story or unrelated product identity contributes narrative notes',()=>{
 const other='<aside class="related-products"><h2>Another Coffee</h2><p>Description: '+literal+'</p></aside>';
 for(const html of [
  page('This cup is bright and juicy.',{extra:other}),
  page('This cup is bright and juicy.',{extra:'<meta name="description" content="'+literal+'">'}),
  page(literal.replace('notes of pecan','hints of plum')),
  page('On the front end you get notes of caramel. At the end you get honey cookies.')
 ])assert.equal(refine(html),'');
});
test('historical, conditional serving, alternate roast and duplicate description claims cannot be merged',()=>{
 for(const statement of [
  'Previously this coffee offered notes of pecan. It now offers notes of caramel.',
  'If brewed with milk, you will get notes of pecan and vanilla.',
  'When cooled, you get notes of pecan and cookies.',
  'This coffee as a light roast has notes of pecan; as a dark roast it has notes of chocolate.',
  'Another coffee has notes of pecan and caramel.'
 ])assert.equal(refine(page(statement)),'',statement);
 assert.equal(refine(page(literal,{extra:'<article><h1>Different Coffee</h1><p>Description: Notes of chocolate.</p></article>'})),'');
});
test('unverified descriptions, contradictory selected profile wording and absent overlap remain reviewable',()=>{
 assert.equal(refine(page('Description: This coffee has notes of caramel and vanilla.')),'');
 assert.equal(refine(page(literal,{notes:'Cherry, Peach'}),'');
});
