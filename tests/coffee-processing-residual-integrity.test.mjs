// Source patterns demonstrated by the frozen 603-coffee corpus. Synthetic
// negatives protect current-lot scope and keep the fixed category honest.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractShopifyAjaxData,shopifyProductRequest,mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';
const source_url='https://coffee-example.com/products/current-coffee';
const parse=body=>extractPublicCoffeeFacts('<main><h1>Current Coffee</h1>'+body+'</main>',{source_url});
const endpoint=(description='',tags=[])=>extractShopifyAjaxData({title:'Current Coffee',handle:'current-coffee',description,tags},shopifyProductRequest(source_url));

for(const method of ['Swiss Water Process','Swiss Water Decaf','Mountain Water Process','Sugar Cane Decaffeination Process',
 'Natural EA decaffeination','EA (Ethyl Acetate) Natural Decaffeination'])
test('a decaffeination label retains its literal detail without claiming a green-coffee category: '+method,()=>{
 const result=parse('<p>Process: '+method+'</p>');
 assert.equal(result.fields.process,undefined);
 assert.equal(result.roaster_details?.processing_detail,method);
 assert.ok(result.source_facts.some(fact=>fact.value===method));
});

test('EA natural decaffeination does not conflict with a separately published washed method',()=>{
 const result=endpoint('<p>Process: EA (Ethyl Acetate) Natural Decaffeination</p><p>Process: Natural EA decaffeination</p>'+
  '<p>Processing: Washed process before EA decaffeination</p>');
 assert.equal(result.fields.process,'Washed');
 assert.equal(result.roaster_details?.processing_detail,'Washed process before EA decaffeination');
 assert.ok(!result.conflicts?.includes('process'));
 assert.ok(result.source_facts.some(fact=>fact.value.includes('Natural Decaffeination')));
 assert.ok(result.source_facts.some(fact=>fact.value.includes('Washed process before EA decaffeination')));
});

test('an explicitly natural green-coffee process remains Natural before a separate EA step',()=>{
 const result=parse('<p>Process: Natural process before EA decaffeination</p>');
 assert.equal(result.fields.process,'Natural');
 assert.match(result.roaster_details.processing_detail,/Natural process before EA decaffeination/);
});

test('an explicit water decaffeination caption does not import its following education link',()=>{
 const result=parse('<p>Decaffeination method: Water process (non-chemical). For more information, read more here.</p>');
 assert.equal(result.fields.process,undefined);
 assert.equal(result.roaster_details?.processing_detail,'Decaffeination: Water process (non-chemical)');
 assert.ok(result.source_facts.some(fact=>fact.value.includes('For more information')));
});

for(const [sentence,detail] of [
 ['Crafted from Brazilian beans and processed using the Mountain Water method, this medium roast is smooth.','Mountain Water method'],
 ['-delicious rich chocolatey Colombia made with the sugarcane decaffeination process','sugarcane decaffeination process'],
 ['This coffee is rather unique in that it is decaffeinated at origin in Colombia using a chemical-free process our roaster loosely translated as “sugar process”.','sugar process'],
 ['Swiss Water Process leads to a fantastic decaf coffee with a sweet cup.','Swiss Water Process']
])test('current-product decaffeination prose preserves its published method: '+detail,()=>{
 const result=parse('<p>'+sentence+'</p>');
 assert.equal(result.fields.process,undefined);
 assert.equal(result.roaster_details?.processing_detail,'Decaffeination: '+detail);
});

for(const sentence of [
 'This coffee is not decaffeinated using the Swiss Water process.',
 'Other coffees are processed using the Mountain Water method.',
 "Last year's coffee was decaffeinated using the Swiss Water process.",
 'The Swiss Water process is a common example of decaffeination.',
 'Our farm uses pure mountain water to wash coffee cherries.',
 'This coffee is natural sugarcane decaf.',
 'This coffee is naturally decaffeinated.',
 'The coffee has natural sweetness and honey notes.'
])test('general, negative, and unrelated water/decaf language is not a method: '+sentence,()=>{
 const result=parse('<p>'+sentence+'</p>');
 assert.equal(result.fields.process,undefined);
 assert.equal(result.roaster_details?.processing_detail,undefined);
});

