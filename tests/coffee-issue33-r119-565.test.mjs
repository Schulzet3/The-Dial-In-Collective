import test from 'node:test';
import assert from 'node:assert/strict';
import {selected119,direct119,fields119Ok} from '../scripts/audit/issue33-r119-565-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const selectedStory='Our house espresso blend, roasted medium-light and featuring a blend of washed and natural process coffees. Yields a full-bodied shot with notes of dark chocolate, blueberries and pop rocks.';
const other='Peru Churupampa — Light roast, lime, grape and brown sugar; Wush Wush natural Ethiopian coffee.';
const page=(story=selectedStory,extra='',heading=selected119.name)=>
 '<html><head><title>Sidecar Espresso</title><meta property="og:title" content="Espresso, Brown Sugar"></head><body><main>'+
 '<article class="product"><h1>'+heading+'</h1><div class="product__description"><p>'+story+'</p></div></article>'+
 extra+'</main></body></html>';
test('565 unique exact current selected product and its three own direct source phrases',()=>{
 const x=direct119(page());assert.equal(x.uniqueH1,true,JSON.stringify(x));
 assert.ok(x.direct.every(v=>v.matched),JSON.stringify(x));
});
test('565 changed or duplicate current H1 never establishes selected identity',()=>{
 for(const h of ['Espresso Decaf','Almost French','2025 Espresso','Peru Churupampa'])
  assert.equal(direct119(page(selectedStory,'',h)).uniqueH1,false);
 assert.equal(direct119(page().replace('</h1>','</h1><h1>Other Espresso</h1>')).uniqueH1,false);
});
test('565 own missing processing description cannot be borrowed from menu, recommendations or SEO',()=>{
 const x=direct119(page('House espresso blend, more details soon',
  '<aside>'+selectedStory+'</aside><nav>'+selectedStory+'</nav><footer>'+selectedStory+'</footer>'));
 assert.ok(x.direct.some(v=>!v.matched),JSON.stringify(x));
});
test('565 edited current processing/notes fail strict selected direct prose evidence',()=>{
 assert.ok(direct119(page(selectedStory.replace('washed and natural','washed'))).direct.some(x=>!x.matched));
 assert.ok(direct119(page(selectedStory.replace('blueberries and pop rocks','brown sugar'))).direct.some(x=>!x.matched));
});
test('565 actual parser preserves medium-light, all three notes and mixed process safely',()=>{
 const x=extractPublicCoffeeFacts(page(),{source_url:selected119.url});
 assert.equal(x.ok,true,JSON.stringify(x));assert.ok(fields119Ok(x.fields),JSON.stringify(x.fields));
});
test('565 selected blend never takes another product flavor/origin/process from recommendation text',()=>{
 const x=extractPublicCoffeeFacts(page(selectedStory,'<aside><h2>More coffees</h2>'+other+'</aside>'),
  {source_url:selected119.url});
 assert.equal(x.ok,true,JSON.stringify(x));assert.ok(fields119Ok(x.fields),JSON.stringify(x.fields));
 assert.ok(!/brown sugar|lime|grape|wush wush/i.test(String(x.fields.tasting_notes||'')));
});
test('565 metadata-only or mismatched selected product cannot satisfy direct evidence',()=>{
 const bad=page('Packaging only','<meta name="description" content="'+selectedStory+'">','Another Coffee');
 assert.equal(direct119(bad).uniqueH1,false);
 assert.ok(direct119(bad).direct.some(x=>!x.matched));
});
