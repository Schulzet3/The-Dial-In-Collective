import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {isolateCoffeeIdentityCohorts} from '../src/server/coffee-source-identity-scope.mjs';

const name='Decaf - Swiss Water Process - Medium Roast';
const intro='<p>This ethically sourced blend has multiple origins: Colombia, Ethiopia, Honduras, Mexico and Indonesia.</p><p>Decaffeinated.</p>';
const foreign='<p>With regards to acidity and brightness, Kenya is widely recognized as the king of the hill, and our Kenya AB has been selected at auction as an expertly processed, top-notch offering not to be missed.</p>';
const specs='<p>Cupping Notes: Currant, black tea, blackberry</p><p>Producer: Small Farm Holders</p>'+
 '<p>Region: Mt. Kenya, Central Kenya</p><p>Variety: Mix of Varietals</p><p>Processing: Washed, and then sun dried</p>'+
 '<p>Altitude: 4600–6500ft (1400–2000m)</p><p>Coffee Grading: AB</p>';
const scope=html=>isolateCoffeeIdentityCohorts(html,{name});
const plain=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();

test('a later named foreign coffee with corroborating specification cohort is quarantined',()=>{
 const source=intro+foreign+specs,result=scope(source);
 assert.equal(result.origin,'Colombia, Ethiopia, Honduras, Mexico and Indonesia');
 assert.match(result.html,/Decaffeinated/);assert.doesNotMatch(result.html,/Kenya|Small Farm Holders|1400/);
 assert.deepEqual(result.quarantined_fields,['elevation_m','origin','process','producer','tasting_notes','variety']);
 assert.equal(result.conflicts,undefined);assert.equal(result.quarantined.length,1);
 const range=result.quarantined[0];assert.equal(range.start,intro.length);assert.equal(range.end,source.length);
 assert.match(source.slice(range.start,range.end),/our Kenya AB/);
});
test('flattened selected Product JSON description retains the same identity boundary',()=>{
 const source=plain(intro+foreign+specs),result=scope(source);
 assert.match(result.html,/Decaffeinated/);assert.doesNotMatch(result.html,/Kenya|Small Farm Holders/);
 assert.equal(result.quarantined.length,1);assert.equal(result.origin,'Colombia, Ethiopia, Honduras, Mexico and Indonesia');
});
test('an exact later current-name heading resumes current-product facts',()=>{
 const result=scope(intro+foreign+specs+'<h2>'+name+'</h2><p>Variety: Caturra</p>');
 assert.match(result.html,/Variety: Caturra/);assert.doesNotMatch(result.html,/Small Farm Holders/);
});
test('generic detail headings do not resume a foreign coffee',()=>{
 const result=scope(intro+foreign+specs+'<h2>Product Details</h2><p>Variety: Robusta</p>');
 assert.doesNotMatch(result.html,/Robusta/);
});
test('a sentence-initial Our keeps the named coffee case requirement',()=>{
 const result=scope(intro+'<p>Our Kenya AB coffee has a bright cup.</p>'+specs);
 assert.equal(result.quarantined.length,1);assert.doesNotMatch(result.html,/Small Farm Holders/);
 assert.equal(scope(intro+'<p>Our kenya ab coffee has a bright cup.</p>'+specs).quarantined.length,0);
});
test('country outside the list needs a positively named different coffee',()=>{
 for(const story of ['<p>Farmers in Kenya grow coffee near these mountains.</p>',
  '<p>Kenya coffee is often washed.</p>','<p>Our Kenya farmer lives on a farm.</p>'])
  assert.equal(scope(intro+story+specs).quarantined.length,0);
});
test('same-country named coffee alone is not enough to quarantine',()=>{
 const source=intro+foreign.replaceAll('Kenya','Colombia')+specs.replaceAll('Kenya','Colombia');
 assert.equal(scope(source).quarantined.length,0);
});
test('a component explicitly belonging to the selected blend remains available',()=>{
 for(const story of ['<p>One component of this blend is our Kenya AB coffee.</p>',
  '<p>Our Kenya AB coffee is a component of this blend.</p>'])
  assert.equal(scope(intro+story+specs).quarantined.length,0);
});
test('named foreign coffee must be followed by corroborating origin and multiple labels',()=>{
 for(const detail of ['<p>Region: Kenya</p>',specs.replaceAll('Kenya','Colombia'),
  '<p>Producer: Kenya Hills</p><p>Variety: Bourbon</p><p>Process: Washed</p>'])
  assert.equal(scope(intro+foreign+detail).quarantined.length,0);
});
test('generic country lessons and quoted examples cannot establish current blend identity',()=>{
 for(const first of ['<p>For example, this blend has multiple origins: Colombia, Ethiopia.</p>',
  '<p>Example: "This blend has multiple origins: Colombia, Ethiopia."</p>',
  '<p>A blend can include coffee from Colombia and Ethiopia.</p>'])
  assert.equal(scope(first+foreign+specs).quarantined.length,0);
});
test('comparisons and negations do not assert a separate coffee section',()=>{
 for(const story of ['<p>Unlike our Kenya AB coffee, this blend is decaffeinated.</p>',
  '<p>This blend is not our Kenya AB coffee.</p>',
  '<p>We compare our Kenya AB coffee with this blend.</p>'])
  assert.equal(scope(intro+story+specs).quarantined.length,0);
});
test('an absent or single-country initial blend list never starts quarantine',()=>{
 for(const first of ['', '<p>This blend comes from Colombia.</p>'])
  assert.equal(scope(first+foreign+specs).quarantined.length,0);
});
test('script, style, comment and navigation examples do not become product evidence',()=>{
 for(const wrap of [x=>'<script>'+x+'</script>',x=>'<style>'+x+'</style>',x=>'<!--'+x+'-->',x=>'<nav>'+x+'</nav>']){
  assert.equal(scope(wrap(intro)+foreign+specs).quarantined.length,0);
  assert.equal(scope(intro+wrap(foreign+specs)).quarantined.length,0);
 }
});
test('unknown regional names do not gain a country through geography guessing',()=>{
 assert.equal(scope(intro+foreign+specs.replace('Mt. Kenya, Central Kenya','Nyeri')).quarantined.length,0);
});
test('a reference equal to the selected name is not a different coffee',()=>{
 const result=isolateCoffeeIdentityCohorts(intro+foreign+specs,{name:'Kenya AB'});
 assert.equal(result.quarantined.length,0);
});
test('entity decoding and quoted angle brackets preserve original input offsets',()=>{
 const start=intro+'<div title="a > b &amp; c"></div>',story=foreign.replace('Kenya AB','Kenya A&#66;');
 const source=start+story+specs,result=scope(source),range=result.quarantined[0];
 assert.ok(range);assert.equal(range.start,start.length);
 assert.match(source.slice(range.start,range.end),/Kenya A&#66;/);assert.equal(result.html.length,source.length);
});
test('incompatible current blend lists do not produce a made-up union',()=>{
 const source=intro+'<p>This blend has multiple origins: Brazil, Peru.</p>'+foreign+specs,result=scope(source);
 assert.equal(result.origin,undefined);assert.equal(result.quarantined.length,0);
});
test('unscanned structural and input tails are withheld with a truncation receipt',()=>{
 for(const source of [intro+'<div>'.repeat(130)+foreign+specs,
  intro+'<span></span>'.repeat(40001)+foreign+specs,
  intro+' '.repeat(2_000_000)+foreign+specs]){
  const result=scope(source);assert.equal(result.truncated,true);assert.ok(result.html.length<source.length);
  assert.doesNotMatch(result.html,/Kenya AB/);
 }
});
test('adversarial malformed and repeated labels stay within a bounded child run',()=>{
 const source="import {isolateCoffeeIdentityCohorts as isolate} from './src/server/coffee-source-identity-scope.mjs';"+
  "for(const html of ['<h1>'.repeat(400000),'<p>Region: Kenya</p>'.repeat(70000),'a'.repeat(2000000)])isolate(html,{name:'Current Blend'});console.log('bounded');";
 const child=spawnSync(process.execPath,['--input-type=module','-e',source],{cwd:new URL('..',import.meta.url),timeout:4000,encoding:'utf8'});
 assert.equal(child.error,undefined,child.error?.message);assert.equal(child.status,0,child.stderr);assert.equal(child.stdout.trim(),'bounded');
});
