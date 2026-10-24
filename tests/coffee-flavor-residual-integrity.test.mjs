import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractProductFlavorEvidence,extractProductImageTextEvidence} from '../src/server/coffee-flavor-evidence.mjs';
import {extractShopifyAjaxData,shopifyProductRequest} from '../src/server/coffee-shopify-ajax.mjs';
const source_url='https://roaster.examplecoffee.com/products/current-lot';
const clean=(value,max=6001)=>String(value).replace(/<[^<>]+>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().slice(0,max);
const parse=body=>extractPublicCoffeeFacts('<main><h1>Current Lot</h1>'+body+'</main>',{source_url});

test('a BR inside a narrative flavor cannot manufacture a shorter hero profile',()=>{
 const body='<div class="product__description"><p><strong><span>This light roast presents a sweet and round body with tasting notes of fruit<br>punch, passion fruit, and pineapple.</span></strong></p><p>This coffee won its annual Taste of Harvest competition.</p></div>';
 assert.equal(parse(body).fields.tasting_notes,'fruit punch, passion fruit, and pineapple');
 const endpoint=extractShopifyAjaxData({title:'Current Lot',handle:'current-lot',description:body},shopifyProductRequest(source_url));
 assert.equal(endpoint.fields.tasting_notes,'fruit punch, passion fruit, and pineapple');
});
test('possessive and delivery clauses do not remove the first literal flavor noun',()=>{
 assert.equal(parse('<p>This coffee is lightly roasted and is sure to please with its chocolate, black cherry, and strawberry notes.</p>').fields.tasting_notes,
  'chocolate, black cherry, and strawberry');
 assert.equal(parse('<p>Our blend, crafted from select Central American and Indonesian beans, delivers a robust caramel flavor designed to rejuvenate.</p>').fields.tasting_notes,
  'robust caramel');
 assert.equal(parse('<p>This blend has a medium body, with a nice sweet caramel flavor and a creamy finish.</p>').fields.tasting_notes,
  'nice sweet caramel');
 assert.equal(parse('<div class="product__description"><h3>Costa Rica Single Origin Coffee – Sweet, Chocolaty, and BoldA crime story brewed to perfection.</h3><p>This coffee delivers a sweet, chocolaty flavor.</p></div>').fields.tasting_notes,
  'sweet, chocolaty');
});
test('an explicit flavoring fusion retains the literal list before its verb clause',()=>{
 assert.equal(parse('<p>The enchanting blend of Graham Cracker, aromatic Cinnamon, smooth Vanilla, and nutty Hazelnut creates a symphony of taste that dances on your palate.</p>').fields.tasting_notes,
  'Graham Cracker, aromatic Cinnamon, smooth Vanilla, and nutty Hazelnut');
 assert.equal(parse('<p>This delightful fusion of rich caramel and smooth French vanilla creates an irresistible flavor experience that is sweet and satisfying.</p>').fields.tasting_notes,
  'rich caramel and smooth French vanilla');
 for(const sentence of ['A blend of Brazil and Ethiopia creates a floral flavor.','A fusion of love and coffee creates a great taste.','Last year a blend of caramel and vanilla created a great flavor.'])
  assert.equal(parse('<p>'+sentence+'</p>').fields.tasting_notes,undefined,sentence);
});
test('fully written first-person tasting cues remain literal current-coffee evidence',()=>{
 assert.equal(parse('<p>In this coffee we are tasting fresh plum and florals.</p>').fields.tasting_notes,'fresh plum and florals');
 assert.equal(parse('<p>Last year we were tasting fresh plum and florals.</p>').fields.tasting_notes,undefined);
});
test('a dedicated cup heading preserves the complete literal sensory paragraph',()=>{
 const profile='This is a full bodied coffee with sweet flavors of maple glaze and raspberry preserves. We also get some nice cinnamon-like spice with hints of ginger that is reminiscent of root beer.';
 assert.equal(parse('<h2>What you\'ll find in the cup:</h2><p>'+profile+'</p>').fields.tasting_notes,profile);
 assert.equal(extractProductFlavorEvidence('<main><h1>What you\'ll find in the cup:</h1><p>'+profile+'</p></main>',{clean}),profile);
 assert.equal(parse('<h2>What you\'ll find in the cup:</h2><p>Last year this coffee had flavors of maple and raspberry.</p>').fields.tasting_notes,undefined);
 assert.equal(parse('<h2>What you\'ll find in the cup:</h2><h3>The Farm</h3><p>'+profile+'</p>').fields.tasting_notes,undefined);
});
test('a standalone tastes-like profile has precedence over component narrative',()=>{
 const body='<p>The component beans have baking spice notes.</p><div><i>Tastes like dark chocolate, warm spices, and pecan clusters</i></div>';
 assert.equal(parse(body).fields.tasting_notes,'dark chocolate, warm spices, and pecan clusters');
 const conflict=parse(body+'<p>Tasting Notes: Lemon, Pear, Tea</p>');
 assert.equal(conflict.fields.tasting_notes,undefined);
 assert.ok(conflict.conflicts?.includes('tasting_notes'));
});
test('labeled block flavor chips preserve their boundaries without splitting inline words',()=>{
 for(const body of [
  '<h4>Tasting Notes</h4><div class="roast-notes"><div class="roast-note-item"><img alt="Dark Chocolate"><p>Dark Chocolate</p></div><div class="roast-note-item"><img alt="Dark Cherry"><p>Dark Cherry</p></div><div class="roast-note-item"><img alt="Wild Honey"><p>Wild Honey</p></div></div>',
  '<h4>Tasting Notes</h4><div class="Vendor__Note__List"><div data-note="Dark Chocolate">Dark Chocolate</div><div data-note="Dark Cherry">Dark Cherry</div><div data-note="Wild Honey">Wild Honey</div></div>'
 ])assert.equal(parse(body).fields.tasting_notes,'Dark Chocolate, Dark Cherry, Wild Honey');
 assert.equal(parse('<h4>Tasting Notes</h4><div class="notes"><span>Ch</span><span>erry</span></div>').fields.tasting_notes,'Cherry');
 assert.equal(parse('<h4>Tasting Notes</h4><div class="notes"><p>Cherry</p><p>This coffee has a smooth body.</p></div>').fields.tasting_notes,
  'Cherry This coffee has a smooth body.');
});
test('an explicitly recommended linked coffee cannot donate its roast through nested spans',()=>{
 const other='<div><span>Our current half-caff is smooth. (Prefer decaf? Try </span><span><u><a href="/products/other-decaf" title="Other Decaf: Medium Smooth Roast">Other Decaf: Medium Smooth Roast</a></u></span><span>.)</span></div>';
 assert.equal(parse(other).fields.roast_level,undefined);
 assert.equal(extractShopifyAjaxData({title:'Current Lot',handle:'current-lot',description:other},shopifyProductRequest(source_url)).fields.roast_level,undefined);
 assert.equal(parse('<p>This coffee is a dark roast.</p>'+other).fields.roast_level,'Dark');
 assert.equal(parse('<p>This coffee is a <a href="/products/current-lot">medium roast</a>.</p>').fields.roast_level,'Medium');
});

test('image controls cannot become notes or conflict with a complete profile',()=>{
 for(const ui of ['Hover','Zoom, Expand image caption']){
  const body='<div><img alt="Tasting notes for this coffee">'+ui+'</div><p>Tasting Notes: Butter, Citrus, Milk Chocolate</p>';
  const result=parse(body);
  assert.equal(result.fields.tasting_notes,'Butter, Citrus, Milk Chocolate');
  assert.ok(!result.conflicts?.includes('tasting_notes'));
 }
 assert.equal(parse('<button><img alt="Tasting notes">Zoom, Expand image caption</button>').fields.tasting_notes,undefined);
});
test('exact-name image alt text is still evidence when the image is a zoom button',()=>{
 const image='<button><img alt="Current Lot coffee profile card; Notes: Peach, Honey; Medium roast">Zoom</button>';
 assert.equal(extractProductImageTextEvidence(image,{name:'Current Lot',clean}).tasting_notes,'Peach, Honey');
});
test('a hyphenated marketing adjective does not create a flavor field',()=>{
 const result=parse('<p>Flavor-forward and full-bodied, without the caffeine.</p>'+
  '<p>Tasting Notes: Nutty and smooth with a delicate sweetness and hints of chocolate</p>');
 assert.equal(result.fields.tasting_notes,'Nutty and smooth with a delicate sweetness and hints of chocolate');
 assert.ok(!result.conflicts?.includes('tasting_notes'));
});
test('a current-product process slider cannot become a competing flavor profile',()=>{
 const result=parse('<div class="coffee-highlights-slider"><div>Wet, Dry, Honey Carbonic Maceration</div>'+
  '<div>Chocolate, Tamarind, Hibiscus</div><div>Honduras, Colombia, Ethiopia</div></div>');
 assert.equal(result.fields.tasting_notes,'Chocolate, Tamarind, Hibiscus');
 assert.ok(!result.conflicts?.includes('tasting_notes'));
});
test('a list bullet immediately after an explicit flavor label is normalized',()=>{
 assert.equal(parse('<p>Tasting Notes: -Wine, Blackcurrant, Brown Sugar</p>').fields.tasting_notes,'Wine, Blackcurrant, Brown Sugar');
 assert.equal(parse('<p>-Wine, Blackcurrant, Brown Sugar</p>').fields.tasting_notes,undefined);
});
test('a long selected JSON description preserves the complete final labeled profile',()=>{
 const description='Selected coffee from a longstanding farm partnership. '.repeat(13)+
  '\nTasting Notes: Stone Fruit, Raspberry Yogurt\nBrewing Tips: Contact our team';
 const product={'@type':'Product',name:'Current Lot',url:source_url,description};
 const result=parse('<script type="application/ld+json">'+JSON.stringify(product)+'</script>'+
  '<p>Tasting Notes: Stone Fruit, Raspberry Yogurt</p>');
 assert.equal(result.fields.tasting_notes,'Stone Fruit, Raspberry Yogurt');
 assert.ok(!result.conflicts?.includes('tasting_notes'));
});
test('a concatenated sensory paragraph does not override the complete compact label',()=>{
 const result=parse('<p>Flavor Notes: Caramel, Red Apple, SyrupyCreamy caramel body with red apple notes.</p>'+
  '<p>Tasting Notes: Caramel, Red Apple, Syrupy</p>');
 assert.equal(result.fields.tasting_notes,'Caramel, Red Apple, Syrupy');
 assert.ok(!result.conflicts?.includes('tasting_notes'));
});
test('grammatical continuations and body introductions do not become flavor nouns',()=>{
 assert.equal(parse('<p>This coffee has notes of cherry and milk chocolate, but it can also be prepared as espresso.</p>').fields.tasting_notes,'cherry and milk chocolate');
 assert.equal(parse('<p>With a creamy body, sweet chocolate and citrus notes, and mild acidity, it is versatile.</p>').fields.tasting_notes,'sweet chocolate and citrus');
 assert.equal(parse('<p>The milk chocolate notes of the Black Satin pair perfectl</p>').fields.tasting_notes,undefined);
});
test('a named sensory section keeps literal comparisons without adjective suffixes or scene metaphors',()=>{
 const body='<p><strong>TAKE A SIP |</strong> The red fruit notes in this cup are pronounced and profound, reminding us of black cherries and almost grape-like in character. '+
  'It is boozy-but-also-sweet, like cherry cordial filling, and that sweetness feels smooth and creamy, like marzipan. '+
  'Citrus notes play well with a cinnamon-like spice, giving us a delightful spiced orange note. '+
  'As the cup cools, it finishes like craft chocolate—and it smells just like walking into a chocolate factory.</p>';
 assert.equal(extractProductFlavorEvidence('<main>'+body+'</main>',{clean}),
  'black cherries, cherry cordial filling, marzipan, spiced orange, craft chocolate');
});
test('flavor icons inside icon-with-text rows retain the complete visible cohort',()=>{
 const items=['OOLONG','BROWN SUGAR','PAPAYA'].map(note=>'<li class="icon-with-text__item"><img src="/25_ShopTastingNote_Icon.png"><span>'+note+'</span></li>').join('');
 assert.equal(parse('<ul class="icon-with-text">'+items+'</ul>').fields.tasting_notes,'OOLONG, BROWN SUGAR, PAPAYA');
 assert.equal(parse('<ul><li class="icon-with-text__item"><img src="/tasting.png"><span>Chamomile, pear, juicy</span></li><li>Washed</li></ul>').fields.tasting_notes,'Chamomile, pear, juicy');
});
test('all descendants of a roast graphic remain outside named flavor profiles',()=>{
 const result=parse('<p>Tasting Notes: Nectarine, Jasmine, Toffee, Honeysuckle</p>'+
  '<section class="tasting-notes"><div class="tasting-notes__inner"><h2>Tasting Notes</h2>'+
  '<div class="tasting-notes__roast"><span>Light</span><span>Dark</span></div><div class="tasting-notes__rows"><p>Process</p><p>Washed</p></div></div></section>');
 assert.equal(result.fields.tasting_notes,'Nectarine, Jasmine, Toffee, Honeysuckle');
 assert.ok(!result.conflicts?.includes('tasting_notes'));
});
test('literal merchant tasting labels and a standalone first-person tasting statement are supported',()=>{
 for(const label of ['Primary Descriptors','Coffee flavor profile',"What you'll taste in your cup",'We taste notes of']){
  assert.equal(parse('<h3>'+label+'</h3><p>Milk Chocolate, Sweet Tobacco, Cinnamon Sugar</p>').fields.tasting_notes,'Milk Chocolate, Sweet Tobacco, Cinnamon Sugar',label);
 }
 const result=parse('<p>Fermentation develops notes of cherry and apple.</p><p>We’re tasting papaya, guava, &amp; hibiscus.</p>');
 assert.equal(result.fields.tasting_notes,'papaya, guava, & hibiscus');
});
test('unambiguous literal roast qualifiers survive while unsupported plus levels stay reviewable',()=>{
 assert.equal(parse('<p>Roast: Special Dark</p>').fields.roast_level,'Dark');
 assert.equal(parse('<p>This coffee is a Medium Smooth Roast.</p>').fields.roast_level,'Medium');
 assert.equal(parse('<h3>Roast Level</h3><p>Medium, keeping things warm, sweet, and approachable.</p>').fields.roast_level,'Medium');
 for(const text of ['Roast Level: Light+','Roast Level: Medium+','Light to Medium Roast']){
  const result=parse('<p>'+text+'</p>');
  assert.equal(result.fields.roast_level,undefined,text);
 }
 const plus=parse('<p>Roast Level: Light+</p>');
 assert.match(plus.roast_hint,/Light\+/);
 const tag=extractShopifyAjaxData({title:'Current Lot',handle:'current-lot',tags:['medium roast coffee']},shopifyProductRequest(source_url));
 assert.equal(tag.fields.roast_level,'Medium');
});
test('coffee-bean roast and current blend assertion survive preceding sensory context',()=>{
 assert.equal(parse('<p>We remove caffeine, leaving the rich flavor of the dark-roasted Colombian bean.</p>').fields.roast_level,'Dark');
 assert.equal(parse('<p>The notes of cacao pair with caramel, and together they deliver a balanced dark/medium roast.</p>').fields.roast_level,'Medium-Dark');
 const result=parse('<p>Roast Level: Light</p><p>A one-to-one decaffeinated version of our medium roast Signature Espresso.</p>');
 assert.equal(result.fields.roast_level,'Light');
 assert.ok(!result.conflicts?.includes('roast_level'));
});
test('roast metadata fallback needs exact product identity and rejects stale country cohorts',()=>{
 const meta=description=>'<link rel="canonical" href="'+source_url+'"><meta property="og:title" content="Current Lot"><meta name="description" content="'+description+'">';
 assert.equal(extractPublicCoffeeFacts(meta('This is a medium roasted coffee.')+'<h1>Current Lot</h1>',{source_url}).fields.roast_level,'Medium');
 const stale=parse('<p>Country: Honduras</p>'+meta('This coffee from El Salvador is a dark roast.'));
 assert.equal(stale.fields.roast_level,undefined);
 const wrong=extractPublicCoffeeFacts(meta('This is a medium roasted coffee.').replace('href="'+source_url+'"','href="https://roaster.examplecoffee.com/products/other"')+'<h1>Current Lot</h1>',{source_url});
 assert.equal(wrong.fields.roast_level,undefined);
});
test('selected subtitle and early description lists require a sensory role and retain literal terms',()=>{
 for(const body of [
  '<div class="product__block__text"><p>VELVETY, DARK CHOCOLATE, STONEFRUIT</p></div>',
  '<div itemprop="description"><h4>Velvety, Dark Chocolate, Stonefruit</h4><p>This coffee comes from a farm.</p></div>',
  '<div class="product-description"><p>- Velvety, Dark Chocolate, Stonefruit<br>- Medium Roast</p></div>'
 ])assert.match(parse(body).fields.tasting_notes,/velvety, dark chocolate, stonefruit/i);
 for(const text of ['Brazil, Colombia, Guatemala','Bourbon, Caturra, Typica','New, Limited, Seasonal','Zoom, Hover, Expand'])
  assert.equal(parse('<p class="product__text">'+text+'</p>').fields.tasting_notes,undefined,text);
 assert.equal(parse('<section class="related-products"><p class="product__text">Caramel, Chocolate, Honey</p></section>').fields.tasting_notes,undefined);
 assert.equal(parse('<p>Caramel, Chocolate, Honey</p>').fields.tasting_notes,undefined);
});
test('a multi-paragraph named sensory section continues until the next product specification',()=>{
 const result=parse('<p><strong>TAKE A SIP |</strong> This decaf has an unusual appearance.</p>'+
  '<p>It is still fruity, like strawberry jam and chocolate cherries – but also sweet, like dulce de leche and milk chocolate.</p>'+
  '<p><strong>Origin |</strong> Colombia</p><p>Another coffee is like peach and like honey.</p>');
 assert.equal(result.fields.tasting_notes,'strawberry jam and chocolate cherries, dulce de leche and milk chocolate');
});
test('inline formatting does not split flavor words and wrapped bullet paragraphs remain one profile',()=>{
 assert.equal(parse('<p><strong>Notes: </strong>c</span>andied yam, vanilla, macadamia nut</p>').fields.tasting_notes,'candied yam, vanilla, macadamia nut');
 const values=['Smooth body with a soft, rounded feel','Light caramel sweetness','Gentle cocoa finish','Balanced and comforting from start to finish'];
 const result=parse('<div><p><strong><span>Flavor Notes</span></strong></p>'+values.map(value=>'<p><span>• '+value+'</span></p>').join('')+'<p>Roast Level</p><p>Medium</p></div>');
 assert.equal(result.fields.tasting_notes,values.join(', '));
});

test('a narrative tasting sentence elaborates on a formal label without manufacturing a conflict',()=>{
 const body='<p><strong>Flavor:</strong> White Peach, Strawberry, Jasmine, Honeysuckle, Almond, Agave</p>'+
  '<p>Very sweet. We’re tasting white peach, strawberry, and an assortment of florals.</p>';
 for(const source of [body,'<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:'Current Lot',url:source_url,description:body})+'</script>']){
  const result=parse(source);
  assert.equal(result.fields.tasting_notes,'White Peach, Strawberry, Jasmine, Honeysuckle, Almond, Agave');
  assert.ok(!result.conflicts?.includes('tasting_notes'));
 }
 const conflict=parse(body+'<p>We Taste: Cocoa, Apple, Vanilla</p>');
 assert.equal(conflict.fields.tasting_notes,undefined);
 assert.ok(conflict.conflicts.includes('tasting_notes'));
});
test('a general profile is fallback evidence below a specific flavor-notes field',()=>{
 for(const body of [
  '<p>Flavor Notes: Red Currant, Star Anise, Satiny</p><p>Profile: Sweet and complex fruit, warming spices, satiny body</p>',
  '<p>Profile: Sweet and complex fruit, warming spices, satiny body</p><p>Flavor Notes: Red Currant, Star Anise, Satiny</p>'
 ]){
  const result=parse(body);
  assert.equal(result.fields.tasting_notes,'Red Currant, Star Anise, Satiny');
  assert.ok(!result.conflicts?.includes('tasting_notes'));
 }
 assert.equal(parse('<p>Profile: Sweet and complex fruit, warming spices, satiny body</p>').fields.tasting_notes,
  'Sweet and complex fruit, warming spices, satiny body');
});
test('marketing quantities and incomplete verb phrases cannot become flavor nouns',()=>{
 for(const sentence of [
  'This coffee offers more than enough flavor.',
  'Explore a brilliant spectrum of flavors.',
  'We achieved balance in flavor.',
  'Roasting unlocks the aroma and flavor.',
  'This is a sustainable upgrade with the same flavor.',
  'Aiming for a cleaner coffee taste.',
  'This coffee is delivering a naturally sweet flavor.',
  'Roasted sugars are bridging the gap between specialty fruit notes and traditional coffee comfort.'
 ])assert.equal(parse('<p>'+sentence+'</p>').fields.tasting_notes,undefined,sentence);
 const literal=parse('<p>This coffee offers more than enough flavor. It has notes of caramel.</p>');
 assert.equal(literal.fields.tasting_notes,'caramel');
 assert.equal(parse('<p>Roasted medium-dark for a bright, natural earthy flavor profile.</p>').fields.tasting_notes,
  'bright, natural earthy');
});
test('a current-product noun phrase after an explicit sensory verb remains literal',()=>{
 for(const [sentence,expected] of [
  ['In the cup, it showcases deep fruit notes, great body and a smooth finish.','deep fruit'],
  ['This coffee has a nutty taste.','nutty'],
  ['Savor the unique floral and chocolatey notes of this coffee.','floral and chocolatey'],
  ['This coffee has notes of natural wine, rich cacao, and cherry cordial.','natural wine, rich cacao, and cherry cordial']
 ])assert.equal(parse('<p>'+sentence+'</p>').fields.tasting_notes,expected,sentence);
 for(const sentence of ['Other coffees have a nutty taste.','This coffee does not have a nutty taste.'])
  assert.equal(parse('<p>'+sentence+'</p>').fields.tasting_notes,undefined,sentence);
});
test('one icon-labeled multiline sensory profile remains one literal profile',()=>{
 const result=parse('<div class="product__description"><h4><img src="/Tasting_Notes_16x16.png">'+
  'Honey, Raspberry, Almond. <br>Syrupy Body, Tangy Acidity, Sweet.</h4></div>');
 assert.equal(result.fields.tasting_notes,'Honey, Raspberry, Almond. Syrupy Body, Tangy Acidity, Sweet.');
 assert.ok(!result.conflicts?.includes('tasting_notes'));
 const unsafe=parse('<h4><img src="/Tasting_Notes_16x16.png">Please order whole bean and grind before brewing.</h4>');
 assert.equal(unsafe.fields.tasting_notes,undefined);
});
test('a discrete roast meter uses only a selected printed anchor, without interpolating between anchors',()=>{
 const meter=(states,heading='Roast Level',middle='Medium')=>'<section><h3>'+heading+'</h3><div><div class="product-attribute-meter">'+
  '<div class="product-attribute-meter_segments">'+states.map(active=>'<div class="product-attribute-meter__segment'+(active?' active':'')+'"></div>').join('')+'</div>'+
  '<div class="product-attribute-meter_labels"><span class="product-attribute-meter__label">Light</span><span class="product-attribute-meter__label product-attribute-meter__label-middle">'+middle+'</span><span class="product-attribute-meter__label">Dark</span></div></div></div></section>';
 for(const [states,value] of [[[true,false,false,false,false],'Light'],[[true,true,true,false,false],'Medium'],[[true,true,true,true,true],'Dark']])
  assert.equal(parse(meter(states)).fields.roast_level,value);
 for(const body of [meter([true,true,false,false,false]),meter([true,true,true,true,false]),meter([false,false,true,false,false]),meter([true,false,false,false,false],'Body'),meter([true,true,true,false,false],'Roast Level','Balanced')])
  assert.equal(parse(body).fields.roast_level,undefined,body);
 assert.match(parse(meter([true,true,false,false,false])).roast_hint,/step 2 of 5.*between printed labels/);
 assert.match(parse(meter([true,true,true,false,false])).roast_hint,/step 3 of 5.*aligns with Medium/);
 const conflict=parse(meter([true,false,false,false,false])+'<p>Roast Level: Dark</p>');
 assert.equal(conflict.fields.roast_level,undefined);
 assert.ok(conflict.conflicts.includes('roast_level'));
});
test('a numbered roast guide binds only one marked endpoint or center to its own printed label',()=>{
 const guide=active=>'<div class="guide"><p class="guide__heading">Roast Profile</p><div class="guide__line">'+
  [1,2,3,4,5].map(n=>'<span'+(active.includes(n)?' class="is-active"':'')+'>'+n+'</span>').join('')+'</div>'+
  '<div class="guide__content"><div class="guide__left">Light</div><div class="guide__middle">Medium</div><div class="guide__right">Dark</div></div></div>';
 for(const [active,value] of [[[1],'Light'],[[3],'Medium'],[[5],'Dark']])assert.equal(parse(guide(active)).fields.roast_level,value);
 for(const active of [[2],[4],[1,3],[]])assert.equal(parse(guide(active)).fields.roast_level,undefined);
 assert.equal(parse(guide([1]).replace('Roast Profile','Acidity')).fields.roast_level,undefined);
 assert.equal(parse('<section class="related-products">'+guide([1])+'</section>').fields.roast_level,undefined);
});
test('a shorter named sensory summary can omit a literal qualifier in the complete label',()=>{
 const chips='<div class="flavor-profile"><span>Strawberry</span><span>Pineapple</span><span>Dark Chocolate</span></div>';
 const result=parse(chips+'<p>Flavor: Macerated Strawberry, Pineapple, Yogurt, Dark Chocolate</p>');
 assert.equal(result.fields.tasting_notes,'Macerated Strawberry, Pineapple, Yogurt, Dark Chocolate');
 assert.ok(!result.conflicts?.includes('tasting_notes'));
 const unrelated=parse(chips+'<p>Flavor: Strawberry, Pineapple, Milk Chocolate, Yogurt</p>');
 assert.equal(unrelated.fields.tasting_notes,undefined);
 assert.ok(unrelated.conflicts.includes('tasting_notes'));
 const separate=parse('<p>Flavor: Strawberry, Pineapple, Dark Chocolate</p><p>Flavor: Macerated Strawberry, Pineapple, Yogurt, Dark Chocolate</p>');
 assert.equal(separate.fields.tasting_notes,undefined);
 assert.ok(separate.conflicts.includes('tasting_notes'));
});
test('a literal percentage position remains reviewable without becoming a roast category',()=>{
 const result=parse('<section><h3>Roast Level</h3><div class="roast-scale"><span>Light</span><span>Medium</span><div style="left:20%"></div></div></section>');
 assert.equal(result.fields.roast_level,undefined);
 assert.match(result.roast_hint,/published marker at 20%/);
 const tooltip=parse('<section><h3>Roast Level</h3><div class="roast-scale"><span>Light</span><span>Medium</span><div title="left:20%"></div></div></section>');
 assert.ok(!tooltip.roast_hint?.includes('20%'));
});
