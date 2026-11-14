import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const original='https://ridleyroasthouse.com/products/ridley-roasthouse-easy-rider-organic-decaf';
const detail='<p>ORIGIN: Honduras</p><p>ROAST: Dark</p><p>FLAVOR: Cane sugar sweetness with medium acidity and creamy body brings to mind cocoa with a citrus finish.</p><p>We sampled decaf beans for a year before we discovered this standout bean. It is decaffeinated using the Swiss Water Process which is a patented, eco-friendly, chemical-free process that removes 99.9% of the caffeine from green coffee. It is also fair trade and organic.</p>';
function parse(body=detail,other='',name='Easy Rider SWP Decaf'){
 const ld={'@context':'https://schema.org','@type':'Product',name,url:original,brand:{'@type':'Brand',name:'Ridley Roasthouse'}};
 const html='<!doctype html><html><head><script type="application/ld+json">'+JSON.stringify(ld)+'</script></head><body><header><nav>Shop coffees</nav></header><main><article class="product"><h1>'+name+'</h1><div class="product-description">'+body+'</div><button>Add to Cart</button></article></main>'+other+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:original});
}
test('#281 preserves selected decaf coffee identity and directly labeled origin/roast',()=>{
 const p=parse();assert.equal(p.ok,true,JSON.stringify(p).slice(0,900));
 assert.equal(p.fields?.name,'Easy Rider SWP Decaf');
 assert.match(String(p.fields?.origin||''),/honduras/i);
 assert.equal(p.fields?.roast_level,'Dark');
});
test('#281 current selected description contains cane sugar, cocoa and citrus',()=>{
 const p=parse();assert.equal(p.ok,true);
 for(const x of ['cane sugar','cocoa','citrus'])
  assert.match(String(p.fields?.tasting_notes||'').toLowerCase(),new RegExp(x));
});
test('#281 direct Swiss Water is decaffeination, not a green bean process',()=>{
 const p=parse();assert.equal(p.ok,true,JSON.stringify(p).slice(0,850));
 assert.equal(p.fields?.decaffeination_method,'Water Process');
 assert.ok(!p.fields?.process,'do not infer washed green coffee from decaf method');
});
test('#281 selected page does not invent a farm, grower, harvest or espresso dose',()=>{
 const p=parse();assert.equal(p.ok,true);
 assert.ok(!p.fields?.producer&&!p.fields?.espresso_recipe&&!p.fields?.release_label);
});
test('#281 adjacent Pura Vida content cannot contaminate selected roast, origin or tasting',()=>{
 const other='<aside><h2>Pura Vida</h2><p>ORIGIN: Costa Rica</p><p>ROAST: Light</p><p>FLAVOR: Peanut Butter, Hickory, Tropical Fruit</p></aside>';
 const p=parse(detail,other);
 assert.equal(p.ok,true);assert.match(String(p.fields?.origin||''),/honduras/i);
 assert.equal(p.fields?.roast_level,'Dark');
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/peanut butter|hickory|tropical fruit/i);
});
test('#281 Swiss Water mention in an unrelated card cannot establish selected decaf method',()=>{
 const without=detail.replace(/It is decaffeinated using the Swiss Water Process[^<]+/,'This is a classic dark-roasted Honduras coffee.');
 const other='<aside><h2>Other coffee</h2><p>Decaffeinated using the Swiss Water Process</p></aside>';
 const p=parse(without,other);
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,700));
 assert.ok(!p.fields?.decaffeination_method,'sibling must not supply decaf method');
});
