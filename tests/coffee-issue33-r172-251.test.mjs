import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {chosen251,source251} from '../scripts/audit/issue33-r172-251-check.mjs';
const own='<h1>Decaf Espresso Blend</h1><p>This is the decaffeinated version of our best selling espresso and it doesn\'t compromise on flavor. Crafted from a carefully selected blend of high quality decaf beans from Central America, South America, and Indonesia.</p>'+
'<p>Expect a velvety, full-bodied profile with a smooth finish and well-balanced character. The combination of origins brings out deep, rounded flavors with subtle notes of cocoa, toasted nuts, and a touch of earthiness.</p>'+
'<p>This blend can be used as a drip coffee if you like a dark roasted coffee. Decaffeinated.</p>';
const page=(body=own,other='')=>'<html><head><title>Older Kenya Medium Coffee</title><meta name="description" content="Old Peru Natural strawberry"></head><body><nav>New Dark Roast Coffee</nav><main><article class="product">'+body+'</article></main>'+other+'<footer>Related Dark Espresso Chocolate</footer></body></html>';
const parse=(body=own,other='')=>extractPublicCoffeeFacts(page(body,other),{source_url:chosen251.url});
test('#251 exact selected H1 and own cocoa/tasted nuts/earthiness',()=>{
 const p=source251(page());assert.equal(p.identity,true);assert.equal(p.direct_notes,true);assert.equal(p.conditional_dark_context,true);assert.equal(p.blend_origins,true);
});
test('#251 selected name preserved over historical SEO and menu',()=>{
 const r=parse();assert.equal(r.ok,true,JSON.stringify(r).slice(0,1900));assert.equal(r.fields?.name,'Decaf Espresso Blend');
});
test('#251 conditional drip recommendation does NOT establish canonical Dark roast',()=>{
 const r=parse();assert.ok(!r.fields?.roast_level,JSON.stringify(r).slice(0,1900));
});
test('#251 own selected direct cocoa/toasted nuts/earthiness not related products',()=>{
 const r=parse();const n=String(r.fields?.tasting_notes||'').toLowerCase();
 assert.ok(/cocoa/.test(n)&&/toasted nuts/.test(n)&&/earthiness/.test(n),JSON.stringify(r).slice(0,2200));
});
test('#251 selected blend origins never borrow unrelated SEO Peru or navigation',()=>{
 const r=parse();const o=String(r.fields?.origin||'').toLowerCase();
 assert.ok(o.includes('central america')&&o.includes('south america')&&o.includes('indonesia'),JSON.stringify(r).slice(0,2300));
 assert.ok(!o.includes('peru'),JSON.stringify(r).slice(0,1300));
});
test('#251 decaffeinated selected coffee does not invent chemical/water method or green process',()=>{
 const r=parse();assert.ok(!r.fields?.decaffeination_method&&!r.fields?.process,JSON.stringify(r).slice(0,1900));
});
test('#251 a genuine own labeled roast is NOT suppressed by conditional context',()=>{
 const r=parse(own+'<p>Roast Level: Dark</p>');
 assert.equal(r.fields?.roast_level,'Dark',JSON.stringify(r).slice(0,1900));
});
test('#251 unrelated related-product Dark roast cannot fill selected roast',()=>{
 const r=parse(own,'<aside><h2>Related coffee</h2><p>Espresso Milano Roast Level: Dark and washed Kenya coffee</p></aside>');
 assert.ok(!r.fields?.roast_level,JSON.stringify(r).slice(0,1900));
});
test('#251 changing selected product heading does not verify former selected identity',()=>{
 assert.equal(source251(page(own.replace('<h1>Decaf Espresso Blend</h1>','<h1>Colombia Geisha Natural</h1>'))).identity,false);
});
test('#251 drip preference is not espresso recipe evidence',()=>{
 const r=parse();assert.ok(!r.fields?.espresso_recipe,JSON.stringify(r).slice(0,1900));
});
