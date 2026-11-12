import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedVtSumatraGayo} from '../scripts/audit/issue33-r86-vtartisan-402-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://vtartisan.com/products/sumatra-gayo';
const story='This popular Indonesian coffee is from a Co-op we have worked with for years, and is in the Gayo mountain region of Aceh. The beans are wet hulled just for us producing beautifully rich, full bodied coffee that is chocolaty, licorice-like with bold, earthy undertones.';
const page=(name='Sumatra Gayo',prose=story,details='<p>Notes: Farm Direct</p><p>Roast: Medium</p>')=>'<main><article class="product"><h1>'+name+'</h1><p>'+prose+'</p>'+details+'</article></main>';
const verify=(p,heads=['Sumatra Gayo'])=>selectedVtSumatraGayo(p,heads);
test('selected direct source facts and unique H1',()=>assert.deepEqual(Object.values(verify(page())),Array(7).fill(true)));
test('missing, duplicate and other coffee heading fail',()=>{
 assert.equal(verify(page(),[]).uniqueSelected,false);
 assert.equal(verify(page(),['Sumatra Gayo','Sumatra Gayo']).uniqueSelected,false);
 assert.equal(verify(page('Colombia Chiroso - Microlot'),['Colombia Chiroso - Microlot']).uniqueSelected,false);
});
test('navigation, script, sidebar and footer never supply direct selected facts',()=>{
 const x=page('Sumatra Gayo','', '')+'<nav>'+story+'</nav><script>'+story+'</script><aside>'+story+'</aside><footer>'+story+' Roast: Medium Notes: Farm Direct</footer>';
 const f=verify(x);for(const k of ['ownGeography','ownWetHulling','ownSensory','ownRoast','unnamedCooperative','sourcingNotTaste'])assert.equal(f[k],false,k);
});
test('unrelated geography cannot replace own Aceh region',()=>assert.equal(verify(page('Sumatra Gayo',story.replace('Gayo mountain region of Aceh','another Indonesian region'))).ownGeography,false));
test('generic marketing cannot replace literal wet hulling',()=>assert.equal(verify(page('Sumatra Gayo',story.replace('beans are wet hulled just for us','beans are carefully selected'))).ownWetHulling,false));
test('a missing selected licorice phrase fails sensory evidence',()=>assert.equal(verify(page('Sumatra Gayo',story.replace('licorice-like','smooth'))).ownSensory,false));
test('roast in heading alone is not separately sourced spec',()=>assert.equal(verify(page('Sumatra Gayo Medium',story,'<p>Notes: Farm Direct</p>')).ownRoast,false));
test('roast in neighboring product sidebar is not a selected spec',()=>assert.equal(verify(page('Sumatra Gayo',story,'<aside>Roast: Medium</aside>')).ownRoast,false));
test('unnamed coop is not an invented named farm',()=>assert.equal(verify(page('Sumatra Gayo',story.replace('Co-op we have worked with for years','farm named Paraíso'))).unnamedCooperative,false));
test('Farm Direct is sourcing rather than flavor',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.ok(!/farm.direct/i.test(r.fields.tasting_notes||''),JSON.stringify(r.fields));
});
test('actual parser does not misread wet hulling as Washed green process',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.ok(!['Washed','Honey','Natural'].includes(r.fields.process),JSON.stringify(r.fields));
});
test('no other current selected Chiroso lot contaminates source',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.ok(!/wilton|benitez|chiroso/i.test(JSON.stringify(r.fields)),JSON.stringify(r.fields));
});

test('direct sourcing printed as Notes: Farm Direct remains reviewable without a tasting-note type',()=>{
 const r=extractPublicCoffeeFacts(page(),{source_url:url});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.ok((r.source_facts||[]).some(f=>/^farm[ -]?direct$/i.test(f.value||'')&&!f.field),JSON.stringify(r.source_facts));
 assert.ok(!(r.source_facts||[]).some(f=>f.field==='tasting_notes'&&/^farm[ -]?direct$/i.test(f.value||'')),JSON.stringify(r.source_facts));
});
test('hyphenated sourcing Notes: Farm-Direct cannot become tasting typed evidence',()=>{
 const r=extractPublicCoffeeFacts(page('Sumatra Gayo',story,'<p>Notes: Farm-Direct</p><p>Roast: Medium</p>'),{source_url:url});
 assert.ok(!(r.source_facts||[]).some(f=>f.field==='tasting_notes'&&/^farm[ -]?direct$/i.test(f.value||'')),JSON.stringify(r.source_facts));
});
test('actual genuine labeled selected tasting notes are still typed, not hidden by sourcing guard',()=>{
 const r=extractPublicCoffeeFacts(page('Sumatra Gayo',story,'<p>Notes: Cocoa, Blueberry</p><p>Roast: Medium</p>'),{source_url:url});
 assert.ok((r.source_facts||[]).some(f=>f.field==='tasting_notes'&&/Cocoa, Blueberry/i.test(f.value||'')),JSON.stringify(r.source_facts));
});
