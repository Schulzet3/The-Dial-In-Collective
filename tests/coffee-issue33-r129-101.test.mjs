import test from 'node:test';
import assert from 'node:assert/strict';
import {selected129,selected129CurrentSource} from '../scripts/audit/issue33-r129-101-check.mjs';
const title=selected129.name;
const own='<h2>Light roast and Natural Process</h2><p>Single Origin Organic Honduras coffee from Marcala, La Paz, Honduras. COMSA growers at 1,300 to 1,700 meters, with tasting notes of plum, raspberry, strawberry-lemonade, rhubarb, allspice, and cream.</p>';
const page=(body=own,h1=title,extra='')=>'<html><head><script type="application/ld+json">'+
 JSON.stringify({'@context':'https://schema.org','@type':'Product',name:h1,url:selected129.url,description:h1})+
 '</script></head><body><main><article class="product"><h1>'+h1+'</h1><section class="product__description">'+body+'</section></article>'+extra+'</main></body></html>';
test('direct currently selected Honduras product has all supported evidence',()=>{
 const d=selected129CurrentSource(page());assert.equal(d.exactSelectedHeading,true);
 assert.ok(Object.values(d.direct).every(Boolean),JSON.stringify(d.direct));
});
test('changed selected heading rejects historical coffee identity',()=>{
 assert.equal(selected129CurrentSource(page(own,'Nicaragua - Organic Coffee Beans')).exactSelectedHeading,false);
});
test('SEO-only original identity cannot replace current chosen heading',()=>{
 assert.equal(selected129CurrentSource(page(own,'Different coffee')).exactSelectedHeading,false);
});
test('unrelated navigation, aside and footer cannot supply missing producer or locality',()=>{
 const d=selected129CurrentSource(page('<p>Honduras coffee</p>',title,
 '<nav>'+own+'</nav><aside>'+own+'</aside><footer>'+own+'</footer>'));
 assert.equal(d.direct.chosenOrigin,false);assert.equal(d.direct.producer,false);
});
test('flavor from another coffee footer cannot repair incomplete chosen notes',()=>{
 const d=selected129CurrentSource(page(own.replace('strawberry-lemonade','bright fruit'),title,
 '<footer>strawberry-lemonade</footer>'));
 assert.equal(d.direct.tastes,false);
});
test('unrelated published altitude must not backfill current product',()=>{
 const d=selected129CurrentSource(page(own.replace('1,300 to 1,700 meters','high altitudes'),title,
 '<aside>1,300 to 1,700 meters</aside>'));
 assert.equal(d.direct.elevation,false);
});
test('foreign natural-processing tag cannot determine selected process',()=>{
 const d=selected129CurrentSource(page(own.replace('Natural Process','Organic'),title,
 '<footer>Natural Process</footer>'));
 assert.equal(d.direct.explicitlyLightNatural,false);
});
test('other-coffee COMSA metadata cannot invent selected producer',()=>{
 const d=selected129CurrentSource(page(own.replace('COMSA growers','smallholder growers'),title,
 '<script type="application/ld+json">{"producer":"COMSA"}</script><footer>COMSA</footer>'));
 assert.equal(d.direct.producer,false);
});
