import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen,selectedProof} from '../scripts/audit/issue33-r103-540-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own=chosen.own.join('. ');
const markup=(h1,description,neighbor='')=>
 '<html><head><meta property="og:type" content="product"></head><body><main>'+
 '<article class="product"><h1>'+h1+'</h1><div class="product__description"><p>'+
 description+'</p></div></article>'+neighbor+'</main></body></html>';
test('exact H1 and current direct body qualify despite historical /guatemala slug',()=>{
 const p=selectedProof(markup(chosen.name,own));
 assert.equal(p.uniqueH1,true);
 assert.ok(p.direct.every(Boolean),JSON.stringify(p));
});
test('changed, absent or multiple selected H1 fails identity even with matching literal body',()=>{
 for(const html of [
  markup('Guatemala — Pablo & Eva Del Cid',own),
  markup('Other coffee',own),
  markup(chosen.name,own).replace('<h1>'+chosen.name+'</h1>','<h1>'+chosen.name+'</h1><h1>Different lot</h1>')
 ])assert.equal(selectedProof(html).uniqueH1,false);
});
test('menu/SEO/neighbor facts cannot replace direct chosen body',()=>{
 const other='<nav>'+own+'</nav><aside>'+own+'</aside><footer>'+own+'</footer>';
 const proof=selectedProof(markup(chosen.name,'No current specific facts.',other));
 assert.deepEqual(proof.direct,chosen.own.map(()=>false));
});
test('changed direct product note set cannot certify historical note text',()=>{
 const p=selectedProof(markup(chosen.name,own.replace('juicy cherries','blueberries')));
 assert.equal(p.direct.at(-1),false);
});
test('actual parser keeps chosen identity, not a reused URL slug or adjacent coffee',()=>{
 const html=markup(chosen.name,
  'Washed Process. Medium Roast. Indulge in our meticulously crafted decaf coffee, sourced from a collective of smallholder farms nestled in the vibrant town of Inza, Colombia. With notes of sweet dark chocolate, juicy cherries and rich raisins this will surely become an instant classic.',
  '<aside><h2>Guatemala — Pablo & Eva Del Cid</h2>Natural Geisha praline nougat 1900 masl.</aside>');
 const p=extractPublicCoffeeFacts(html,{source_url:'https://'+chosen.host+chosen.path});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,chosen.name);
 assert.doesNotMatch(JSON.stringify(p.fields),/Guatemala|Pablo|nougat|1900 masl/i);
});
