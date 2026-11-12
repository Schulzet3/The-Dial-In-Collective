import test from 'node:test';
import assert from 'node:assert/strict';
import {direct432,selected432} from '../scripts/audit/issue33-r93-aveley-432-check.mjs';
import {parseCoffeeElevation,compatibleCoffeeElevations} from '../src/server/coffee-elevation-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const story='This coffee comes from the hills of Guji Ethiopia in western Ethiopia. This lot is grown at over 2,200 meters high and comes from the heirloom variety. This crop of coffee is natural processed, laid on drying patios and roofs while still in the cherry and produces incredible cupping notes. Cupping notes include a sweet cup with blueberry, lemon, and lime notes throughout.';
const specs='Cupping notes: Sweet - Blueberry - Lemon - Lime<br>Roast Level: Light<br>Processing Method: Natural<br>Varietal: Heirloom<br>2000 MASL';
const page=(desc=story,extra='',caption=specs)=>'<main><article class="product"><h1>Ethiopia Qabballe</h1><div class="product__description"><p>'+desc+'</p><p>'+caption+'</p></div></article></main>'+extra;
test('current selected #432 unique heading and both directly contradictory elevations',()=>{
 const r=direct432(page(),[selected432.name]);
 assert.equal(r.uniqueSelected,true);assert.equal(r.directCurrentWitnesses,true);
});
test('selected identity absent, wrong or repeated cannot pass',()=>{
 for(const h of [[],['Ethiopia Harrar'],[selected432.name,selected432.name]])
  assert.equal(direct432(page(),h).uniqueSelected,false);
});
test('related/menu/SEO text cannot satisfy missing selected elevation',()=>{
 const outside='<aside>'+story+' '+specs+'</aside><nav>'+story+' '+specs+'</nav>';
 assert.equal(direct432(page(story.replace('over 2,200 meters','over 2,150 meters'),outside),
  [selected432.name]).directCurrentWitnesses,false);
});
test('direct own elevation change cannot pass stale original receipt',()=>{
 assert.equal(direct432(page(story.replace('over 2,200 meters','over 2,000 meters')),
  [selected432.name]).directCurrentWitnesses,false);
});
test('physically incompatible >2200m and 2000m may never be reconciled',()=>{
 assert.equal(parseCoffeeElevation('over 2,200 meters')?.operator,'>');
 assert.equal(parseCoffeeElevation('2000 MASL')?.low,2000);
 assert.equal(compatibleCoffeeElevations('over 2,200 meters','2000 MASL'),null);
});
test('actual current parser is invoked with chosen product and does not swap neighbor coffee',()=>{
 const p=extractPublicCoffeeFacts(page(story,'<aside>Ethiopia Harrar; Costa Rica El Indio; Nevado Gona</aside>'),
  {source_url:selected432.url});
 assert.equal(p.ok,true,JSON.stringify(p));assert.ok(!/nevado gona|santos lopez/i.test(JSON.stringify(p.fields)));
});
test('no published farm, cultivar substitution or artificial decaf method',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selected432.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.ok(!p.fields.decaffeination_method);assert.ok(!p.fields.producer);
});
