import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractShopifyAjaxData,shopifyProductRequest,mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';
import {extractWooStoreData,wooProductRequest} from '../src/server/coffee-woocommerce-store.mjs';
import {parseCoffeeElevation,compatibleCoffeeElevations} from '../src/server/coffee-elevation-evidence.mjs';
import {coffeeProductHandle,isCoffeeProductDetailUrl} from '../src/server/coffee-url-guard.mjs';
const url='https://roaster.example.org/products/current-coffee';
const parse=(body,product={})=>extractPublicCoffeeFacts('<html><head><meta property="og:site_name" content="Example Coffee Roasters">'+
 '<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:'Current Coffee',url,...product})+'</script></head>'+
 '<body><main><h1>Current Coffee</h1>'+body+'</main></body></html>',{source_url:url});

test('bare and explicitly metered altitude values are equivalent, including split inline units',()=>{
 const result=parse('<p>Altitude - <span>1600</span><span> masl</span></p>',{additionalProperty:[{name:'Altitude',value:'1600'}]});
 assert.ok(result.fields.elevation_m);assert.equal(result.conflicts,undefined);
});
test('adjacent metric unit is part of the value, not a numeric word-boundary failure',()=>{
 assert.equal(parse('<h5>Altitude: 1400m</h5>').fields.elevation_m,'1400m');
 assert.equal(parse('<h5>Altitude: 1800-1900m</h5>').fields.elevation_m,'1800-1900m');
});
test('explicit composite/plural altitude labels and bullets preserve the complete range',()=>{
 for(const label of ['Altitudes','Altitude/elevation','ALTITUDE MASL'])
  assert.match(parse('<p>'+label+': 1450–1520 meters</p>').fields.elevation_m||'',/1450.*1520/);
 assert.match(parse('<p>✹ <strong>Altitude</strong>: 1,000-1,450 meters<br>✹ <strong>Farm Size</strong>: 800 hectares</p>').fields.elevation_m||'',/1,000-1,450/);
});
test('standalone product height and slash-separated specifications preserve thousands',()=>{
 for(const body of ['<p>1,900 masl</p>','<p>Region | 1,900 MASL | Natural Process</p>',
  '<p>Washed Gesha // 1,900 masl</p>','<p>ALTITUDE MASL /// 1,900</p>'])
  assert.match(parse(body).fields.elevation_m||'',/1,?900/);
});
test('feet are explicitly converted to metres without dropping thousands or open bounds',()=>{
 const feet=parse('<p>Elevation: 3,280–4,920 feet</p>').fields.elevation_m;
 assert.match(feet||'',/1000.*1500/);
 assert.match(parse('<p>This coffee is grown at an elevation of 4,492 feet.</p>').fields.elevation_m||'',/1369/);
 const minimum=parse('<p>Altitude: 5,500+ feet</p>').fields.elevation_m;
 assert.match(minimum||'',/1676/);assert.match(minimum,/\+|≥|>/);
});
test('dual unit evidence retains the metric value and rejects genuinely contradictory conversion',()=>{
 assert.match(parse('<p>Altitude: 1,847m (6060 ft)</p>').fields.elevation_m||'',/1,?847/);
 assert.match(parse('<p>Altitude/elevation: 1450 meters to 1520 MASL (4772-5003 feet)</p>').fields.elevation_m||'',/1450.*1520/);
 const conflict=parse('<p>Altitude: 5200 feet (1100 MASL)</p>');
 assert.equal(conflict.fields.elevation_m,undefined);assert.ok(conflict.conflicts?.includes('elevation_m'));
});
test('ranges and bound qualifiers never silently become a single point',()=>{
 const between=parse('<p>This coffee is cultivated at elevations between 2,100 and 2,200 meters above sea level.</p>');
 assert.match(between.fields.elevation_m||'',/2100.*2200|2,100.*2,200/);
 const over=parse('<p>This coffee grows at altitudes that surpass 2,000 meters.</p>');
 assert.match(over.fields.elevation_m||'',/>\s*2000/);
 const merged=mergePublicProductPreview({ok:true,fields:{name:'Current Coffee',elevation_m:'>1800 m'}},
  {ok:true,fields:{name:'Current Coffee',elevation_m:'1800 m'}});
 assert.equal(merged.fields.elevation_m,undefined);assert.ok(merged.conflicts?.includes('elevation_m'));
});
test('elevation fallback excludes generic lessons, other coffees, weights and impossible ranges',()=>{
 for(const body of ['<p>Coffee is generally grown at 1800 meters.</p>',
  '<p>This coffee is not grown at 1800 meters.</p>','<p>This coffee is grown at 2200–1200 meters.</p>',
  '<p>This coffee is grown at 99999 meters.</p>','<p>Shipping weight: 1800 grams</p>',
  '<section class="related-products"><p>Altitude: 1800m</p></section>'])
  assert.equal(parse(body).fields.elevation_m,undefined,body);
});
test('same-product endpoint brand prefix does not discard purchase evidence or change release identity',()=>{
 const endpoint=extractShopifyAjaxData({handle:'current-coffee',title:'2026 Halo Hartume; 2nd Selection - Ethiopia',vendor:'SEY COFFEE',description:'<p>Variety: Landrace</p>',variants:[{title:'250g',price:2600}]},shopifyProductRequest(url));
 const html={ok:true,fields:{name:'SEY - 2026 Halo Hartume; 2nd Selection - Ethiopia',roaster:'SEY'}};
 const result=mergePublicProductPreview(html,endpoint);
 assert.equal(result.fields.variety,'Landrace');assert.ok(result.source_facts?.some(f=>/250g/.test(f.value)));
 assert.equal(mergePublicProductPreview({ok:true,fields:{name:'SEY - 2025 Halo Hartume; 1st Selection - Ethiopia',roaster:'SEY'}},endpoint).fields.variety,undefined);
});
test('a Woo endpoint title encoded with HTML entities is compared after decoding',()=>{
 const request=wooProductRequest('https://roaster.example.org/product/pink-bourbon-washed-process');
 const result=extractWooStoreData({name:'PINK BOURBON &#8211; Washed Process',slug:request.slug,permalink:request.sourceUrl,
  description:'<p>Variety: Pink Bourbon</p>'},request);
 assert.equal(result?.fields.name,'PINK BOURBON – Washed Process');assert.equal(result?.fields.variety,'Pink Bourbon');
});
test('explicit Woo product title headings identify a product without a generic H1',()=>{
 const source_url='https://roaster.example.org/product/pink-bourbon-washed-process';
 const result=extractPublicCoffeeFacts('<html><head><title>PINK BOURBON &#8211; Washed Process &#8211; Iwana Coffee</title></head><body><main>'+
  '<h2 class="product_title entry-title">PINK BOURBON &#8211; Washed Process</h2><p>Variety: Pink Bourbon</p></main></body></html>',{source_url});
 assert.equal(result.ok,true);assert.equal(result.fields.name,'PINK BOURBON – Washed Process');assert.equal(result.fields.roaster,'Iwana Coffee');
});
test('generic vendor categories do not replace the source site roaster',()=>{
 for(const vendor of ['My Store','vendor-unknown','SINGLE ORIGIN','Single Origin | 10 oz','El Salvador 🇸🇻'])
  assert.equal(parse('',{brand:vendor}).fields.roaster,'Example Coffee Roasters',vendor);
});
test('a named exact ProductGroup survives its own size/grind variants without choosing another product',()=>{
 const group={'@type':'ProductGroup',name:'Current Coffee',url,hasVariant:[
  {'@type':'Product',name:'Current Coffee - Whole bean, 12 oz',url},
  {'@type':'Product',name:'Current Coffee - Ground, 1 lb',url}]};
 assert.equal(parse('',group).fields.name,'Current Coffee');
 const unrelated=parse('',{'@type':'ProductGroup',name:'Current Coffee',url,hasVariant:[
  {'@type':'Product',name:'Different Coffee',url}]});
 assert.equal(unrelated.ok,false);
});
test('international product handles preserve exact identity without accepting encoded separators or another endpoint',()=>{
 const international='café-reserva®_lot';
 const request=shopifyProductRequest('https://roaster.example.org/products/'+encodeURIComponent(international));
 assert.equal(request.handle,international);assert.ok(isCoffeeProductDetailUrl(request.sourceUrl));
 const result=extractShopifyAjaxData({title:'Café Reserva',handle:international,description:'<p>Altitude: 1500m</p>'},request);
 assert.equal(result.fields.elevation_m,'1500m');
 assert.equal(extractShopifyAjaxData({title:'Café Reserva',handle:'cafe-reserva',description:''},request),null);
 for(const bad of ['coffee%2Fsecret','coffee%252Fsecret','coffee%3Fadmin','coffee%00'])assert.equal(coffeeProductHandle(bad),null,bad);
 assert.equal(shopifyProductRequest('https://roaster.example.org/products/current-coffee.json'),null);
});
test('supported finite heights enrich open bounds while incompatible or strict endpoints stay rejected',()=>{
 assert.equal(compatibleCoffeeElevations('up to 1800m','1600–1800m'),'1600–1800m');
 assert.equal(compatibleCoffeeElevations('1800+ m','1900–2100m'),'1900–2100m');
 assert.equal(compatibleCoffeeElevations('>1800 m','1800 m'),null);
 assert.equal(compatibleCoffeeElevations('up to 1800m','1600–2000m'),null);
 const result=parse('<p>Elevation: up to 1800m</p>',{additionalProperty:[{name:'Elevation',value:'1600–1800m'}]});
 assert.equal(result.fields.elevation_m,'1600–1800m');assert.equal(result.conflicts,undefined);
});
test('bracket and slash dual units plus written approximate heights preserve measurements',()=>{
 for(const value of ['1800 m [5906 ft]','1800 m / 5906 ft'])assert.equal(parseCoffeeElevation(value).low,1800);
 assert.equal(parseCoffeeElevation('5200 feet [1100 MASL]').conflicting,true);
 assert.equal(parseCoffeeElevation('two thousand meters on average').approximate,true);
 assert.equal(parseCoffeeElevation('one thousand five hundred meters'),null);
});
test('countrywide growing-height descriptions are not this lot altitude',()=>{
 for(const line of ['Most of the coffee grown in Peru is grown at 1600 meters.',
  'Much of the coffee is cultivated at 1600 meters.',
  'The majority of the coffee is grown at 1600 meters.'])
  assert.equal(parse('<p>'+line+'</p>').fields.elevation_m,undefined,line);
 assert.match(parse('<p>This coffee is grown at 1600 meters.</p>').fields.elevation_m||'',/1600/);
});
test('long descriptions require an exact page binding and may refine a published elevation bound',()=>{
 const description='This is the current release from a longstanding producer partnership. '.repeat(12)+
  'This coffee is grown at 1600–1800 meters.';
 const page=(identity,body='')=>'<html><head>'+identity+'<meta name="description" content="'+description+'"></head>'+
  '<body><main><h1>Current Coffee</h1>'+body+'</main></body></html>';
 const canonical='<link rel="canonical" href="'+url+'">';
 const positive=extractPublicCoffeeFacts(page(canonical,'<p>Elevation: up to 1800m</p>'),{source_url:url});
 assert.match(positive.fields.elevation_m||'',/1600.*1800/);
 assert.equal(extractPublicCoffeeFacts(page(''),{source_url:url}).fields.elevation_m,undefined);
 assert.equal(extractPublicCoffeeFacts(page(canonical+'<meta property="og:url" content="https://roaster.example.org/products/different">'),{source_url:url}).fields.elevation_m,undefined);
});
test('a current ProductGroup with only declared variants survives expanded SEO without an H1',()=>{
 const product={'@type':'ProductGroup',name:'Current Coffee',url,hasVariant:[{'@type':'Product',name:'Current Coffee - Whole Bean',url}]};
 const html='<head><meta property="og:title" content="Buy Current Coffee Fresh Roasted">'+
  '<script type="application/ld+json">'+JSON.stringify(product)+'</script></head><main><p>Variety: Caturra</p></main>';
 const result=extractPublicCoffeeFacts(html,{source_url:url});
 assert.equal(result.ok,true);assert.equal(result.fields.name,'Current Coffee');assert.equal(result.fields.variety,'Caturra');
});
test('explicit product headings omit a price and a published DBA identifies the trading roaster',()=>{
 const result=extractPublicCoffeeFacts('<html><head><meta property="og:site_name" content="Example LLC dba Example Coffee"></head>'+
  '<body><main><h1>Shop</h1><h2 class="product_title">Current Coffee <span class="price">$24.00</span></h2><p>Variety: Bourbon</p></main></body></html>',{source_url:url});
 assert.equal(result.fields.name,'Current Coffee');assert.equal(result.fields.roaster,'Example Coffee');
});
