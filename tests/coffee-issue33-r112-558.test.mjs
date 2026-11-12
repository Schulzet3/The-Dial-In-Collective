import test from 'node:test';
import assert from 'node:assert/strict';
import {selected112,currentDirect112,selected112FieldsOk} from '../scripts/audit/issue33-r112-558-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const story='<h3>Divine Inspiration at a glance</h3><ul>'+
 '<li>Flavor notes: Chocolate, spiced apple, nutty</li>'+
 '<li>Roast level: Light-Medium</li>'+
 '<li>Origin: Nicaragua, Jinotega region</li>'+
 '<li>Farms: Smallholder farms in the region</li>'+
 '<li>Processing method: Washed</li>'+
 '<li>Current harvest: 2023-24 (Landed Sept 24)</li></ul>';
const page=(body=story,extra='')=>'<html><head><title>'+selected112.name+'</title>'+
 '<meta property="og:type" content="product"><meta property="og:url" content="'+selected112.url+'"></head>'+
 '<body><main><article class="product"><h1>'+selected112.name+'</h1>'+
 '<div class="product__description">'+body+'</div></article>'+extra+'</main></body></html>';
test('558 exact selected unique H1 owns five direct printed specs',()=>{
 const p=currentDirect112(page());assert.equal(p.uniqueH1,true,JSON.stringify(p));
 assert.ok(p.direct.every(x=>x.matched),JSON.stringify(p));
});
test('different or duplicate H1 cannot certify selected identity',()=>{
 assert.equal(currentDirect112(page().replace('<h1>'+selected112.name+'</h1>','<h1>Another coffee</h1>')).uniqueH1,false);
 assert.equal(currentDirect112(page().replace('</h1>','</h1><h1>Another coffee</h1>')).uniqueH1,false);
});
test('unrelated menu, reviews, aside and SEO do not supply selected specs',()=>{
 const noisy=page('Choose your grind.','<nav>'+story+'</nav><aside>'+story+'</aside><h2>Customer Reviews</h2>'+story);
 assert.ok(currentDirect112(noisy).direct.some(x=>!x.matched),JSON.stringify(currentDirect112(noisy)));
});
test('contradictory own direct roast or processing fails literal afterproof',()=>{
 assert.ok(currentDirect112(page(story.replace('Roast level: Light-Medium','Roast level: Dark'))).direct.some(x=>!x.matched));
 assert.ok(currentDirect112(page(story.replace('Processing method: Washed','Processing method: Natural'))).direct.some(x=>!x.matched));
});
test('actual selected parser preserves Nicaraguan own fields',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selected112.url});assert.equal(p.ok,true,JSON.stringify(p));
 assert.ok(selected112FieldsOk(p.fields),JSON.stringify(p.fields));
});
test('historic 2023-24 harvest is not fabricated as fresh 2026',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selected112.url});assert.equal(p.ok,true,JSON.stringify(p));
 assert.doesNotMatch(String(p.fields.release_label||''),/2026/);
});
test('Gold Mountain owns sourcing network, not this selected farm; unrelated roast in controls ignored',()=>{
 const noisy=page(story+'<h3>About Gold Mountain Coffee Growers</h3><p>The sourcing company operates Finca Idealista.</p>',
  '<form><select><option>Ground (Drip/med)</option><option>French Roast</option></select></form>'+
  '<aside><h2>Kula Peaberry</h2><p>Roast color: Dark. Origin: Papua New Guinea.</p></aside>');
 const p=extractPublicCoffeeFacts(noisy,{source_url:selected112.url});assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.roast_level,'Medium-Light',JSON.stringify(p.fields));
 assert.doesNotMatch(String(p.fields.origin||''),/papua new guinea/i);
 assert.doesNotMatch(String(p.fields.producer||''),/finca idealista/i);
});
