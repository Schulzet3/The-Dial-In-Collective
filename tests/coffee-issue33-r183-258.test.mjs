import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {chosen258,source258} from '../scripts/audit/issue33-r183-258-check.mjs';
const own='<h1>Kibaya</h1>'+
 '<p>Kibaya comes from smallholder farmers near Kigali, Rwanda, and is processed at the Rwamatamu washing station. Grown at 1,600-2,000 MASL and composed entirely of Red Bourbon, this lot reflects the clarity of Rwandan coffees.</p>'+
 '<p>Kibaya opens with jammy blackberry and plum, followed by golden raisin sweetness and soft vanilla. Hints of allspice add warmth and structure.</p>'+
 '<p>Flavor Profile: Golden Raisin, Vanilla, Blackberry Jam</p>'+
 '<p>Origin: KIGALI, RWANDA</p><p>Process: Washed</p><p>Cultivar: Red Bourbon</p><p>Elevation: 1600-2000 MASL</p><p>Roast Level: Light Medium Dark</p>';
const page=(product=own,related='')=>'<html><head><title>OLD Colombia Decaf</title><meta name="description" content="Prior Peru Espresso Natural"></head><body><nav>Other Peru coffee</nav><main><article class="product">'+product+'</article></main>'+related+'<footer>Related Colombia, Dark Roast</footer></body></html>';
const parse=(product=own,related='')=>extractPublicCoffeeFacts(page(product,related),{source_url:chosen258.url});
test('#258 selected H1 must be exactly Kibaya',()=>{const s=source258(page());assert.equal(s.identity,true);assert.deepEqual(s.headings,[chosen258.name])});
test('#258 selected seller identifies Kigali smallholders and separate washing station',()=>{const s=source258(page());assert.equal(s.smallholders,true);assert.equal(s.station,true)});
test('#258 direct selected cultivar/elevation/process and flavor list are present',()=>{const s=source258(page());assert.equal(s.altitude,true);assert.equal(s.cultivar,true);assert.equal(s.labeled_notes,true)});
test('#258 actual seller narrative contains additional plum and allspice',()=>{const s=source258(page());assert.equal(s.narrative_plum,true);assert.equal(s.narrative_allspice,true)});
test('#258 actual parser uses selected coffee not hostile SEO title',()=>{const p=parse();assert.equal(p.ok,true,JSON.stringify(p).slice(0,2000));assert.equal(p.fields?.name,'Kibaya');assert.ok(!/colombia|peru/i.test(String(p.fields?.origin||'')))});
test('#258 three source-labeled flavor notes stay selected and not prior-lot',()=>{const p=parse();assert.ok(['golden raisin','vanilla','blackberry'].every(x=>String(p.fields?.tasting_notes||'').toLowerCase().includes(x)),JSON.stringify(p).slice(0,2500));assert.ok(!/espresso|cherry/i.test(String(p.fields?.tasting_notes||'')))});
test('#258 H1 reuse for another coffee fails selected identity',()=>{assert.equal(source258(page(own.replace('<h1>Kibaya</h1>','<h1>Mutu Batak</h1>'))).identity,false)});
test('#258 a related seller coffee cannot supply missing allspice',()=>{const s=source258(page(own.replace('Hints of allspice','Hints of citrus'),'<aside>Related product Hints of allspice</aside>'));assert.equal(s.narrative_allspice,false)});
test('#258 a related seller coffee cannot supply missing plum',()=>{const s=source258(page(own.replace('blackberry and plum','blackberry and apricot'),'<aside>Related product blackberry and plum</aside>'));assert.equal(s.narrative_plum,false)});
test('#258 no unsupported decaf mechanism or espresso recipe',()=>{const p=parse();assert.ok(!p.fields?.decaffeination_method&&!p.fields?.espresso_recipe,JSON.stringify(p).slice(0,2200))});
test('#258 Rwamatamu is a processing station, never the named farmer',()=>{const p=parse();assert.ok(!/rwamatamu/i.test(String(p.fields?.producer||'')),JSON.stringify(p).slice(0,2500))});
