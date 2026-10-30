import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
const source_url='https://roaster.example/products/selected';
const page=(name,body='')=>'<html><body><main><h1>'+name+'</h1>'+body+'</main></body></html>';
const parse=(name,body='')=>extractPublicCoffeeFacts(page(name,body),{source_url});
for(const [name,roast] of [['Rise and Shine – Medium','Medium'],['Traders Blend – Medium Dark','Medium-Dark']]){
 test('a selected product title establishes its own roast tier: '+name,()=>{
  const x=parse(name,'<p>Available only as this coffee.</p>');
  assert.equal(x.ok,true);assert.equal(x.fields.roast_level,roast);
  assert.match(coffeeUrlPreviewMarkup(x),new RegExp(roast));
 });
}
for(const [name,roast,raw] of [['Ambition','Medium-Light','Medium-light'],['Dark Raine','Dark','Dark']]){
 test('a single current selected product Coffee roast option is source-backed: '+name,()=>{
  const x=parse(name,'<form><label>Coffee roast</label><select name="options[Coffee roast]"><option value="'+raw+'" selected="selected">'+raw+'</option></select></form>');
  assert.equal(x.ok,true);assert.equal(x.fields.roast_level,roast);
 });
}
test('a literal standalone current selected limited release banner preserves original capitalization',()=>{
 const x=parse('Costa Rica Perla Negra Peaberry','<p>Fresh coffee product.</p><p><strong>LIMITED RELEASE | WHOLE BEAN ONLY</strong></p>');
 assert.equal(x.fields.release_label,'LIMITED RELEASE');
});
test('a selected menu with two roast options never establishes one fixed tier',()=>{
 const x=parse('Ambition','<select name="options[Coffee roast]"><option value="Light" selected>Light</option><option value="Dark">Dark</option></select>');
 assert.equal(x.fields.roast_level,undefined);
});
test('recommendation/related coffee Coffee roast options cannot contaminate selected coffee',()=>{
 const x=parse('Ambition','<p>Our selected espresso.</p><section class="product-recommendations"><select name="options[Coffee roast]"><option value="Dark" selected>Dark</option></select></section>');
 assert.equal(x.fields.roast_level,undefined);
});
test('an actual fixed selected roast remains when a different related coffee has its own option',()=>{
 const x=parse('Ambition','<form><select name="options[Coffee roast]"><option value="Light" selected>Light</option></select></form><section class="product-recommendations"><select name="options[Coffee roast]"><option value="Dark" selected>Dark</option></select></section>');
 assert.equal(x.fields.roast_level,'Light');
});
test('ambiguous mixed tiers, relative roast, White Coffee and Custom must never be forced into seven tiers',()=>{
 for(const value of ['Light/Medium','Medium/Medium-Dark','White Coffee','Lighter','Custom']){
  const x=parse('Test Coffee','<form><select name="options[Coffee roast]"><option value="'+value+'" selected>'+value+'</option></select></form>');
  assert.equal(x.fields.roast_level,undefined,value);
 }
});
test('noncurrent product and historical release mentions do not supply direct selected value',()=>{
 const x=parse('Current Blend','<p>Our previous coffee was a LIMITED RELEASE.</p><nav>LIMITED RELEASES Collection</nav><section class="product-recommendations"><p>LIMITED RELEASE | WHOLE BEAN ONLY</p></section>');
 assert.equal(x.fields.release_label,undefined);
});
test('an independently named selected release outranks a generic limited banner',()=>{
 const x=parse('Holy Grail No. 2: Strawberry Jam','<p><strong>LIMITED RELEASE | WHOLE BEAN ONLY</strong></p><p>Release: Holy Grail No. 2</p>');
 assert.equal(x.fields.release_label,'Holy Grail No. 2');
});
test('without a selected coffee H1, generic catalog and shop pages cannot steal a roast from a tile',()=>{
 for(const heading of ['Our Catalog','Catalog','All Coffees','Shop All','Products']){
  const x=extractPublicCoffeeFacts('<html><body><h1>'+heading+'</h1><select name="options[Coffee roast]"><option value="Dark" selected>Dark</option></select></body></html>',{source_url});
  assert.notEqual(x.fields?.roast_level,'Dark',heading);
 }
});

test('a valid roast control plus another unclassified control cannot establish one fixed roast',()=>{
 for(const other of [
  '<select name="options[Coffee roast]"><option value="Custom" selected>Custom</option></select>',
  '<select name="options[Coffee roast]"><option selected>Light</option><option>Dark</option></select>',
  '<select name="options[Coffee roast]"><option selected>Medium-Light</option></select>'
 ]){
  const x=parse('Selected Coffee','<form><select name="options[Coffee roast]"><option value="Dark" selected>Dark</option></select>'+other+'</form>');
  assert.equal(x.fields.roast_level,undefined,other);
 }
});
test('a second in-scope coffee tile menu without a special CSS classname cannot donate or validate selected roast',()=>{
 const x=parse('Selected Coffee','<form><select name="options[Coffee roast]"><option selected>Light</option></select></form>'+
  '<section class="coffee-tile"><form><select name="options[Coffee roast]"><option selected>Custom</option></select></form></section>');
 assert.equal(x.fields.roast_level,undefined);
});
test('a known separately scoped recommendation menu does not block an exact selected single fixed roast',()=>{
 const x=parse('Selected Coffee','<form><select name="options[Coffee roast]"><option selected>Dark</option></select></form>'+
  '<section class="product-recommendations"><form><select name="options[Coffee roast]"><option selected>Custom</option></select></form></section>');
 assert.equal(x.fields.roast_level,'Dark');
});
test('identically repeated responsive selected headings still permit a unique exact roast control',()=>{
 const x=extractPublicCoffeeFacts('<html><body><main><h1>Selected Coffee</h1><h1>Selected Coffee</h1>'+
  '<form><select name="options[Coffee roast]"><option value="Light" selected>Light</option></select></form></main></body></html>',{source_url});
 assert.equal(x.ok,true);
 assert.equal(x.fields.roast_level,'Light');
});
