import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCoffeeElevation,compatibleCoffeeElevations} from '../src/server/coffee-elevation-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractShopifyAjaxData,shopifyProductRequest,mergePublicProductPreview} from '../src/server/coffee-shopify-ajax.mjs';
const url='https://roaster.example.org/products/current-coffee';
const parse=body=>extractPublicCoffeeFacts('<head><link rel="canonical" href="'+url+'"></head><main><h1>Current Coffee</h1>'+body+'</main>',{source_url:url});

test('redundant altitude unit expansions and non-measurement grade notes preserve explicit heights',()=>{
 for(const value of ['1,900 Meters Above Sea Level (MASL)','1,100 - 1,600 MASL meters above sea level',
  '1,600 – 2,000 meters (SHB - Strictly Hard Bean)'])assert.ok(parseCoffeeElevation(value),value);
 assert.equal(parseCoffeeElevation('1,550m+').operator,'>=');
 assert.equal(parseCoffeeElevation('5200 feet (1100 MASL)').conflicting,true);
 assert.equal(parseCoffeeElevation('1800m (other farm 2200m)'),null);
});
test('approximate dual units use the explicit metric counterpart without losing the bound or conversion',()=>{
 const value=parseCoffeeElevation('~3,400-5,000 feet above sea level [1,100 - 1,600 MASL meters above sea level]');
 assert.equal(value.low,1100);assert.equal(value.high,1600);
});
test('restored repeated delimiters and growing-height captions are explicit specifications',()=>{
 for(const line of ['Altitude -- 2050 meters','Altitude /// 2050 meters','Growing Elevation - 2050 Meters',
  'Coffee growing altitude = 2050 meters','"Elevation : 2050 meters'])
  assert.match(parse('<p>'+line+'</p>').fields.elevation_m||'',/2050/,line);
});
test('growth statements and farm locations retain literal physical measurements',()=>{
 const cases=[
  ['This premium selection is a clean, double picked Sumatra grown in the Jegarang region, at an elevation of 1375 & 1600 meters.',/1375\s*&\s*1600/],
  ['More specifically, a washed Caturra and Bourbon varietal grown at 1500-1700 meters above sea level from the lake Atitlan region.',/1500.*1700/],
  ['Grown 1200+MASL– Chiapas comes to us from a mountainous cloud forest region.',/1200\+/],
  ['The berries grow 1630 meters above sea level before they are harvested.',/1630/],
  ['The unique terroir at Fazenda Matheus and Fazenda Mayara allows coffee to grow slowly and uniformly at 1,100masl.',/1100/],
  ['There, Sebastian and his family invested in what is now Finca Gonzalo, a 2.8-hectare farm sitting at 1,530 meters above sea level.',/1530/],
  ['Nestled between 2000 and 2200 meters above sea level, near Bombe Mountain, this coffee embodies the rich terroir of southern Ethiopia.',/2000.*2200/],
  ['Today, ASOPCE represents 450 smallholder producers, most farming small plots averaging 1.5 hectares at elevations between 1,400 and 2,050 MASL.',/1400.*2050/],
  ['The coffee is grown in volcanic soil at approximately 1,600 meters above sea level.',/approximately\s+1600/],
  ['This coffee is grown on small family farms in the volcanic soil of the Kenyan highlands, at about 4,600 to 5,900 feet.',/1402.*1798/],
  ['Sourced from the lofty peaks of Huila, where altitudes surpass 2,000 meters, this Colombian coffee thrives in volcanic soil.',/>\s*2000/],
  ['Grown at altitudes ranging from 1300 to 1900 meters above sea level, this coffee is sourced directly from local farmers.',/1300.*1900/],
  ['Family farms work a few acres at a time and grow coffee alongside citrus trees in volcanic soil, between 1,200 and 1,600 meters.',/1200.*1600/],
  ['The farms range in elevation from 1800–1950 meters above sea level.',/1800.*1950/]
 ];
 for(const [sentence,expected] of cases)assert.match(parse('<p>'+sentence+'</p>').fields.elevation_m||'',expected,sentence);
});
test('generic regional elevations and unrelated distances cannot supply this coffee height',()=>{
 for(const sentence of ['At altitudes between 800 and 1300 meters, the Cerrado region exhibits a unique identity.',
  'Coffee can be grown at altitudes reaching up to 2,000 meters without risk of frost.',
  'The farm is located 1800 meters from the town.',
  'Most of the coffee grown in Peru is grown at 1600 meters.',
  'Unlike our coffee, another lot is grown at 1700 meters.',
  'One of the coffees is grown at 1800–2000 meters. The other is grown at 1500–1700 meters.'])
  assert.equal(parse('<p>'+sentence+'</p>').fields.elevation_m,undefined,sentence);
});
test('an exact-page description can carry a discrete altitude after processing details',()=>{
 const description='Fragancia varietal grown by Luis Edgar Camacho in Huila. Fully Washed Process, 48 hr dry fermentation, Greenhouse drying for 15 days, 1720 masl.';
 const html='<head><meta property="og:url" content="'+url+'"><meta name="description" content="'+description+'"></head><main><h1>Current Coffee</h1></main>';
 assert.match(extractPublicCoffeeFacts(html,{source_url:url}).fields.elevation_m||'',/1720/);
});
test('original selected-product feet remain authoritative over compatible lower-tier SEO metric range',()=>{
 const html='<head><meta property="og:url" content="'+url+'"><meta name="description" content="The coffee is grown between 1800 and 2100 meters above sea level."></head>'+
  '<main><h1>Current Coffee</h1><p>Elevation: 5900-6890 feet</p></main>';
 const result=extractPublicCoffeeFacts(html,{source_url:url});
 assert.match(result.fields.elevation_m||'',/1798.*2100/);assert.equal(result.conflicts,undefined);
 const contradiction=parse('<p>Elevation: 1800m</p><p>Elevation: 1850m</p>');
 assert.equal(contradiction.fields.elevation_m,undefined);assert.ok(contradiction.conflicts?.includes('elevation_m'));
});
test('a labeled height stops at an explicit neighboring grade without discarding a mixed specification line',()=>{
 const result=parse('<p>Variety: Bourbon, Caturra, Processing: Fully washed, Altitudes: 1350-1550m, Grade: SHB, Variety: Caturra, Pache, Maragogype, others</p>');
 assert.match(result.fields.elevation_m||'',/1350.*1550/);
 assert.ok(result.conflicts?.includes('variety'));
});
test('a later unrelated negative in an exact product description cannot erase its discrete metric',()=>{
 const description='Fully Washed Process, Greenhouse drying for 15 days, 1720 masl.Sold in 300g bags. This was a surprise because the cup did not lack any sweetness.';
 const html='<head><meta property="og:url" content="'+url+'"><meta name="description" content="'+description+'"></head><main><h1>Current Coffee</h1></main>';
 assert.match(extractPublicCoffeeFacts(html,{source_url:url}).fields.elevation_m||'',/1720/);
 const negative='<p>This coffee is not from a site, 1720 masl.</p>';
 assert.equal(parse(negative).fields.elevation_m,undefined);
});
test('same exact endpoint preserves native feet provenance without SEO refinement during merging',()=>{
 const html='<head><meta property="og:url" content="'+url+'"><meta name="description" content="The coffee is grown between 1800 and 2100 meters above sea level."></head>'+
  '<main><h1>Current Coffee</h1><p>Elevation: 5900-6890 feet</p></main>';
 const base=extractPublicCoffeeFacts(html,{source_url:url});
 const extra=extractShopifyAjaxData({title:'Current Coffee',handle:'current-coffee',description:'<p>Elevation: 5900-6890 feet</p>'},shopifyProductRequest(url));
 const result=mergePublicProductPreview(base,extra);
 assert.match(result.fields.elevation_m||'',/1798.*2100/);assert.equal(result.conflicts,undefined);
 const contradictory=mergePublicProductPreview(parse('<p>Elevation: 1800m</p>'),parse('<p>Elevation: 1850m</p>'));
 assert.equal(contradictory.fields.elevation_m,undefined);assert.equal(contradictory.elevation_source,undefined);
 const spoofed=mergePublicProductPreview(parse('<p>Elevation: 1800m</p>'),{...parse('<p>Elevation: 2200m</p>'),elevation_source:'5900 feet'});
 assert.equal(spoofed.fields.elevation_m,undefined);
});
test('a unit in a neighboring inline span refines the same current-product elevation',()=>{
 const cases=[
  ['<p><span>Altitude - 1600</span><span> </span><span>masl</span><br></p>','1600 masl'],
  ['<p>Altitude: <meta charset="utf-8"><span>1500-1700</span> masl</p>','1500-1700 masl']
 ];
 for(const [html,expected] of cases){
  const actual=parse(html);
  assert.equal(actual.fields.elevation_m,expected);
  assert.equal(actual.conflicts,undefined);
 }
 assert.equal(compatibleCoffeeElevations('1600','1600 masl'),'1600 masl');
 assert.equal(compatibleCoffeeElevations('1600 masl','1600'),'1600 masl');
 assert.equal(compatibleCoffeeElevations('1600','1600 feet'),null);
 assert.equal(compatibleCoffeeElevations('> 1600','1600 masl'),null);
 assert.equal(compatibleCoffeeElevations('1600-1700','1600-1800 masl'),null);
});
test('an additional plantation biography cannot supply the selected coffee elevation',()=>{
 const biography='Today, our coffee export business operates several washing stations. In addition to these, the family owns a 450 hectare coffee plantation in another town. It has suitable conditions for specialty coffee production. Its altitude is between 1600 and 1900 meters asl, and temperatures are conducive for coffee production.';
 assert.equal(parse('<p>'+biography+'</p>').fields.elevation_m,undefined);
 assert.equal(parse('<p>The family also owns a plantation in another town, where coffee grows at 1800 meters.</p>').fields.elevation_m,undefined);
 const returned=parse('<p>'+biography+' This coffee is grown at 2100 meters above sea level.</p>');
 assert.match(returned.fields.elevation_m||'',/2100/);
 const earlier=parse('<p>This coffee is grown at 2200 meters. '+biography+'</p>');
 assert.match(earlier.fields.elevation_m||'',/2200/);
 const labeled=parse('<p>'+biography+'</p><p>Elevation: 2050 masl</p>');
 assert.equal(labeled.fields.elevation_m,'2050 masl');
});
test('a general regional coffee-class range is not a measured height for the current farm',()=>{
 const general='Yergecheffe coffees are exclusively indigenous heirloom cultivars grown at altitude of 5700 – 7500 feet.';
 assert.equal(parse('<p>This coffee is produced by the Gelgelu Edema Farm. '+general+'</p>').fields.elevation_m,undefined);
 assert.match(parse('<p>These beans are exclusively grown at altitude of 5700 – 7500 feet.</p>').fields.elevation_m||'',/1737.*2286/);
 assert.equal(parse('<p>'+general+'</p><p>Altitude: 1800 masl</p>').fields.elevation_m,'1800 masl');
});
