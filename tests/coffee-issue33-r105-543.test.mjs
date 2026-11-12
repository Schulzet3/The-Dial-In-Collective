import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen,selectedProof} from '../scripts/audit/issue33-r105-543-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const direct='This coffee comes from Chiapas, Mexico, grown in the highlands near the El Triunfo Biosphere Reserve—one of the most biodiverse cloud forest regions in the world. The lush environment, high elevation, and traditional varieties like Typica, Bourbon, and Caturra create ideal conditions for producing clean, sweet, high-quality coffee. Sourced through the Comon Yaj Noptic cooperative, a group of smallholder farmers founded in 1995, this lot reflects both strong regional character and careful producer commitment. Certified organic and Fair Trade, it offers a beautiful example of the quality possible from southern Mexico’s specialty coffee communities.';
const url='https://'+chosen.host+chosen.path;
const markup=(name,body,extra='',meta='')=>'<html><head><meta property="og:type" content="product"><meta property="og:url" content="'+url+'"><meta property="og:title" content="'+name+'">'+meta+'</head><body><main><article class="product"><h1>'+name+'</h1><div class="product__description"><p>'+body+'</p></div></article>'+extra+'</main></body></html>';
test('current selected original #543 H1 and four exact current story spans are necessary',()=>{
 const p=selectedProof(markup(chosen.name,direct));
 assert.equal(p.uniqueH1,true);assert.deepEqual(p.direct,[true,true,true,true]);assert.equal(p.oldFlavorAbsent,true);
});
test('different, empty, duplicate selected H1 cannot certify original source',()=>{
 for(const v of [markup('Different Chiapas',direct),markup('',direct),
  markup(chosen.name,direct).replace('</h1>','</h1><h1>Different coffee</h1>')])
  assert.equal(selectedProof(v).uniqueH1,false);
});
test('navigation, unrelated product and SEO cannot satisfy current selected story',()=>{
 const extra='<nav>'+direct+'</nav><aside>'+direct+' red apple panela brown sugar</aside>';
 assert.deepEqual(selectedProof(markup(chosen.name,'No direct source description.',extra)).direct,[false,false,false,false]);
});
test('missing cooperative and changed origin fail literal selected current source',()=>{
 const changed=direct.replace('Chiapas, Mexico','Oaxaca, Mexico').replace('Comon Yaj Noptic','different group');
 const p=selectedProof(markup(chosen.name,changed));
 assert.deepEqual(p.direct,[false,true,false,true]);
});
test('historical flavor in direct selected body requires a new explicit source adjudication',()=>{
 const p=selectedProof(markup(chosen.name,direct+' Tasting notes: red apple, panela, brown sugar.'));
 assert.equal(p.oldFlavorAbsent,false);
});
test('real parser preserves only current chosen coffee identity and origin, no fabricated historical flavor',()=>{
 const p=extractPublicCoffeeFacts(markup(chosen.name,direct),{source_url:url});
 assert.equal(p.ok,true,JSON.stringify(p));assert.equal(p.fields.name,chosen.name);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/red apple|panela|panels|brown sugar/i);
});
test('regional examples are not a published selected-lot variety roster',()=>{
 const p=extractPublicCoffeeFacts(markup(chosen.name,direct),{source_url:url});
 assert.equal(p.ok,true,JSON.stringify(p));assert.equal(p.fields.variety,undefined,JSON.stringify(p));
});
test('old metadata flavor alone does not outrank substantial current lot story',()=>{
 const meta='<meta property="og:description" content="Mexico Chiapas Seasonal Espresso tastes of red apple, panela, brown sugar">';
 const p=extractPublicCoffeeFacts(markup(chosen.name,direct,'',meta),{source_url:url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.tasting_notes,undefined,JSON.stringify(p));
});
test('literal selected current tasting notes may populate if independently printed',()=>{
 const meta='<meta property="og:description" content="Mexico Chiapas Seasonal Espresso tastes of red apple, panela, brown sugar">';
 const p=extractPublicCoffeeFacts(markup(chosen.name,direct+' Tasting Notes: red apple, panela, brown sugar.','',meta),{source_url:url});
 assert.equal(p.ok,true,JSON.stringify(p));assert.match(String(p.fields.tasting_notes||''),/red apple/i);
});

test('generic company marketing without deictic present-lot language must not count as selected current story',()=>{
 const generic='Our coffee region team supports farmers with growing, processing, region sourcing and quality control for many different origins; these coffees are featured across our seasonal catalog, alongside other coffees and producers throughout the year.';
 const meta='<meta property="og:description" content="Mexico Chiapas Seasonal Espresso tastes of red apple, panela, brown sugar">';
 const p=extractPublicCoffeeFacts(markup(chosen.name,generic,'',meta),{source_url:url});
 assert.equal(p.ok,true,JSON.stringify(p));
 // No competing direct chosen-lot growing narrative: preserve existing low-confidence fallback.
 assert.match(String(p.fields.tasting_notes||''),/red apple/i);
 assert.ok((p.seo_fallback_fields||[]).includes('tasting_notes'));
});
test('unrelated product panel cannot authenticate the selected coffee direct source',()=>{
 const meta='<meta property="og:description" content="Mexico Chiapas Seasonal Espresso tastes of red apple, panela, brown sugar">';
 const p=extractPublicCoffeeFacts(markup(chosen.name,'Only a price is published.','<aside>'+direct+'</aside>',meta),{source_url:url});
 assert.equal(p.ok,true,JSON.stringify(p));
 // If there is no current selected narrative, the old clearly marked metadata fallback may remain.
 assert.ok(!p.fields.origin||!String(p.fields.origin).includes('Chiapas')||
   (p.seo_fallback_fields||[]).includes('origin'),JSON.stringify(p));
});
