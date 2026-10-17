// Representative, deliberately small HTML structures based on actual
// public product-page facts observed 2026-10-16/17. NOT verbatim archived
// HTML from those sites; their markup can change without warning.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,applyCoffeeUrlFields} from '../site/cloud/coffee-url-autofill.js';

const head=(title,brand='')=>'<html><head><meta property="og:type" content="product">'+
 '<meta property="og:title" content="'+title+'">'+
 (brand?'<meta property="og:site_name" content="'+brand+'">':'')+
 '</head><body><main>';
const tail='</main><footer><p>Other coffees</p><p>Dark Blend</p></footer></body></html>';
const preview=(html,url)=>extractPublicCoffeeFacts(html,{source_url:url});
const coffee=(title,path,body,brand)=>preview(head(title,brand)+'<h1>'+title+'</h1>'+body+tail,'https://'+path);
test('Proud Mary inline attributes and honest Espresso-only ratio',()=>{
 const source='proudmarycoffee.com/collections/wild/products/honduras-ovidio-gomez-catuai-natural';
 const page=head('HONDURAS | Ovidio Gomez | Catuai | Natural','Proud Mary Coffee')+
 '<p>Tasting Notes</p><p>Blackcurrant, winey, & tropical</p>'+
 '<p>Process</p><p>Natural</p><p>Producer</p><p>Ovidio Gomez</p>'+
 '<p>Variety</p><p>Catuai</p>'+
 '<h1>HONDURAS | Ovidio Gomez | Catuai | Natural</h1>'+
 '<p>Espresso | Filter</p><p>Ratio 1:2.5 | 1:16</p>'+tail;
 const r=preview(page,'https://'+source);
 assert.equal(r.ok,true);
 assert.equal(r.fields.process,'Natural');
 assert.equal(r.fields.producer,'Ovidio Gomez');
 assert.equal(r.fields.variety,'Catuai');
 assert.match(r.fields.tasting_notes,/Blackcurrant/);
 assert.equal(r.roaster_recipe?.ratio,2.5);
 assert.equal(r.roaster_recipe?.dose_g,undefined);
 const markup=coffeeUrlPreviewMarkup(r);
 assert.match(markup,/1:2.5/);assert.doesNotMatch(markup,/undefined g/);
});
test('Queen City recognizes country, natural heirloom and explicit tasting reminder',()=>{
 const r=coffee('Banko Gotiti ~ Natural // Ethiopia',
 'queencitycollectivecoffee.com/products/banko-gotiti-natural-ethiopia',
 '<p>Reminds us of - Black Cherry & Haribo Goldbears</p>'+
 '<p>Banko Gotiti CWS // Gedeb, Yirgacheffe, Gedeo Zone, Ethiopia</p>'+
 '<p>Natural-processed heirloom varietals // 2170 masl</p>',
 'Queen City Collective Coffee');
 assert.equal(r.fields.roaster,'Queen City Collective Coffee');
 assert.equal(r.fields.origin,'Gedeb, Yirgacheffe, Gedeo Zone, Ethiopia');
 assert.equal(r.fields.elevation_m,'2170 masl');
 assert.equal(r.fields.variety,'heirloom');
 assert.equal(r.fields.process,'Natural');
 assert.equal(r.fields.tasting_notes,'Black Cherry & Haribo Goldbears');
});
test('Onyx reversed metric labels give actual Ultra Light and Agtron without inference',()=>{
 const r=coffee('Ethiopia Mullugeta Muntasha Natural',
 'onyxcoffeelab.com/products/ethiopia-mullugeta-muntasha-natural-26',
 '<div>Ultra Light</div><div>ROAST LEVEL</div>'+
 '<div>Agtron #133</div><div>AGTRON</div>'+
 '<div>Natural</div><div>PROCESS METHOD</div>'+
 '<div class="a-stat" data-name="country"><p>Ethiopia<br><label>ORIGIN</label></p></div>'+
 '<div class="a-stat" data-name="ferment"><p>Natural<br><label>PROCESS METHOD</label></p></div>'+
 '<div class="a-stat" data-name="season"><p>November<br><label>HARVEST SEASON</label></p></div>'+
 '<div class="a-stat" data-name="roaster"><p>Loring S70 Peregrine<br><label>PRODUCTION ROASTER</label></p></div>'+
 '<div>Landrace</div><div>VARIETY</div>'+
 '<div>2150 MASL</div><div>ELEVATION</div>'+
 '<div>Raised-Bed Dried</div><div>DRYING METHOD</div>'+
 '<div>November</div><div>HARVEST SEASON</div>'+
 '<p>Filter & Espresso</p><div>PREFERRED EXTRACTION</div>');
 assert.equal(r.fields.roast_level,'Ultra Light');
 assert.equal(r.fields.process,'Natural');
 assert.equal(r.fields.variety,'Landrace');
 assert.equal(r.fields.elevation_m,'2150 MASL');
 assert.equal(r.fields.origin,'Ethiopia');
 assert.equal(r.roaster_details.harvest_season,'November');
 assert.equal(r.roaster_details.production_roaster,'Loring S70 Peregrine');
 assert.equal(r.roaster_details.agtron,'133');
 assert.equal(r.fields.producer,undefined,'unrelated educational text is not a coffee producer');
 assert.equal(r.roaster_details.preferred_extraction,'Filter & Espresso','explicit product stat takes priority over unrelated guide titles');
 assert.equal(r.roaster_details.drying_method,'Raised-Bed Dried','specific source metric overrides unrelated guide text');
 assert.equal(r.roaster_details.drying_method,'Raised-Bed Dried');
 assert.equal(r.roaster_details.harvest_season,'November');
 assert.equal(r.roaster_details.preferred_extraction,'Filter & Espresso');
});
test('PERC icon+heading metrics include process, Agtron, rest and Breville recipe',()=>{
 const r=coffee('Colombia Franky Hoyos Adv Washed',
 'perccoffee.com/products/colombia-franky-hoyos-adv-washed?variant=53562522829114',
 '<h2>ORIGIN</h2><h6>Pitalito</h6>'+
 '<h2>ELEVATION</h2><h6>1650 MASL</h6>'+
 '<h2>VARIETY</h2><h6>Orange Bourbon</h6>'+
 '<h2>PROCESS</h2><h6>Adv Washed Co-ferment</h6>'+
 '<h2>ROAST COLOR</h2><h6>74.7 Agtron</h6>'+
 '<h2>BEST RESTED</h2><h6>15-18 Days</h6>'+
 '<h2>BREW RECCS</h2>'+
 '<h2>Aeropress XL</h2><h6>Dose: 22g</h6><h6>Water: 350g</h6>'+
 '<h2>Breville Espresso</h2><h6>GRIND: 7</h6>'+
 '<h6>DOSE: 16g</h6><h6>YIELD: 40g</h6><h6>TEMP: 205° F</h6>'+
 '<h6>TIME: 0:25</h6><h6>TDS: 7.77</h6>'+
 '<h2>Hario V60</h2><h6>Dose: 20g</h6><h6>Water: 320g</h6>');
 assert.equal(r.fields.origin,'Pitalito');
 assert.equal(r.fields.elevation_m,'1650 MASL');
 assert.equal(r.fields.variety,'Orange Bourbon');
 assert.equal(r.fields.process,'Washed');
 assert.equal(r.roaster_details.processing_detail,'Adv Washed Co-ferment');
 assert.equal(r.roaster_details.agtron,'74.7');
 assert.equal(r.roaster_details.recommended_rest,'15–18 days');
 assert.deepEqual(r.roaster_recipe,{dose_g:16,yield_g:40,time_s_min:25,time_s_max:25,method:'Breville Espresso',temperature:'205°F'});
 const markup=coffeeUrlPreviewMarkup(r);
 assert.match(markup,/Roaster Agtron/);assert.match(markup,/Other published details/);
 assert.match(markup,/16 g in/);assert.match(markup,/25–25 s/);
});
test('The Picky Chemist uses French product details on English-language Wix page',()=>{
 const title='Ethiopia - Gesha Village - Lot #26/136 - Oma Honey';
 const r=preview(head(title,'The Picky Chemist')+
 '<h1>'+title+'</h1>'+
 '<p>Région : Bench Maji – Oma</p><p>Producteur : Gesha Village Coffee Estate</p>'+
 '<p>Altitude : 1931 – 2049 m</p>'+
 '<p>Variété : Gesha 1931</p><p>Traitement : Honey</p>'+tail,
 'https://en.thepickychemist.com/product-page/ethiopia-gesha-village-lot-26-136-oma-honey');
 assert.equal(r.fields.origin,'Bench Maji – Oma');
 assert.equal(r.fields.producer,'Gesha Village Coffee Estate');
 assert.equal(r.fields.elevation_m,'1931 – 2049 m');
 assert.equal(r.fields.variety,'Gesha 1931');
 assert.equal(r.fields.process,'Honey');
});
test('SEY varietal/region/altitude/harvest headings and explicit process-tagged title',()=>{
 const title='Chorso Bule HIGHEST ELEVATION PROJECT ETHIOPIAN LANDRACE - WASHED';
 const r=preview(head(title,'SEY')+'<h1>'+title+'</h1>'+
 '<h3>VARIETAL</h3><div>Ethiopian Landrace</div>'+
 '<h3>REGION</h3><div>Gedeb</div>'+
 '<h3>ALTITUDE</h3><div>2,450+ masl</div>'+
 '<h3>HARVEST</h3><div>January 2026</div>'+
 '<p>Together with our friends at SNAP. In the cup we find ripe peach, melon, and honeysuckle.</p>'+
 '<h3>PROCESSING</h3><p>Hand-picked at peak ripeness. Floated. Dried on raised beds.</p>'+tail,
 'https://www.seycoffee.com/collections/coffee/products/2026-chorso-bule-highest-elevation-project-ethiopia');
 assert.equal(r.fields.variety,'Ethiopian Landrace');
 assert.equal(r.fields.origin,'Gedeb');
 assert.equal(r.fields.elevation_m,'2,450+ masl');
 assert.equal(r.fields.release_label,'January 2026');
 assert.equal(r.fields.process,'Washed');
 assert.match(r.fields.tasting_notes,/peach, melon, and honeysuckle/);
});
test('Black & White inline pipe-separated product data fields',()=>{
 const r=coffee('Los Altos Washed',
 'blackwhiteroasters.com/products/r-los-altos-washed',
 '<p>Origin | Teopisca Nuevo León, Chiapas, Mexico</p>'+
 '<p>Producer | UCANOCH Cooperative</p>'+
 '<p>Process | Washed</p>'+
 '<p>Variety | field blend</p>'+
 '<p>Elevation | 1200-1700 MASL</p>');
 assert.equal(r.fields.origin,'Teopisca Nuevo León, Chiapas, Mexico');
 assert.equal(r.fields.producer,'UCANOCH Cooperative');
 assert.equal(r.fields.process,'Washed');
 assert.equal(r.fields.variety,'field blend');
 assert.equal(r.fields.elevation_m,'1200-1700 MASL');
});
test('Little Wolf colon specs and Farm/Co-op are recognized',()=>{
 const r=coffee('Tegu','littlewolf.coffee/products/tegu',
 '<p>Tasting Notes: Lime, White Tea, Vibrant</p>'+
 '<p>Origin: Kenya - Nyeri</p><p>Farm/Co-op: Tegu</p>'+
 '<p>Process: Washed</p><p>Elevation: 1700m</p>'+
 '<p>Varietal: SL28, SL34, Batian, Ruiru 11</p>');
 assert.equal(r.fields.producer,'Tegu');
 assert.equal(r.fields.variety,'SL28, SL34, Batian, Ruiru 11');
 assert.equal(r.fields.origin,'Kenya - Nyeri');
 assert.equal(r.fields.tasting_notes,'Lime, White Tea, Vibrant');
});
test('Heart rotating single origin supports ordinary explicit metrics without inventing roast',()=>{
 const r=coffee('Phono','heartroasters.com/products/phono',
 '<p>Location: Huehuetenango</p>'+
 '<p>Varieties: Caturra, Catuai, Bourbon</p>'+
 '<p>Process: Fully washed</p><p>Elevation: 1600-1900m</p>');
 assert.equal(r.fields.origin,'Huehuetenango');
 assert.equal(r.fields.variety,'Caturra, Catuai, Bourbon');
 assert.equal(r.fields.process,'Washed');
 assert.equal(r.fields.roast_level,undefined);
});
test('Shopify collection alias JSON-LD is matched by exact handle, never by related product',()=>{
 const handle='honduras-ovidio-gomez-catuai-natural',url='https://proudmarycoffee.com/collections/wild/products/'+handle;
 const product={'@type':'Product',name:'Ovidio Gomez Natural',url:'https://proudmarycoffee.com/products/'+handle};
 const good=preview(head('Ovidio Gomez Natural')+
 '<script type="application/ld+json">'+JSON.stringify(product)+'</script>'+tail,url);
 assert.equal(good.fields.name,'Ovidio Gomez Natural');
 const bad=preview(head('Ovidio Gomez Natural')+
 '<script type="application/ld+json">'+JSON.stringify({...product,url:'https://proudmarycoffee.com/products/other-lot'})+'</script>'+tail,url);
 assert.notEqual(bad.fields.name,'other-lot');
});
test('Queen City homepage and generic category never invent a coffee identity',()=>{
 const page='<html><head><meta property="og:type" content="website">'+
 '<meta property="og:site_name" content="Queen City"></head><body>'+
 '<h1>Queen City Collective Coffee</h1>'+
 '<script type="application/ld+json">'+JSON.stringify([{'@type':'Product',name:'Banko',url:'https://queencitycollectivecoffee.com/products/banko'},
 {'@type':'Product',name:'Other',url:'https://queencitycollectivecoffee.com/products/other'}])+'</script></body></html>';
 assert.equal(preview(page,'https://queencitycollectivecoffee.com/').ok,false);
 assert.equal(preview(page,'https://queencitycollectivecoffee.com/collections/coffee').ok,false);
});
test('Agtron alone, unrelated marketing and HTML in supplemental details never make a roast classification or XSS',()=>{
 const r=coffee('Test Coffee','anothercoffee.com/products/test-coffee',
 '<div>133 Agtron</div><div>ROAST COLOR</div>'+
 '<div>Some Very Light Savings!!!</div>'+
 '<p>BEST RESTED</p><p>&lt;img src=x onerror=alert(1)&gt; 15-18 Days</p>');
 assert.equal(r.fields.roast_level,undefined);
 const rendered=coffeeUrlPreviewMarkup({...r,roaster_details:{agtron:'<script>alert(1)</script>',recommended_rest:'15–18 days'}});
 assert.doesNotMatch(rendered,/<script>/);
 assert.match(rendered,/&lt;script&gt;/);
});

