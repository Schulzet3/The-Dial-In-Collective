import test from 'node:test';
import assert from 'node:assert/strict';
import {selected120,direct120,fields120Ok} from '../scripts/audit/issue33-r120-568-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const story='Tasting notes: Jasmine Mochi, Blueberry Pie, Brown Butter. La Esperanza farm is managed by the Alvarez family. Farm: Finca La Esperanza. Region: La Libertad. Varietals: Bourbon. Processing: Natural. Altitude: 1,000-1,450 meters.';
const neighboring='Honduras - Expreso Paraiseño. Owner: Gerardo Peñalva. Processing: Fully washed. Milk Chocolate, Brown Sugar, Almond.';
const page=(body=story,extra='',heading=selected120.name)=>
 '<html><head><title>Slow Burn Coffee</title><meta property="og:site_name" content="Slow Burn Coffee"></head><body><main>'+
 '<article class="product"><h1>'+heading+'</h1><div class="product__description"><p>'+body+'</p></div></article>'+
 extra+'</main></body></html>';
test('568 own exact selected H1, farm facts and tasting notes are present',()=>{
 const x=direct120(page());assert.equal(x.uniqueH1,true,JSON.stringify(x));
 assert.ok(x.direct.every(y=>y.matched),JSON.stringify(x));
});
test('568 changed or duplicate selected H1 does not certify original',()=>{
 for(const heading of ['Honduras - Expreso Paraiseño','Finca La Esperanza Decaf','El Salvador - Other Farm'])
  assert.equal(direct120(page(story,'',heading)).uniqueH1,false);
 assert.equal(direct120(page().replace('</h1>','</h1><h1>Honduras - Expreso Paraiseño</h1>')).uniqueH1,false);
});
test('568 related coffee, menu and SEO cannot restore absent selected source evidence',()=>{
 const x=direct120(page('Packaging information only',
  '<aside>'+story+'</aside><nav>'+story+'</nav><footer>'+story+'</footer><meta name="description" content="'+story+'">'));
 assert.ok(x.direct.some(z=>!z.matched),JSON.stringify(x));
});
test('568 source change to processing or tasting notes fails exact direct evidence',()=>{
 assert.ok(direct120(page(story.replace('Processing: Natural','Processing: Fully washed'))).direct.some(z=>!z.matched));
 assert.ok(direct120(page(story.replace('Blueberry Pie','Milk Chocolate'))).direct.some(z=>!z.matched));
});
test('568 real parser positive source-shaped direct selected product',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selected120.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.ok(String(p.fields?.name||'').includes('Finca La Esperanza'),JSON.stringify(p.fields));
 assert.ok(String(p.fields?.tasting_notes||'').toLowerCase().includes('jasmine mochi'),JSON.stringify(p.fields));
});
test('568 related Honduras processing/producer/flavor cannot contaminate current selected fields',()=>{
 const p=extractPublicCoffeeFacts(page(story,'<aside><h2>Our current offerings</h2>'+neighboring+'</aside>'),{source_url:selected120.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.ok(!/milk chocolate|almond|gerardo|padilla/i.test(String(p.fields?.tasting_notes||'')));
 assert.ok(!/Honduras/i.test(String(p.fields?.origin||'')));
});
test('568 synthetic expected source fields reject neighbor contamination and missing literals',()=>{
 const good={name:selected120.name,origin:'La Libertad, El Salvador',process:'Natural',
  variety:'Bourbon',tasting_notes:'Jasmine Mochi, Blueberry Pie, Brown Butter',elevation_m:'1,000-1,450 meters'};
 assert.ok(fields120Ok(good));
 assert.equal(fields120Ok({...good,origin:'Honduras'}),false);
 assert.equal(fields120Ok({...good,process:'Washed'}),false);
 assert.equal(fields120Ok({...good,tasting_notes:'Brown Sugar, Almond'}),false);
});
