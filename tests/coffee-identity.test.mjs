import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nextCoffeeAction,proposalWithRecognizedRoaster,matchReviewMarkup} from '../site/cloud/coffee-match-ui.js';

const id='12345678-1234-4123-8123-123456789abc';
const example={name:'Wuri',roaster:'Sweet Bloom Coffee Roasters',release_label:'2026 harvest',source_url:'https://sweetbloomcoffee.com/products/wuri',origin:'Gedeb'};
test('brand recognition never equates to verification of the coffee product',()=>{
 const result={classification:'new_pending',exact_id:null,candidates:[],roaster:{recognized:true,canonical_name:'Sweet Bloom'}};
 assert.equal(nextCoffeeAction(result),'submit_pending');
 const change=proposalWithRecognizedRoaster(example,result);
 assert.equal(change.proposed_data.roaster,'Sweet Bloom');
 assert.equal(change.proposed_data.roaster_as_entered,'Sweet Bloom Coffee Roasters');
 assert.equal(change.proposed_data.name,'Wuri');
 assert.equal(change.proposed_data.release_label,'2026 harvest');
 assert.equal(change.source_url,example.source_url);
 assert.equal(example.roaster,'Sweet Bloom Coffee Roasters');
});
test('unrecognized brands are never silently renamed',()=>{
 const result={classification:'new_pending',roaster:{recognized:false,canonical_name:'Another company'}};
 const out=proposalWithRecognizedRoaster(example,result);
 assert.equal(out.proposed_data.roaster,'Sweet Bloom Coffee Roasters');
 assert.ok(!('roaster_as_entered' in out.proposed_data));
});
test('only authenticated server-classified verified identity selects automatically',()=>{
 assert.equal(nextCoffeeAction({classification:'exact_verified',exact_id:id}),'reuse_verified');
 assert.equal(nextCoffeeAction({classification:'needs_confirmation',exact_id:id,candidates:[{id}]}),'ask_user');
 assert.equal(nextCoffeeAction({classification:'exact_verified',exact_id:'<script>bad</script>'}),'submit_pending');
 assert.equal(nextCoffeeAction({classification:'new_pending',roaster:{recognized:true},exact_id:id}),'submit_pending');
});
test('probable duplicates require a deliberate user confirmation',()=>{
 assert.equal(nextCoffeeAction({classification:'needs_confirmation',candidates:[{id}]}),'ask_user');
 assert.equal(nextCoffeeAction({classification:'needs_confirmation',candidates:[]}),'submit_pending');
 const html=matchReviewMarkup({candidates:[{id,name:'Wuri',roaster:'Sweet Bloom',release_label:'2026 harvest',origin:'Gedeb'}]});
 assert.match(html,/Use existing/);
 assert.match(html,/This is a different coffee/);
 assert.match(html,/Different harvests or releases can be distinct/);
 assert.doesNotMatch(html,/data-action="approve"|data-action="merge"/);
});
test('untrusted catalog strings cannot inject script, markup, or fake buttons',()=>{
 const html=matchReviewMarkup({candidates:[{
  id:'\"><img src=x onerror=alert(1)>',
  name:'<script>alert(2)</script>',
  roaster:'<svg onload=alert(3)>',
  origin:'\"><a href="javascript:alert(1)">Hi</a>',
  release_label:'<p>2026</p>'
 }]});
 assert.doesNotMatch(html,/<script>|<img|<svg|<a href="javascript:|<p>2026/);
 assert.match(html,/&lt;script&gt;/);
 assert.match(html,/&lt;svg/);
 assert.match(html,/&lt;p&gt;/);
});
test('client and UI use the server matcher before existing verified or pending actions',()=>{
 const cloud=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 const client=readFileSync(new URL('../site/cloud/client.js',import.meta.url),'utf8');
 const source=readFileSync(new URL('../supabase/migrations/20261014215731_dic_roaster_identity_matching.sql',import.meta.url),'utf8');
 assert.match(cloud,/this\.client\.findCoffeeMatches\(d\)/);
 assert.match(cloud,/add_verified_coffee/);
 assert.match(cloud,/submit_coffee/);
 assert.match(cloud,/matchReviewMarkup\(matched\)/);
 assert.match(cloud,/Release \/ harvest/);
 assert.match(client,/rpc\('dic_find_coffee_matches',\{payload\}\)/);
 assert.match(source,/private\.is_member\(\)/);
 assert.match(source,/create function public\.dic_find_coffee_matches\(payload jsonb\)/);
 assert.match(source,/source_kind='roaster_page'/);
 assert.match(source,/checked_at>=now\(\)-interval '120 days'/);
});
