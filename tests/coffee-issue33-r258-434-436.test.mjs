import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {cases as blackCoffee, directCurrent} from '../scripts/audit/issue33-r94-blackcoffee-433-435-check.mjs';
import {cases as blackHills, ownSelectedProof} from '../scripts/audit/issue33-r95-blackhills-436-438-check.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
const red=blackCoffee.find(x=>x.number===434);
const house=blackHills.find(x=>x.number===436);
const redStory='Silky smooth with a layered depth. Clove, tamarind, starfruit, and a touch of noir cinema. Roast Level: Dark.';
const houseStory='A blend of Central & South American Coffees, balanced with City Roast & Full City Roast beans. Medium body and high acidity makes this a perfect all day, every day coffee.';
const html=(name,story,other='',selectedRedSpecs=true)=>'<html><body><main><article class="product"><h1>'+name+'</h1>'+
 '<div class="woocommerce-product-details__short-description"><p>'+
 (name===red.name?story.replace(/\s*Roast Level: Dark[.]?$/,''):story)+'</p>'+
 (name===red.name&&selectedRedSpecs?
  '<p><strong>Roast Level: Dark</strong></p><p>Tastes Like: Clove, tamarind, starfruit</p>':'')+
 '</div></article></main>'+other+'</body></html>';
const parse=(entry,story,other='')=>extractPublicCoffeeFacts(html(entry.name,story,other),{
 source_url:entry.number===434?'https://www.blackcoffeeroastingco.com'+entry.path:
 'https://www.blackhillscoffee.com'+entry.path});
test('red room exact selected merchant identity and direct current claims, not nearby metadata',()=>{
 const own=productMarkup(html(red.name,redStory));
 const proof=directCurrent(own,selectedProductHeadings(own),red);
 assert.equal(proof.exactUniqueSelected,true);
 assert.deepEqual(proof.directWitnesses,[true,true]);
 const wrong=productMarkup(html('AM',redStory));
 assert.equal(directCurrent(wrong,selectedProductHeadings(wrong),red).exactUniqueSelected,false);
 const sidebar=productMarkup(html(red.name,'Selected facts not published.','<aside>'+red.witnesses.join(' ')+'</aside>',false));
 assert.deepEqual(directCurrent(sidebar,selectedProductHeadings(sidebar),red).directWitnesses,[false,false]);
});
test('red room: retain literal named cup notes and Dark; exclude cinematic setting from canonical flavor',()=>{
 const p=parse(red,redStory);
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,red.name);
 assert.equal(p.fields.roast_level,'Dark',JSON.stringify(p.fields));
 const notes=p.fields.tasting_notes||'';
 for(const n of ['clove','tamarind','starfruit'])assert.match(notes,new RegExp(n,'i'),JSON.stringify(p.fields));
 assert.doesNotMatch(notes,/noir|cinema/i,JSON.stringify(p.fields));
});
test('red room: customer-review and sibling notes, origin, process cannot become own facts',()=>{
 const p=parse(red,redStory,
 '<section id="reviews">Coffee tastes of bananas and espresso chocolate. Origin: Kenya; Natural; Gesha.</section>'+
 '<aside class="related-products"><h2>AM</h2>Washed, Guatemala, lemon, sunrise</aside>');
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.doesNotMatch(p.fields.tasting_notes||'',/banana|espresso chocolate|sunrise/i,JSON.stringify(p.fields));
 assert.ok(!p.fields.origin&&!p.fields.process&&!p.fields.producer&&!p.fields.elevation_m,JSON.stringify(p.fields));
});
test('house blend own selected City and Full City COMPONENT roasts are not an unambiguous roast',()=>{
 const own=productMarkup(html(house.name,houseStory));
 const proof=ownSelectedProof(own,selectedProductHeadings(own),house);
 assert.equal(proof.uniqueH1,true);
 assert.deepEqual(proof.direct,[true,true]);
 const p=parse(house,houseStory,'<select name="Grind"><option>Medium</option></select>');
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields.name,house.name);
 assert.ok(!p.fields.roast_level,JSON.stringify(p.fields));
 assert.match(p.fields.origin||'',/central america/i,JSON.stringify(p.fields));
 assert.match(p.fields.origin||'',/south america/i,JSON.stringify(p.fields));
 assert.ok(coffeeUrlPreviewMarkup(p).includes('coffee-url-preview'));
 assert.ok(coffeeSourceReviewSnapshot({...p,source_url:'https://www.blackhillscoffee.com'+house.path}));
});
test('house blend cannot inherit light roast and fruit from sibling breakfast blend or reviews',()=>{
 const p=parse(house,houseStory,
 '<aside class="related-products"><h2>Washington\'s Breakfast Blend</h2>roasted light (city roast), Ethiopian blueberry; Natural</aside>'+
 '<section id="reviews">Dark roast, Cinnamon chocolate from Brazil and Colombia at 1800 masl.</section>');
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.ok(!p.fields.roast_level&&!p.fields.process&&!p.fields.producer&&!p.fields.elevation_m,JSON.stringify(p.fields));
 assert.doesNotMatch(JSON.stringify(p.fields),/ethiop|blueberr|cinnamon|colombia|brazil|1800/i);
});
test('house blend absence, wrong/duplicate title or sibling-only prose is never identity certification',()=>{
 for(const h of [[],['Washington\'s Breakfast Blend'],['House Blend','House Blend']]){
  const proof=ownSelectedProof(productMarkup(html(house.name,houseStory)),h,house);
  assert.equal(proof.uniqueH1,false);
 }
 const scope=productMarkup(html(house.name,'No published fields.','<nav>'+houseStory+'</nav>'));
 assert.deepEqual(ownSelectedProof(scope,selectedProductHeadings(scope),house).direct,[false,false]);
});
test('original selected official unavailable results fail closed and cannot borrow archived captures',()=>{
 const failures=requiredFocusedSourceFailures([434,436],[
  {number:434,status:'UNAVAILABLE',parser_ok:false},
  {number:436,status:'UNAVAILABLE',parser_ok:false}
 ]);
 assert.ok(failures.filter(x=>x.reason==='required_official_source_not_fetched').length>=2);
});