test('live Onyx custom product markup parses explicitly labeled Ultra Light without JSON-LD or OG',()=>{
 const link='https://onyxcoffeelab.com/products/ethiopia-mullugeta-muntasha-natural-26';
 const html='<html><head><title>Ethiopia Mullugeta Muntasha Natural &ndash; Onyx Coffee Lab</title>'+
  '<link rel="canonical" href="'+link+'"></head><body><main>'+
  '<p>Producer: Abstract</p><p>Preferred Extraction: INVENTORY</p><p>Drying Method: ABSTRACT</p>'+
  '<div class="a-stat" data-name="roast-level" data-stat-id="agtron"><span class="stat-text">'+
  '<p>Ultra Light<br>Agtron #133<br><label>ROAST LEVEL</label></p></span></div>'+
  '<div class="a-stat" data-name="variety"><span class="stat-text"><p>Landrace<br><label>VARIETY</label></p></span></div>'+
  '</main></body></html>';
 const r=preview(html,link+'?variant=43228176810082');
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,'Ethiopia Mullugeta Muntasha Natural');
 assert.equal(r.fields.roaster,'Onyx Coffee Lab');
 assert.equal(r.fields.roast_level,'Ultra Light');
 assert.equal(r.fields.variety,'Landrace');
 assert.equal(r.roaster_details.agtron,'133');
});
test('live PERC Product variants do not displace exact canonical product identity',()=>{
 const url='https://perccoffee.com/products/colombia-franky-hoyos-adv-washed';
 const raw=[
  {'@type':'Product',name:'Colombia Franky Hoyos Adv Washed',url},
  {'@type':'Product',name:'Colombia Franky Hoyos Adv Washed - 13oz / Whole',url},
  {'@type':'Product',name:'Colombia Franky Hoyos Adv Washed - 5lb / Ground',url}
 ];
 const html='<html><head><meta property="og:title" content="Colombia Franky Hoyos Adv Washed">'+
  '<meta property="og:type" content="product"></head><body>'+
  '<script type="application/ld+json">'+JSON.stringify(raw)+'</script>'+
  '<main><h2>ORIGIN</h2><rte-formatter><h6>Pitalito</h6></rte-formatter>'+
  '<h2>ROAST COLOR</h2><rte-formatter><h6>74.7 Agtron</h6></rte-formatter></main></body></html>';
 const r=preview(html,url+'?variant=53562522829114');
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,'Colombia Franky Hoyos Adv Washed');
 assert.equal(r.fields.origin,'Pitalito');
 assert.equal(r.roaster_details.agtron,'74.7');
});
test('PERC JSON-LD ProductGroup parent wins over size/grind variant Products only when URL matches',()=>{
 const url='https://perccoffee.com/products/colombia-franky-hoyos-adv-washed';
 const graph={'@context':'https://schema.org','@graph':[
  {'@type':'ProductGroup',name:'Colombia Franky Hoyos Adv Washed',url,
   hasVariant:[{'@type':'Product',name:'Colombia Franky Hoyos Adv Washed - 13oz / Whole'},
   {'@type':'Product',name:'Colombia Franky Hoyos Adv Washed - 2lb / Ground'}]},
  {'@type':'Product',name:'Another Coffee',url:'https://perccoffee.com/products/other-coffee'}
 ]};
 const html=head('Colombia Franky Hoyos Adv Washed','PERC COFFEE')+
  '<script type="application/ld+json">'+JSON.stringify(graph)+'</script>'+
  '<h2>ORIGIN</h2><h6>Pitalito</h6>'+tail;
 const good=preview(html,url+'?variant=53562522829114');
 assert.equal(good.ok,true);
 assert.equal(good.fields.name,'Colombia Franky Hoyos Adv Washed');
 const unrelated=preview(html,'https://perccoffee.com/products/third-coffee');
 assert.equal(unrelated.ok,false,'unrelated ProductGroup cannot be silently chosen');
});
test('live Proud Mary product specification links and ratio remain purely source-reported',()=>{
 const url='https://proudmarycoffee.com/collections/wild/products/honduras-ovidio-gomez-catuai-natural';
 const html=head('HONDURAS | Ovidio Gomez | Catuai | Natural','Proud Mary Coffee')+
  '<h1>HONDURAS | Ovidio Gomez | Catuai | Natural</h1>'+
  '<div class="meta-info"><p class="meta-title">Variety</p>'+
  '<a href="javascript:;">Catuai</a></div>'+
  '<div class="meta-info"><p class="meta-title">Producer</p>'+
  '<a href="javascript:;">Ovidio Gomez</a></div>'+
  '<div class="meta-info"><p class="meta-title">Espresso | Filter</p>'+
  '<p>Ratio 1:2.5 | 1:16</p></div>'+tail;
 const r=preview(html,url);
 assert.equal(r.fields.variety,'Catuai');
 assert.equal(r.fields.producer,'Ovidio Gomez');
 assert.equal(r.roaster_recipe.ratio,2.5);
 assert.equal(r.roaster_recipe.dose_g,undefined);
});
test('live Little Wolf product paragraph with br-separated facts never contaminates tasting notes',()=>{
 const html=head('Tegu','Little Wolf Coffee')+
 '<h1>Tegu</h1><p>Tasting Notes: Lime, White Tea, Vibrant<br>'+
 'Origin: Kenya - Nyeri<br>Farm/Co-op: Tegu<br>Process: Washed<br>'+
 'Elevation: 1700m<br>Varietal: SL28, SL34, Batian, Ruiru 11</p>'+tail;
 const r=preview(html,'https://littlewolf.coffee/products/tegu');
 assert.equal(r.fields.tasting_notes,'Lime, White Tea, Vibrant');
 assert.equal(r.fields.origin,'Kenya - Nyeri');
 assert.equal(r.fields.producer,'Tegu');
 assert.equal(r.fields.process,'Washed');
 assert.equal(r.fields.elevation_m,'1700m');
 assert.equal(r.fields.variety,'SL28, SL34, Batian, Ruiru 11');
});
test('live SEY explicit variety-process component may establish Washed without inventing roast level',()=>{
 const r=coffee('2026 Chorso Bule','seycoffee.com/products/2026-chorso-bule-highest-elevation-project-ethiopia',
 '<div><span class="coffeeTitle_varietyProcess">ETHIOPIAN LANDRACE - WASHED</span></div>');
 assert.equal(r.fields.process,'Washed');
 assert.equal(r.fields.roast_level,undefined);
});
