import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://quillscoffee.com/products/guatemala-quetzal';
const story=`The Quetzal (the national bird of Guatemala) Program was born after the creation of Regional Select - Waykan, allowing us to buy more coffee and pay producers more. High-grown, hard-bean coffees from Guatemala are a staple for many coffee roasters: the crisp acidity, full body, and toffee sweetness found in these coffees make them valuable as approachable single-origin brews or blend components.`;
function selected(extra='',storyText=story){
 const product={ '@context':'https://schema.org','@type':'Product',name:'Guatemala | Quetzal',url,brand:{'@type':'Brand',name:'Quills Coffee'} };
 return '<!doctype html><html><head><meta property="og:type" content="product"><meta property="og:title" content="Guatemala | Quetzal"><meta property="og:site_name" content="Quills Coffee"><script type="application/ld+json">'+JSON.stringify(product)+'</script></head><body><main><article class="product"><h1>Guatemala | Quetzal</h1><div class="product-description"><p>'+storyText+'</p><p>We\'re tasting molasses, pecan, &amp; red grape</p><p>Country: Guatemala</p><p>Region: Huehuetenango</p><p>Harvest: December - May</p><p>Variety: Bourbon, Catimor, Caturra, Maragogype, Pache</p><p>Process: Washed</p><p>Elevation: 1,400 - 2,200 Meters Above Sea Level (MASL)</p></div></article></main>'+extra+'</body></html>';
}
const parse=(extra='',s=story)=>extractPublicCoffeeFacts(selected(extra,s),{source_url:url});
test('#273 selected literal sensory panel outranks Guatemalan generic toffee narrative',()=>{
 const p=parse(); assert.equal(p.ok,true,JSON.stringify(p).slice(0,1500));
 assert.equal(p.fields?.name,'Guatemala | Quetzal');
 for(const n of ['molasses','pecan','red grape']) assert.match(String(p.fields?.tasting_notes||'').toLowerCase(),new RegExp(n));
 assert.doesNotMatch(String(p.fields?.tasting_notes||'').toLowerCase(),/toffee/);
});
test('#273 general Quetzal buying program does not identify a lot-specific producer or dated release',()=>{
 const p=parse(); assert.equal(p.ok,true,JSON.stringify(p).slice(0,1500));
 assert.ok(!p.fields?.producer,JSON.stringify(p).slice(0,2000));
 assert.ok(!p.fields?.release_label,JSON.stringify(p).slice(0,2000));
 assert.ok(!p.fields?.roast_level&&!p.fields?.decaffeination_method);
});
test('#273 selected origin process and five varieties stay independently grounded',()=>{
 const p=parse(); assert.equal(p.ok,true,JSON.stringify(p).slice(0,1500));
 assert.match(String(p.fields?.origin||''),/Guatemala/i);
 assert.match(String(p.fields?.process||''),/Washed/i);
 const varieties=String(p.fields?.variety||'').toLowerCase();
 for(const n of ['bourbon','catimor','caturra','maragogype','pache'])assert.match(varieties,new RegExp(n));
});
test('#273 unrelated sibling and promotional SEO cannot replace chosen sensory profile',()=>{
 const aside='<aside><h2>Colombia | Natural Guamo</h2><p>Producer: Reforest Project</p><p>We are tasting papaya, guava, hibiscus</p><p>Dark roast</p></aside>';
 const p=parse(aside); assert.equal(p.ok,true,JSON.stringify(p).slice(0,1500));
 assert.equal(p.fields?.name,'Guatemala | Quetzal');
 assert.doesNotMatch(String(p.fields?.tasting_notes||'').toLowerCase(),/papaya|guava|hibiscus/);
 assert.ok(!p.fields?.producer,JSON.stringify(p).slice(0,1500));
});
