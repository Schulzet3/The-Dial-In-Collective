import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {chosen252,source252} from '../scripts/audit/issue33-r176-252-check.mjs';
const selected='<h1>Windsor Court Blend</h1><p>Crafted from a few exceptional coffees sourced from Latin America, East Africa and Colombia. Each origin is roasted in micro-batches and expertly blended in precise proportions, with just a touch of dark roast to deepen the flavor profile.</p>'+
 '<p>The result is a silky-smooth cup with a touch of lively acidity, offering balance, elegance, and refined complexity.</p><p>Notes: Floral aroma, full-bodied. Wonderful balanced cup.</p>';
const page=(own=selected,other='')=>'<html><head><title>Old Peru Dark Roast</title><meta name="description" content="Old coffee dark chocolate and strawberry"></head><body><nav>Medium Ethiopia Espresso</nav><main><article class="product">'+own+'</article></main>'+other+'<footer>Related Dark Espresso</footer></body></html>';
const parse=(own=selected,other='')=>extractPublicCoffeeFacts(page(own,other),{source_url:chosen252.url});
test('#252 chosen exact H1 and selected direct source component/notes',()=>{
 const s=source252(page());assert.equal(s.identity,true);assert.equal(s.three_blend_regions,true);assert.equal(s.floral,true);assert.equal(s.component_dark,true);
});
test('#252 exact selected name outranks stale title/SEO/navigation',()=>{
 const r=parse();assert.equal(r.ok,true,JSON.stringify(r).slice(0,1400));assert.equal(r.fields?.name,'Windsor Court Blend');
});
test('#252 a touch of dark roast in blend is NOT selected Dark roast',()=>{
 const r=parse();assert.ok(!r.fields?.roast_level,JSON.stringify(r).slice(0,2200));
});
test('#252 own floral is preserved without borrowing unrelated SEO notes',()=>{
 const r=parse();const n=String(r.fields?.tasting_notes||'').toLowerCase();
 assert.ok(n.includes('floral'),JSON.stringify(r).slice(0,2000));
 assert.ok(!n.includes('strawberry')&&!n.includes('dark chocolate'),JSON.stringify(r).slice(0,2000));
});
test('#252 published blend component geographies do not borrow Peru SEO',()=>{
 const r=parse();const origin=String(r.fields?.origin||'').toLowerCase();
 for(const x of ['latin america','east africa','colombia'])assert.ok(origin.includes(x),JSON.stringify(r).slice(0,2200));
 assert.ok(!origin.includes('peru'),JSON.stringify(r).slice(0,1800));
});
test('#252 genuine explicit roast specification remains eligible',()=>{
 const r=parse(selected+'<p>Roast Level: Dark</p>');
 assert.equal(r.fields?.roast_level,'Dark',JSON.stringify(r).slice(0,2000));
});
test('#252 unrelated selected-like related coffee cannot supply roast',()=>{
 const r=parse(selected,'<aside><h2>Other coffee</h2><p>Dark Roast Level: Dark, Natural, Kenya. Dark chocolate and berries.</p></aside>');
 assert.ok(!r.fields?.roast_level,JSON.stringify(r).slice(0,1800));
});
test('#252 changed selected H1 is not falsely certified',()=>{
 assert.equal(source252(page(selected.replace('<h1>Windsor Court Blend</h1>','<h1>Peru Natural</h1>'))).identity,false);
});
test('#252 no invented process, producer, decaf method or espresso recipe',()=>{
 const r=parse();assert.ok(!r.fields?.process&&!r.fields?.producer&&!r.fields?.decaffeination_method&&!r.fields?.espresso_recipe,JSON.stringify(r).slice(0,2400));
});
