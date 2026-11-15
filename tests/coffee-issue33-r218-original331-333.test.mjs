import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const cases=[
 {n:331,name:'Colombia - Narino',url:'https://skcoffeeplease.com/products/colombia-narino',notes:['Chocolate Truffle','Cranberry','Cara Cara Orange'],origin:'La Union, Narino, Colombia',producer:'Various smallholder farmers work with FUDAM',variety:'Castillo, Colombia',elevation:'1500-2200 masl'},
 {n:332,name:'Mexico - Chiapas',url:'https://skcoffeeplease.com/products/mexico-chiapas',notes:['Hazelnut','Chocolate','Marzipan'],origin:'Chiapas, Mexico',producer:'GRAPOS Cooperative',variety:'Typical, Bourbon, Mundo Novo, Catuai, Marsellesa, Caturra',elevation:'900-1600 masl'},
 {n:333,name:'Rwanda - Gishamwana',url:'https://skcoffeeplease.com/products/rwanda',notes:['Butter Cookies','Pecan','Pear'],origin:'Western Province, Rwanda',producer:'Gishamwana Island Farm',variety:'Bourbon',elevation:'1500-1650 masl'}
];
function source(c,related=''){
 const schema={'@context':'https://schema.org','@type':'Product',name:c.name,url:c.url,brand:{'@type':'Brand',name:'SK Coffee'}};
 const labels=['Reminds us of: '+c.notes.join(', '),'Variety: '+c.variety,'Process: Washed','Producer: '+c.producer,'Region: '+c.origin,'Elevation: '+c.elevation];
 const selected='<article class="product"><h1>'+c.name+'</h1><div class="product-description">'+labels.map(x=>'<p>'+x+'</p>').join('')+
 '<h2>Brewing</h2><p>In our shops we do all our hand brews on Origami brewers at a 1:17 ratio.</p></div></article>';
 return '<!doctype html><html><head><title>GUATEMALA SWISS WATER DARK MANGO unrelated SEO</title><script type="application/ld+json">'+JSON.stringify(schema)+'</script></head><body><main>'+selected+'</main>'+related+'</body></html>';
}
function parse(c,related=''){return extractPublicCoffeeFacts(source(c,related),{source_url:c.url});}
test('all selected SK Coffee H1/product identities remain distinct from SEO and siblings',()=>{
 for(const c of cases){const p=parse(c);assert.equal(p.ok,true,'parser '+c.n);assert.equal(p.fields.name,c.name);assert.ok(!(p.conflicts||[]).includes('name'));}
});
test('all selected direct green processes are Washed, never decaffeination',()=>{
 for(const c of cases){const p=parse(c);assert.equal(p.fields.process,'Washed','#'+c.n);assert.ok(!p.fields.decaffeination_method,'#'+c.n);}
});
test('all selected direct source-tasting literals are retained without sibling mango',()=>{
 for(const c of cases){const p=parse(c,'<aside class="related-products">OTHER Guatemala Swiss Water mango Dark Roast</aside>');
  for(const note of c.notes)assert.ok(String(p.fields.tasting_notes||'').toLowerCase().includes(note.toLowerCase()),'#'+c.n+' missing '+note);
  assert.doesNotMatch(String(p.fields.tasting_notes||''),/guatemala|mango|swiss water/i);}
});
test('selected regional country remains correct and not sibling Guatemala',()=>{
 for(const c of cases){const p=parse(c);const s=String(p.fields.origin||'');assert.match(s,new RegExp(c.n===331?'Colombia':c.n===332?'Mexico':'Rwanda','i'));assert.doesNotMatch(s,/Guatemala/i);}
});
test('selected direct producers are not replaced by stale metadata',()=>{
 for(const c of cases){const p=parse(c);assert.ok(String(p.fields.producer||'').length,'#'+c.n+' producer missing');assert.doesNotMatch(String(p.fields.producer||''),/Guatemala|unrelated/i);}
});
test('generic shop-wide Origami 1:17 filter guidance never turns into espresso recipe',()=>{
 for(const c of cases)assert.ok(!parse(c).fields.espresso_recipe,'#'+c.n+' invented espresso recipe');
});
test('absent own roast remains blank despite unrelated SEO dark-roast text',()=>{
 for(const c of cases){const p=parse(c);assert.notEqual(p.fields.roast_level,'Dark','#'+c.n+' borrowed SEO roast');}
});
test('selected Gishamwana Bourbon and Colombia/Mexico cultivar remain product-local',()=>{
 const p=parse(cases[2],'<aside class="related-products">Other Pink Bourbon Guatemala</aside>');
 assert.match(String(p.fields.variety||''),/Bourbon/i);assert.doesNotMatch(String(p.fields.variety||''),/Pink/i);
});
test('R218 dedicated source workflow tracks full selected source inputs on both PR and push',()=>{
 const w=readFileSync(new URL('../.github/workflows/issue33-r218-original331-333.yml',import.meta.url),'utf8');
 const [pr,more='']=w.split(/^  push:\s*$/m),push=more.split(/^permissions:\s*$/m)[0];
 for(const path of ['tests/coffee-issue33-r218-original331-333.test.mjs','scripts/audit/issue33-r218-original331-333-check.mjs',
 'scripts/audit/issue33-original603-focused-source-review.mjs','scripts/audit/issue33-selected-product-heading.mjs',
 'src/server/coffee-page-metadata.mjs','src/server/coffee-direct-product-prose.mjs','src/server/coffee-product-scope.mjs',
 'src/server/coffee-selected-offer-h2.mjs','src/server/coffee-html-structure.mjs','src/server/coffee-url-guard.mjs',
 'site/cloud/coffee-url-autofill.js','docs/workstreams/ops-issue33-r218-331-333-20261115.md']){
  assert.ok(pr.includes('      - '+path),'PR trigger missing '+path);assert.ok(push.includes('      - '+path),'push trigger missing '+path);}
 assert.match(w,/DIC_ISSUE33_FOCUSED_PUBLIC_NUMBERS:\s*'331,332,333'/);
});
