import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractProductFlavorEvidence} from '../src/server/coffee-flavor-evidence.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const url='https://example-coffee.test/products/current-coffee',name='Current Decaf Coffee';
const comparison="it’s the kind of Central American coffee you like to start and end the day with because it’s sweet, heavy-bodied, warm, and comforting.";
const sensory='The flavor starts off with a dry nutty bite similar to almonds; '+comparison+' Lingering brown sugar notes, balanced acidity, and lovely slightly tart cherry flavor round out this cup.';
const geography='This Colombian coffee comes from the Department of Tolima in the Andean mountain range, purchased from a Colombia export company that works with an association of small specialty coffee farmers in Planadas.';
const markup=({title=name,description=sensory,origins=['Colombia'],location=geography,extra='',json=true}={})=>{
 const direct=origins.map(origin=>'<p>Origin: '+origin+'</p>').join('');
 const schema=json?'<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'Product',name:title,url,description,brand:{'@type':'Brand',name:'Example Coffee Roasters'}})+'</script>':'';
 return '<html><head><title>'+title+' | Example Coffee Roasters</title><meta property="og:type" content="product"><meta property="og:url" content="'+url+'">'+schema+'</head><body><nav>Another coffee: Guatemala, Dark, Washed, peach</nav><main><article class="product"><h1>'+title+'</h1><div class="product__description"><h2>Description</h2><p>'+description+'</p>'+direct+'<p>'+location+'</p></div></article></main>'+extra+'<footer>Other coffee Central American Roast</footer></body></html>';
};
const parse=html=>extractPublicCoffeeFacts(html,{source_url:url});
const notes=p=>String(p.fields?.tasting_notes||'').toLowerCase();
test('R352 selected direct three tasting claims and Colombia win over the broad sensory analogy',()=>{
 const p=parse(markup());assert.equal(p.ok,true);assert.match(notes(p),/almonds?/);
 assert.match(notes(p),/brown sugar/);assert.match(notes(p),/tart cherry/);
 assert.match(p.fields.origin||'',/Colombia/i);assert.doesNotMatch(p.fields.origin||'',/Central America/i);
 assert.ok(!p.conflicts?.includes('origin'));
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R352 analogy alone cannot become producing region when explicit country omitted',()=>{
 const p=parse(markup({description:sensory,origins:[]}));assert.equal(p.ok,true);
 assert.doesNotMatch(p.fields.origin||'',/Central America/i);
});
test('R352 genuine country disagreement stays blank and conflicting',()=>{
 const p=parse(markup({origins:['Colombia','Guatemala']}));assert.equal(p.ok,true);
 assert.equal(p.fields.origin,undefined);assert.ok(p.conflicts?.includes('origin'));
});
test('R352 direct country Guatemala is never masked',()=>{
 const p=parse(markup({description:'Our coffee is directly sourced in Guatemala.',origins:['Guatemala'],location:'This coffee is grown in Guatemala.'}));assert.equal(p.ok,true);
 assert.match(p.fields.origin||'',/Guatemala/i);
});
test('R352 conditional, historical, unrelated and incomplete narratives cannot supply three notes',()=>{
 for(const d of ['Previously '+sensory,'Another coffee: '+sensory,'If brewed with milk: '+sensory,'Our syrup adds these notes: '+sensory,
  'This coffee has a dry nutty bite similar to almonds. Lingering brown sugar notes, balanced acidity, and lovely slightly tart cherry flavor round out this cup.']){
  const p=parse(markup({description:d,origins:['Colombia']}));
  assert.ok(!/almonds?, brown sugar, tart cherry/.test(notes(p)),d.slice(0,60));
 }
});
test('R352 other coffee sidebar cannot donate exact selected narrative',()=>{
 const p=parse(markup({description:'This coffee has no printed tasting descriptors.',extra:'<aside><p>'+sensory+'</p></aside>'}));
 assert.equal(p.ok,true);assert.ok(!/almonds?, brown sugar, tart cherry/.test(notes(p)));
});
test('R352 full same-paragraph evidence and singular chosen H1 are required',()=>{
 const clean=(s,n)=>String(s).replace(/<[^<>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
 const split='<main><h1>Current Decaf Coffee</h1><p>The flavor starts off with a dry nutty bite similar to almonds.</p><p>Lingering brown sugar notes, balanced acidity, and lovely slightly tart cherry flavor round out this cup.</p></main>';
 assert.equal(extractProductFlavorEvidence(split,{clean}),'');
 const other='<main><h1>Another Coffee</h1><h1>Current Decaf Coffee</h1><p>'+sensory+'</p></main>';
 assert.equal(extractProductFlavorEvidence(other,{clean}),'');
});
test('R352 no invented roast, cherry process, producer or lot',()=>{
 const p=parse(markup());assert.equal(p.fields.roast_level,undefined);
 assert.equal(p.fields.process,undefined);assert.equal(p.fields.producer,undefined);
 assert.equal(p.fields.release_label,undefined);
});

test('R354 decaf-site geography alone cannot establish green-coffee provenance',()=>{
 const sentence='This coffee is decaffeinated at origin in Colombia using a process they called "sugar process".';
 const noGrowingSource=parse(markup({description:sentence,origins:[],location:'',json:false}));
 assert.equal(noGrowingSource.ok,true);
 assert.equal(noGrowingSource.fields.decaffeination_method,'Sugar Process');
 assert.equal(noGrowingSource.fields.origin,undefined);
 const labeledOrigin=parse(markup({description:sentence,origins:['Colombia'],location:'',json:false}));
 assert.match(labeledOrigin.fields.origin||'',/Colombia/i,'independent selected origin survives');
 assert.equal(labeledOrigin.fields.decaffeination_method,'Sugar Process');
});

test('R354 unmasked selected decaf treatment remains without false growing origin',()=>{
 const method='This coffee is decaffeinated at origin in Colombia using a chemical-free process our roaster loosely attempted to translate as “sugar process”.';
 const current=parse(markup({description:method,origins:[],location:'',json:false}));
 assert.equal(current.ok,true);
 assert.equal(current.fields.decaffeination_method,'Sugar Process');
 assert.equal(current.fields.origin,undefined);
 assert.equal(current.fields.process,undefined);
 const related=parse(markup({description:'Our current coffee has no method published.',origins:[],location:'',json:false,
  extra:'<aside><h2>Related coffees</h2><p>'+method+'</p></aside>'}));
 assert.equal(related.fields.decaffeination_method,undefined);
});