test('decaf education and related products cannot donate a current processing detail',()=>{
 for(const body of ['<h2>Processing education</h2><p>This coffee is decaffeinated using the Swiss Water process.</p>',
  '<h2>You may also like</h2><p>Other Decaf: Process: Swiss Water Process</p>']){
  const result=parse(body);assert.equal(result.fields.process,undefined);
  assert.equal(result.roaster_details?.processing_detail,undefined);
 }
});

test('contradictory decaffeination labels remain separate source facts without a chosen summary',()=>{
 const result=parse('<p>Process: Swiss Water Process</p><p>Process: Mountain Water Process</p>');
 assert.equal(result.fields.process,undefined);assert.equal(result.roaster_details?.processing_detail,undefined);
 assert.ok(result.source_facts.some(fact=>fact.value==='Swiss Water Process'));
 assert.ok(result.source_facts.some(fact=>fact.value==='Mountain Water Process'));
});

test('incompatible EA stage order and different methods cannot pick a processing detail',()=>{
 for(const pair of [['Washed process before EA decaffeination','Washed process after EA decaffeination'],
  ['Washed process before EA decaffeination','Natural process before EA decaffeination'],
  ['Natural EA decaffeination','Swiss Water Process'],['Natural EA decaffeination','sugar process']]){
  const result=parse(pair.map(value=>'<p>Process: '+value+'</p>').join(''));
  assert.equal(result.roaster_details?.processing_detail,undefined,pair.join(' / '));
 }
});

for(const [value,process] of [['Extended-Fermentation Wet Process','Washed'],['Dry Process','Natural']])
test('the Process suffix is part of an explicit wet/dry method name: '+value,()=>{
 const result=parse('<p>'+value+'</p>');
 assert.equal(result.fields.process,process);
 assert.equal(result.roaster_details?.processing_detail,value);
 assert.ok(result.source_facts.some(fact=>fact.value===value));
});

test('a compact metric keeps wet processing distinct from sugarcane decaffeination',()=>{
 const value='Wet Process & SugarCane Ethyl Acetate Decaffeination';
 const result=parse('<ul><li><p class="slide-content">'+value+'</p></li></ul>');
 assert.equal(result.fields.process,'Washed');assert.equal(result.roaster_details?.processing_detail,value);
 assert.ok(result.source_facts.some(fact=>fact.value===value));
});

test('sentence and education uses of wet processing are not a compact method metric',()=>{
 for(const body of ['<p>Learn about the Wet Process</p>','<p>This coffee does not use Wet Process</p>',
  '<h2>Processing education</h2><p>Wet Process & SugarCane Ethyl Acetate Decaffeination</p>']){
  const result=parse(body);assert.equal(result.fields.process,undefined);
 }
});

test('an exact product-owned Washed Coffee taxonomy tag supplies the method',()=>{
 const result=endpoint('<p>Current coffee from Brazil.</p>',['Brazil','Washed Coffee']);
 assert.equal(result.fields.process,'Washed');assert.ok(result.source_facts.some(fact=>fact.value.includes('Washed Coffee')));
});

test('natural marketing and longer negative or promotional taxonomy tags are not a method',()=>{
 for(const tag of ['Natural Coffee','Not Washed Coffee','Try Washed Coffee','Honey Coffee','Washed Coffee Alternatives'])
  assert.equal(endpoint('',[tag]).fields.process,undefined,tag);
});

