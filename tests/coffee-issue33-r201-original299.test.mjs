import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://sextantcoffee.com/products/the-windsor-sextant-coffee';
const name='The Windsor - Brazil Coffee';
const description='This coffee is grown by a highly knowledgeable multi-generational Brazilian family in the Minas Gerais region of North Eastern Brazil. In the shade of the Amazon rainforest, these farmers combine modern eco-friendly coffee production methods with traditional water-friendly processing to produce sweet, clean, and heavy-bodied coffee. We like to brew this coffee to highlight the delicate notes of cherry and milk chocolate, but it can also be prepared as a nutty and creamy single-origin espresso.';
function parse({story=description,details='',aside='',title='Historical Other Coffee - old SEO'}={}){
 const ld={'@context':'https://schema.org','@type':'Product',name,url,brand:{'@type':'Brand',name:'Sextant Coffee Roasters'}};
 const html='<!doctype html><html><head><title>'+title+'</title><script type="application/ld+json">'+JSON.stringify(ld)+'</script></head><body><main><article class="product"><h1>'+name+'</h1><div class="product-description"><p>'+story+'</p>'+details+'</div></article></main>'+aside+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('original299 current selected Windsor directly credits Brazil and cherry/milk chocolate, not anonymous family as named producer',()=>{
 const p=parse();
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,1100));
 assert.equal(p.fields?.name,name);
 assert.match(String(p.fields?.origin||''),/Brazil/i);
 for(const note of ['cherry','milk chocolate'])assert.match(String(p.fields?.tasting_notes||''),new RegExp(note,'i'));
 assert.ok(!p.fields?.producer,'unnamed multi-generational Brazilian family must not be a canonical named producer: '+JSON.stringify(p.fields));
 assert.ok(!p.fields?.roast_level,'unpublished roast must remain blank');
 assert.notEqual(p.fields?.process,'Washed','traditional water-friendly processing does not prove green Washed process');
});
test('original299 a directly labeled actually named selected cooperative remains eligible',()=>{
 const p=parse({details:'<p>Producer: Cooperativa Bela Vista</p>'});
 assert.equal(p.ok,true);
 assert.match(String(p.fields?.producer||''),/Cooperativa Bela Vista/i);
});
test('original299 nearby unrelated product and old SEO cannot supply a producer or roast',()=>{
 const aside='<aside><h2>Other Coffee</h2><p>Producer: Fazenda Other Coffee. Process: Washed. Roast: Dark. Notes: Papaya and Lychee.</p></aside>';
 const p=parse({aside});
 assert.equal(p.ok,true);
 assert.equal(p.fields?.name,name);
 assert.ok(!p.fields?.producer,'related card must not supply named producer');
 assert.notEqual(p.fields?.roast_level,'Dark');
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/papaya|lychee/i);
 assert.doesNotMatch(String(p.fields?.name||''),/Historical Other Coffee/i);
});
test('original299 customer review tasting and roaster marketing are not selected product literal notes',()=>{
 const aside='<section id="reviews"><h2>Customer Reviews</h2><p>Melon fruit with a touch of nuttiness, my favorite roast.</p></section>';
 const p=parse({aside});
 assert.equal(p.ok,true);
 assert.match(String(p.fields?.tasting_notes||''),/cherry/i);
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/melon fruit/i);
});
