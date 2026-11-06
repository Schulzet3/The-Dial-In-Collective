import test from 'node:test';
import assert from 'node:assert/strict';
import {rawElements,removeElements} from '../supabase/functions/_shared/html-scan.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://roaster.example.com/products/current-coffee';
const product={'@type':'Product',name:'Current Coffee',url,
 additionalProperty:[{name:'Process',value:'Washed'},{name:'Origin',value:'Ethiopia'}]};
const metadata='<meta property="og:type" content="product">'+
 '<meta property="og:title" content="Current Coffee">'+
 '<meta property="og:site_name" content="Roaster">';

test('quoted > in single/double HTML attributes preserves exact raw JSON-LD body and UTF-16 offsets',()=>{
 for(const quote of ['"',"'"]){
  const opener='<SCRIPT type="application/ld+json" data-note='+quote+'before > after'+quote+'>';
  const html='☕'+opener+JSON.stringify(product)+'</ScRiPt >tail';
  const [block]=rawElements(html);
  assert.equal(block.start,1);
  assert.equal(block.attributes,' type="application/ld+json" data-note='+quote+'before > after'+quote);
  assert.equal(block.body,JSON.stringify(product));
  assert.equal(block.closed,true);
  assert.equal(block.end,html.length-'tail'.length);
  assert.equal(block.name,'script');
  assert.equal(removeElements(html,['script']),'☕ tail');
 }
});

test('official selected JSON-LD fields survive quoted >; different-coffee metadata cannot fill current fields',()=>{
 for(const quote of ['"',"'"]){
  const opener='<script type="application/ld+json" data-note='+quote+'>'+' unrelated marker'+quote+'>';
  const other={'@type':'Product',name:'Other Coffee',
   url:'https://roaster.example.com/products/other',
   additionalProperty:[{name:'Process',value:'Natural'},{name:'Roast Level',value:'Dark'}]};
  const html=metadata+opener+JSON.stringify(product)+'</script>'+
   '<script type="application/ld+json">'+JSON.stringify(other)+'</script>';
  const result=extractPublicCoffeeFacts(html,{source_url:url});
  assert.equal(result.fields.process,'Washed');
  assert.equal(result.fields.origin,'Ethiopia');
  assert.notEqual(result.fields.roast_level,'Dark');
  assert.equal(result.fields.name,'Current Coffee');
 }
});

test('unclosed quoted attribute fails closed instead of parsing a stray > as JSON-LD',()=>{
 const html='before<script type="application/ld+json" data-note="not actually > opened';
 const [block]=rawElements(html);
 assert.equal(block.start,6);
 assert.equal(block.closed,false);
 assert.equal(block.body,'');
 assert.equal(block.attributes,'');
 assert.equal(block.end,html.length);
 assert.equal(removeElements(html,['script']),'before ');
});

test('unquoted > remains a valid opening delimiter and later blocks remain distinct',()=>{
 const html='<script data-value=>first</script><style data-note="x > y">second</style>';
 const blocks=[...rawElements(html,['script','style'])];
 assert.deepEqual(blocks.map(b=>[b.name,b.body,b.closed]),[
  ['script','first',true],['style','second',true]
 ]);
 assert.equal(removeElements(html,['script','style']),'  ');
});

test('long quoted > spans are traversed once without truncating selected JSON-LD',()=>{
 const note='x>'.repeat(20000);
 const html='<script type="application/ld+json" data-note="'+note+'">'+JSON.stringify(product)+'</script>';
 const [block]=rawElements(html);
 assert.equal(block.body,JSON.stringify(product));
 assert.equal(block.end,html.length);
});
