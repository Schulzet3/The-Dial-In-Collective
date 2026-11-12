import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen185,selected185Source} from '../scripts/audit/issue33-r157-185-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own='<p>Medium roast</p><p>Cupping Notes: Caramel, Chocolate, and Vanilla</p>'+
 '<p>Our naturally decaffeinated coffee undergoes a unique decaffeination process utilizing sugar cane and water.</p>'+
 '<p>Origin: Popayan, Cauca</p>'+
 '<p>Varietal: Castillo, Catimor Typica, and Caturra</p>'+
 '<p>Process: Washed</p><p>Altitude: 1,500 - 2,070 MASL</p>'+
 '<p>Farmers: Smallholders in rural areas of Popayan, Cauca</p>';
const page=(body=own,name=chosen185.name,extra='',seo='Old natural processed coffee')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head><body>'+
 '<nav>Coffee listing Natural Ethiopia Honey</nav><main><article class="product"><h1>'+name+'</h1>'+
 '<div class="product__description">'+body+'</div></article></main>'+extra+
 '<footer>Related coffee Natural Process Dark roast</footer></body></html>';
test('#185 exact selected source direct notes, washing and cane decaffeination',()=>{
 const p=selected185Source(page());
 assert.equal(p.exactSelectedTitle,true);
 assert.ok(Object.values(p.direct).every(x=>Array.isArray(x)?x.every(Boolean):x),JSON.stringify(p));
});
test('#185 selected facts survive HTML ampersand punctuation',()=>{
 const p=selected185Source(page(own.replace('Caramel, Chocolate, and Vanilla','Caramel, Chocolate &amp; Vanilla')));
 assert.equal(p.direct.flavors.every(Boolean),true);
});
test('#185 natural decaffeination title does not become green natural process',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen185.url});
 assert.ok(p.ok!==true||p.fields.process!=='Natural',JSON.stringify(p));
});
test('#185 explicitly washed green process is not inferred from natural decaf marketing',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen185.url});
 assert.ok(p.ok!==true||!p.fields.process||p.fields.process==='Washed',JSON.stringify(p));
});
test('#185 missing cupping notes cannot be borrowed from navigation/footer',()=>{
 const no=own.replace('Cupping Notes: Caramel, Chocolate, and Vanilla','Cupping Notes unpublished');
 const p=selected185Source(page(no,chosen185.name,'<nav>'+own+'</nav><footer>'+own+'</footer>'));
 assert.equal(p.direct.selected_tastes,false);
});
test('#185 missing decaffeination method cannot be borrowed from SEO',()=>{
 const p=selected185Source(page(own.replace('utilizing sugar cane and water','using an unpublished method'),
 chosen185.name,'','Natural Decaf sugar cane and water'));
 assert.equal(p.direct.sugarcane_decaﬀ,false);
});
test('#185 selected wrong coffee cannot claim original H1 from SEO',()=>{
 const p=selected185Source(page(own,'Exotic Mule','',chosen185.name));
 assert.equal(p.exactSelectedTitle,false);
});
test('#185 unrelated selected product cannot inherit current details from recommendations',()=>{
 const p=selected185Source(page('<p>Method unavailable</p>',chosen185.name,
 '<section class="related-products"><h1>Other Decaf</h1>'+own+'</section>'));
 assert.equal(p.direct.washed_green,false);assert.equal(p.direct.selected_tastes,false);
});
test('#185 source-bound green process must not come from product footer',()=>{
 const p=selected185Source(page(own.replace('Process: Washed','Process not published'),
 chosen185.name,'<footer>Process: Washed</footer>'));
 assert.equal(p.direct.washed_green,false);
});
test('#185 selected origin must not be borrowed from a sibling card',()=>{
 const p=selected185Source(page(own.replaceAll('Popayan, Cauca','other region'),
 chosen185.name,'<section class="related-products">'+own+'</section>'));
 assert.equal(p.direct.origin,false);assert.equal(p.direct.growers,false);
});
test('#185 explicit missing roast must not be replaced by meta old coffee',()=>{
 const p=selected185Source(page(own.replace('Medium roast','Roast unpublished'),
 chosen185.name,'','Medium roast 2025 old product'));
 assert.equal(p.direct.roast,false);
});
test('#185 other lot or variant is not the selected original identity',()=>{
 for(const wrong of ['Humble Mule Decaf Old Lot 2024','Exotic Mule, Natural Decaf','Humble Mule, Natural Process'])
  assert.equal(selected185Source(page(own,wrong)).exactSelectedTitle,false);
});
