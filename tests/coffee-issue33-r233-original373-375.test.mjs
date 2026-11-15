import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {inferDecaffeinationMethod} from '../src/server/coffee-decaffeination-method.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';

const selected={
 373:{name:'Decaf Nicaragua Jinotega Micro Lot',url:'https://talkingcrowcoffeeroasters.com/products/decaf-nicaragua-jinotega-micro-lot',green:'Natural',notes:'Cherry, Apple, Red Wine, Grilled Pineapple'},
 374:{name:'Decaf Peru Cajamarca',url:'https://talkingcrowcoffeeroasters.com/products/decaf-peru-swiss-water-process',green:'Washed',notes:'Mango, Orange, Nougat, Cocoa'},
 375:{name:'Decaf Brazil Whiskey Barrel Aged',url:'https://talkingcrowcoffeeroasters.com/products/decaf-whiskey-barrel-aged-brazil',green:'Natural',notes:'Vanilla, Honey, Oak, Nutty, Spice'}
};
function parse(n,own,related=''){
 const c=selected[n];
 const schema={'@context':'https://schema.org','@type':'Product',name:c.name,url:c.url};
 const html='<html><head><title>'+c.name+' | Talking Crow</title><script type="application/ld+json">'+
  JSON.stringify(schema)+'</script></head><body><main><article class="product"><h1>'+c.name+
  '</h1><div class="product-description">'+own.map(x=>'<p>'+x+'</p>').join('')+
  '</div></article></main>'+related+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:c.url});
}
for(const [id,c] of Object.entries(selected)){
 test('#'+id+' exact product keeps its own green processing distinct from decaf',()=>{
  const p=parse(Number(id),['Origin: '+(id==='374'?'Cajamarca, Peru':id==='373'?'Jinotega, Nicaragua':'Brazil'),
   'Process: '+c.green,'Decaffeination Method: Swiss Water Process','Tasting Notes: '+c.notes]);
  assert.equal(p.ok,true);
  assert.equal(p.fields.name,c.name);
  assert.equal(p.fields.process,c.green);
  assert.notEqual(p.fields.process,'Water Process');
  assert.doesNotMatch(String(p.fields.tasting_notes||''),/unrelated sibling coffee|generic page menu/iu);
 });
}
test('Swiss Water is a decaffeination method, not green Washed process',()=>{
 const method=inferDecaffeinationMethod({name:selected[373].name,selectedMethod:'Method: Swiss Water Process (chemical-free)'});
 assert.equal(method,'Water Process');
});
test('opposing selected decaffeination methods stay blank and reviewable',()=>{
 const method=inferDecaffeinationMethod({name:selected[374].name,selectedMethod:'Swiss Water Process; Sugarcane Ethyl Acetate'});
 assert.equal(method,'');
});
test('regular coffee cannot borrow a decaf method from generic FAQ',()=>{
 assert.equal(inferDecaffeinationMethod({name:'Regular Colombia',selectedMethod:'Swiss Water Process'}),'');
});
test('half caf cannot become an unqualified fully decaffeinated coffee',()=>{
 assert.equal(inferDecaffeinationMethod({name:'Half Caf Brazil',selectedMethod:'Swiss Water Process'}),'');
});
test('#375 whiskey barrel treatment cannot substitute for Natural green processing',()=>{
 const p=parse(375,['Origin: Brazil','Process: Natural','Decaffeination Method: Swiss Water Process',
  'Barrel: Retired bourbon barrels','Tasting Notes: Vanilla, Honey, Oak, Nutty, Spice']);
 assert.equal(p.ok,true);assert.equal(p.fields.process,'Natural');
});
test('exact selected notes must not be obtained from another coffee product card',()=>{
 const p=parse(373,['Origin: Jinotega, Nicaragua','Process: Natural','Tasting Notes: Cherry, Apple, Red Wine'],
  '<aside class="related-products"><h2>Decaf Peru Cajamarca</h2><p>Mango, Orange, Nougat, Cocoa</p></aside>');
 assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/mango|nougat|cocoa/iu);
});
test('unavailable original does not pass merely because zero fetched records were eligible',()=>{
 const f=requiredFocusedSourceFailures([373],[{number:373,status:'UNAVAILABLE',parser_ok:false}]);
 assert.ok(f.some(x=>x.reason==='required_official_source_not_fetched'));
});
