import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen118,selected118Source} from '../scripts/audit/issue33-r138-118-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const components=chosen118.selectedComponents[0]+', '+chosen118.selectedComponents[1]+', and '+chosen118.selectedComponents[2];
const selected='<p>'+components+'</p>'+
 '<p>Medium Roast: This energizing espresso blend is especially unique as all its components compose each common processing method. The flavors of milk chocolate, roasted almonds and dried fruits come out more clearly!</p>';
const page=(own=selected,heading=chosen118.name,extra='',seo='Historic Colombia - Kumanday')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head><body>'+
 '<main><article class="product"><h1>'+heading+'</h1><div class="product__description">'+own+'</div></article></main>'+extra+'</body></html>';
const direct=html=>selected118Source(html).direct;
test('#118 exact selected current H1 and three component list with Medium and own tastes',()=>{
 const result=selected118Source(page());
 assert.equal(result.exactH1,true);
 assert.ok(Object.values(result.direct).every(Boolean),JSON.stringify(result.direct));
});
test('#118 changed selected H1 rejects unchanged old body',()=>assert.equal(selected118Source(page(selected,'New Espresso')).exactH1,false));
test('#118 missing current Guatemala Washed cannot be supplied by SEO',()=>{
 const html=page(selected.replace(chosen118.selectedComponents[0],'component unpublished'),chosen118.name,'',chosen118.selectedComponents[0]);
 assert.equal(direct(html).guatemalaWashed,false);
});
test('#118 unrelated nav cannot supply old-or-current Koke Honey component',()=>{
 const html=page(selected.replace(chosen118.selectedComponents[1],'component unpublished'),chosen118.name,'<nav>'+selected+'</nav>');
 assert.equal(direct(html).kokeHoney,false);
});
test('#118 related sidebar cannot supply selected Godina Natural',()=>{
 const html=page(selected.replace(chosen118.selectedComponents[2],'component unpublished'),chosen118.name,'<aside>'+selected+'</aside>');
 assert.equal(direct(html).godinaNatural,false);
});
test('#118 footer cannot fill missing selected milk-chocolate notes',()=>{
 const html=page(selected.replace('milk chocolate','flavor unpublished'),chosen118.name,'<footer>'+selected+'</footer>');
 assert.equal(direct(html).milkChocolate,false);
});
test('#118 source list must preserve complete current three components, not a partial composition',()=>{
 const html=page(selected.replace('and '+chosen118.selectedComponents[2],''));
 assert.equal(direct(html).currentThreeComponentOrder,false);
});
test('#118 selected medium roast cannot be stolen from navigation',()=>{
 const html=page(selected.replace('Medium Roast','Roast unpublished'),chosen118.name,'<nav>Medium Roast</nav>');
 assert.equal(direct(html).mediumRoast,false);
});
test('#118 selected product-form description can be direct evidence',()=>{
 const html=page('<form action="/cart/add">'+selected+'</form>');
 assert.ok(Object.values(direct(html)).every(Boolean));
});
test('#118 actual parser prevents stale Colombian SEO from replacing new blend origin',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen118.url});
 assert.equal(p.ok,true);
 assert.ok(!String(p.fields?.origin||'').toLowerCase().includes('colombia'),JSON.stringify(p.fields));
});
test('#118 three current processes must not collapse to one incorrectly',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen118.url});
 assert.equal(p.ok,true);
 assert.ok(!['Washed','Honey','Natural'].includes(p.fields?.process),JSON.stringify(p.fields));
});
test('#118 actual parser retains selected espresso identity over old SEO',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen118.url});
 assert.equal(p.ok,true);
 assert.equal(p.fields?.name?.toLowerCase(),chosen118.name);
});
