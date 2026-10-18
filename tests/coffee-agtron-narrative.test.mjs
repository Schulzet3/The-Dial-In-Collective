import test from 'node:test';
import assert from 'node:assert/strict';
import {interpretAgtron,agtronExplanation,AGTRON_GOURMET_ANCHORS} from '../src/server/agtron-roast.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

const link='https://perccoffee.com/products/kenya-mara-estate?variant=53093321998650';
const facts=(markup,url=link)=>extractPublicCoffeeFacts(markup,{source_url:url});
const page=(title,process,agtron,story='',extra='')=>
 '<html><head><meta property="og:type" content="product">'+
 '<meta property="og:site_name" content="PERC COFFEE">'+
 '<meta property="og:title" content="'+title+'"></head><body><main>'+
 '<h1>'+title+'</h1>'+
 '<h2>ORIGIN</h2><h6>Narok County</h6>'+
 '<h2>ELEVATION</h2><h6>1800 MASL</h6>'+
 '<h2>VARIETY</h2><h6>Batian, SL 28, Ruiru 11</h6>'+
 '<h2>PROCESS</h2><h6>'+process+'</h6>'+
 '<h2>ROAST COLOR</h2><h6>'+agtron+'</h6>'+
 '<h2>BEST RESTED</h2><h6>8-10 Days</h6>'+
 '<h2>THE DEETS!</h2><p>'+story+'</p>'+
 '<h2>BREW RECCS</h2><h3>Breville Espresso</h3>'+
 '<p>GRIND: 7<br>DOSE: 16g<br>YIELD: 40g<br>TEMP: 205°F<br>TIME: 0:26</p>'+
 extra+'</main></body></html>';

const maraStory='AN ANAEROBIC NATURAL KENYA FROM MARA ESTATE! '+
 'Mara Estate works with Batian cherries. This natural lot is placed in sealed tanks to '+
 'ferment anaerobically for 96 hours, then dries on raised beds in the shade. '+
 'The result is a strawberry, honeydew and sweet cream profile.';

