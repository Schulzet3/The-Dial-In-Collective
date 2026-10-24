// New adversarial source cases from the independent parser audit. These are
// synthetic, isolated fragments; no expected facts come from extractor output.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractNarrativeCoffeeEvidence} from '../src/server/coffee-narrative-evidence.mjs';
import {extractProductFlavorEvidence,extractProductImageTextEvidence} from '../src/server/coffee-flavor-evidence.mjs';

const source_url='https://roaster.example/products/current-coffee';
const clean=(value,max=300)=>String(value).replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().slice(0,max);
const markup=(body,name='Current Coffee')=>'<main><h1>'+name+'</h1>'+body+'</main>';
const parse=(body,name='Current Coffee')=>extractPublicCoffeeFacts(markup(body,name),{source_url});
const narrative=body=>extractNarrativeCoffeeEvidence(markup(body),{name:'Current Coffee'});
const profile=(notes='peach, honey',roast='light',name='Current Coffee')=>
 '<img alt="'+name+' coffee profile card; notes of '+notes+'; '+roast+' roast">';

for(const body of [
 '<p>This coffee does not undergo anaerobic fermentation.</p>',
 '<p>Anaerobic fermentation is not used for this coffee.</p>',
 '<h3>Without anaerobic fermentation</h3><p>This coffee retains its ordinary washed profile.</p>',
 '<h2>Carbonic Maceration glossary</h2><p>The label explains a technique used elsewhere.</p>',
 '<h2>The Story</h2><p>This coffee is not an anaerobic natural coffee. These beans are washed.</p>',
 '<h2>The Story</h2><p>This coffee is never fermented anaerobically in sealed tanks.</p>'
])test('negated or educational process is not a current-lot fact: '+clean(body,90),()=>{
 assert.equal(narrative(body).fields.process,undefined);
 assert.equal(narrative(body).details.processing_detail,undefined);
 const result=parse(body);
 assert.equal(result.fields.process,body.includes('These beans are washed.')?'Washed':undefined);
 assert.equal(result.roaster_details?.processing_detail,undefined);
});

