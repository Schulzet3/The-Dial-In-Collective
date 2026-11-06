import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractShopifyAjaxData,shopifyProductRequest} from '../src/server/coffee-shopify-ajax.mjs';
import {extractProductFlavorEvidence} from '../src/server/coffee-flavor-evidence.mjs';

const source_url='https://roaster.examplecoffee.com/products/current-coffee';
const other_url='https://roaster.examplecoffee.com/products/another-coffee';
const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const clean=(value,max=6000)=>String(value).replace(/<[^<>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().slice(0,max);
const page=(name,body,head='')=>head+'<main><h1>'+escape(name)+'</h1>'+body+'</main>';
const parse=(name,body,head='')=>extractPublicCoffeeFacts(page(name,body,head),{source_url});
const product=data=>'<script type="application/ld+json">'+JSON.stringify(data).replace(/</g,'\\u003c')+'</script>';
const retained=(result,text,type)=>result.source_facts?.some(fact=>(!type||fact.source_type===type)&&String(fact.value).includes(text));
const cases=[
  {
    "id": "ink6610",
    "name": "6610",
    "source": "6610 ft. This is the altitude we roast our coffee and the reason our High Altitude, Slow roasting process brings out the deepest, smoothest flavors of each and every bean. A blend so rich yet so smooth. Characteristics - A bold blend of full-bodied coffees roasted special dark to reveal a rich taste, slightly smoky undertones and bittersweet, dark chocolate. Origin - Central & South America Roast - Special Dark Body - Full Acidity - Very Low",
    "notes": "rich taste, slightly smoky undertones and bittersweet, dark chocolate",
    "quote": "Characteristics - A bold blend of full-bodied coffees roasted special dark to reveal a rich taste, slightly smoky undertones and bittersweet, dark chocolate.",
    "case_id": "shop-inkcoffee-com__6610-01ae1c21"
  },
  {
    "id": "ink89",
    "name": "Espresso 89",
    "source": "We usually prefer our espresso Northern Italian style; a complex blend roasted delicately and taken straight. But when we took this single origin to a slightly darker roast, we found the resulting caramelized sugars matched perfectly in milk. So we thought, why not? Characteristics - Darker roast chocolate taste, licorice sweetness, Big body Origin - Africa/Asia/Americas Roast - Trade Secret Body - Full Acidity - Medium",
    "notes": "chocolate taste, licorice sweetness",
    "quote": "Characteristics - Darker roast chocolate taste, licorice sweetness, Big body",
    "case_id": "shop-inkcoffee-com__espresso-89-bd5b9a13"
  },
  {
    "id": "bless",
    "name": "Bless Your Heart - Brazilian",
    "source": "A mildly sweet and nutty Brazilian variety, roasted to perfection with your sweet little heart in mind. This mild variety pairs well with all our flavor options and tastes great on its own! We recommend a medium roast Bless Your Heart as a daily go to.",
    "notes": "mildly sweet and nutty",
    "quote": "A mildly sweet and nutty Brazilian variety, roasted to perfection with your sweet little heart in mind.",
    "case_id": "hellolarsonscoffee-com__bless-your-heart-1-ccbccf60"
  },
  {
    "id": "darlin",
    "name": "Hello Darlin' - Papua New Guinea",
    "source": "Hello Darlin' Nice to see you. This rich cup of fruity Papua New Guinea goodness will keep your toes tapping to its eloquent taste. Bold flavor to enjoy alone or with any optional flavor.",
    "notes": "fruity",
    "quote": "This rich cup of fruity Papua New Guinea goodness will keep your toes tapping to its eloquent taste.",
    "case_id": "hellolarsonscoffee-com__hello-darlin-1-4d1fcba2"
  },
  {
    "id": "bleu",
    "name": "Sumatra Mandheling| Fair Trade Organic",
    "source": "Coffee profile: Coffee features floral, fruity, and sweet aromas of vanilla and pipe tobacco, with rich, lush, and smooth flavors of black cherry, tobacco, and cocoa. Varietals: Bourbon, Tim Tim, Catimor Elevation: 1,200-1,500 Meters",
    "notes": "floral, fruity, and sweet aromas of vanilla and pipe tobacco, with rich, lush, and smooth flavors of black cherry, tobacco, and cocoa",
    "quote": "Coffee profile: Coffee features floral, fruity, and sweet aromas of vanilla and pipe tobacco, with rich, lush, and smooth flavors of black cherry, tobacco, and cocoa.",
    "case_id": "bleucoffee-com__copy-of-papua-new-guinea-741ec193"
  },
  {
    "id": "rose",
    "name": "Rosé & Roots",
    "source": "Discover Rose & Roots, a 72-hour natural process coffee from Honduras' Tres Pinos region. Expertly light roasted to highlight delicate floral and fruity notes, this single-origin bean delivers an enchanting aroma of strawberry and rose with each brew. Taste the complexity of strawberry jam and chocolate in every cup. Perfect for those seeking a nuanced, aromatic coffee experience.",
    "notes": "strawberry jam and chocolate",
    "quote": "Taste the complexity of strawberry jam and chocolate in every cup.",
    "case_id": "south17roasters-com__rose-roots-4d6c4fe4"
  },
  {
    "id": "honey",
    "name": "Colombia- Honey Process",
    "source": "Colombia- Honey Process Colombia Honey Process – Light Roast Grown on the Las Mercedes farm in northern Colombia, the Gamboa family has been cultivating coffee for sixty years, carrying on a family tradition that dates back to 1920. Through careful cultivation and specialty processing methods, they produce exceptional coffees with distinctive flavor profiles. Our light-roasted Honey Process Colombian features vibrant notes of strawberry and orange, complemented by delicate floral undertones. The honey process removes the coffee cherry’s outer skin and some of its fruit before drying, creating unique fermentation characteristics that contribute to its bright, fruit-forward flavor.",
    "notes": "strawberry and orange, delicate floral undertones",
    "quote": "Our light-roasted Honey Process Colombian features vibrant notes of strawberry and orange, complemented by delicate floral undertones.",
    "case_id": "shop-justlovecoffee-com__colombia-honey-process-8fa61c65"
  }
];


// Exact original frozen public descriptions and selected names. The proposed
// fields deliberately keep modifiers and flavor roles instead of matching
// simplified oracle tokens. Aroma, body, roast and optional flavors stay separate.
for(const entry of cases)test('literal current flavor roles from original source: '+entry.id,()=>{
 const visible=parse(entry.name,'<p>'+escape(entry.source)+'</p>');
 const structured=parse(entry.name,'',product({'@type':'Product',name:entry.name,url:source_url,description:entry.source}));
 const request=shopifyProductRequest(source_url);
 assert.ok(request,'Synthetic public-shaped fixture must pass the real URL guard; no network request is made.');
 const endpoint=extractShopifyAjaxData({title:entry.name,handle:'current-coffee',description:'<p>'+escape(entry.source)+'</p>'},request);
 for(const result of [visible,structured,endpoint]){
  assert.equal(result?.ok,true);
  assert.equal(result.fields.tasting_notes,entry.notes,entry.id);
  assert.ok(!result.conflicts?.includes('tasting_notes'));
  assert.ok(retained(result,entry.quote),entry.id);
 }
 assert.ok(retained(structured,entry.quote,'product_json'));
 assert.ok(retained(endpoint,entry.quote,'product_json'));
});

test('mixed Characteristics preserves taste modifiers without promoting roast, body or acidity',()=>{
 const ink6610=parse(cases[0].name,'<p>'+cases[0].quote+' Origin - Brazil Roast - Special Dark Body - Full Acidity - Low</p>');
 assert.equal(ink6610.fields.tasting_notes,cases[0].notes);
 const ink89=parse(cases[1].name,'<p>'+cases[1].quote+' Origin - Brazil Roast - Trade Secret Body - Full Acidity - Medium</p>');
 assert.equal(ink89.fields.tasting_notes,cases[1].notes);
 for(const result of [ink6610,ink89])assert.ok(!/\b(?:roast|body|acidity)\b/i.test(result.fields.tasting_notes));
 const generic=parse('Current Coffee','<p>Characteristics - Lighter roast ripe pear taste, brown sugar sweetness, silky body Origin - Peru</p>');
 assert.equal(generic.fields.tasting_notes,'ripe pear taste, brown sugar sweetness');
 for(const text of [
  'Characteristics - Darker roast, full body, low acidity',
  'Characteristics - Darker roast full body, low acidity, Big body',
  'Characteristics - Darker roast big body taste, low acidity sweetness, silky body',
  'Characteristics - A bold blend of full-bodied coffees roasted dark to reveal a rich body, medium acidity and a long finish.',
  'Characteristics - Hints of dark roast, and syrup-y body'
 ])assert.equal(parse('Current Coffee','<p>'+text+'</p>').fields.tasting_notes,undefined,text);
});

test('current adjectival coffee claims retain complete words and stay independent of optional flavor choices',()=>{
 for(const [name,entry] of [["Bless Your Heart",cases[2]],["Hello Darlin'",cases[3]]]){
  const country=entry.id==='bless'?'Brazil':'Papua New Guinea';
  const result=parse(name,'<p>Country: '+country+'</p><p>'+escape(entry.source)+'</p><label>Optional Flavor</label><select><option>Vanilla syrup</option><option>Caramel syrup</option></select>');
  assert.equal(result.fields.tasting_notes,entry.notes);
  assert.ok(!/vanilla|caramel/i.test(result.fields.tasting_notes));
  assert.ok(retained(result,entry.quote));
 }
 const generic=parse('Peru Coffee','<p>A gently sweet and pomelo-like Peruvian variety, roasted to perfection.</p>');
 assert.equal(generic.fields.tasting_notes,'gently sweet and pomelo-like');
 for(const text of [
  'A certified organic Brazilian variety, roasted to perfection.',
  'A rare and exclusive Brazilian variety, roasted to perfection.',
  'This rich cup of organic Papua New Guinea goodness is available today.'
 ])assert.equal(parse('Current Coffee','<p>'+text+'</p>').fields.tasting_notes,undefined,text);
});

test('country-qualified flavor adjectives cannot describe another origin or a blend component',()=>{
 for(const [name,text,composition] of [
  ['Kenya Coffee',cases[2].quote,''],
  ['Kenya Coffee',cases[3].quote,''],
  ['Brazil and Kenya Blend',cases[2].quote,''],
  ['Papua New Guinea and Kenya Blend',cases[3].quote,''],
  ['Morning Song',cases[2].quote,'This coffee is a blend of Brazil and Kenya.'],
  ['Morning Song',cases[3].quote,'We blend Papua New Guinea with Kenya for this coffee.']
 ])assert.equal(parse(name,'<p>'+composition+'</p><p>'+text+'</p>').fields.tasting_notes,undefined,name+' '+text);
 const whole=parse('Morning Song Blend','<p>Taste the complexity of ripe pear and cocoa in every cup.</p>');
 assert.equal(whole.fields.tasting_notes,'ripe pear and cocoa');
});

test('one selected Coffee profile preserves its complete aroma and flavor clauses as fallback',()=>{
 const entry=cases[4],result=parse(entry.name,'<p>'+entry.source+'</p>');
 assert.equal(result.fields.tasting_notes,entry.notes);
 for(const aroma of ['floral','fruity','vanilla','pipe tobacco'])assert.ok(result.fields.tasting_notes.includes(aroma),aroma);
 assert.ok(retained(result,'floral, fruity, and sweet aromas of vanilla and pipe tobacco'));
 const other=parse('Current Coffee','<p>Coffee profile: Coffee features gentle aromas of jasmine and tea, with bright, rounded flavors of ripe pear and candied lime.</p>');
 assert.equal(other.fields.tasting_notes,'gentle aromas of jasmine and tea, with bright, rounded flavors of ripe pear and candied lime');
});

test('separate Taste complexity statement supplies only its explicit cup list',()=>{
 const entry=cases[5],result=parse(entry.name,'<p>'+escape(entry.source)+'</p>');
 assert.equal(result.fields.tasting_notes,'strawberry jam and chocolate');
 assert.ok(!/\brose\b|floral|fruity/.test(result.fields.tasting_notes));
 assert.ok(retained(result,'an enchanting aroma of strawberry and rose'));
 for(const text of [
  'Taste the complexity of a full body and low acidity in every cup.',
  'Taste the complexity of strawberry jam or chocolate in every cup.',
  'Taste the complexity of strawberry jam and chocolate in every cup of tea.'
 ])assert.equal(parse('Current Coffee','<p>'+text+'</p>').fields.tasting_notes,undefined,text);
});

test('history, denial, examples, hypothetical and conditional current roles cannot create notes',()=>{
 for(const entry of cases){
  const quote=entry.quote;
  const modified=quote.startsWith('Characteristics')?
   [
    quote.replace('Characteristics - ','Characteristics - Previously, '),
    quote.replace('Characteristics - ','Characteristics - For example, '),
    quote.replace('Characteristics - ','Characteristics - When served with milk, '),
    quote.replace('Characteristics - ','Characteristics - Hypothetical '),
    quote.replace('Characteristics - ','Characteristics - Not ')
   ]:[
    'Previously, '+quote,
    'Last year, '+quote,
    'For example, '+quote,
    'When served with milk, '+quote,
    'Hypothetically, '+quote,
    'Not '+quote
   ];
  for(const text of modified)assert.equal(parse(entry.name,'<p>'+escape(text)+'</p>').fields.tasting_notes,undefined,entry.id+' '+text);
 }
});

test('later preparation qualifications cannot be promoted with a new current flavor role',()=>{
 for(const entry of cases){
  const quote=entry.quote.replace(/[.!?]+$/,'');
  const text=quote+' if served with milk.';
  assert.equal(parse(entry.name,'<p>'+escape(text)+'</p>').fields.tasting_notes,undefined,entry.id);
 }
 const milk='Characteristics - A bold blend of full-bodied coffees roasted dark to reveal a rich taste, smooth undertones and chocolate with milk.';
 assert.equal(parse('Current Coffee','<p>'+milk+'</p>').fields.tasting_notes,undefined);
 const literal='Characteristics - A bold blend of full-bodied coffees roasted dark to reveal a rich taste, smooth undertones and milk chocolate.';
 assert.equal(parse('Current Coffee','<p>'+literal+'</p>').fields.tasting_notes,'rich taste, smooth undertones and milk chocolate');
});

test('education, region prose and other-product scope remain excluded',()=>{
 for(const entry of cases){
  for(const heading of ['Brewing guide','About the Region','Regional characteristics','Previous year','Previous harvest','Other coffee'])
   assert.equal(parse(entry.name,'<h2>'+heading+'</h2><p>'+escape(entry.quote)+'</p>').fields.tasting_notes,undefined,entry.id+' '+heading);
  const related=parse(entry.name,'<p>Current coffee details.</p><aside class="related-products"><h2>Another Coffee</h2><p>'+escape(entry.quote)+'</p></aside>');
  assert.equal(related.fields.tasting_notes,undefined,entry.id);
  const graph=product({'@graph':[
   {'@type':'Product',name:entry.name,url:source_url,description:'Current coffee details.'},
   {'@type':'Product',name:'Another Coffee',url:other_url,description:entry.source}
  ]});
  assert.equal(parse(entry.name,'',graph).fields.tasting_notes,undefined,entry.id);
 }
});

test('two independently asserted prose or Characteristics profiles are not joined',()=>{
 for(const [name,first,second] of [
  ['Current Coffee','Taste the complexity of strawberry jam and chocolate in every cup.','Taste the complexity of ripe pear and honey in every cup.'],
  ['Current Coffee',cases[4].quote,'Coffee profile: Coffee features sweet aromas of jasmine and tea, with bright flavors of ripe pear and candied lime.'],
  ['Current Coffee',cases[1].quote,'Characteristics - Lighter roast ripe pear taste, brown sugar sweetness, silky body']
 ]){
  const result=parse(name,'<p>'+escape(first)+'</p><p>'+escape(second)+'</p>');
  assert.equal(result.fields.tasting_notes,undefined,name);
  assert.ok(retained(result,first));
  assert.ok(retained(result,second));
 }
});

test('printed tasting labels retain their existing precedence over narrative relationships',()=>{
 for(const entry of cases){
  const result=parse(entry.name,'<p>Tasting Notes: Pear, Honey</p><p>'+escape(entry.source)+'</p>');
  assert.equal(result.fields.tasting_notes,'Pear, Honey');
  assert.ok(retained(result,entry.quote));
 }
});

test('explicit competing roast options still withhold these non-primary flavor assertions',()=>{
 for(const entry of cases){
  const html=page(entry.name,'<p>As a light roast, this coffee is delicate. As a dark roast, this coffee is bold.</p><p>'+escape(entry.quote)+'</p>');
  assert.equal(extractProductFlavorEvidence(html,{clean}),'',entry.id);
 }
});


test('explicit selected origin constrains country-qualified notes in visible and structured descriptions',()=>{
 for(const entry of [cases[2],cases[3]]){
  const country=entry.id==='bless'?'Brazil':'Papua New Guinea';
  const selected='Morning Song';
  const visible=parse(selected,'<p>Origin: Kenya</p><p>'+escape(entry.quote)+'</p>');
  const structured=parse(selected,'',product({'@type':'Product',name:selected,url:source_url,description:entry.quote,additionalProperty:[{name:'Country',value:'Kenya'}]}));
  const endpoint=extractShopifyAjaxData({title:selected,handle:'current-coffee',description:'<p>Country: Kenya</p><p>'+escape(entry.quote)+'</p>'},shopifyProductRequest(source_url));
  for(const result of [visible,structured,endpoint]){
   assert.equal(result.fields.origin,'Kenya');
   assert.equal(result.fields.tasting_notes,undefined,entry.id);
   assert.ok(retained(result,entry.quote));
  }
  const matching=parse(selected,'<p>Origin: '+country+'</p><p>'+escape(entry.quote)+'</p>');
  assert.equal(matching.fields.tasting_notes,entry.notes);
  assert.equal(parse(selected,'<p>'+escape(entry.quote)+'</p>').fields.tasting_notes,undefined,'A branded name alone does not bind a country-qualified variety.');
 }
});

test('withheld conflicting origins cannot lend false certainty to country-qualified notes',()=>{
 for(const entry of [cases[2],cases[3]]){
  for(const name of ['Morning Song',entry.name]){
   const visible=parse(name,'<p>Origin: Kenya</p><p>Origin: Peru</p><p>'+escape(entry.quote)+'</p>');
   const structured=parse(name,'',product({'@type':'Product',name,url:source_url,description:entry.quote,additionalProperty:[{name:'Origin',value:'Kenya'},{name:'Origin',value:'Peru'}]}));
   const endpoint=extractShopifyAjaxData({title:name,handle:'current-coffee',description:'<p>Origin: Kenya</p><p>Origin: Peru</p><p>'+escape(entry.quote)+'</p>'},shopifyProductRequest(source_url));
   for(const result of [visible,structured,endpoint]){
    assert.equal(result.fields.origin,undefined);
    assert.ok(result.conflicts?.includes('origin'));
    assert.equal(result.fields.tasting_notes,undefined,name+' '+entry.id);
    assert.ok(retained(result,entry.quote));
   }
  }
 }
 const labeled=parse('Morning Song','<p>Origin: Kenya</p><p>Origin: Peru</p><p>Tasting Notes: Pear, Honey</p><p>'+escape(cases[2].quote)+'</p>');
 assert.equal(labeled.fields.tasting_notes,'Pear, Honey','Existing explicit flavor labels keep their independent precedence.');
});

test('early Product descriptions are evaluated against later explicit origin facts',()=>{
 for(const entry of [cases[2],cases[3]]){
  const json=product({'@type':'Product',name:entry.name,url:source_url,description:entry.quote});
  for(const body of [
   '<p>Country: Kenya</p>',
   '<p>Origin: Kenya</p><p>Origin: Peru</p>'
  ]){
   const result=parse(entry.name,body,json);
   assert.equal(result.fields.tasting_notes,undefined,entry.id+' '+body);
   assert.ok(retained(result,entry.quote,'product_json'));
  }
  const lateProperty=product({'@type':'Product',name:entry.name,url:source_url,description:entry.quote,country:'Kenya'});
  assert.equal(parse(entry.name,'',lateProperty).fields.tasting_notes,undefined,'A later Product field must constrain its earlier description.');
 }
});


test('Onyx metric and matched SEO entrypoints pass the actual selected origin context',()=>{
 for(const entry of [cases[2],cases[3]]){
  const name='Morning Song';
  const metric=(label,value,kind)=>'<div class="a-stat" data-name="'+kind+'"><p>'+value+'<br><label>'+label+'</label></p></div>';
  const onyx=parse(name,metric('Roast Level','Light','roast-level')+metric('Origin','Kenya','origin')+'<p>'+escape(entry.quote)+'</p>');
  assert.equal(onyx.fields.origin,'Kenya');
  assert.equal(onyx.fields.tasting_notes,undefined,entry.id+' metric');
  const conflict=parse(name,metric('Roast Level','Light','roast-level')+metric('Origin','Kenya','origin')+metric('Origin','Peru','origin')+'<p>'+escape(entry.quote)+'</p>');
  assert.ok(conflict.conflicts?.includes('origin'));
  assert.equal(conflict.fields.tasting_notes,undefined,entry.id+' metric conflict');
  const head='<meta property="og:url" content="'+source_url+'"><meta property="og:title" content="'+name+'"><meta name="description" content="'+escape(entry.quote)+'">';
  const seo=parse(name,'<p>Country: Kenya</p>',head);
  assert.equal(seo.fields.tasting_notes,undefined,entry.id+' SEO');
  const correct=entry.id==='bless'?'Brazil':'Papua New Guinea';
  const currentSeo=parse(name,'<p>Country: '+correct+'</p>',head);
  assert.equal(currentSeo.fields.tasting_notes,entry.notes,entry.id+' selected SEO');
 }
});

test('Colombia Honey keeps its full named notes while retaining the causal processing description',()=>{
 const entry=cases.at(-1),result=parse(entry.name,'<p>'+escape(entry.source)+'</p>');
 assert.equal(result.fields.tasting_notes,entry.notes);
 assert.ok(retained(result,'creating unique fermentation characteristics that contribute to its bright, fruit-forward flavor'));
 assert.ok(!result.fields.tasting_notes.includes('fruit-forward'));
 const mechanism='The natural process removes the fruit before drying, creating fermentation characteristics that contribute to its bright, fruit-forward flavor.';
 const current='Our medium-dark-roasted Peru Bourbon features clear notes of ripe pear and honey.';
 assert.equal(parse('Peru Bourbon','<p>'+current+' '+mechanism+'</p>').fields.tasting_notes,'ripe pear and honey');
});

test('a processing descriptor stays unchanged alone and cannot erase another complete tasting assertion',()=>{
 const mechanism='The honey process removes the coffee cherry’s outer skin and some of its fruit before drying, creating unique fermentation characteristics that contribute to its bright, fruit-forward flavor.';
 const entry=cases.at(-1);
 assert.equal(parse(entry.name,'<p>'+mechanism+'</p>').fields.tasting_notes,'fruit-forward');
 for(const other of [
  'This coffee has notes of ripe pear and honey.',
  'The honey process creates fermentation characteristics that contribute to its notes of plum and cocoa.',
  'This coffee has a fruit-forward flavor.'
 ]){
  const result=parse(entry.name,'<p>'+entry.quote+'</p><p>'+other+'</p><p>'+mechanism+'</p>');
  assert.equal(result.fields.tasting_notes,undefined,other);
  assert.ok(retained(result,other));
  assert.ok(retained(result,entry.quote));
 }
 const labeled=parse(entry.name,'<p>Tasting Notes: Pear, Honey</p><p>Tasting Notes: Plum, Cocoa</p><p>'+entry.source+'</p>');
 assert.equal(labeled.fields.tasting_notes,undefined);
 assert.ok(labeled.conflicts?.includes('tasting_notes'));
});

test('a named profile must match current identity before demoting a process explanation',()=>{
 const entry=cases.at(-1),mechanism='The honey process removes the fruit before drying, creating fermentation characteristics that contribute to its bright, fruit-forward flavor.';
 for(const [name,quote,expected] of [
  ['Brazil Coffee',entry.quote,undefined],
  ['Colombia Natural',entry.quote,undefined],
  [entry.name,'Previously, '+entry.quote,'fruit-forward'],
  [entry.name,'For example, '+entry.quote,'fruit-forward'],
  [entry.name,entry.quote.replace('features vibrant','might feature vibrant'),undefined],
  [entry.name,entry.quote.replace('features vibrant','features hypothetical'),'fruit-forward'],
  ['Colombia and Brazil Blend',entry.quote,undefined]
 ]){
  const result=parse(name,'<p>'+escape(quote)+' '+mechanism+'</p>');
  assert.equal(result.fields.tasting_notes,expected,name+' '+quote);
  assert.notEqual(result.fields.tasting_notes,entry.notes,'Unverified named notes must not demote the unchanged standalone process descriptor.');
 }
});

test('causal processing prose cannot demote bare flavor nouns or multi-item flavor lists',()=>{
 const entry=cases.at(-1);
 for(const descriptor of ['plum','citrus','plum-forward','cocoa-forward','plum and cocoa','plum, cocoa','plum / cocoa','plum | cocoa','plum • cocoa','plum · cocoa','plum; cocoa','plum or cocoa']){
  const other='The honey process removes the fruit before drying, creating unique fermentation characteristics that contribute to its bright, '+descriptor+' flavor.';
  const result=parse(entry.name,'<p>'+escape(entry.quote)+'</p><p>'+escape(other)+'</p>');
  assert.equal(result.fields.tasting_notes,undefined,descriptor);
  assert.ok(retained(result,other));
  assert.ok(retained(result,entry.quote));
 }
});
