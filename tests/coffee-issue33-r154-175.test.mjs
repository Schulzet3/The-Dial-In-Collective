import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen175,selected175Source} from '../scripts/audit/issue33-r154-175-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own='<p>Notes: Cherries, Raspberries & Chocolate Brownies</p>'+
 '<p>This red honey process coffee comes to us from the Oviedo family and the Sircof farm.</p>';
const page=(body=own,title=chosen175.name,other='',seo='Unrelated Guatemala dark roast')=>
 '<html><head><title>'+seo+'</title><meta name="description" content="'+seo+'"></head><body>'+
 '<header>Guatemala Estate Dark Roast</header><main><article class="product">'+
 '<h1>'+title+'</h1><div class="product__description">'+body+'</div></article></main>'+
 other+'<footer>Other Coffee: Dark roast 1850m</footer></body></html>';
test('#175 selected exact H1 and direct Sircof labeled notes',()=>{
 const d=selected175Source(page());assert.equal(d.exactSelectedTitle,true);
 assert.ok(Object.values(d.direct).every(x=>Array.isArray(x)?x.every(Boolean):x),JSON.stringify(d));
});
test('#175 old SEO and related cards cannot rescue wrong selected product',()=>{
 assert.equal(selected175Source(page(own,'Costa Rica Other Farm',
  '<section class="related products"><h1>'+chosen175.name+'</h1>'+own+'</section>')).exactSelectedTitle,false);
});
test('#175 missing chosen tasting notes cannot borrow footer, nav or related cards',()=>{
 const d=selected175Source(page(own.replace('Notes: Cherries, Raspberries & Chocolate Brownies','Notes unpublished'),
  chosen175.name,'<nav>'+own+'</nav><section class="related products">'+own+'</section>'));
 assert.equal(d.direct.labeled_notes,false);
});
test('#175 another farm cannot be substituted by a global old Sircof SEO',()=>{
 const d=selected175Source(page(own.replace('Oviedo family','Other cooperative'),chosen175.name,'',chosen175.name+' Oviedo family'));
 assert.equal(d.direct.oviedo_family,false);
});
test('#175 related process cannot fill absent chosen process',()=>{
 const d=selected175Source(page(own.replace('red honey process','unknown process'),chosen175.name,
 '<section class="related products">'+own+'</section>'));assert.equal(d.direct.red_honey,false);
});
test('#175 missing selected chocolate brownie note not rescued by customer review',()=>{
 const d=selected175Source(page(own.replace('Chocolate Brownies','Unspecified finish'),chosen175.name,
 '<section class="jdgm-widget"><p>Chocolate Brownies</p></section>'));
 assert.equal(d.direct.labeled_notes,false);
});
test('#175 actual parser uses chosen name, not stale metadata name',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen175.url});
 assert.ok(p.ok!==true||!/Guatemala Estate/i.test(p.fields?.name||''),JSON.stringify(p));
});
test('#175 direct current honey process is not decaf',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen175.url});
 assert.ok(p.ok!==true||(!p.fields.decaffeination_method&&(!p.fields.process||p.fields.process==='Honey')),JSON.stringify(p));
});
test('#175 no absent roast inferred from global header or SEO',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen175.url});
 assert.ok(p.ok!==true||(!p.fields.roast_level&&!p.fields.elevation_m),JSON.stringify(p));
});
test('#175 other chosen coffee invalidates exact selected source',()=>{
 for(const title of ['Peru Cajamarca','Costa Rica Other Farm','Costa Rica Cafe Sircof 2027'])
  assert.equal(selected175Source(page(own,title)).exactSelectedTitle,false,title);
});
