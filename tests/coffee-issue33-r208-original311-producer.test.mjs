import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {selectedCoffeeContextRoles} from '../src/server/coffee-selected-context-roles.mjs';
const name='Volcán Atitlán Guatemala',url='https://shop.iconikcoffee.com/products/washed-guatemala-finca-san-jeronimo';
const family='Bressani Family, San Jerónimo Guatemala';
const ownStory="Finca San Jerónimo Miramar sits on a volcano in Atitlán. In 2015, Iconik made contact with Giorgio, a third-generation coffee producer, who showed us the ropes on his family farm.";
const coffee=(label=family,story=ownStory,extra='')=>{
 const ld={'@context':'https://schema.org','@type':'Product',name,url,brand:{'@type':'Brand',name:'ICONIK'}};
 return '<!doctype html><html><head><title>FORMER UNRELATED KENYA DECAF</title><script type="application/ld+json">'+JSON.stringify(ld)+'</script></head><body><main><article class="product"><h1>'+name+'</h1><h2>'+name+'</h2><section class="product-description"><p>Black cherry, walnut, nougat</p><p>'+label+'</p><p>'+story+'</p></section></article></main>'+extra+'</body></html>';
};
const clean=value=>String(value).replace(/<[^<>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
test('red-first current #311 direct selected named growing family + producing family farm is not dropped',()=>{
 const p=extractPublicCoffeeFacts(coffee(),{source_url:url});
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,550));
 assert.equal(p.fields?.name,name);
 assert.equal(p.fields?.producer,'Bressani Family','Seller publishes direct current selected named producing family, not SEO');
 assert.match(String(p.fields?.origin||''),/Guatemala/i);
 assert.ok(!p.fields?.decaffeination_method && !p.fields?.espresso_recipe);
});
test('direct named family role helper is generic, not ICONIK/handle-specific',()=>{
 const other='Valley Harvest',person='Garcia Family, Huila Colombia';
 const doc='<main><article class="product"><h1>'+other+'</h1><h2>'+other+'</h2><p>'+person+'</p><p>After meeting the family coffee producer, we visited the family farm during harvest.</p></article></main>';
 const p=selectedCoffeeContextRoles(doc,{name:other,clean});
 assert.equal(p.producer,'Garcia Family');
});
test('unsubstantiated named family label alone is reviewable, not autofilled',()=>{
 const p=extractPublicCoffeeFacts(coffee(family,'A clean, sweet coffee from Guatemala.'),{source_url:url});
 assert.ok(!p.fields?.producer);
});
test('formerly sourcing the named family cannot promote current selected producer',()=>{
 const p=extractPublicCoffeeFacts(coffee(family,'We formerly worked with this family farm on a previous harvest. Our current source is not named.'),{source_url:url});
 assert.ok(!p.fields?.producer);
});
test('related product’s farmer, origin and tasting cannot leak into same selected coffee',()=>{
 const p=extractPublicCoffeeFacts(coffee('San Jerónimo, Guatemala',ownStory,
 '<aside class="related-products"><h2>Different Coffee</h2><p>Other Family, Nyeri Kenya. The coffee producer lives on another family farm. Natural, blueberry, kiwi, Swiss Water Decaf. Espresso 18g in and 36g out.</p></aside>'),{source_url:url});
 assert.ok(!p.fields?.producer || !/Other Family/i.test(p.fields.producer));
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/blueberry|kiwi/i);
 assert.ok(!p.fields?.decaffeination_method && !p.fields?.espresso_recipe);
});

test('two incompatible directly selected families cannot be silently chosen',()=>{
 const p=extractPublicCoffeeFacts(coffee(family+' </p><p>Torres Family, Huila Colombia',ownStory),{source_url:url});
 assert.ok(!p.fields?.producer,'Two direct named family identities conflict; leave producer reviewable');
});
test('generic family-sounding words in unrelated current-page sections cannot claim selected producer',()=>{
 const p=extractPublicCoffeeFacts(coffee('San Jerónimo, Guatemala',ownStory,'<section class="related-products"><h2>Family Growers</h2><p>Garcia Family, Huila Colombia</p><p>Family coffee producer on his family farm.</p></section>'),{source_url:url});
 assert.ok(!p.fields?.producer);
});
