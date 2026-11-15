import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {inferDecaffeinationMethod} from '../src/server/coffee-decaffeination-method.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';

// Source-constrained synthetic adversarial fixtures, not a replacement for live official HTML.
const cases={
  376:{name:'Meseta de Popayan DECAF - Colombia',
    url:'https://tenfoldcoffee.com/products/meseta-de-popayan-decaf-colombia'},
  377:{name:'San Lorenzo X',url:'https://tenfoldcoffee.com/products/san-lorenzo-x'},
  378:{name:'Bulaago Natural',url:'https://tenfoldcoffee.com/products/umoja-pb-copy'}
};
function parse(n,own,related=''){
  const c=cases[n];
  const schema={'@context':'https://schema.org','@type':'Product',name:c.name,url:c.url};
  const html='<html><head><title>'+c.name+' | Tenfold Coffee</title>'+
   '<script type="application/ld+json">'+JSON.stringify(schema)+'</script></head>'+
   '<body><main><article class="product"><h1>'+c.name+'</h1>'+
   '<div class="product-description">'+own.map(s=>'<p>'+s+'</p>').join('')+
   '</div></article></main>'+related+'</body></html>';
  return extractPublicCoffeeFacts(html,{source_url:c.url});
}
test('#376 direct own EA decaffeination has Sugar Process method, never generic green Natural',()=>{
  assert.equal(inferDecaffeinationMethod({
    name:cases[376].name,selectedMethod:'Processing Method: Ethyl Acetate Decaffeination'
  }),'Sugar Process');
  const p=parse(376,['Country: Colombia','Region: Popayán, Cauca',
    'Processing Method: Ethyl Acetate Decaffeination',
    'Tasting Notes: Grapefruit, Toffee, Juicy']);
  assert.equal(p.ok,true);
  assert.equal(p.fields.name,cases[376].name);
  assert.notEqual(p.fields.process,'Natural');
  assert.notEqual(p.fields.process,'Washed');
});
test('#377 explicit selected named lot is not a recurring harvest season',()=>{
  const p=parse(377,['Country: Guatemala','Region: Cobán',
    'Producer: Luis Wicho Valdés III','Process: Washed',
    'Harvest: November–April','Lot: San Lorenzo X','Tasting Notes: Yuzu, Bergamont, Winey']);
  assert.equal(p.ok,true);
  assert.equal(p.fields.name,cases[377].name);
  assert.equal(p.fields.process,'Washed');
  assert.doesNotMatch(String(p.fields.release_label||''),/november|april/iu);
});
test('#378 archived Umoja slug must not replace the current exact Bulaago selected identity',()=>{
  const p=parse(378,['Country: Uganda','Region: Mt Elgon','Community: Bulaago',
    'Producer: Smallholder producer group','Export Partner: Zukuka Bora',
    'Process: Natural','Producers: 208 contributing in 2024',
    'Tasting Notes: Cherry, Apricot & Light']);
  assert.equal(p.ok,true);
  assert.equal(p.fields.name,'Bulaago Natural');
  assert.equal(p.fields.process,'Natural');
  assert.notEqual(p.fields.name,'Umoja PB');
  assert.doesNotMatch(String(p.fields.release_label||''),/2024/iu);
});
test('sensory word Light alone does not prove a roast level',()=>{
  const p=parse(378,['Country: Uganda','Process: Natural',
    'Tasting Notes: Cherry, Apricot & Light','208 producers contributed in 2024']);
  assert.equal(p.ok,true);
  assert.notEqual(p.fields.roast_level,'Light');
});
test('#376 unrelated product sidebar cannot donate fruit notes or a different process',()=>{
  const p=parse(376,['Country: Colombia',
    'Processing Method: Ethyl Acetate Decaffeination',
    'Tasting Notes: Grapefruit, Toffee, Juicy'],
    '<aside class="related-products"><h2>San Lorenzo X</h2>'+
    '<p>Yuzu, Bergamont, Winey; Process: Washed</p></aside>');
  assert.equal(p.ok,true);
  assert.doesNotMatch(String(p.fields.tasting_notes||''),/bergamont|winey|yuzu/iu);
  assert.notEqual(p.fields.process,'Washed');
});
test('#378 export/processing partner must not automatically become an individual grower',()=>{
  const p=parse(378,['Country: Uganda','Producer: Smallholder producer group',
    'Export Partner: Zukuka Bora','Process: Natural']);
  assert.equal(p.ok,true);
  assert.notEqual(p.fields.producer,'Zukuka Bora');
});
test('nondecaf current selected coffee cannot borrow EA from sibling decaf',()=>{
  assert.equal(inferDecaffeinationMethod({
    name:'San Lorenzo X',selectedMethod:'Ethyl Acetate Decaffeination'
  }),'');
});
test('opposing selected EA and water decaffeination evidence stays undecided',()=>{
  assert.equal(inferDecaffeinationMethod({
    name:cases[376].name,selectedMethod:'Ethyl Acetate Decaffeination and Swiss Water'
  }),'');
});
test('unreachable original is not a synthetic pass without current official source',()=>{
  const failures=requiredFocusedSourceFailures([376],
    [{number:376,status:'UNAVAILABLE',parser_ok:false}]);
  assert.ok(failures.some(x=>x.reason==='required_official_source_not_fetched'));
});