test('only an explicitly declared blend aggregates exact distinct process tags',()=>{
 const tags=['type:Blend','process:Natural','process:Washed'];
 const result=endpoint('',tags);assert.equal(result.fields.process,'Other/Unknown');
 assert.ok(!result.conflicts?.includes('process'));
 assert.ok(result.source_facts.some(fact=>fact.value.includes('process:Natural')));
 assert.ok(result.source_facts.some(fact=>fact.value.includes('process:Washed')));
 for(const unsafe of [['process:Natural','process:Washed'],['type:Single Origin','process:Natural','process:Washed'],
  ['type:Blend','process:Natural','process:Honey fermentation']]){
  const conflict=endpoint('',unsafe);assert.equal(conflict.fields.process,undefined);
  assert.ok(conflict.conflicts?.includes('process'));
 }
});

for(const [combined,subtype] of [['Washed, 30-hour anaerobic fermentation','Washed'],['Anaerobic Natural','Natural'],
 ['Natural Anaerobic','Natural'],['Honey, 48-hour anaerobic fermentation','Honey']])
test('one literal combined treatment is compatible with its own simpler subtype: '+combined,()=>{
 for(const description of ['<p>Process: '+combined+'</p><p>Process: '+subtype+'</p>',
  '<p>Process: '+subtype+'</p><p>Process: '+combined+'</p>']){
  const result=parse(description);assert.equal(result.fields.process,'Anaerobic');assert.ok(!result.conflicts?.includes('process'));
 }
 const base=parse('<p>Process: '+combined+'</p>'),extra=endpoint('', ['process:'+subtype]);
 const merged=mergePublicProductPreview(base,extra);assert.equal(merged.fields.process,'Anaerobic');assert.ok(!merged.conflicts?.includes('process'));
});

test('a complete current-product combined claim can reconcile its endpoint stage summaries',()=>{
 const base=parse('<p>Process: Anaerobic Natural</p><p>Process: Extended Fermentation Natural</p>');
 const extra=endpoint('<p>Process: Extended Fermentation Natural</p><p>Process: 120-hour anaerobic fermentation in cherry</p>');
 assert.ok(extra.conflicts?.includes('process'),'the endpoint alone has no combined subtype witness');
 const merged=mergePublicProductPreview(base,extra);assert.equal(merged.fields.process,'Anaerobic');assert.ok(!merged.conflicts?.includes('process'));
});

for(const [first,second] of [['Anaerobic Washed','Natural'],['Anaerobic Natural','Washed'],['Anaerobic','Natural'],['Anaerobic Honey','Washed']])
test('a different or unstated subtype never resolves a process contradiction: '+first+' / '+second,()=>{
 const result=parse('<p>Process: '+first+'</p><p>Process: '+second+'</p>');
 assert.equal(result.fields.process,undefined);assert.ok(result.conflicts?.includes('process'));
 const merged=mergePublicProductPreview(parse('<p>Process: '+first+'</p>'),endpoint('<p>Process: '+second+'</p>'));
 assert.equal(merged.fields.process,undefined);assert.ok(merged.conflicts?.includes('process'));
});

test('a combined claim cannot clear an additional incompatible claim or an untracked earlier conflict',()=>{
 const base=parse('<p>Process: Anaerobic Natural</p>');
 for(const extra of [endpoint('<p>Process: Natural</p><p>Process: Washed</p>'),
  {ok:true,fields:{name:'Current Coffee'},conflicts:['process']}]){
  const merged=mergePublicProductPreview(base,extra);assert.equal(merged.fields.process,undefined);
  assert.ok(merged.conflicts?.includes('process'));
 }
 const result=parse('<p>Process: Natural</p><p>Process: Washed</p><p>Process: Anaerobic Natural</p>');
 assert.equal(result.fields.process,undefined);assert.ok(result.conflicts?.includes('process'));
});

test('related-product combined processing cannot repair current contradictory methods',()=>{
 const result=parse('<p>Process: Natural</p><p>Process: Anaerobic</p><h2>You may also like</h2><p>Process: Anaerobic Natural</p>');
 assert.equal(result.fields.process,undefined);assert.ok(result.conflicts?.includes('process'));
});

