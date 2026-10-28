// General source patterns independently observed in the frozen 603-coffee
// corpus. These bounded fragments test causes, not particular merchant names.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {normalizeRoastLabel} from '../src/server/roast-level-evidence.mjs';
import {extractShopifyAjaxData,shopifyProductRequest} from '../src/server/coffee-shopify-ajax.mjs';
import {extractSemanticCoffeeSpecs} from '../src/server/coffee-semantic-specs.mjs';

const source_url='https://roaster.examplecoffee.com/products/current-lot';
const parse=(body,name='Current Lot')=>extractPublicCoffeeFacts(
 '<main><h1>'+name+'</h1>'+body+'</main>',{source_url});

test('a later tasting sentence survives a long product description and nested emphasis',()=>{
 const filler='This is the current selection from a longstanding farming partnership. '.repeat(12);
 const result=parse('<p>'+filler+'In the cup we find melon, plum, and <em>lemon verbena</em>.</p>');
 assert.equal(result.fields.tasting_notes,'melon, plum, and lemon verbena');
});
test('flavor reading does not impose the legacy 60KB gallery cutoff',()=>{
 const result=parse('<div>'+('<img src="/bag.jpg" alt="Package front">'.repeat(1700))+'</div>'+
  '<p>This coffee has tasting notes of fruit punch, passion fruit, and pineapple.</p>');
 assert.equal(result.fields.tasting_notes,'fruit punch, passion fruit, and pineapple');
});
for(const [body,expected] of [
 ['<p>A decadent cup with notes of raisin, chocolate and caramel.</p>','raisin, chocolate and caramel'],
 ['<div>Flavor: Cocoa, Almond</div>','Cocoa, Almond'],
 ['<p><strong>We Taste:</strong> Lemon Lime Soda, Ruby Grapefruit, Raspberry</p>','Lemon Lime Soda, Ruby Grapefruit, Raspberry'],
 ['<h3>Taste</h3><p>Cashew, Pear, Green Tea</p>','Cashew, Pear, Green Tea'],
 ['<p>Featuring notes of praline, nougat and raspberry, this is a coffee to enjoy.</p>','praline, nougat and raspberry'],
 ['<p>The cup: notes of sweet citrus, floral, plum, and jasmine tea.</p>','sweet citrus, floral, plum, and jasmine tea']
])test('explicit selected-product flavor wording: '+expected,()=>{
 assert.equal(parse(body).fields.tasting_notes,expected);
});
test('an explicit flavor profile wins over an incidental prose example',()=>{
 const result=parse('<h2>The Story</h2><p>This coffee has notes of cherry and caramel.</p>'+
  '<h3>We Taste</h3><p>Lemon Lime Soda, Ruby Grapefruit, Raspberry</p>');
 assert.equal(result.fields.tasting_notes,'Lemon Lime Soda, Ruby Grapefruit, Raspberry');
});
test('negated, other-lot, general education and related-product sensory claims stay absent',()=>{
 for(const body of [
  '<p>This coffee does not have notes of peach and honey.</p>',
  "<p>Last year's lot had notes of peach and honey.</p>",
  '<p>Other coffees have notes of peach and honey.</p>',
  '<h2>Understanding coffee flavors</h2><p>Coffees can have notes of peach and honey.</p>',
  '<section class="related-products"><p>This coffee has notes of peach and honey.</p></section>'
 ])assert.equal(parse(body).fields.tasting_notes,undefined,body);
});
test('a later negative sentence does not erase a positive current-coffee profile',()=>{
 const result=parse('<p>This coffee has notes of peach and honey. It does not include added flavorings.</p>');
 assert.equal(result.fields.tasting_notes,'peach and honey');
});

