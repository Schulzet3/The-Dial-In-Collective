import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const brazil='https://shop.broadporchcoffee.com/products/brazil-medium-roast';
const decaf='https://shop.broadporchcoffee.com/products/decaf';
const brazilName='Brazil - Cerrado';
const decafName='Decaf - Colombian Water Process';
const brazilCopy="A smooth, easy-drinking coffee from Brazil's Cerrado region with classic notes of chocolate and toasted nuts. The natural process brings plenty of sweetness and body to the cup, while a medium roast keeps it balanced and approachable. Tasting Notes: Chocolate · Toasted Nuts · Smooth. Roast Level: Medium Roast. Origin: Cerrado, Brazil. Process: Natural.";
const decafCopy="A smooth and satisfying Colombian decaf with rich notes of dark chocolate and hazelnut. Decaffeinated using the Mountain Water Process, this coffee keeps plenty of sweetness, body and flavor in the cup. Tasting Notes: Dark Chocolate · Hazelnut. Origin: Colombia. Decaf Process: Mountain Water Process.";
function parse({url=brazil,name=brazilName,description=brazilCopy,seo='Stale Unrelated SEO',aside=''}={}){
 const schema={'@context':'https://schema.org','@type':'Product',name,url,brand:{'@type':'Brand',name:'Broad Porch Coffee'}};
 const html='<html><head><title>'+seo+'</title><script type="application/ld+json">'+JSON.stringify(schema)+'</script></head><body><main><article class="product"><h1>'+name+'</h1><div class="product-description"><p>'+description+'</p></div></article></main>'+aside+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('original #301 selected Brazilian product explicitly supports natural Cerrado medium and chocolate/toasted nuts',()=>{
 const p=parse();assert.equal(p.ok,true,JSON.stringify(p).slice(0,1200));
 assert.equal(p.fields?.name,brazilName);
 for(const s of ['chocolate','toasted nuts'])assert.match(String(p.fields?.tasting_notes||''),new RegExp(s,'i'));
 assert.match(String(p.fields?.origin||''),/Brazil/i);
 assert.match(String(p.fields?.process||''),/Natural/i);
 assert.match(String(p.fields?.roast_level||''),/Medium/i);
 assert.ok(!p.fields?.producer && !p.fields?.decaffeination_method,'unpublished facts cannot be inferred');
});
test('original #301 sibling sidebar and stale SEO cannot override selected coffee',()=>{
 const p=parse({seo:'Guatemala Gesha Dark Roast',aside:'<aside><h2>Another Coffee</h2><p>Notes: lychee, papaya. Process: Washed. Producer: Finca La Esperanza. Roast: Dark.</p></aside>'});
 assert.equal(p.ok,true);assert.equal(p.fields?.name,brazilName);
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/lychee|papaya/i);
 assert.notEqual(p.fields?.process,'Washed');assert.notEqual(p.fields?.roast_level,'Dark');
 assert.doesNotMatch(String(p.fields?.producer||''),/Finca La Esperanza/i);
});
test('original #302 actual selected Colombian decaf labels Mountain Water and dark chocolate/hazelnut',()=>{
 const p=parse({url:decaf,name:decafName,description:decafCopy});
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,1200));assert.equal(p.fields?.name,decafName);
 for(const s of ['dark chocolate','hazelnut'])assert.match(String(p.fields?.tasting_notes||''),new RegExp(s,'i'));
 assert.match(String(p.fields?.origin||''),/Colombia/i);
 assert.match(String(p.fields?.decaffeination_method||''),/Water/i,'selected Mountain Water is a water decaffeination method');
 assert.ok(!p.fields?.producer && !p.fields?.elevation_m,'no named producer or elevation');
});
test('original #302 unrelated Swiss Water sibling may not replace exact Mountain Water decaf identity',()=>{
 const aside='<aside><h2>Other Swiss Water Decaf</h2><p>Swiss Water Process. Notes: cherry, peach. Origin: Kenya. Producer: Other Family.</p></aside>';
 const p=parse({url:decaf,name:decafName,description:decafCopy,aside,seo:'Old Swiss Water Decaf'});
 assert.equal(p.ok,true);assert.equal(p.fields?.name,decafName);
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/cherry|peach/i);
 assert.doesNotMatch(String(p.fields?.origin||''),/Kenya/i);
 assert.doesNotMatch(String(p.fields?.producer||''),/Other Family/i);
});
test('original #302 contradictory unrelated image SEO cannot supply nonliteral farm or roast facts',()=>{
 const p=parse({url:decaf,name:decafName,description:decafCopy,aside:'<aside><img alt="Different 2023 Kenya Dark Roast by Named Grower"/></aside>'});
 assert.equal(p.ok,true);assert.equal(p.fields?.name,decafName);
 assert.doesNotMatch(String(p.fields?.producer||''),/Named Grower/i);
 assert.doesNotMatch(String(p.fields?.origin||''),/Kenya/i);
});
