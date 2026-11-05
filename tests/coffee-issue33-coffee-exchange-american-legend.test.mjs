// Issue #33 original603 #585: the selected Coffee Exchange American roast
// must not inherit other roast tiers from the site's comparison legend.
// Synthetic adversarial fixture, not a raw official HTML replay.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://www.thecoffeeexchange.com/products/peru-cafe-canchaque-natural-process-american-roast-limited-offering';
const name='Peru Cafe Canchaque – Natural, American';
const description='<p>Fair Trade / Organic • Canchaque • 1500-2350 meters</p>'+
 '<p>Flavor Notes: Milk Chocolate, Caramel, Vanilla, Medium Body</p>'+
 '<p>The Canchaque region of northern Piura is one of the only producers of high-quality, unwashed (natural process) coffees in all of Peru.</p>'+
 '<h2>About our Roasts</h2>'+
 '<p>American Roast: Our lightest roast, characterized by a dry surface, leading to a light body and a bright, piquant flavor</p>'+
 '<p>Full City Roast: A medium/light roast, slightly darker than our American, has a rich, sweet, full-body creating a complex cup</p>'+
 '<p>Vienna Roast: A medium/dark roast that brings the ambrosial coffee oils to the surface</p>'+
 '<p>French Roast: A classic dark roast that results in a dark, oily bean</p>'+
 '<p>Espresso Roast: As dark as it gets</p>';
const page=(head='',tail='')=>'<html><head><meta property="og:type" content="product">'+head+
 '</head><body><main><article class="product"><h1>'+name+'</h1>'+
 '<div itemprop="description">'+description+'</div></article></main>'+tail+'</body></html>';
const parse=(head='',tail='')=>extractPublicCoffeeFacts(page(head,tail),{source_url:url});

test('#585 selected American roast does not inherit Medium Body or another roast in comparison legend',()=>{
 const result=parse();
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.fields.name,name);
 assert.equal(result.fields.process,'Natural',JSON.stringify(result.fields));
 assert.match(result.fields.tasting_notes||'',/Milk Chocolate/i);
 assert.equal(result.fields.roast_level,undefined,JSON.stringify(result.fields));
 assert.ok(!result.conflicts?.includes('roast_level'),JSON.stringify(result.conflicts));
});

test('#585 stale SEO, related French roast and a grind option cannot invent a selected roast',()=>{
 const seo='<title>French Roast Peru - Old SEO</title>'+
  '<meta property="og:title" content="Peru French Roast - Previous Release">'+
  '<meta property="og:description" content="A dark roast from a previous coffee">';
 const tail='<aside class="related-products"><h2>Other coffees</h2>'+
  '<h3>Peru Pangoa French Roast</h3><p>Roast: Dark</p></aside>'+
  '<form><label>Grind</label><select name="grind">'+
  '<option>Whole Bean</option><option selected>Medium</option></select></form>';
 const result=parse(seo,tail);
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.fields.name,name);
 assert.equal(result.fields.process,'Natural',JSON.stringify(result.fields));
 assert.equal(result.fields.roast_level,undefined,JSON.stringify(result.fields));
 assert.ok(!result.conflicts?.includes('roast_level'),JSON.stringify(result.conflicts));
 assert.doesNotMatch(JSON.stringify(result.fields),/Peru Pangoa|French Roast Peru|Previous Release/i);
});
