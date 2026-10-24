import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const source_url='https://roaster.example/products/current-coffee';
const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const parse=body=>extractPublicCoffeeFacts('<main><h1>Current Coffee</h1>'+body+'</main>',{source_url});
const retained=(result,text)=>result.source_facts?.some(row=>String(row.value).includes(text));
const association='(FUDAM) is a 300-member association of organic-certified (and Rainforest Alliance–certified) growers that was founded in the year 2000 by just seven producers who shared a vision of sustainable agriculture as well as environmental protection and development.';
const farms='Bali Blue Moon comes from the Kintamani highlands of central Bali, where small family farms work a few acres at a time and grow coffee right alongside citrus trees in volcanic loam soil, between 1,200 and 1,600 meters.';
const operator='What happened is that Gold Mountain sealed ripe Pacamara cherries in a tank without oxygen, fermented them twice, and put real pumpkin spice in with them.';
const biography='Dehab Bitewlign has been working hard her whole life – she’s a mom, a wife, an accountant, and most recently an amazing coffee producer!';
const cases=[
 [association,'FUDAM'],
 [farms,'small family farms'],
 [operator,'Gold Mountain'],
 [biography,'Dehab Bitewlign']
];

// These literal public excerpts were independently projected from the
// unchanged original frozen603 replay. They do not replace full captures.
test('current producer roles remain explicit through certification, cultivation, processing, and biography grammar',()=>{
 for(const [quote,producer] of cases){
  const result=parse('<p>'+escape(quote)+'</p>');
  assert.equal(result.ok,true);
  assert.equal(result.fields.producer,producer);
  assert.ok(retained(result,quote));
 }
});

test('a named processing actor requires cherries in a tank and preserves the oxygen-free source qualification',()=>{
 const result=parse('<p>'+operator+'</p>');
 assert.equal(result.fields.producer,'Gold Mountain');
 assert.ok(retained(result,'without oxygen'));
 for(const text of [
  'Gold Mountain sealed a bag of roasted coffee.',
  'Gold Mountain sealed ripe cherries in a cardboard box.',
  'Gold Mountain sealed fresh strawberries in a tank.',
  'Gold Mountain did not seal ripe Pacamara cherries in a tank without oxygen.',
  'Previously Gold Mountain sealed ripe Pacamara cherries in a tank without oxygen.',
  'In 2020 Gold Mountain sealed ripe Pacamara cherries in a tank without oxygen.'
 ])assert.equal(parse('<p>'+text+'</p>').fields.producer,undefined,text);
});

test('a current biographical producer role cannot be borrowed from a relative or a different occupation',()=>{
 for(const text of [
  'Dehab Bitewlign has been working hard her whole life – she’s the daughter of an amazing coffee producer!',
  'Dehab Bitewlign has been working hard her whole life – she’s a mom, a wife, an accountant, and most recently an amazing film producer!',
  'Dehab Bitewlign has been working hard her whole life – she’s a mom, a wife, an accountant, and is not a coffee producer!',
  'Last year '+biography
 ])assert.equal(parse('<p>'+escape(text)+'</p>').fields.producer,undefined,text);
});

test('certification parentheses do not turn buyers or denied growers into a producer group',()=>{
 for(const text of [
  '(FUDAM) is a 300-member association of organic-certified (and Rainforest Alliance–certified) coffee buyers.',
  '(FUDAM) is not a 300-member association of organic-certified (and Rainforest Alliance–certified) growers.',
  'Previously '+association
 ])assert.equal(parse('<p>'+escape(text)+'</p>').fields.producer,undefined,text);
 const result=parse('<p>'+escape(association)+'</p>');
 assert.ok(retained(result,'Rainforest Alliance–certified'));
 assert.ok(retained(result,'founded in the year 2000'));
});

test('working farms must explicitly grow coffee rather than a different crop or fictional coffee',()=>{
 for(const text of [
  'Small family farms work a few acres at a time and grow citrus trees.',
  'Small family farms work a few acres at a time but do not grow coffee.',
  'For example, '+farms,
  'Last year '+farms
 ])assert.equal(parse('<p>'+escape(text)+'</p>').fields.producer,undefined,text);
});

test('current-role additions remain inside selected visible prose and reject history, denial and educational context',()=>{
 for(const [quote] of cases){
  for(const body of [
   '<p>This is not true: '+escape(quote)+'</p>',
   '<p>Last year '+escape(quote)+'</p>',
   '<h2>Learn about producers</h2><p>'+escape(quote)+'</p>',
   '<section class="related products"><h2>Related coffees</h2><p>'+escape(quote)+'</p></section>'
  ])assert.equal(parse(body).fields.producer,undefined,body);
 }
});

test('competing current producer actors and explicit source contradictions still remain withheld',()=>{
 const other=operator.replace('Gold Mountain','Silver Valley');
 const actors=parse('<p>'+operator+'</p><p>'+other+'</p>');
 assert.equal(actors.fields.producer,undefined);
 for(const [quote] of cases){
  const result=parse('<p>Producer: Ana Torres</p><p>Producer: Maria Lopez</p><p>'+escape(quote)+'</p>');
  assert.equal(result.fields.producer,undefined);
  assert.ok(result.conflicts?.includes('producer'));
 }
});

test('an unrelated structured Product cannot donate any new current producer role',()=>{
 for(const [quote] of cases){
  const other={'@type':'Product',name:'Another Coffee',url:'https://roaster.example/products/another-coffee',description:quote};
  const result=parse('<script type="application/ld+json">'+JSON.stringify(other)+'</script><p>A current selected coffee.</p>');
  assert.equal(result.fields.producer,undefined);
 }
});
