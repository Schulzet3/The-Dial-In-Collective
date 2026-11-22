// #33 R399: exact selected current product #99, never a cross-product producer guess.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

const url='https://dekaf.com/products/guatemala-finca-santa-isabel';
const name='Guatemala Finca Santa Isabel';
function parse(body){
 const structured=JSON.stringify({'@context':'https://schema.org','@type':'Product',name,url,brand:{'@type':'Brand',name:'DEKAF'}});
 return extractPublicCoffeeFacts('<html><head><script type="application/ld+json">'+structured+'</script></head>'+
 '<body><nav><p>Producer: Wrong Menu</p></nav><main><h1>'+name+'</h1>'+body+'</main>'+
 '<footer><p>Producer: Wrong Footer</p></footer></body></html>',{source_url:url});
}
const realSelected='Carefully cultivated by the Keller family for over a century, Finca Santa Isabel coffee reflects a legacy of tradition and sustainability.';

test('selected #99 direct named family keeps its name but excludes temporal cultivation tenure',()=>{
 const r=parse('<section><h2>FINCA SANTA ISABEL</h2><p>'+realSelected+'</p></section>');
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,name);
 assert.equal(r.fields.producer,'Keller family');
 assert.ok(!r.conflicts?.includes('producer'));
 assert.match(coffeeUrlPreviewMarkup(r),/Keller family/);
 assert.doesNotMatch(String(r.fields.producer),/century|Wrong Menu|Wrong Footer/);
});

test('closed numeric or worded tenure is not part of an otherwise named growing collective',()=>{
 for(const [source,expected] of [
  ['Cultivated by the Gomez family for 35 years, the selected coffee grows in Guatemala.','Gomez family'],
  ['Grown by the Ruiz family for more than three decades, this lot comes from Guatemala.','Ruiz family'],
  ['Produced by the Soto family for over a century, this coffee is from Guatemala.','Soto family']
 ]){
  const r=parse('<p>'+source+'</p>');
  assert.equal(r.fields.producer,expected,source);
 }
});

test('a for-phrase that is NOT a closed tenure must not be silently shortened',()=>{
 const r=parse('<p>Cultivated by the Gomez family for Coffee Futures, this coffee is grown in Guatemala.</p>');
 assert.equal(r.fields.producer,'Gomez family for Coffee Futures');
});

test('explicit named producer captions remain authoritative; scope excludes unrelated suppliers',()=>{
 const explicit=parse('<p>Producer: Keller Family for Earth</p><p>'+realSelected+'</p>');
 assert.equal(explicit.fields.producer,'Keller Family for Earth');
 const absent=parse('<p>For another coffee, cultivated by the Keller family for over a century.</p>');
 assert.equal(absent.fields.producer,undefined);
});

test('independent current conflicting family credits never collapse into one name',()=>{
 const r=parse('<p>'+realSelected+'</p><p>Cultivated by the Ruiz family for 25 years, this selected coffee is grown in Guatemala.</p>');
 assert.equal(r.fields.producer,undefined);
});