test('negated and historical growers cannot become named current producers',()=>{
 for(const body of [
  '<p>This lot was not produced by Ana Torres.</p>',
  "<p>Last year's coffee was produced by Ana Torres. This year we chose a different farm.</p>"
 ]){
  assert.equal(narrative(body).details.named_producer,undefined);
  assert.equal(parse(body).roaster_details?.named_producer,undefined);
 }
});
test('grower names end at the sentence boundary and preserve full multilingual names',()=>{
 for(const [name,tail] of [
  ['Ana Torres','. Her farm has fertile soil.'],
  ['José Luis Rodríguez López','.'],
  ['Luis de la Cruz','.'],
  ['Ana María de la Cruz Gómez','.']
 ]){
  const result=parse('<p>This coffee is produced by '+name+tail+'</p>');
  assert.equal(result.roaster_details?.named_producer,name);
 }
});
test('an explicit joint grower credit retains both people, while contradictory credits stay unresolved',()=>{
 const joint=parse('<p>This coffee is produced by Ana Torres and Rosa Martínez.</p>');
 assert.equal(joint.roaster_details?.named_producer,'Ana Torres and Rosa Martínez');
 const conflicting=parse('<p>This coffee is produced by Ana Torres.</p><p>This coffee is produced by Rosa Martínez.</p>');
 assert.equal(conflicting.roaster_details?.named_producer,undefined);
});
test('a farm heading cannot overwrite the explicitly named owner in its own farm story',()=>{
 const result=parse('<h2>Sobre la finca</h2><div>Aquiares es propiedad de Diego Robelo y su familia.</div>'+
  '<h3>Finca Aquiares, Costa Rica</h3>');
 assert.equal(result.fields.producer,'Diego Robelo y su familia');
 assert.equal(result.roaster_details?.named_producer,'Diego Robelo y su familia');
 assert.equal(result.roaster_details?.farm,'Finca Aquiares');
 const english=parse('<h2>About the farm</h2><div>Finca Verde is owned by Ana Torres and her family.</div>');
 assert.equal(english.fields.producer,'Ana Torres and her family');
 assert.equal(english.roaster_details?.farm,'Finca Verde');
});
test('narrative altitude needs a current-coffee context and a plausible ascending physical range',()=>{
 for(const body of [
  '<p>Coffee is generally grown at 1800 meters for desirable flavor.</p>',
  '<p>This coffee is grown at 99999 meters.</p>',
  '<p>This coffee is grown at 2200–1200 meters.</p>',
  '<p>This coffee is not grown at 1800 meters.</p>'
 ]){
  assert.equal(narrative(body).fields.elevation_m,undefined);
  assert.equal(parse(body).fields.elevation_m,undefined);
 }
 const result=parse('<p>This coffee is grown at 1,800–2,200 meters.</p>');
 assert.equal(result.fields.elevation_m,'1800–2200 masl');
 assert.equal(parse('<p>This lot was cultivated at an elevation of 1850 meters above sea level.</p>').fields.elevation_m,'1850 masl');
});
test('wash finishing evidence must belong to the actual fermentation paragraph',()=>{
 const result=parse('<h3>Carbonic Maceration</h3><p>This coffee stays in a sealed tank.</p>'+
  '<p>In a different process, other coffees are then washed.</p>');
 assert.equal(result.fields.process,'Anaerobic');
 assert.equal(result.roaster_details?.processing_detail,'Carbonic Maceration');
 const positive=parse('<h3>Carbonic Maceration</h3><p>This coffee uses carbonic maceration. '+
  'Whole cherries rest in sealed tanks before the coffee is washed clean and dried.</p>');
 assert.match(positive.roaster_details?.processing_detail||'',/washed finish/);
});
test('late current-product facts survive more than ninety paragraphs and long visible prose',()=>{
 const filler='<p>'+('A careful harvesting story. '.repeat(50))+'</p>';
 const result=parse(filler.repeat(100)+'<p>This coffee is produced by Ana Torres.</p>'+
  '<p>This coffee is grown at 1850 meters.</p>');
 assert.equal(result.roaster_details?.named_producer,'Ana Torres');
 assert.equal(result.fields.elevation_m,'1850 masl');
});
test('decoration and ordinary wrappers do not hide explicit later narrative and flavor facts',()=>{
 const decoration='<div aria-hidden="true">'+('<svg><path d="0,1"/></svg>'.repeat(1900))+'</div>';
 const body=decoration+'<section class="description"><div class="flavor-profile">'+
  '<span>Peach</span><span>Honey</span></div></section><p>This coffee is produced by Ana Torres.</p>';
 const result=parse(body);
 assert.equal(result.fields.tasting_notes,'Peach, Honey');
 assert.equal(result.roaster_details?.named_producer,'Ana Torres');
 assert.equal(extractProductFlavorEvidence(markup(body),{clean}),'Peach, Honey');
});
test('an identified Product without H1 can still supply explicitly named flavor and narrative regions',()=>{
 const product={'@type':'Product',name:'Current Coffee',url:source_url};
 const html='<script type="application/ld+json">'+JSON.stringify(product)+'</script><main>'+
  '<div class="flavor-profile"><span>Peach</span><span>Honey</span></div>'+
  '<p>This coffee is produced by Ana Torres.</p></main>';
 const result=extractPublicCoffeeFacts(html,{source_url});
 assert.equal(result.fields.tasting_notes,'Peach, Honey');
 assert.equal(result.roaster_details?.named_producer,'Ana Torres');
});
test('span wrappers do not merge distinct flavor chips into a new flavor',()=>{
 const result=parse('<section><div class="flavor-profile"><span><span>Peach</span>'+
  '<span>Honey</span></span></div></section>');
 assert.equal(result.fields.tasting_notes,'Peach, Honey');
});
for(const [value,expected] of [
 ['Chocolate','Chocolate'],['70% dark chocolate, orange, honey','70% dark chocolate, orange, honey'],
 ['Peach | Honey | Almond','Peach, Honey, Almond'],['Peach • Honey • Almond','Peach, Honey, Almond']
])test('explicit flavor lists preserve valid source notation: '+value,()=>{
 assert.equal(parse('<p class="tasting-notes">'+value+'</p>').fields.tasting_notes,expected);
});
test('flavor containers cannot turn recipes, prices or impossible percentages into notes',()=>{
 for(const value of ['18g dose, 36g yield','$20, $25','170% dark chocolate, honey'])
  assert.equal(parse('<p class="tasting-notes">'+value+'</p>').fields.tasting_notes,undefined);
});
test('known flavor classes match complete attribute tokens',()=>{
 const result=parse('<em class="old-product__ingredients">old apple, old pear</em>'+
  '<em class="product__ingredients">Peach, Honey</em>');
 assert.equal(result.fields.tasting_notes,'Peach, Honey');
});
test('image profile evidence comes only from a real unique alt attribute',()=>{
 const description='Current Coffee coffee profile card; notes of peach, honey; light roast';
 for(const body of [
  '<img data-alt="'+description+'" alt="Package front">',
  '<img title="alt=\''+description+'\'" alt="Package front">',
  '<img alt="'+description+'" alt="Package front">'
 ]){
  const result=parse(body);
  assert.equal(result.fields.tasting_notes,undefined);
  assert.equal(result.fields.roast_level,undefined);
  assert.deepEqual(extractProductImageTextEvidence(markup(body),{name:'Current Coffee',clean}),{});
 }
});
test('short exact coffee names can identify a profile without allowing another coffee',()=>{
 const result=parse(profile('peach, honey','light','Wuri'),'Wuri');
 assert.equal(result.fields.tasting_notes,'peach, honey');
 assert.equal(result.fields.roast_level,'Light');
 const other=parse(profile('peach, honey','dark','Wuri Decaf'),'Wuri');
 assert.equal(other.fields.roast_level,undefined);
});
test('equivalent image profiles compare note sets and canonical roast names',()=>{
 const result=parse(profile('peach, honey','light-medium')+profile('honey, peach','medium-light'));
 assert.equal(result.fields.roast_level,'Medium-Light');
 assert.equal(result.fields.tasting_notes,'honey, peach');
 assert.equal(result.conflicts,undefined);
});
test('contradictory exact-name profiles remain conflicts even after structured fallback',()=>{
 const body='<p>Roast Level: Light</p><p>Tasting Notes: peach, honey</p>'+
  profile()+profile('apple, cocoa','dark');
 const direct=extractProductImageTextEvidence(markup(body),{name:'Current Coffee',clean});
 assert.deepEqual(new Set(direct.conflicts),new Set(['roast_level','tasting_notes']));
 const result=parse(body);
 assert.equal(result.fields.roast_level,undefined);
 assert.equal(result.fields.tasting_notes,undefined);
 assert.ok(result.conflicts.includes('roast_level'));
 assert.ok(result.conflicts.includes('tasting_notes'));
});
test('a roast spectrum is not a selected roast or a source conflict',()=>{
 const body='<img alt="Current Coffee coffee profile card; roast levels: light roast, medium roast, dark roast.">';
 assert.equal(parse(body).fields.roast_level,undefined);
 const result=parse('<p>Roast Level: Light</p>'+body);
 assert.equal(result.fields.roast_level,'Light');
 assert.equal(result.conflicts,undefined);
});
test('explicitly negated image flavor notes and roast statements stay absent',()=>{
 const result=parse('<img alt="Current Coffee coffee profile card; no notes of peach, honey; not a dark roast">');
 assert.equal(result.fields.tasting_notes,undefined);
 assert.equal(result.fields.roast_level,undefined);
});
test('hidden stale facts stay excluded while a controlled current-product accordion remains evidence',()=>{
 const content='<p>This coffee is produced by Ana Torres.</p><p class="tasting-notes">Peach, Honey</p>';
 const hidden=parse('<div hidden>'+content+profile()+'</div>');
 assert.equal(hidden.roaster_details?.named_producer,undefined);
 assert.equal(hidden.fields.tasting_notes,undefined);
 assert.equal(hidden.fields.roast_level,undefined);
 const controlled=parse('<button aria-controls="story">About this coffee</button><div id="story" hidden>'+content+'</div>');
 assert.equal(controlled.roaster_details?.named_producer,'Ana Torres');
 assert.equal(controlled.fields.tasting_notes,'Peach, Honey');
});
test('TAKE A SIP metaphors about experiences are not flavor notes',()=>{
 const body='<p><strong>TAKE A SIP | </strong>This coffee experience is like your favorite childhood memory, '+
  'and like a warm summer day.</p>';
 assert.equal(parse(body).fields.tasting_notes,undefined);
});
test('conflicting explicitly named flavor containers do not pick the first HTML value',()=>{
 const body='<p class="tasting-notes">Peach, Honey</p><p class="tasting-notes">Apple, Cocoa</p>';
 assert.equal(extractProductFlavorEvidence(markup(body),{clean}),'');
 assert.equal(parse(body).fields.tasting_notes,undefined);
});
