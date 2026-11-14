import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {sameHandleCollectionAlternate,identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';

const original='https://ridleyroasthouse.com/products/pura-vida';
const alternate='https://ridleyroasthouse.com/collections/coffee/products/pura-vida';
const detail='<p>Origin: Costa Rica</p><p>Region: Tarrazú</p><p>Process: Washed</p><p>Varietal: Caturra</p><p>Certification: Fairtrade Organic</p><p>Tasting notes: Smooth peanut butter and hickory with a full body and dry finish</p><p>This farmer grew up in a family of coffee producers. She produces coffee on her estate Santa Elena in Tarrazú. The cherries are washed and dried at Finca Santa Elena.</p><p>This coffee makes an outstanding espresso for deeper earth tones and thick crema.</p>';
function parse(body=detail,other='',url=original){
 const ld={'@context':'https://schema.org','@type':'Product',name:'Pura Vida',url:original,brand:{'@type':'Brand',name:'Ridley Roasthouse'}};
 const html='<!doctype html><html><head><script type="application/ld+json">'+JSON.stringify(ld)+'</script></head><body><header><nav><a href="/products/bold-betty">Other coffees</a></nav></header><main><article class="product"><h1>Pura Vida</h1><div class="product-description">'+body+'</div><button>Add to Cart</button></article></main>'+other+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('#280 directly selected source must keep its chosen coffee name and primary sensory evidence',()=>{
 const p=parse();assert.equal(p.ok,true,JSON.stringify(p).slice(0,800));
 assert.equal(p.fields?.name,'Pura Vida');
 const notes=String(p.fields?.tasting_notes||'').toLowerCase();
 assert.match(notes,/peanut butter/);
 assert.match(notes,/hickory/);
});
test('#280 selected region, washed process and Caturra are selected coffee facts',()=>{
 const p=parse();assert.equal(p.ok,true);
 assert.match(String(p.fields?.origin||''),/costa rica/i);
 assert.equal(p.fields?.process,'Washed');
 assert.match(String(p.fields?.variety||''),/caturra/i);
});
test('#280 farm narrative cannot invent the unnamed female grower as a personal name',()=>{
 const p=parse();assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields?.producer||''),/^(?:this farmer|she|costa rica|tarrazú)$/i);
 assert.ok(!p.fields?.roast_level&&!p.fields?.decaffeination_method&&!p.fields?.espresso_recipe);
});
test('#280 sibling coffee cannot overwrite the selected name, roast or flavor',()=>{
 const p=parse(detail,'<aside><h2>Bold Betty</h2><p>Roast: Dark</p><p>Flavor: Apricot, honey, pear</p></aside>');
 assert.equal(p.ok,true);
 assert.equal(p.fields?.name,'Pura Vida');
 assert.ok(!p.fields?.roast_level,JSON.stringify(p.fields));
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/apricot|pear/i);
});
test('#280 same-handle official alternate is only a fallback on the same host and handle',()=>{
 assert.equal(sameHandleCollectionAlternate(original,alternate),alternate);
 for(const invalid of ['https://evil.test/collections/coffee/products/pura-vida',
  'https://ridleyroasthouse.com/collections/coffee/products/bold-betty',
  'https://ridleyroasthouse.com/collections/coffee/products/pura-vida?variant=1',
  'http://ridleyroasthouse.com/collections/coffee/products/pura-vida'])
   assert.equal(sameHandleCollectionAlternate(original,invalid),null,invalid);
 assert.equal(identicalCurrentSelectedTitle('Pura Vida','Pura Vida','Pura Vida'),true);
 assert.equal(identicalCurrentSelectedTitle('Pura Vida','Bold Betty','Pura Vida'),false);
});
