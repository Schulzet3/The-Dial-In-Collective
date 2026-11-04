// Issue #33: source-specific regression for original603 #22, #286 and #287.
// These are short, publicly reviewed selected-product excerpts, NOT archived
// official HTML or independent live parser acceptance. Keep frozen603 untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const htmlEscape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function selected({name,url,roaster,specs=[],story=[]}){
 const data={'@type':'Product',name,url,brand:roaster};
 const html='<html><head><meta property="og:type" content="product"/>'+
  '<script type="application/ld+json">'+JSON.stringify(data)+'</script></head>'+
  '<body><main><article class="product"><h1>'+htmlEscape(name)+'</h1>'+
  '<div class="product__description">'+
  specs.map(([label,value])=>'<p><strong>'+htmlEscape(label)+'</strong>: '+htmlEscape(value)+'</p>').join('')+
  story.map(value=>'<p>'+htmlEscape(value)+'</p>').join('')+
  '</div></article></main></body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}

const cases=[
 {id:22,name:'Organic Honduras COMSA',roaster:'Black River Roasters',
  url:'https://blackriverroasters.com/products/organic-honduras-comsa',
  specs:[['Altitude','1220 MASL'],['Varietal','Bourbon, Catuai, Caturra, Typica'],['Process','Natural'],
   ['Harvest','December - April']],
  story:['A rich and incredibly sweet cup with raspberry, jam, cranberry and cherry.'],
  harvest:/December\s*-\s*April/i},
 {id:286,name:'Ethiopia Worka Sakaro',roaster:'Roadmap CoffeeWorks',
  url:'https://roadmapcoffeeworks.com/products/ethiopia-worka-sakaro-anaerobic',
  specs:[['Farm','400 smallholder farms'],['Region','Worka Chelbesa, Gedio, Gedeb'],
   ['Production Method','Anaerobic Natural'],['Harvest','Nov - Jan']],
  story:['Coffee Review quotation published in November 2025 describes this coffee, not its selected harvest year.'],
  harvest:/Nov\s*-\s*Jan/i},
 {id:287,name:'Mexico Angel Albino Corzo',roaster:'Roadmap CoffeeWorks',
  url:'https://roadmapcoffeeworks.com/products/mexico-cesmach',
  specs:[['Farm','FFESICH Cooperative'],['Region','Chiapas'],['Production Method','Washed'],
   ['Harvest','December - March']],
  story:['Angel Albino Corzo is the region; the selected coffee comes from FFESICH Cooperative.'],
  harvest:/December\s*-\s*March/i}
];
for(const item of cases){
 test('original603 #'+item.id+' current yearless harvest window is NOT a release edition',()=>{
  const r=selected(item);
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(r.fields.name,item.name);
  assert.equal(r.fields.release_label,undefined,JSON.stringify(r.fields));
  assert.ok(!r.conflicts?.includes('release_label'),JSON.stringify(r.conflicts));
  assert.match(r.roaster_details?.harvest_season||'',item.harvest,JSON.stringify(r.roaster_details));
  assert.ok(r.source_facts?.some(f=>f.field==='harvest_season'&&item.harvest.test(String(f.value))),
   'Keep literal harvest as provenance, not a release identifier');
 });
}
test('same selected Roadmap product can retain a truly dated release independently of recurring harvest',()=>{
 const current=cases[1];
 const r=selected({...current,specs:[...current.specs,['Release','2026']]});
 assert.equal(r.ok,true);
 assert.equal(r.fields.release_label,'2026');
 assert.match(r.roaster_details?.harvest_season||'',current.harvest);
 assert.ok(!r.conflicts?.includes('release_label'));
});
test('a historic review date and unrelated seasonal catalog copy do not date the selected harvest',()=>{
 const current=cases[1];
 const r=selected({...current,story:[...current.story,
  'Other coffees we reviewed came from the 2024 harvest; our catalog has Summer 2025 releases.']});
 assert.equal(r.ok,true);
 assert.equal(r.fields.release_label,undefined,JSON.stringify(r.fields));
 assert.match(r.roaster_details?.harvest_season||'',current.harvest);
});
