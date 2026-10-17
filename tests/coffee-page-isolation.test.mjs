import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const url='https://roaster.com/products/current';
const meta='<meta property="og:type" content="product"><meta property="og:title" content="Current Coffee"><meta property="og:site_name" content="Roaster">';
const parse=body=>extractPublicCoffeeFacts(meta+body,{source_url:url});
test('unrelated hidden and navigation labels cannot become product facts',()=>{
 for(const tag of ['nav','footer','aside','template','noscript','script','style']){
  const result=parse(`<${tag}><p>Producer: Unrelated Farm</p><p>Roast: Dark</p></${tag}><main><h1>Current Coffee</h1><p>Origin: Ethiopia</p></main>`);
  assert.equal(result.fields.producer,undefined,tag);assert.equal(result.fields.roast_level,undefined,tag);
  assert.equal(result.fields.origin,'Ethiopia');
 }
});
test('related products cannot fill absent facts even on a short page',()=>{
 const r=parse('<main><h1>Current Coffee</h1><h2><span>Related Products</span></h2><p>Producer: Wrong Farm</p><p>Process: Natural</p></main>');
 assert.equal(r.fields.producer,undefined);assert.equal(r.fields.process,undefined);
});
test('explicit product widgets survive a long decorative prelude without borrowing navigation facts',()=>{
 const r=parse('<nav><div class="meta-info"><p class="meta-title">Producer</p><p>Wrong Farm</p></div></nav>'+
  '<h1>Current Coffee</h1><svg><path d="'+'M0 0 '.repeat(14000)+'"/></svg>'+
  '<div class="meta-info"><p class="meta-title">Producer</p><a>Ovidio Gomez</a></div>'+
  '<div class="meta-info"><p class="meta-title">Variety</p><a>Catuai</a></div>');
 assert.equal(r.fields.producer,'Ovidio Gomez');assert.equal(r.fields.variety,'Catuai');
});
test('stale structured process and current explicit process are withheld on conflict',()=>{
 const product={"@type":"Product",name:'Current Coffee',url,additionalProperty:[{name:'Process',value:'Washed'}]};
 const r=parse('<script type="application/ld+json">'+JSON.stringify(product)+'</script><main><h1>Current Coffee</h1><p>Process: Natural</p></main>');
 assert.equal(r.fields.process,undefined);assert.ok(r.conflicts.includes('process'));
});
test('a compound process does not fall back to the washed component from stale metadata',()=>{
 const product={"@type":"Product",name:'Current Coffee',url,additionalProperty:[{name:'Process',value:'Washed'}]};
 for(const body of ['<p>Process: Washed & Natural</p>','<h2>Process</h2><p>Washed & Natural</p>']){
  const r=parse('<script type="application/ld+json">'+JSON.stringify(product)+'</script><main><h1>Current Coffee</h1>'+body+'</main>');
  assert.equal(r.fields.process,undefined);assert.ok(r.conflicts.includes('process'));
 }
});
