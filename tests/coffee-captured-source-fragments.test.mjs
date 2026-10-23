// Minimal structural regressions informed by anonymous public responses
// captured on 2026-10-23 by the live-completeness probe. These fragments retain
// only the relevant markup and factual labels, not whole vendor pages/stories.
// The generated multiword heading and negative controls are synthetic variants.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {compactCoffeeProductHtml} from '../src/server/coffee-product-prep.mjs';

function parse({url,name,body,head='',heading='<h1>'+name+'</h1>'}){
 const html='<!doctype html><html><head><title>'+name+'</title>'+
  '<link rel="canonical" href="'+url+'">'+head+'</head><body><main>'+heading+body+'</main></body></html>';
 const result=extractPublicCoffeeFacts(compactCoffeeProductHtml(html),{source_url:url});
 assert.equal(result.ok,true,'The selected coffee must remain recognizable');
 return result;
}
function animatedHeading(name){
 return '<h1 class="blinds-text">'+name.split(' ').map(word=>
  '<div class="word">\n'+[...word,' '].map((char,index)=>
   '  <span class="char-clip">\n    <span style="--i:'+index*20+'ms">'+char+'</span>\n  </span>\n').join('')+
  '</div>').join('\n')+
  '<div class="pron-play-button"><svg><text>pronunciation</text></svg><button>Play</button></div></h1>';
}
function metric(label,value,attributes){
 return '<div class="a-stat" '+attributes+'><span class="stat-text"><p>'+value+
  '<br><label>'+label+'</label></p><svg><use href="#icon"></use></svg></span><hr></div>';
}

test('Onyx actual animated character heading identifies Geometry without og:title or Product JSON',()=>{
 const heading=animatedHeading('Geometry');
 assert.ok(heading.length>400,'Exercise the former heading-size failure');
 const result=parse({url:'https://onyxcoffeelab.com/products/geometry',name:'Onyx Coffee Lab Geometry',heading,
  body:metric('ROAST LEVEL','Light<br>Agtron #130','data-name="roast-level" data-stat-id="agtron"')+
   metric('ORIGIN','Colombia, Ethiopia','data-name="country" data-stat-id="origin"')+
   metric('VARIETY','Mixed','data-name="variety" data-stat-id="variety"')+
   metric('PROCESS METHOD','Washed','data-name="ferment" data-stat-id="fermentation"')+
   metric('DRYING METHOD','Raised-Bed Dried','data-naem="dry" data-stat-id="drying"')+
   '<div class="a-stat-desc" data-stat-id="elevation"><h2>Elevation</h2><h4>1950 MASL</h4></div>'+
   '<p class="tasting-notes kapra"><span class="note">Berries</span><span class="note">Stone Fruit</span>'+
   '<span class="note">Earl Grey</span><span class="note">Honeysuckle</span><span class="note">Round</span></p>'+
   '<h2>What Are Coffee Varieties?</h2><p>Examples include Gesha, SL28 and Pink Bourbon.</p>'});
 assert.equal(result.fields.name,'Geometry');
 assert.equal(result.fields.variety,'Mixed');
 assert.equal(result.fields.origin,'Colombia, Ethiopia');
 assert.equal(result.fields.process,'Washed');
 assert.equal(result.fields.roast_level,'Light');
 assert.equal(result.fields.elevation_m,'1950 MASL');
 assert.equal(result.fields.tasting_notes,'Berries, Stone Fruit, Earl Grey, Honeysuckle, Round');
 assert.equal(result.roaster_details?.agtron,'130');
 assert.equal(result.roaster_details?.drying_method,'Raised-Bed Dried');
});

test('animated word wrappers preserve spaces and accented letters in multiword product names',()=>{
 const name='José del Pico';
 const result=parse({url:'https://roaster.example/products/jose-del-pico',name:'Fixture Roaster '+name,
  heading:animatedHeading(name),body:'<p>Variety: Bourbon Ají</p>'});
 assert.equal(result.fields.name,name);
 assert.equal(result.fields.variety,'Bourbon Ají');
});

test('Manhattan sibling detail cards keep farm, named producer and multiline variety distinct',()=>{
 const card=(label,value)=>'<div class="product-drilldown__content--detail">'+
  '<div class="detail-label">'+label+'</div><div class="detail-value">'+value+'</div></div>';
 const result=parse({url:'https://manhattancoffeeroasters.com/product/coffees/world-class/samuel-jr/',name:'Samuel Jr.',
  body:'<div class="product-drilldown__content--info__tastes-like"><div class="fancy-title">Tastes Like</div>'+
   '<div class="subtitle">Star anise<span> &bullet;</span> Dark fudge<span> &bullet;</span> Verbena<span> &bullet;</span></div></div>'+
   '<div class="product-drilldown__content--details__wrapper">'+
   card('Farm','El Paraiso')+card('Processing','Double Anaerobic<br />Thermal Shock<br />Washed<br />')+
   card('Altitude','1960 masl')+card('Region','Cauca<br />')+
   card('Variety','Caturra<br />Chiroso')+card('producer','Diego Bermudez')+'</div>'});
 assert.equal(result.fields.producer,'Diego Bermudez');
 assert.equal(result.roaster_details?.farm,'El Paraiso');
 assert.equal(result.fields.variety,'Caturra Chiroso');
 assert.equal(result.fields.elevation_m,'1960 masl');
 assert.equal(result.fields.origin,'Cauca');
 assert.equal(result.fields.tasting_notes,'Star anise, Dark fudge, Verbena');
 assert.equal(result.roaster_details?.processing_detail,'Double Anaerobic Thermal Shock Washed');
});

