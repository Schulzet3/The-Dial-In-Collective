import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const source_url='https://roaster.example/products/current-coffee';
const other_url='https://roaster.example/products/another-coffee';
const quote="Here's what you can expect from this coffee in 2023/24: More creamy caramel characteristics than last year's harvest with nice sweetness and a soft citrus acidity reminiscent of mandarin orange. This is a well-balanced and easy-drinking coffee.";
const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const page=(body,head='')=>head+'<main><h1>Current Coffee</h1>'+body+'</main>';
const parse=(body,head='')=>extractPublicCoffeeFacts(page(body,head),{source_url});
const product=data=>'<script type="application/ld+json">'+JSON.stringify(data)+'</script>';
const retained=(result,text)=>result.source_facts?.some(row=>String(row.value).includes(text));

// Original frozen oracle: ironcladcoffee-com__honduras-san-lazaro-ea54f0fa,
// capture product-endpoint, literal quote "this coffee in 2023/24".
// The full sentence is retained in the hash-bound original C11 replay.
test('explicit current coffee year-pair prefix survives a later comparison with the previous harvest',()=>{
 for(const body of ['<p>'+escape(quote)+'</p>',
  '<p>Here&#39;s what you can expect from this coffee in <strong>2023/24</strong>: More creamy caramel characteristics than last year&#39;s harvest.</p>']){
  const result=parse(body);
  assert.equal(result.ok,true);
  assert.equal(result.fields.release_label,'2023/24');
  assert.ok(!result.conflicts?.includes('release_label'));
  assert.ok(retained(result,'2023/24'));
  assert.ok(retained(result,"last year's harvest"));
 }
});

test('selected Product description supplies the same literal current year pair without borrowing another Product',()=>{
 const selected={'@type':'Product',name:'Current Coffee',url:source_url,description:'<p>'+quote+'</p>'};
 const other={'@type':'Product',name:'Another Coffee',url:other_url,
  description:"<p>Here's what you can expect from this coffee in 2024/25: A different release.</p>"};
 const result=parse('',product([selected,other]));
 assert.equal(result.fields.release_label,'2023/24');
 assert.ok(!result.conflicts?.includes('release_label'));
 assert.ok(result.source_facts?.some(row=>row.source_type==='product_json'&&String(row.value).includes('2023/24')));
 const unrelated=parse('<p>A current coffee.</p>',product(other));
 assert.equal(unrelated.fields.release_label,undefined);
});

test('current year-pair prose preserves conflicts with another current claim or explicit release label',()=>{
 for(const extra of [
  "<p>Here's what you can expect from this coffee in 2024/25: A different release.</p>",
  '<p>Release: 2024/25</p>',
  '<p>Harvest: 2024/25</p>'
 ]){
  const result=parse('<p>'+escape(quote)+'</p>'+extra);
  assert.equal(result.fields.release_label,undefined,extra);
  assert.ok(result.conflicts?.includes('release_label'),extra);
  assert.ok(!result.available.includes('release_label'),extra);
  assert.ok(retained(result,'2023/24'),extra);
  assert.ok(retained(result,'2024/25'),extra);
 }
 const same=parse('<p>'+escape(quote)+'</p><p>Release: 2023/24</p>');
 assert.equal(same.fields.release_label,'2023/24');
 assert.ok(!same.conflicts?.includes('release_label'));
});

test('dated prose does not promote denied, historical, hypothetical, educational, or recommended coffee claims',()=>{
 for(const body of [
  '<p>Previously, '+escape(quote)+'</p>',
  '<p>Last year, '+escape(quote)+'</p>',
  '<p>This is not true: '+escape(quote)+'</p>',
  '<p>For example, '+escape(quote)+'</p>',
  '<p>Imagine '+escape(quote)+'</p>',
  '<h2>Learn about harvests</h2><p>'+escape(quote)+'</p>',
  '<section class="related products"><h2>Related coffees</h2><p>'+escape(quote)+'</p></section>'
 ]){
  assert.equal(parse(body).fields.release_label,undefined,body);
 }
});

test('year extraction does not guess a calendar, generic lot, series badge, SKU, or absent year',()=>{
 for(const body of [
  '<p>Harvest: December–April</p><p>Lot: Microlot</p>',
  '<p>Limited Release</p><p>Gold Collection</p>',
  '<p>42 Series</p><p>Pink Bucket Series</p>',
  '<p>SKU: 2023/24</p>',
  "<p>Here's what you can expect from this coffee in summer: A sweet cup.</p>",
  "<p>Here's what you could expect from this coffee in 2023/24: A hypothetical cup.</p>",
  "<p>Here's what you can expect from another coffee in 2023/24: A different coffee.</p>"
 ]){
  assert.equal(parse(body).fields.release_label,undefined,body);
 }
});
