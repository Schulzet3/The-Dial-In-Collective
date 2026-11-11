import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen,selectedProof} from '../scripts/audit/issue33-r104-542-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own='Ethiopia Refisa is a washed coffee from the West Arsi region, processed at the Testi West Arsi Washing Station. Established in 2010, the station works with around 850 smallholder farmers who deliver ripe coffee cherry throughout the harvest season. After delivery, the coffee is depulped, fermented for 24–48 hours, washed, and dried slowly on raised beds for 12–15 days.';
const markup=(name,body,extraneous='')=>
 '<html><head><meta property="og:type" content="product"></head><body><main><article class="product"><h1>'+name+
 '</h1><div class="product__description"><p>'+body+'</p></div></article>'+extraneous+'</main></body></html>';
test('own current selected H1 plus current washed West Arsi 850-farmers description qualify',()=>{
 const proof=selectedProof(markup(chosen.name,own));
 assert.equal(proof.uniqueH1,true);assert.deepEqual(proof.direct,[true,true,true,true]);
 assert.equal(proof.archivedFlavorAbsentFromSelected,true);
});
test('different selected lot, missing H1 and multiple H1 cannot certify the original',()=>{
 for(const html of [markup('Ethiopia Different Lot',own),markup('',own),
  markup(chosen.name,own).replace('</h1>','</h1><h1>Different Lot</h1>')])
  assert.equal(selectedProof(html).uniqueH1,false);
});
test('related product, navigation and metadata cannot supply absent direct selected lot evidence',()=>{
 const extra='<aside>'+own+' jasmine lime berry candy</aside><nav>'+own+'</nav>';
 const proof=selectedProof(markup(chosen.name,'No direct current processing or station details.',extra));
 assert.deepEqual(proof.direct,[false,false,false,false]);
 assert.equal(proof.archivedFlavorAbsentFromSelected,true);
});
test('changed current process or farmer count fails direct selected current proof',()=>{
 const changed=own.replace('washed coffee','natural coffee').replace('850 smallholder','650 smallholder');
 const p=selectedProof(markup(chosen.name,changed));
 assert.equal(p.direct[0],false);assert.equal(p.direct[2],false);
});
test('historical jasmine lime berry candy in current selected body explicitly fails negative source guard',()=>{
 const p=selectedProof(markup(chosen.name,own+' Tasting notes: jasmine, lime, berry candy.'));
 assert.equal(p.archivedFlavorAbsentFromSelected,false);
});
test('real extractor does not invent historical flavor from literal current selected story',()=>{
 const p=extractPublicCoffeeFacts(markup(chosen.name,own),{source_url:'https://'+chosen.host+chosen.path});
 assert.equal(p.ok,true,JSON.stringify(p));assert.equal(p.fields.name,chosen.name);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/jasmine|lime|berry candy/i);
});

const metaPage=(body,seoNotes='jasmine, lime, berry candy')=>
 '<html><head><meta property="og:type" content="product">'+
 '<meta property="og:url" content="https://www.rallycoffee.co/products/ethiopia-refisa">'+
 '<meta property="og:title" content="Ethiopia Refisa">'+
 '<meta property="og:description" content="Ethiopia Refisa tasting notes of '+seoNotes+'"></head>'+
 '<body><main><article class="product"><h1>Ethiopia Refisa</h1>'+
 '<div class="product__description"><p>'+body+'</p></div></article></main></body></html>';
test('SEO notes remain reviewable but cannot autofill when current selected lot has different substantive story',()=>{
 const p=extractPublicCoffeeFacts(metaPage(own),{source_url:'https://'+chosen.host+chosen.path});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,chosen.name);
 assert.equal(p.fields.tasting_notes,undefined,JSON.stringify(p));
 assert.ok((p.source_facts||[]).some(f=>/published page metadata/i.test(f.section||'')&&/jasmine, lime, berry candy/i.test(f.value||'')));
});
test('when selected lot directly prints its listed notes, SEO agrees without displacing direct evidence',()=>{
 const p=extractPublicCoffeeFacts(metaPage(own+' Tasting Notes: jasmine, lime, berry candy.'),{source_url:'https://'+chosen.host+chosen.path});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.match(String(p.fields.tasting_notes||''),/jasmine/i);
});
