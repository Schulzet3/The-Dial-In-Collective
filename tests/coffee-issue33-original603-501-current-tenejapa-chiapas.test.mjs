import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

// Frozen original603 row #501; independently observed CURRENT selected public
// https://www.ixxacoffee.com/products/organic-ki-saya-tenejapa-microlot
// on November 8, 2026. This is a SOURCE-SHAPED fixture, NOT a raw HTML hash
// or a substitute for full current official HTTPS + Add Coffee verification.
const sourceUrl='https://ixxa.example/products/organic-ki-saya-tenejapa-microlot';
const title='Organic Ki-Saya - Tenejapa Microlot';
function chosenPage({regionalSentence='Ki-Saya, our organic gem from Chiapas, blends two Mayan words.',
 localSentence='This lot hails from Tenejapa—a high-altitude spot where rich volcanic soil and ideal climate make magic happen.',
 extra='' }={}){
 const html='<html><head><meta property="og:type" content="product"><link rel="canonical" href="'+sourceUrl+'"></head><body>'+
 '<main><section class="product"><h1>'+title+'</h1><div class="product__description rte">'+
 '<p>'+regionalSentence+'</p><p>'+localSentence+'</p>'+
 '<p>Notes Of: Chocolate, creamy caramel, honey, hazelnut</p></div></section>'+
 extra+'</main></body></html>';
 const parsed=extractPublicCoffeeFacts(html,{source_url:sourceUrl});
 assert.equal(parsed?.ok,true,JSON.stringify(parsed));
 assert.equal(parsed.fields.name,title);
 return parsed;
}

test('original603 #501: selected lot's Tenejapa and directly stated Chiapas both survive',()=>{
 const parsed=chosenPage();
 assert.equal(parsed.fields.origin,'Tenejapa, Chiapas',JSON.stringify(parsed.fields));
 assert.match(parsed.fields.tasting_notes||'',/chocolate/i);
 assert.match(parsed.fields.tasting_notes||'',/hazelnut/i);
 assert.equal(parsed.fields.roast_level,undefined,'unprinted Medium is an old expectation, not current product fact');
});

test('unpublished locality cannot be fabricated from regional context',()=>{
 const parsed=chosenPage({localSentence:'This current coffee comes from the Chiapas region.'});
 assert.notEqual(parsed.fields.origin,'Tenejapa, Chiapas');
});

test('a previous Chiapas lot cannot enrich the current selected locality',()=>{
 const parsed=chosenPage({regionalSentence:'Our previous lot was from Chiapas. This coffee is new.'});
 assert.notEqual(parsed.fields.origin,'Tenejapa, Chiapas');
});

test('an unrelated recommended product cannot donate a selected growing region',()=>{
 const parsed=chosenPage({
  regionalSentence:'Ki-Saya is our organic microlot from Tenejapa.',
  extra:'<section class="product-recommendations"><h2>Other Coffee</h2><p>Our organic gem from Chiapas.</p></section>'
 });
 assert.notEqual(parsed.fields.origin,'Tenejapa, Chiapas');
});