test('an unfamiliar named current method is retained literally without an inferred category',()=>{
 const body="<p>This lot is 100% Chiroso, one of Colombia's most exciting varieties, and it's processed using the traditional Tres Cochadas method.</p>";
 const result=parse(body);assert.equal(result.fields.process,undefined);
 assert.equal(result.roaster_details?.processing_detail,'traditional Tres Cochadas method');
 for(const sentence of ['Other coffees are processed using the traditional Tres Cochadas method.',
  'This lot is not processed using the traditional Tres Cochadas method.',
  "Last year's coffee was processed using the traditional Tres Cochadas method.",
  'This coffee is generally processed using the traditional Tres Cochadas method.'])
  assert.equal(parse('<p>'+sentence+'</p>').roaster_details?.processing_detail,undefined,sentence);
});

test('a direct current natural claim outranks the farm’s historical honey methods and cherry rinsing',()=>{
 const result=parse('<p>They began processing their coffee in 2000, becoming known for honey-processed coffees.</p>'+
  '<p>The Perla Negra Process: Only the ripest coffee cherries are selected for this natural process. '+
  'After harvesting, the cherries are washed and moved to patios, where they dry whole.</p>');
 assert.equal(result.fields.process,'Natural');
});

test('current-method priority cannot override explicit labels or contradictory current claims',()=>{
 const prose='<p>Only the ripest coffee cherries are selected for this natural process.</p>';
 assert.equal(parse('<p>Process: Washed</p>'+prose).fields.process,'Washed');
 const conflict=parse('<p>Process: Washed</p><p>Process: Natural</p>'+prose);
 assert.equal(conflict.fields.process,undefined);assert.ok(conflict.conflicts?.includes('process'));
 assert.equal(parse(prose+'<p>This coffee is washed.</p>').fields.process,undefined);
});

test('a natural grade shorthand needs corroboration in the exact current product title',()=>{
 const named=(body,name)=>extractPublicCoffeeFacts('<main><h1>'+name+'</h1>'+body+'</main>',{source_url});
 const body='<p>-lovely natural grade 1 sidama!</p>';
 assert.equal(named(body,'ethiopia sidama ayla bombe natural light roast').fields.process,'Natural');
 for(const name of ['Ethiopia Sidama Light Roast','Ethiopia Sidama Washed Light Roast','Natural Light Roast'])
  assert.equal(named(body,name).fields.process,undefined,name);
 assert.equal(named('<p>Natural sweetness, grade 1 quality.</p>','Ethiopia Sidama Natural Light Roast').fields.process,undefined);
});

test('a retired washed lot does not conflict with an explicitly newly arrived natural lot',()=>{
 const result=parse('<p>So, we ran out of Danche Washed. While the washed lot is RIP, the natural lot just landed! '+
  'Coffee cherries were left to dry ferment whole in tanks before being dried on raised screens.</p>');
 assert.equal(result.fields.process,'Natural');
 for(const text of ['While the washed lot is RIP, the natural lot did not just land.',
  'While the washed lot is RIP, the natural lot just landed last year.',
  'Other coffees use this method. While the washed lot is RIP, our other natural lot just landed.'])
  assert.equal(parse('<p>'+text+'</p>').fields.process,undefined,text);
});

test('an affirmative depulping-washing-drying sequence identifies the washed treatment',()=>{
 const result=parse("<p>Marina's is no exception: Ripe cherries were depulped each afternoon, dry-fermented for 24 hrs, washed 4x, &amp; dried for 2-3 weeks in covered solar dryers.</p>");
 assert.equal(result.fields.process,'Washed');
 for(const text of ['Ripe cherries were washed 4x and moved to patios to dry whole.',
  'Ripe cherries were depulped and fermented, then dried on raised beds.',
  'Ripe cherries were depulped, not washed, and dried.',
  'The coffees are generally depulped, washed, and dried.',
  "Last year's cherries were depulped, washed, and dried."])
  assert.equal(parse('<p>'+text+'</p>').fields.process,undefined,text);
});
