import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://shop.westrockcoffee.com/products/raiz-palmera-whole-bean-coffee';
const selected='Raiz Palmera Whole Bean Coffee Pack';
const prose='Palmera reminds us of those warm, sunny days with a cool breeze. This 100% Central/South American Arabica is blended for a medium roast and body, with a nice sweet caramel flavor, and a nutty lingering finish that is perfect for your iced or hot drinks. Looking for our High Mt. Arabica? Try the new Raiz Palmera for a sustainable upgrade with the same flavor you love!';
const page=(own=prose,extra='',h1=selected)=>'<html><head><link rel="canonical" href="'+url+'"><title>'+h1+'</title></head><body><main><article class="product"><h1>'+h1+'</h1><div class="product-description rte"><p>'+own+'</p></div></article></main>'+extra+'</body></html>';
const parse=s=>extractPublicCoffeeFacts(s,{source_url:url});
const notes=s=>parse(s).fields?.tasting_notes||'';

test('original603 #323 selected product keeps same-statement caramel and nutty lingering finish',()=>{
 const result=parse(page());
 assert.equal(result.ok,true);
 assert.equal(result.fields?.name,selected);
 assert.match(notes(page()),/nice sweet caramel/i);
 assert.match(notes(page()),/nutty lingering finish/i);
 assert.ok(!result.conflicts?.includes('tasting_notes'));
});
test('same-statement finish is generic across otherwise identical current coffee titles',()=>{
 const s=page('This 100% Arabica is made for a medium roast and body, with a rich cocoa flavor, and a toasted almond finish that is perfect for your hot drinks.','','New Spring Blend');
 assert.equal(parse(s).ok,true);
 assert.match(notes(s),/rich cocoa/i);
 assert.match(notes(s),/toasted almond finish/i);
});
test('do not borrow a nutty finish from a separate sentence, page metadata, or related product',()=>{
 const other='<aside class="related-products"><h2>Other Coffee</h2><p>With a caramel flavor, and a nutty lingering finish.</p></aside>';
 for(const s of [
   page('This coffee has a nice sweet caramel flavor. We also sell nuts.',other),
   page('This coffee has a nice sweet caramel flavor. A nutty lingering finish belongs to another offering.'),
   page('This coffee has a nice sweet caramel flavor.','<meta name="description" content="with a vanilla flavor, and a nutty lingering finish">')
 ])assert.doesNotMatch(notes(s),/nutty lingering finish/i);
});
test('conditional preparation and historical/alternative flavor sentences cannot promote the finish',()=>{
 for(const statement of [
  'If served with milk, this cup has a nice sweet caramel flavor, and a nutty lingering finish.',
  'Previously this coffee had a nice sweet caramel flavor, and a nutty lingering finish.',
  'When roasted with added chocolate, it has a caramel flavor, and a nutty lingering finish.',
  'This coffee has a caramel flavor, and a nutty lingering finish only when cooled.',
  'This coffee has a caramel flavor, and a nutty lingering finish that is perfect for milk drinks.'
 ])assert.doesNotMatch(notes(page(statement)),/nutty lingering finish/i,statement);
});
test('competing light and medium-dark roast-specific flavors remain blank and reviewable',()=>{
 const sentence='This coffee offers something different as a light roast and a medium-dark roast. As a light roast, this coffee has chocolate and red apple. As a medium-dark roast, this coffee has cocoa and caramel.';
 const r=parse(page(sentence));
 assert.ok(!r.fields?.tasting_notes||!/nutty lingering finish/i.test(r.fields.tasting_notes));
});
