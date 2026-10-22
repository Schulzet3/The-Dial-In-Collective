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
test('explicit mixed processing resolves to Other/Unknown despite stale one-process metadata',()=>{
 const product={"@type":"Product",name:'Current Coffee',url,additionalProperty:[{name:'Process',value:'Washed'}]};
 for(const body of ['<p>Process: Washed & Natural</p>','<h2>Process</h2><p>Washed & Natural</p>']){
  const r=parse('<script type="application/ld+json">'+JSON.stringify(product)+'</script><main><h1>Current Coffee</h1>'+body+'</main>');
  assert.equal(r.fields.process,'Other/Unknown');assert.ok(!r.conflicts?.includes('process'));
 }
});
test('same-product structured duplicates cannot silently erase conflicting process, roast or release evidence',()=>{
 const product=values=>({'@type':'Product',name:'Current Coffee',url,
  additionalProperty:Object.entries(values).map(([name,value])=>({name,value}))});
 const first=product({Process:'Washed','Roast Level':'Light',Harvest:'2025',Origin:'Ethiopia'});
 const second=product({Process:'Natural','Roast Level':'Dark',Harvest:'2026'});
 for(const nodes of [[first,second],[second,first]]){
  const result=parse('<script type="application/ld+json">'+JSON.stringify(nodes)+'</script>');
  for(const field of ['process','roast_level','release_label']){
   assert.equal(result.fields[field],undefined,field);assert.ok(result.conflicts.includes(field));
  }
  assert.equal(result.fields.origin,'Ethiopia');
 }
});
test('equivalent structured nodes enrich compatible missing facts without treating purchase variants as the same coffee',()=>{
 const nodes=[
  {'@type':'Product',name:'Current Coffee',url,additionalProperty:[{name:'Process',value:'Washed'}]},
  {'@type':'Product',name:'Current Coffee',url,additionalProperty:[{name:'Origin',value:'Ethiopia'}]},
  {'@type':'Product',name:'Other Coffee',url:'https://roaster.com/products/other',additionalProperty:[{name:'Process',value:'Natural'}]}
 ];
 const result=parse('<script type="application/ld+json">'+JSON.stringify(nodes)+'</script>');
 assert.equal(result.fields.process,'Washed');assert.equal(result.fields.origin,'Ethiopia');assert.equal(result.conflicts,undefined);
});
test('same-title inline product state and JSON-LD retain a conflict instead of choosing one representation',()=>{
 const linked={'@type':'Product',name:'Current Coffee',url,additionalProperty:[{name:'Process',value:'Washed'}]};
 const inline={title:'Current Coffee',url,metafields:{process:'Natural'}};
 const result=parse('<script type="application/ld+json">'+JSON.stringify(linked)+'</script>'+
  '<script id="product-json" type="application/json">'+JSON.stringify(inline)+'</script>');
 assert.equal(result.fields.process,undefined);assert.ok(result.conflicts.includes('process'));
});
test('contradictory explicit roast graphics suppress structured and Agtron fallback suggestions',()=>{
 const product={'@type':'Product',name:'Current Coffee',url,additionalProperty:[
  {name:'Roast Level',value:'Light'},{name:'Agtron',value:75}
 ]};
 const result=parse('<script type="application/ld+json">'+JSON.stringify(product)+'</script>'+
  '<main><h1>Current Coffee</h1><div data-roast-level="Dark"></div><div data-roast-level="Medium"></div></main>');
 assert.equal(result.fields.roast_level,undefined);assert.equal(result.roast_source,undefined);
 assert.ok(result.conflicts.includes('roast_level'));assert.match(result.roast_hint,/Conflicting roast labels/);
});
