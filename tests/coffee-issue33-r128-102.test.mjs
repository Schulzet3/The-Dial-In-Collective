import test from 'node:test';
import assert from 'node:assert/strict';
import {selected128,selected128CurrentSource} from '../scripts/audit/issue33-r128-102-check.mjs';
const title=selected128.name;
const own='<h2>Dark roast</h2><p>Single Origin Organic Nicaragua coffee from Jinotega, Nicaragua, grown at altitudes ranging from 1,100 to 1,700 meters. With tasting notes of milk chocolate, citrus, almond, and brown sugar.</p>';
const page=(body=own,h1=title,extra='')=>'<html><head><script type="application/ld+json">'+
 JSON.stringify({'@context':'https://schema.org','@type':'Product',name:h1,url:selected128.url,description:h1})+
 '</script></head><body><main><article class="product"><h1>'+h1+'</h1><section class="product__description">'+body+'</section></article>'+extra+'</main></body></html>';
test('full current exact selected official page is source-qualified',()=>{
 const d=selected128CurrentSource(page());assert.equal(d.exactSelectedHeading,true);
 assert.ok(Object.values(d.direct).every(Boolean),JSON.stringify(d.direct));
});
test('changed chosen heading rejects stale original coffee identity',()=>{
 assert.equal(selected128CurrentSource(page(own,'Guatemala Honey Process')).exactSelectedHeading,false);
});
test('SEO-only original identity does not replace selected heading',()=>{
 assert.equal(selected128CurrentSource(page(own,'Different coffee')).exactSelectedHeading,false);
});
test('unrelated nav aside footer cannot provide absent selected locality',()=>{
 const d=selected128CurrentSource(page('<p>Single Origin Nicaragua</p>',title,
 '<nav>'+own+'</nav><aside>'+own+'</aside><footer>'+own+'</footer>'));
 assert.equal(d.direct.chosenOrigin,false);assert.equal(d.direct.tastes,false);
});
test('missing selected direct flavor statement fails instead of using footer',()=>{
 const d=selected128CurrentSource(page(own.replace('milk chocolate, citrus, almond, and brown sugar','smooth body'),title,
 '<footer><p>tasting notes of milk chocolate, citrus, almond, and brown sugar</p></footer>'));
 assert.equal(d.direct.tastes,false);
});
test('wrong altitude from another product aside does not fill selected',()=>{
 const d=selected128CurrentSource(page(own.replace('1,100 to 1,700 meters','high altitudes'),title,
 '<aside>1,100 to 1,700 meters</aside>'));
 assert.equal(d.direct.elevation,false);
});
test('dark roast from foreign recommendation does not substitute for chosen roast',()=>{
 const d=selected128CurrentSource(page(own.replace('Dark roast','Organic'),title,
 '<footer>Dark roast</footer>'));
 assert.equal(d.direct.explicitlyDark,false);
});
test('another coffee origin cannot supply selected Jinotega field',()=>{
 const d=selected128CurrentSource(page(own.replace('Jinotega, Nicaragua','Nicaragua'),title,
 '<nav><a>Jinotega, Nicaragua</a></nav>'));
 assert.equal(d.direct.chosenOrigin,false);
});