test('NOMAD colon generated by CSS still leaves explicit Spanish label/value pairs',()=>{
 const pair=(label,value)=>'<li class="pt-1 mb-1 grid grid-cols-2">'+
  '<span class="flex after:inline after:content-[\':\']"> '+label+' </span><span class="block">'+value+'</span></li>';
 const result=parse({url:'https://nomadcoffee.es/products/centroamericano-natural-anaerobico',name:'Centroamericano Natural Anaeróbico',
  body:'<ul class="text-[14px] font-basis-mono">'+pair('Origen','Costa Rica')+pair('Proceso','Natural Anaeróbico')+
   pair('Variedad','Centroamericano')+pair('Altitud','1200 - 1400 MSNM')+pair('Cosecha','2026')+
   pair('Nota de cata','Cacao nibs<br>Frutos del bosque<br>Tamarindo')+'</ul>'});
 assert.equal(result.fields.origin,'Costa Rica');
 assert.equal(result.fields.variety,'Centroamericano');
 assert.equal(result.fields.process,'Anaerobic');
 assert.equal(result.fields.elevation_m,'1200 - 1400 MSNM');
 assert.equal(result.fields.release_label,'2026');
 assert.match(result.fields.tasting_notes||'',/Cacao nibs.*Frutos del bosque.*Tamarindo/);
 assert.equal(result.roaster_details?.processing_detail,'Natural Anaeróbico');
});

test('Circulor explicit variety summary versus Genesis table remains a source conflict',()=>{
 const result=parse({url:'https://coffeacirculor.com/products/kenya-coffea-circulor-outo-isolated-sl34-aa-washed-wx',
  name:'KENYA Coffea Circulor Outo Isolated SL34 AA Washed WX',
  body:'<section><p class="standard__subheading">Summary of variety</p>'+
   '<h2 class="standard__heading">Isolated, SL34, AA-grade</h2></section>'+
   '<section><h2 class="standard__heading">Genesis</h2><div class="rte"><p><table><tbody>'+
   '<tr><td>Country</td><td>Kenya<br></td></tr><tr><td>Varietal</td><td>Isolated, Ruiru 11, AA-grade</td></tr>'+
   '<tr><td>Process</td><td>Washed</td></tr></tbody></table></p></div></section>'});
 assert.equal(result.fields.variety,undefined);
 assert.ok(result.conflicts?.includes('variety'));
 assert.equal(result.fields.origin,'Kenya');
 assert.equal(result.fields.process,'Washed');
});

const bwName='Lica Torres - Black Cherry Natural';
const bwUrl='https://www.blackwhiteroasters.com/products/r-lica-torres-black-cherry-natural';
const profile='Lica Torres Black Cherry Natural coffee profile card with notes of cocktail cherry, port wine, white icing, milk chocolate; light roast, slightly funky flavor.';
test('Black and White exact product profile image alt supplies explicit notes and roast',()=>{
 const result=parse({url:bwUrl,name:bwName,body:'<img src="profile.jpg" alt="'+profile+'">'+
  '<p>Origin | Rivas, Brunca, Costa Rica</p><p>Variety | Catuaí</p><p>Process | Black Cherry Natural</p>'});
 assert.equal(result.fields.tasting_notes,'cocktail cherry, port wine, white icing, milk chocolate');
 assert.equal(result.fields.roast_level,'Light');
 assert.equal(result.fields.variety,'Catuaí');
 assert.equal(result.fields.process,'Natural');
});

test('other products, generic bag image descriptions and recommendation cards cannot supply notes or roast',()=>{
 const cases=[
  '<img alt="Other Coffee coffee profile card with notes of peach, mango; dark roast.">',
  '<img alt="Lica Torres Black Cherry Natural bag with peach, mango and dark roast lettering.">',
  '<img alt="Lica Torres Black Cherry Natural Decaf coffee profile card with notes of peach, mango; dark roast.">',
  '<section class="related-products"><h2>More coffees</h2><img alt="'+profile+'"></section>'
 ];
 for(const body of cases){
  const result=parse({url:bwUrl,name:bwName,body:'<p>Origin: Costa Rica</p>'+body});
  assert.equal(result.fields.tasting_notes,undefined,body);
  assert.equal(result.fields.roast_level,undefined,body);
 }
});

test('inconsistent exact-product image profiles cannot select an arbitrary note list or roast',()=>{
 const result=parse({url:bwUrl,name:bwName,body:'<img alt="'+profile+'">'+
  '<img alt="Lica Torres Black Cherry Natural coffee profile card with notes of peach, mango; dark roast.">'});
 assert.equal(result.fields.tasting_notes,undefined);
 assert.equal(result.fields.roast_level,undefined);
});