test('manufacturer ground Gourmet anchors map to exactly seven approved roast labels',()=>{
 const expected=['Ultra Light','Very Light','Light','Medium-Light','Medium','Medium-Dark','Dark'];
 assert.deepEqual(AGTRON_GOURMET_ANCHORS.map(x=>x.roast),expected);
 for(const [i,anchor] of AGTRON_GOURMET_ANCHORS.entries()){
  const r=interpretAgtron(String(anchor.score)+' Agtron Gourmet Ground');
  assert.equal(r.roast,expected[i]);
  assert.equal(r.provisional,false);
  assert.equal(r.scale,'gourmet');
  assert.equal(r.sample,'ground');
 }
 assert.equal(interpretAgtron('78.4',{scale:'gourmet',sample:'ground'}).roast,'Light');
 assert.equal(interpretAgtron('82.8',{scale:'gourmet',sample:'ground'}).roast,'Very Light');
 assert.equal(interpretAgtron('68.8',{scale:'gourmet',sample:'ground'}).roast,'Medium-Light');
 assert.equal(interpretAgtron('57.6',{scale:'gourmet',sample:'ground'}).roast,'Medium');
 assert.equal(interpretAgtron('78.4').provisional,true);
 assert.match(agtronExplanation(interpretAgtron('78.4')),/Provisional/);
});
test('commercial, whole bean, out-of-range and implausible Agtron cannot be silently equated',()=>{
 const commercial=interpretAgtron('60.6',{scale:'commercial',sample:'ground'});
 assert.equal(commercial.roast,'Very Light');
 assert.equal(commercial.provisional,false);
 assert.equal(interpretAgtron('78.4',{scale:'commercial',sample:'ground'}).roast,'');
 assert.equal(interpretAgtron('100',{scale:'gourmet',sample:'ground'}).roast,'');
 assert.equal(interpretAgtron('75.4',{scale:'commercial',sample:'ground'}).roast,'');
 assert.equal(interpretAgtron('78.4 Agtron Whole Bean').roast,'');
 assert.equal(interpretAgtron('Agtron #133').roast,'');
 assert.equal(interpretAgtron('Agtron #133').score,133);
 assert.equal(interpretAgtron('666 Agtron'),null);
 assert.equal(interpretAgtron('1800 MASL'),null);
 assert.equal(interpretAgtron('Agtron 78.4 and 65'),null);
});
test('PERC Kenya Mara Estate reads its full narrative, preserves processing subtype and scores Light provisionally',()=>{
 const r=facts(page('Kenya Mara Estate','Adv Natural','78.4 Agtron',maraStory));
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,'Kenya Mara Estate');
 assert.equal(r.fields.producer,'Mara Estate');
 assert.equal(r.fields.process,'Anaerobic');
 assert.equal(r.fields.roast_level,'Light');
 assert.equal(r.fields.variety,'Batian, SL 28, Ruiru 11');
 assert.equal(r.fields.origin,'Narok County');
 assert.equal(r.roaster_details.agtron,'78.4');
 assert.match(r.roaster_details.processing_detail,/Adv Natural; anaerobic natural.*96-hour/);
 assert.match(r.roast_hint,/Gourmet scale/);
 assert.match(r.roast_hint,/Provisional/);
 assert.equal(r.roast_source,'agtron_provisional_review');
 assert.deepEqual(r.roaster_recipe,{
  dose_g:16,yield_g:40,time_s_min:26,time_s_max:26,method:'Breville Espresso',temperature:'205°F'
 });
 const markup=coffeeUrlPreviewMarkup(r);
 assert.match(markup,/Mara Estate/);
 assert.match(markup,/Roaster Agtron/);
 assert.match(markup,/Review or correct them, then click Add Coffee/);
});
test('matched coffee name plus its own story corroborate a farm when the visual H1 markup differs',()=>{
 const source=page('Kenya Mara Estate','Adv Natural','78.4 Agtron',maraStory)
  .replace('<h1>Kenya Mara Estate</h1>',
   '<h1 class="coffee-title"><span class="flag">KENYA</span> <span>MARA</span> <i>ESTATE</i></h1>');
 const r=facts(source);
 assert.equal(r.fields.name.toLowerCase(),'kenya mara estate');
 assert.equal(r.fields.producer?.toLowerCase(),'mara estate');
 assert.equal(r.fields.process,'Anaerobic');
});
test('large decorative markup before the PERC coffee story does not hide its real product narrative',()=>{
 const original=page('Kenya Mara Estate','Adv Natural','78.4 Agtron',maraStory);
 // Real PERC has >70 KB of on-product layout HTML before THE DEETS! heading.
 // Continue to ignore scripts/nav and related-products, but read the bounded
 // matched product narrative beyond the shorter metrics-token window.
 const padded=original.replace('<h2>THE DEETS!</h2>',
  '<div class="decorative" aria-hidden="true">'+('<svg width="1" height="1"><path d="M0,0 L1,1"/></svg>'.repeat(1900))+'</div><h2>THE DEETS!</h2>');
 assert.ok(padded.indexOf('THE DEETS')>60000);
 const r=facts(padded);
 assert.equal(r.fields.producer,'Mara Estate');
 assert.equal(r.fields.process,'Anaerobic');
 assert.match(r.roaster_details.processing_detail,/96-hour/);
 assert.equal(r.fields.roast_level,'Light');
});
test('nested visual PERC headings still expose the selected product story',()=>{
 const html=page('Kenya Mara Estate','Adv Natural','78.4 Agtron',maraStory)
  .replace('<h2>THE DEETS!</h2>','<h2><span class="icon"></span><span>THE <em>DEETS!</em></span></h2>')
  .replace('<h2>BREW RECCS</h2>','<h2><span>BREW RECCS</span></h2>');
 const r=facts(html);
 assert.equal(r.fields.producer,'Mara Estate');
 assert.equal(r.fields.process,'Anaerobic');
 assert.equal(r.fields.roast_level,'Light');
 assert.match(r.roaster_details.processing_detail,/96-hour/);
});
test('long on-product description does not truncate late fermentation evidence',()=>{
 const long='This harvest was hand sorted for consistency. '.repeat(73)+maraStory;
 const r=facts(page('Kenya Mara Estate','Adv Natural','78.4 Agtron',long));
 assert.equal(r.fields.process,'Anaerobic');
 assert.equal(r.fields.producer,'Mara Estate');
});
test('estate alone does not prove a producer and prose from related coffees cannot contaminate the product',()=>{
 const unrelated='<h2>More Coffees</h2><p>Another Estate is anaerobic natural for 98 hours. Agtron 85</p>';
 const first=facts(page('Kenya Mara Estate','Natural','78.4 Agtron','This is a fruit-forward regional lot with no estate identification.',unrelated));
 assert.equal(first.fields.producer,undefined);
 assert.equal(first.fields.process,'Natural');
 assert.equal(first.fields.roast_level,'Light');
 const bad=facts(page('Kenya Mara Estate','Natural','666 Agtron','A bright coffee without estate information.',unrelated));
 assert.equal(bad.roaster_details?.agtron,undefined);
 assert.equal(bad.fields.roast_level,undefined);
});
test('explicit roaster roast wins over unqualified Agtron estimate and provenance is disclosed',()=>{
 const r=facts(page('Kenya Mara Estate','Natural','78.4 Agtron',maraStory).replace(
   '<h2>THE DEETS!</h2>','<h2>Roast Level</h2><h6>Very Light</h6><h2>THE DEETS!</h2>'));
 assert.equal(r.fields.roast_level,'Very Light');
 assert.match(r.roast_hint,/explicitly labels Very Light/);
 assert.equal(r.fields.process,'Anaerobic');
});
test('whole-bean measurements must not auto-classify using the ground chart',()=>{
 const r=facts(page('Kenya Mara Estate','Natural','78.4 Agtron Whole Bean',maraStory));
 assert.equal(r.roaster_details.agtron,'78.4');
 assert.equal(r.roaster_details.agtron_sample,'whole bean');
 assert.equal(r.fields.roast_level,undefined);
 assert.match(r.roaster_details.processing_detail,/anaerobic natural/);
});
test('generic fermentation, blends and Adv Washed alone do not become anaerobic',()=>{
 const blend=facts(page('Kenya Mara Estate','Washed & Natural','78.4 Agtron',maraStory));
 assert.equal(blend.fields.process,undefined);
 const washed=facts(page('Kenya Mara Estate','Adv Washed','78.4 Agtron','Washed lot that slowly develops sweetness during fermentation.'));
 assert.equal(washed.fields.process,'Washed');
});
