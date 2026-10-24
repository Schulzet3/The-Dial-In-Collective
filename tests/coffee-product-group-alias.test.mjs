import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://roaster.example.org/products/current-coffee';
const alias='https://example-roaster.myshopify.com/products/current-coffee';
const group=()=>({'@type':'ProductGroup','@id':'/products/current-coffee#product',
 name:'Current Coffee',url:alias,brand:{name:'Example Roaster'},
 description:'Current coffee in a foil bag.',
 hasVariant:[
  {'@type':'Product','@id':'/products/current-coffee?variant=101#variant',name:'Current Coffee - Whole Bean',
   offers:{'@type':'Offer',price:'18.00',priceCurrency:'USD',url:alias+'?variant=101'}},
  {'@type':'Product','@id':'/products/current-coffee?variant=102#variant',name:'Current Coffee - Drip Grind',
   offers:{'@type':'Offer',price:'18.00',priceCurrency:'USD',url:alias+'?variant=102'}}
 ]});
function parse(product,{heading='Current Coffee',declaredUrl=alias,sourceUrl=url,extra=[]}={}){
 const html='<head><meta property="og:url" content="'+declaredUrl+'"><meta property="og:site_name" content="Example Roaster">'+
  '<script type="application/ld+json">'+JSON.stringify({'@graph':[product,...extra]})+'</script></head>'+
  '<main>'+(heading?'<h1>'+heading+'</h1>':'')+'<p>Roast Level: Medium-Dark</p><h2>Wood fire roasted</h2><p>Published roasting method.</p></main>';
 return extractPublicCoffeeFacts(html,{source_url:sourceUrl});
}

test('a locally identified product group survives its corroborated Shopify alias and purchase children',()=>{
 const actual=parse(group());
 assert.equal(actual.ok,true);
 assert.equal(actual.fields.name,'Current Coffee');
 assert.equal(actual.fields.roast_level,'Medium-Dark');
 assert.ok(actual.source_facts.some(fact=>fact.source_type==='html'&&fact.source_url===url&&fact.value.includes('Wood fire roasted')));
 assert.ok(actual.source_facts.some(fact=>fact.format==='json'&&fact.value.includes(alias)),
  'review evidence retains the original published alias instead of fabricating a custom-domain offer URL');
});
test('alias identity requires a local parent ID, exact visible heading, matching handle and declared alias',()=>{
 for(const [product,options] of [
  [{...group(),'@id':'/products/other-coffee#product'},{}],
  [{...group(),'@id':'//other.example.org/products/current-coffee#product'},{}],
  [{...group(),url:'https://example-roaster.myshopify.com/products/other-coffee'},{}],
  [group(),{heading:'Another Coffee'}],
  [group(),{heading:''}],
  [group(),{declaredUrl:'https://different-roaster.myshopify.com/products/current-coffee'}]
 ])assert.equal(parse(product,options).ok,false,JSON.stringify({product:product['@id'],options}));
});
test('an arbitrary external URL or additional unrelated current-page product cannot be treated as a Shopify alias',()=>{
 for(const foreign of ['https://unrelated.example.org/products/current-coffee',
  'https://example-roaster.myshopify.com.attacker.example/products/current-coffee',
  'https://user:secret@example-roaster.myshopify.com/products/current-coffee']){
  assert.equal(parse({...group(),url:foreign},{declaredUrl:foreign}).ok,false,foreign);
 }
 const other={'@type':'Product',name:'Unrelated Coffee',url};
 assert.equal(parse(group(),{extra:[other]}).ok,false);
 const differentPage=parse(group(),{sourceUrl:'https://roaster.example.org/products/other-coffee'});
 assert.ok(!differentPage.source_facts?.some(fact=>fact.value.includes('Current coffee in a foil bag.')),
  'a different path may use its visible heading but cannot adopt the unrelated group description');
});
