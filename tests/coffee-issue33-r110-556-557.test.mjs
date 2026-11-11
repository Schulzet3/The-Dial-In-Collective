import test from 'node:test';
import assert from 'node:assert/strict';
import {selected110,currentDirect110,selected110FieldsOk} from '../scripts/audit/issue33-r110-556-557-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const brazil='About Seibt Family Farm\'s Coffee. Roast level: Medium-Dark. Origin: Seibt Family Farm, Cerrado Mineiro Region, Brazil. Elevation: 900 masl / 3000 ft. Caroline Seibt grew up a second-generation farmer in Minas Gerais, southeastern Brazil.';
const png='Kula Peaberry at a glance. Tasting notes: Sweet aroma, chocolate & raisin/dried fruit notes, earthy, med-heavy body, syrupy mouthfeel. Roast color: Light-Medium. Country: Papua New Guinea. Region: Waghi Valley. Farm: Sigri Estate. Tree variety: Predominantly Typica. Elevation: 1,500-1,600 masl (5,000-5,200 ft).';
const page=(n,story,noise='')=>'<html><head><title>'+selected110[n].name+'</title><meta property="og:type" content="product"><meta property="og:url" content="'+selected110[n].url+'"></head><body><main><article class="product"><h1>'+selected110[n].name+'</h1><div class="product__description"><p>'+story+'</p></div></article>'+noise+'</main></body></html>';
test('556 selected Brazil direct own specs have one exact H1',()=>{
 const x=currentDirect110(page(556,brazil),556);assert.equal(x.uniqueH1,true);assert.ok(x.direct.every(y=>y.matched),JSON.stringify(x));
});
test('557 selected Kula exact own region, lot, variety and flavor specs',()=>{
 const x=currentDirect110(page(557,png),557);assert.equal(x.uniqueH1,true);assert.ok(x.direct.every(y=>y.matched),JSON.stringify(x));
});
test('changed or duplicate H1 invalidates selected coffee',()=>{
 for(const n of [556,557]){const h=page(n,n===556?brazil:png);
  assert.equal(currentDirect110(h.replace('<h1>'+selected110[n].name+'</h1>','<h1>Other coffee</h1>'),n).uniqueH1,false);
  assert.equal(currentDirect110(h.replace('</h1>','</h1><h1>Other coffee</h1>'),n).uniqueH1,false);}
});
test('specs confined to nav, metadata, aside or reviews do not prove selection',()=>{
 for(const n of [556,557]){
  const story=n===556?brazil:png;const h=page(n,'Please select a bag.', '<aside>'+story+'</aside><nav>'+story+'</nav><h2>Customer Reviews</h2>'+story);
  assert.ok(currentDirect110(h,n).direct.some(x=>!x.matched),JSON.stringify(currentDirect110(h,n)));
 }
});
test('changed selected source spec fails the strict literal proof',()=>{
 assert.ok(currentDirect110(page(556,brazil.replace('900 masl','1200 masl')),556).direct.some(x=>!x.matched));
 assert.ok(currentDirect110(page(557,png.replace('Predominantly Typica','Bourbon')),557).direct.some(x=>!x.matched));
});
test('556 actual parser preserves own Brazil, 900m and medium-dark, no review tasting notes',()=>{
 const p=extractPublicCoffeeFacts(page(556,brazil),{source_url:selected110[556].url});
 assert.equal(p.ok,true,JSON.stringify(p));assert.ok(selected110FieldsOk(556,p.fields),JSON.stringify(p.fields));
});
test('557 actual parser preserves own Kula country, region, roast, variety, notes',()=>{
 const p=extractPublicCoffeeFacts(page(557,png),{source_url:selected110[557].url});
 assert.equal(p.ok,true,JSON.stringify(p));assert.ok(selected110FieldsOk(557,p.fields),JSON.stringify(p.fields));
});
test('556 no sibling Kula sensory copied into own canonical product',()=>{
 const p=extractPublicCoffeeFacts(page(556,brazil,'<aside><h2>Kula Peaberry</h2>'+png+'</aside>'),{source_url:selected110[556].url});
 assert.equal(p.ok,true,JSON.stringify(p));assert.ok(!/chocolate|raisin|earthy/i.test(String(p.fields.tasting_notes||'')),JSON.stringify(p.fields));
});
test('557 grind dropdown medium is not medium roast and unrelated reviews not origin',()=>{
 const h=page(557,png,'<form><select><option>Ground (Medium/Drip)</option></select></form><aside><h2>Reviews</h2> Brazil French roast</aside>');
 const p=extractPublicCoffeeFacts(h,{source_url:selected110[557].url});assert.equal(p.ok,true,JSON.stringify(p));
 assert.ok(/medium.light/i.test(String(p.fields.roast_level||'')),JSON.stringify(p.fields));
 assert.ok(!/brazil|french/i.test(String(p.fields.origin||'')),JSON.stringify(p.fields));
});