for(const [label,expected] of [
 ['Medium roast','Medium'],['Light/Medium Roast','Medium-Light'],['Medium/ Dark Roast','Medium-Dark'],
 ['Medium Roast.','Medium'],['Medium (Full City)','Medium'],['Full City (Med)','Medium'],
 ['Medium-dark (Light to Extra Dark)','Medium-Dark']
])test('supported roast category survives source formatting: '+label,()=>{
 assert.equal(normalizeRoastLabel(label),expected);
 assert.equal(parse('<p>Roast Type: '+label+'</p>').fields.roast_level,expected);
});
for(const [body,expected] of [
 ['<p>This decaf is a medium roast.</p>','Medium'],
 ['<p>Mellow and easy-going — Medium Roast</p>','Medium'],
 ['<p>We roast Lamari light.</p>','Light'],
 ['<p>This coffee is lightly roasted.</p>','Light'],
 ['<p>Roasted medium-dark.</p>','Medium-Dark'],
 ['<p>This coffee is roasted in a medium profile.</p>','Medium'],
 ['<p>This is a medium-light roast.</p>','Medium-Light']
])test('explicit current-coffee roast prose: '+expected+' '+body,()=>{
 assert.equal(parse(body).fields.roast_level,expected);
});
test('an explicit title roast is evidence, but a roast-like coffee name is not',()=>{
 assert.equal(parse('','Current Lot - Dark Roast').fields.roast_level,'Dark');
 assert.equal(parse('<p>Sweet chocolate and a light body.</p>','Dark Skies').fields.roast_level,undefined);
});
test('unsupported traditional names and ranges other than approved Full City remain raw source text',()=>{
 for(const value of ['Lighter','ExtraLight','French Roast','Light to Medium','Medium/Medium Dark'])
  assert.equal(parse('<p>Roast: '+value+'</p>').fields.roast_level,undefined,value);
});
test('ordinary prose cannot turn a roast legend, comparison or historical roast into a value',()=>{
 for(const body of [
  '<p>This coffee is not a dark roast.</p>',
  "<p>Last year's coffee was a medium roast.</p>",
  '<p>For example, a dark roast has a different character.</p>',
  '<p>Our roast levels range from light roast to dark roast.</p>',
  '<h2>Roast Level</h2><div><span>Light</span><span>Medium</span></div>'
 ])assert.equal(parse(body).fields.roast_level,undefined,body);
});
test('conflicting current-roast statements remain a source conflict',()=>{
 const result=parse('<p>This coffee is a medium roast.</p><p>Dark Roast</p>');
 assert.equal(result.fields.roast_level,undefined);
 assert.ok(result.conflicts.includes('roast_level'));
});
test('exact product roast category tags remain evidence and conflicting tags remain final',()=>{
 const request=shopifyProductRequest(source_url);
 const result=extractShopifyAjaxData({title:'Current Lot',handle:'current-lot',vendor:'Roaster',
  description:'<p>Roast Level: Medium</p>',tags:['Coffee_Light Roast']},request);
 assert.equal(result.fields.roast_level,undefined);
 assert.ok(result.conflicts.includes('roast_level'));
 const positive=extractShopifyAjaxData({title:'Current Lot',handle:'current-lot',tags:['Medium Roast']},request);
 assert.equal(positive.fields.roast_level,'Medium');
});
test('multiple explicitly named roast purchase options cannot choose one narrative roast',()=>{
 const result=extractShopifyAjaxData({title:'Current Lot',handle:'current-lot',
  description:'<p>Our recommended medium roast.</p>',options:[{name:'Roast Level',values:['Medium','Dark']}]},shopifyProductRequest(source_url));
 assert.equal(result.fields.roast_level,undefined);
 assert.ok(result.conflicts.includes('roast_level'));
});
test('explicit profile punctuation and order are compatible but contradictory lists remain blank',()=>{
 const same=parse('<p>Flavor: Cocoa, Almond.</p><p>Tasting Notes: Almond &amp; Cocoa</p>');
 assert.equal(same.fields.tasting_notes,'Cocoa, Almond.');
 assert.ok(!same.conflicts?.includes('tasting_notes'));
 const different=parse('<p>Flavor: Cocoa, Almond.</p><div class="flavor-profile"><span>Peach</span><span>Honey</span></div>');
 assert.equal(different.fields.tasting_notes,undefined);
 assert.ok(different.conflicts.includes('tasting_notes'));
 assert.ok(different.source_facts.some(fact=>fact.conflicting));
});
test('a compound roast offer and another roast comparison do not select an arbitrary tier',()=>{
 assert.equal(parse('<p>Medium and Medium-dark Roast</p>').fields.roast_level,undefined);
 assert.equal(parse('<p>This bean is harder than a dark roasted bean.</p>').fields.roast_level,undefined);
 assert.equal(parse('<p>We roast light to keep what each coffee can do.</p>').fields.roast_level,undefined);
});
test('current roast taxonomy lookup ignores other explicitly named categories',()=>{
 const body='<p>American Roast: A light roast.</p><p>Vienna Roast: A medium/dark roast.</p><p>French Roast: A dark roast.</p>';
 assert.equal(parse(body,'Dominican Republic - Vienna Roast').fields.roast_level,'Medium-Dark');
});
test('the independently selected structured Product description supplies explicit sensory prose',()=>{
 const product={'@type':'Product',name:'Current Lot',url:source_url,
  description:'<p>This coffee is a medium roast with tasting notes of peach, honey, and black tea.</p>'};
 const result=parse('<script type="application/ld+json">'+JSON.stringify(product)+'</script>');
 assert.equal(result.fields.roast_level,'Medium');
 assert.equal(result.fields.tasting_notes,'peach, honey, and black tea');
});
test('selected structured Product descriptions do not hide explicit visible conflicts',()=>{
 const product={'@type':'Product',name:'Current Lot',url:source_url,
  description:'<p>Roast: Medium</p><p>Flavor: Cocoa, Almond</p>'};
 const result=parse('<script type="application/ld+json">'+JSON.stringify(product)+'</script>'+
  '<p>Roast: Dark</p><p>Tasting Notes: Peach, Honey</p>');
 assert.equal(result.fields.roast_level,undefined);
 assert.equal(result.fields.tasting_notes,undefined);
 assert.ok(result.conflicts.includes('roast_level'));
 assert.ok(result.conflicts.includes('tasting_notes'));
});
test('a structured narrative stays below a complete visible flavor profile',()=>{
 const product={'@type':'Product',name:'Current Lot',url:source_url,
  description:'<p>We taste toffee in this coffee.</p>'};
 const result=parse('<script type="application/ld+json">'+JSON.stringify(product)+'</script>'+
  '<p>Flavor Profile: Cantaloupe, Brown Sugar, Silky</p>');
 assert.equal(result.fields.tasting_notes,'Cantaloupe, Brown Sugar, Silky');
});
test('same-product named chips can summarize a fuller explicit profile without weakening independent profile conflicts',()=>{
 const chips='<div class="flavor-profile"><span>Peach</span><span>Honey</span></div>';
 const complete='<p>Tasting Notes: Peach, Honey, Black Tea</p>';
 assert.equal(parse(chips+complete).fields.tasting_notes,'Peach, Honey, Black Tea');
 const independent=parse('<p>Flavor: Peach, Honey</p>'+complete);
 assert.equal(independent.fields.tasting_notes,undefined);
 assert.ok(independent.conflicts.includes('tasting_notes'));
});
test('inline styling preserves literal flavor words and repeated labeled rows stay complete',()=>{
 assert.equal(parse('<p>Tasting Notes: C<em>itrus</em>, Brown Sugar, Tea</p>').fields.tasting_notes,'Citrus, Brown Sugar, Tea');
 assert.equal(parse('<div><h3>Tasting Notes</h3><p>• Peach</p><p>• Honey</p><p>• Black Tea</p></div>').fields.tasting_notes,'Peach, Honey, Black Tea');
});
test('flavor icon filenames identify the field while visible text supplies the values',()=>{
 assert.equal(parse('<h4><img src="/Tasting_Notes.png">Honey, Peach</h4>').fields.tasting_notes,'Honey, Peach');
 assert.equal(parse('<img src="/peach-honey.png">').fields.tasting_notes,undefined);
 const items=['Cocoa','Apple','Almond'].map(note=>'<li><img src="/tasting-notes.svg">'+note+'</li>').join('');
 assert.equal(parse('<ul>'+items+'</ul>').fields.tasting_notes,'Cocoa, Apple, Almond');
});
test('flavors conditional on different roast purchase options are not a single product profile',()=>{
 const result=parse('<p>As a light roast, this coffee has red fruit notes and bright acidity.</p>'+
  '<p>As a medium-dark roast, this coffee has notes of cooked fruit and caramelized sugars.</p>');
 assert.equal(result.fields.tasting_notes,undefined);
 assert.equal(result.fields.roast_level,undefined);
 assert.ok(result.conflicts.includes('roast_level'));
});
test('an explicitly labeled sensory paragraph remains literal and bounded',()=>{
 const profile='Floral aroma, full-bodied. Wonderful balanced cup.';
 assert.equal(parse('<p>Tasting Notes: '+profile+'</p>').fields.tasting_notes,profile);
 const complex='Walnut and Orange notes with a Caramel finish.';
 assert.equal(parse('<p>Tasting Notes: '+complex+'</p>').fields.tasting_notes,complex);
 assert.equal(parse('<p>Notes: Please order whole bean for the best flavor and grind before brewing.</p>').fields.tasting_notes,undefined);
});
test('a generic comparison chart with two roast endpoints is a legend, not two product claims',()=>{
 const scale='<div class="product-block-comparative-scale"><div class="comparison-chart">'+
  '<div>Light Roast <span class="sr-only">20%</span></div><div>Dark Roast <span class="sr-only">80%</span></div>'+
  '<div style="left:20%"></div></div></div>';
 const graphicOnly=parse(scale);
 assert.equal(graphicOnly.fields.roast_level,undefined);
 assert.ok(!graphicOnly.conflicts?.includes('roast_level'));
 assert.equal(parse(scale+'<p>We roast this coffee medium-light.</p>').fields.roast_level,'Medium-Light');
 assert.equal(parse(scale+'<div data-roast-level="Dark">Selected roast</div>').fields.roast_level,'Dark');
});
test('a title suffix can bind an explicit on-page roast definition without a universal traditional-name mapping',()=>{
 const definitions='<p>American Roast: Our lightest roast with a bright cup.</p>'+
  '<p>Full City Roast: A medium/light roast with a rich body.</p><p>Vienna Roast: A medium/dark roast with a full body.</p>'+
  '<p>French Roast: A classic dark roast.</p>';
 assert.equal(parse(definitions,'Island Coffee – Red Honey, Vienna').fields.roast_level,'Medium-Dark');
 assert.equal(parse(definitions,'Island Coffee, American').fields.roast_level,undefined);
 assert.equal(parse(definitions,'Vienna Valley Farm').fields.roast_level,undefined);
 assert.equal(parse('', 'Island Coffee, Vienna').fields.roast_level,undefined);
});
test('an inline-split tasting label cannot create a competing profile from its linking word',()=>{
 const result=parse('<p><em>Tasting notes</em><span> </span>of <strong></strong></p><h3>Watermelon, Kiwi, Cantaloupe, &amp; Caramel</h3>');
 assert.equal(result.fields.tasting_notes,'Watermelon, Kiwi, Cantaloupe, & Caramel');
 assert.ok(!result.conflicts?.includes('tasting_notes'));
});
test('named flavor chips and their own icons are one complete profile',()=>{
 const chips=['Caramel','Cherry','Floral'].map(value=>'<div class="product-tasting-notes-item">'+
  '<div class="product-tasting-notes-item-icon"><img src="/'+value+'-tasting-note-icon.svg"></div>'+
  '<div class="product-tasting-notes-item-name">'+value+'</div></div>').join('');
 const result=parse('<div class="product-tasting-notes"><div class="tasting-notes-heading">Tasting Notes:</div>'+
  '<div class="product-tasting-notes-items">'+chips+'</div></div>');
 assert.equal(result.fields.tasting_notes,'Caramel, Cherry, Floral');
 assert.ok(!result.conflicts?.includes('tasting_notes'));
 const other=parse('<div class="product-tasting-notes">'+chips+'</div><h4><img src="/Tasting_Notes.png">Honey, Peach</h4>');
 assert.equal(other.fields.tasting_notes,undefined);
 assert.ok(other.conflicts.includes('tasting_notes'));
});
test('a tasting-section heading cannot bind the neighboring roast legend as its flavor value',()=>{
 const result=parse('<p>Tasting Notes: Nectarine, Jasmine, Toffee, Honeysuckle</p>'+
  '<section><h2>Tasting Notes</h2><div class="tasting-notes__roast"><span>Light</span><span>Dark</span></div></section>');
 assert.equal(result.fields.tasting_notes,'Nectarine, Jasmine, Toffee, Honeysuckle');
 assert.ok(!result.conflicts?.includes('tasting_notes'));
});
test('explicit sensory labels survive a preceding sentence, a branded heading, and dash-separated lists',()=>{
 assert.equal(parse('<p>This coffee was grown at an established farm. Tasting Notes: Blueberry, plum and chocolate.</p>').fields.tasting_notes,'Blueberry, plum and chocolate.');
 assert.equal(parse('<p>123 Cupping Notes -- Green apple, florals, raw sugar, vibrant &amp; sweet finish</p>').fields.tasting_notes,'Green apple, florals, raw sugar, vibrant & sweet finish');
 assert.equal(parse('<p>Cupping Notes: Floral - Black tea - Lemon - Orange</p>').fields.tasting_notes,'Floral, Black tea, Lemon, Orange');
 assert.equal(parse('<p>Tasting: Floral, green tea, stone fruit, honey</p>').fields.tasting_notes,'Floral, green tea, stone fruit, honey');
});
test('a dash introducing a roast sentence does not become part of the flavor list',()=>{
 assert.equal(parse('<p>This roast has tasting notes of chocolate, caramel, and apple - roasted to a medium profile!</p>').fields.tasting_notes,'chocolate, caramel, and apple');
 assert.equal(parse('<p>Flavor Notes: Caramel, Citrus, Cocoa -- This coffee has a big, sweet caramel foundation.</p>').fields.tasting_notes,'Caramel, Citrus, Cocoa');
});
test('a sensory paragraph stays supplementary when the product supplies a compact explicit list',()=>{
 const prose='<p>Flavor Profile: A smooth, naturally sweet cup with gentle fruit, comforting chocolate, and creamy vanilla notes.</p>';
 const list='<p>Tasting Notes: Strawberry, Chocolate, Vanilla</p>';
 for(const body of [prose+list,list+prose]){
  const result=parse(body);assert.equal(result.fields.tasting_notes,'Strawberry, Chocolate, Vanilla');
  assert.ok(!result.conflicts?.includes('tasting_notes'));
  assert.ok(result.source_facts.some(fact=>JSON.stringify(fact).includes('gentle fruit')));
 }
 const conflicting=parse(prose+list+'<p>Flavor Notes: Peach, Honey, Almond</p>');
 assert.equal(conflicting.fields.tasting_notes,undefined);
 assert.ok(conflicting.conflicts.includes('tasting_notes'));
});
test('literal noun lists before a sensory suffix survive a preceding clause or a following verb',()=>{
 assert.equal(parse('<p>Berry &amp; salted chocolate taste notes highlight this single origin.</p>').fields.tasting_notes,'Berry & salted chocolate');
 assert.equal(parse('<p>This lot is roasted light to highlight its aroma, sweet floral and citrus notes, and a tea-like body.</p>').fields.tasting_notes,'sweet floral and citrus');
 assert.equal(parse('<p>Filled with deep chocolatey notes.</p>').fields.tasting_notes,'deep chocolatey');
 assert.equal(parse('<p>Savor the unique floral and chocolatey notes of another coffee in this collection.</p>').fields.tasting_notes,undefined);
 assert.equal(parse('<p>Our shipping notes are available below.</p>').fields.tasting_notes,undefined);
 assert.equal(parse('<p>We recorded detailed sourcing notes.</p>').fields.tasting_notes,undefined);
});
test('a standalone taste-notes-of heading has profile priority over general narrative copy',()=>{
 const result=parse('<p>Taste notes of blueberry and caramel.</p><p>This coffee has notes of chocolate, brown sugar, and vanilla.</p>');
 assert.equal(result.fields.tasting_notes,'blueberry and caramel.');
});
test('regional certification copy and importer comparisons cannot fill a variant-dependent profile',()=>{
 const regional='<p>This farm grows coffee on rolling hills. <span>About the Region</span>'+
  '<span>Coffee producers here adopt new technology. This area earned a Designation of Origin recognition for coffee, '+
  'with a sensory profile that boasts notes of dried fruit and chocolate, a full body, and a long finish.</span></p>';
 assert.equal(parse(regional).fields.tasting_notes,undefined);
 const variants='<p>The importer notes for this coffee included tropical fruits, strawberry, and orange notes.</p>'+
  '<p>As a light roast, this coffee has red fruit notes.</p><p>As a medium-dark roast, this coffee has notes of cooked fruit and caramelized sugars.</p>';
 assert.equal(parse(variants).fields.tasting_notes,undefined);
 assert.equal(parse('<p>Tasting Notes: Cocoa, Almond</p>'+variants).fields.tasting_notes,'Cocoa, Almond');
});
test('roast attributes consume complete quoted values and reject ambiguous duplicates',()=>{
 const filler='a'.repeat(350);
 assert.equal(parse('<div title="'+filler+" data-roast-level='Dark'"+'">Coffee</div>').fields.roast_level,undefined);
 assert.equal(parse('<div data-roast-level="Light" data-roast-level="Dark">Coffee</div>').fields.roast_level,undefined);
 assert.equal(parse('<div title="Value > decoration" data-roast-level="Medium-Light">Coffee</div>').fields.roast_level,'Medium-Light');
 assert.equal(parse('<div title="&quot;Decoration&quot;" data-roast-level=Light>Coffee</div>').fields.roast_level,'Light');
 assert.equal(parse('<div title="<svg><title>Roast level: Dark</title></svg>">Coffee</div>').fields.roast_level,undefined);
 assert.equal(parse('<script>const example=\'<meta name="product:roast_level" content="Dark">\';</script>').fields.roast_level,undefined);
});
test('a closed details panel explicitly named Flavor Notes supplies only its own profile',()=>{
 const panel='<details><summary><div><h2>Flavor Notes</h2></div><svg><path d="M0 0"></path></svg></summary>'+
  '<div class="accordion-content"><div><p>Nutella, Buttery, Dried Fruits</p></div></div></details>';
 const result=parse(panel+'<details><summary>Field Notes</summary><p>Country: Brazil</p></details>');
 assert.equal(result.fields.tasting_notes,'Nutella, Buttery, Dried Fruits');
 assert.ok(!result.conflicts?.includes('tasting_notes'));
 assert.equal(parse('<details><summary>Field Notes</summary><p>Country: Brazil</p></details>').fields.tasting_notes,undefined);
});
test('certifications, controls, glossary definitions and coffee-making slogans are not flavor notes',()=>{
 for(const value of ['Fair Trade & Organic Certified','F air Trade & Organic Certified','Close','Field',"Roaster's",'the final brew','each and every bean','expertly roasted coffee']){
  assert.equal(parse('<p>Tasting Notes: '+value+'</p>').fields.tasting_notes,undefined,value);
 }
 assert.equal(parse('<p>Notes: Tasting notes refer to the distinct flavors and aromas that can be perceived in a cup of coffee.</p>').fields.tasting_notes,undefined);
});
test('the roast of a tasting-note food is not the coffee roast',()=>{
 const notesOnly=parse('<p>Tasting Notes: dark roasted almonds, chocolate</p>');
 assert.equal(notesOnly.fields.tasting_notes,'dark roasted almonds, chocolate');
 assert.equal(notesOnly.fields.roast_level,undefined);
 assert.equal(parse('<p>Flavor: lightly roasted pecans, caramel</p>').fields.roast_level,undefined);
 const actual=parse('<p>This coffee is medium roasted with notes of dark roasted almonds, chocolate, and caramel.</p>');
 assert.equal(actual.fields.roast_level,'Medium');
 assert.equal(actual.fields.tasting_notes,'dark roasted almonds, chocolate, and caramel');
 assert.ok(!actual.conflicts?.includes('roast_level'));
});
test('large decorative descendants do not hide an adjacent explicit value or change source offsets',()=>{
 const svg='<svg><path d="'+('M0 0 L1 1 '.repeat(250))+'"></path></svg>';
 const label='<span class="product-feature-title">ROAST LEVEL:</span>';
 const value='<div class="product-feature-icons">'+svg+svg+svg+'<span>Medium</span></div>';
 const body='<div class="product-feature">'+label+value+'</div>';
 assert.equal(parse(body).fields.roast_level,'Medium');
 const clean=value=>value.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 const semantic=extractSemanticCoffeeSpecs(body,{clean});
 const fact=semantic.facts.find(item=>item.kind==='roast_level');
 assert.equal(fact?.value,'Medium');assert.equal(fact?.start,body.indexOf(label));assert.equal(fact?.end,body.indexOf(value)+value.length);
 assert.equal(parse('<div>'+label+'<div>'+svg+'<svg><text>Dark</text></svg></div></div>').fields.roast_level,undefined);
 const oversized=extractSemanticCoffeeSpecs('<div>'+label+'<div>'+('x'.repeat(2401))+' Medium</div></div>',{clean});
 assert.equal(oversized.facts.some(item=>item.kind==='roast_level'),false);
});
test('bounded idioms and a current contrast clause do not negate an explicit roast',()=>{
 assert.equal(parse('<p>Crafted for a bright and clean medium roast, this blend delivers complexity without chaos.</p>').fields.roast_level,'Medium');
 assert.equal(parse('<p>Not for the fainthearted coffee drinker, this bold blend of dark roasted African and Central American coffees was developed for the outdoors-lover.</p>').fields.roast_level,'Dark');
 assert.equal(parse('<p>While most of our coffees lean towards medium roast to lighter style, this coffee is dark.</p>').fields.roast_level,'Dark');
 for(const body of [
  '<p>This is not a medium roast without chaos.</p>',
  '<p>We do not make this a dark roast.</p>',
  "<p>We don't roast this coffee medium.</p>",
  '<p>While most of our coffees have a medium roast, this coffee is dark in color.</p>',
  '<p>Although last year was a dark roast, this coffee is not dark.</p>'
 ])assert.equal(parse(body).fields.roast_level,undefined,body);
});
test('a selected merchant roast alias requires an explicit compatible definition on the same page',()=>{
 const selected='<h4>Ground Agtron: #127 Roast Level: Moderate</h4>';
 const definition='<p>Referring to medium as moderate is an intentional choice to highlight the roasting process, which is also referred to as development.</p>';
 assert.equal(parse(selected+definition).fields.roast_level,'Medium');
 assert.equal(parse(selected).fields.roast_level,undefined);
 assert.equal(parse(definition).fields.roast_level,undefined);
 assert.equal(parse('<h4>Roast Level: Balanced</h4>'+definition).fields.roast_level,undefined);
 assert.equal(parse(selected+'<section class="related-products">'+definition+'</section>').fields.roast_level,undefined);
 const conflict=parse(selected+definition+'<p>Roast Level: Dark</p>');
 assert.equal(conflict.fields.roast_level,undefined);assert.ok(conflict.conflicts.includes('roast_level'));
});
test('a literal metadata flavor description requires the exact product URL and an equivalent product title',()=>{
 const head=(url,title)=>'<meta property="og:url" content="'+url+'"><meta property="og:title" content="'+title+'">'+
  '<meta property="og:site_name" content="Example Roasters"><meta name="description" content="This coffee has tasting notes of peach, honey, and black tea.">';
 const read=metadata=>extractPublicCoffeeFacts('<head>'+metadata+'</head><main><h1>Current Lot</h1></main>',{source_url});
 assert.equal(read(head(source_url,'Current Lot | Example Roasters')).fields.tasting_notes,'peach, honey, and black tea');
 assert.equal(read(head('https://roaster.examplecoffee.com/products/another-lot','Current Lot')).fields.tasting_notes,undefined);
 assert.equal(read(head(source_url,'Another Lot')).fields.tasting_notes,undefined);
 assert.equal(read(head(source_url,'Current Lot | Unrelated Roasters')).fields.tasting_notes,undefined);
 const canonical='<link rel="canonical" href="'+source_url+'"><meta property="og:title" content="Current Lot">'+
  '<meta name="description" content="This coffee has tasting notes of peach, honey, and black tea.">';
 assert.equal(read(canonical).fields.tasting_notes,'peach, honey, and black tea');
 assert.equal(read(canonical+'<meta property="og:url" content="https://roaster.examplecoffee.com/products/another-lot">').fields.tasting_notes,undefined);
});
