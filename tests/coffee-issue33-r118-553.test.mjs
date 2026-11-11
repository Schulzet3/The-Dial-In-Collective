import test from 'node:test';
import assert from 'node:assert/strict';
import {selected118,direct118,fields118Ok} from '../scripts/audit/issue33-r118-553-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const story='A sweet medium roast with a hint of honey, caramel, and chocolate. Sourced from the high-altitude farms of Honduras, this organic single-origin bean is exceptionally smooth and well-rounded, offering a comforting, classic cup that is perfect any time of day.';
const other='Organic Timor - Medium roast, pineapple, fresh orange juice and raw sugar. Organic Mexican - molasses, caramel, lemongrass.';
const page=(s=story,extra='',h=selected118.name)=>'<html><head><title>'+selected118.name+'</title><meta property="og:type" content="product"><meta property="og:url" content="'+selected118.url+'"></head><body><main><article class="product"><h1>'+h+'</h1><section class="product__description"><p>'+s+'</p></section></article>'+extra+'</main></body></html>';
test('553 selected Organic Honduras direct current source facts',()=>{
 const x=direct118(page());assert.equal(x.uniqueH1,true,JSON.stringify(x));
 assert.ok(x.direct.every(y=>y.matched),JSON.stringify(x));
});
test('553 changed or duplicated selected heading is never source identity',()=>{
 for(const h of ['Organic Timor','Organic Mexican','Honduras Other Lot'])assert.equal(direct118(page(story,'',h)).uniqueH1,false);
 assert.equal(direct118(page().replace('</h1>','</h1><h1>Different coffee</h1>')).uniqueH1,false);
});
test('553 unrelated menu, reviews and aside never replace missing selected facts',()=>{
 const x=direct118(page('Packaging only','<aside>'+story+'</aside><nav>'+story+'</nav><footer>'+story+'</footer>'));
 assert.ok(x.direct.some(v=>!v.matched),JSON.stringify(x));
});
test('553 modified own tasting description fails direct selected proof',()=>{
 const x=direct118(page(story.replace('honey, caramel, and chocolate','pineapple, orange juice, and sugar')));
 assert.ok(x.direct.some(v=>!v.matched),JSON.stringify(x));
});
test('553 actual backend parser keeps own Medium, Honduras, notes and no invented grower/process',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:selected118.url});
 assert.equal(r.ok,true,JSON.stringify(r));assert.ok(fields118Ok(r.fields),JSON.stringify(r.fields));
});
test('553 actual selected fields ignore unrelated sibling coffee text',()=>{
 const r=extractPublicCoffeeFacts(page(story,'<aside><h2>Other coffee</h2>'+other+'</aside>'),{source_url:selected118.url});
 assert.equal(r.ok,true,JSON.stringify(r));assert.ok(fields118Ok(r.fields),JSON.stringify(r.fields));
 assert.ok(!/pineapple|lemongrass|orange juice|raw sugar/i.test(String(r.fields.tasting_notes||'')));
});
test('553 no selected primary product is not promoted from metadata',()=>{
 const onlyMeta=page('Packaging only').replace('<h1>Organic Honduras</h1>','<h1>Different Coffee</h1>');
 assert.equal(direct118(onlyMeta).uniqueH1,false);
});
