import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url="https://sextantcoffee.com/products/yirgacheffe-heirloom-12oz-bag";
const name="Black Lion - Best Seller Organic Yirgacheffe Heirloom - Ethiopian Coffee";
const story="The Black Lion - Yirgacheffe Heirloom, is one of Sextant’s prized natural process organic coffee offerings. This heavy, juicy, and aromatic coffee packs a ton of flavor. Sweet and slightly Floral notes are accentuated when drying under the Ethiopian sun creating a malty and Blueberry finish. This coffee is a classic example of what makes Ethiopian coffee so unique and unforgettable. Yirgacheffe is a small but fertile region, producing some of the world's most well-known coffees. Yirgacheffe coffees are comprised of uncatalogued and unique coffee varietals, called heirlooms.";
function parse({description=story,aside='',title='Old unrelated SEO'}={}){
 const ld={'@context':'https://schema.org','@type':'Product',name,url,brand:{'@type':'Brand',name:'Sextant Coffee Roasters'}};
 const html='<html><head><title>'+title+'</title><script type="application/ld+json">'+JSON.stringify(ld)+'</script></head><body><main><article class="product"><h1>'+name+'</h1><div class="product-description"><p>'+description+'</p></div></article></main>'+aside+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('original300 selected Black Lion direct prose retains the full published floral/malty/blueberry sensory arc',()=>{
 const p=parse();assert.equal(p.ok,true,JSON.stringify(p).slice(0,800));
 assert.equal(p.fields?.name,name);
 const notes=String(p.fields?.tasting_notes||'');
 for(const term of ['floral','malt','blueberry'])assert.match(notes,new RegExp(term,'i'),'published selected sensory note omitted: '+term+' from '+notes);
 assert.match(String(p.fields?.origin||''),/Ethiopia/i);
 assert.equal(p.fields?.process,'Natural');
 assert.match(String(p.fields?.variety||''),/Heirloom/i);
 assert.ok(!p.fields?.producer,'selected narrative does not name a producer');
});
test('original300 customer reviews and related product cards cannot supply unrelated flavor notes',()=>{
 const aside='<section id="reviews"><h2>Customer Reviews</h2><p>Lychee, passionfruit and papaya are my favorite flavors.</p></section><aside><h2>Other Coffee</h2><p>Notes: peach, rose, jasmine. Producer: Other Farm.</p></aside>';
 const p=parse({aside});assert.equal(p.ok,true);
 assert.equal(p.fields?.name,name);
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/lychee|passionfruit|papaya|peach|rose|jasmine/i);
 assert.doesNotMatch(String(p.fields?.producer||''),/Other Farm/i);
});
test('original300 recycled SEO title does not replace visible selected coffee identity',()=>{
 const p=parse({title:'Other Ethiopian Roast — obsolete search result'});
 assert.equal(p.ok,true);
 assert.equal(p.fields?.name,name);
 assert.doesNotMatch(String(p.fields?.name),/Other Ethiopian Roast/i);
});
test('original300 general region education does not name an individual farmer or assign decaf',()=>{
 const p=parse({description:story+' Ethiopian farms have many smallholders, and coffee varieties vary by microclimate.'});
 assert.equal(p.ok,true);
 assert.ok(!p.fields?.producer);
 assert.ok(!p.fields?.decaffeination_method);
});


test('original300 conditional milk-service finish does not become intrinsic notes',()=>{
 const p=parse({description:'This coffee has Sweet and slightly Floral notes when brewed with milk, creating a malty and Blueberry finish.'});
 assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/blueberry/i);
});
test('original300 sibling and customer review cannot complete omitted selected flavor',()=>{
 const aside='<section id="reviews"><p>Creating a malty and Blueberry finish when served.</p></section><aside><h2>Other Coffee</h2><p>Sweet and slightly Floral notes creating a malty and Blueberry finish.</p></aside>';
 const p=parse({description:'This Black Lion coffee has Sweet and slightly Floral notes, with a pleasant finish.',aside});
 assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/blueberry|malty/i);
});
