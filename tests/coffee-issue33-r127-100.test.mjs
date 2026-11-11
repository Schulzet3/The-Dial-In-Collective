import test from 'node:test';
import assert from 'node:assert/strict';
import {selected127,selected127CurrentSource} from '../scripts/audit/issue33-r127-100-check.mjs';
const title=selected127.name;
const own='<h2>Light roast and Honey Process</h2><p>Single Origin Organic Guatemala coffee from Joyabaj, Quiché. Grown at altitudes between 1,300 and 2,000 meters and honey-processed (depulped and dried with fruit mucilage still on the bean), this coffee boasts tasting notes of cherry, malt, anise, and cinnamon with a sweet, rounded cup.</p>';
const education='<h3>Why honey?</h3><p>Washed coffee is clean and classic. Natural keeps the whole cherry. Honey is the middle path.</p>';
const page=(body=own+education,h1=title,extra='')=>'<html><head><script type="application/ld+json">'+
 JSON.stringify({'@context':'https://schema.org','@type':'Product',name:h1,url:selected127.url,description:h1})+
 '</script></head><body><main><article class="product"><h1>'+h1+'</h1><section class="product__description">'+body+'</section></article>'+extra+'</main></body></html>';
test('selected official chosen heading and full direct text',()=>{
 const d=selected127CurrentSource(page());assert.equal(d.exactSelectedHeading,true);
 assert.ok(Object.values(d.direct).every(Boolean),JSON.stringify(d.direct));
});
test('changed H1 is not the archived selected product',()=>{
 assert.equal(selected127CurrentSource(page(own,'Different coffee')).exactSelectedHeading,false);
});
test('selected coffee title cannot be obtained from SEO alone',()=>{
 assert.equal(selected127CurrentSource(page(own,'Other Guatemala')).exactSelectedHeading,false);
});
test('educational washed and natural comparisons are not selected processing evidence',()=>{
 const d=selected127CurrentSource(page(education));assert.equal(d.direct.honeyProcessing,false);
});
test('nav, footer and unrelated aside cannot supply missing origin',()=>{
 const d=selected127CurrentSource(page('<p>Selected coffee</p>',title,
 '<nav>'+own+'</nav><aside>'+own+'</aside><footer>'+own+'</footer>'));
 assert.equal(d.direct.chosenOrigin,false);assert.equal(d.direct.tastes,false);
});
test('missing selected literal tasting notes fail closed',()=>{
 const d=selected127CurrentSource(page(own.replace('cherry, malt, anise, and cinnamon','sweetness')));
 assert.equal(d.direct.tastes,false);
});
test('missing direct elevation is not inferred from unrelated sidebar',()=>{
 const d=selected127CurrentSource(page(own.replace('1,300 and 2,000 meters','high altitude'),title,
  '<aside><p>1,300 and 2,000 meters</p></aside>'));
 assert.equal(d.direct.elevation,false);
});
test('missing chosen light roast is not inferred from foreign site recommendations',()=>{
 const d=selected127CurrentSource(page(own.replace('Light roast and Honey Process','Honey Process'),title,
  '<footer>Light roast and Honey Process</footer>'));
 assert.equal(d.direct.explicitlyLight,false);
});
