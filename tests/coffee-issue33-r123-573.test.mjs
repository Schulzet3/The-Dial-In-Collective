import test from 'node:test';
import assert from 'node:assert/strict';
import {selected123,direct123,fields123Ok} from '../scripts/audit/issue33-r123-573-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {refineSelectedCurrentTrailingFlavorNote} from '../src/server/coffee-selected-description-sensory.mjs';
const prose='<p>Another beautiful washed Ethiopian coffee from Negusse Debla, same producer of our previous Worka Sakaro lot.</p>'+
 '<p>This time from the Guji region and a Grade 1 meaning hardly any defects and top notch sorting/harvesting.</p>'+
 '<p>In this coffee we are tasting fresh plum and florals with an orange bitters note that holds through the entire sip.</p>'+
 '<p>Variety: Dega, Kurume</p><p>Process: Washed</p><p>Altitude: 2280 MASL</p>';
const page=(body=prose,heading=selected123.name,other='')=>'<html><head><title>Old Worasa SEO title</title></head><body><main><article class="product"><h1>'+
 heading+'</h1><section class="product__description">'+body+'</section></article>'+other+'</main></body></html>';
test('current unique selected Wate Gogogu directly states its own provenance, specs and full three-note profile',()=>{
 const d=direct123(page());assert.equal(d.uniqueH1,true,JSON.stringify(d));assert.ok(d.own.every(x=>x.matched),JSON.stringify(d));
});
test('recycled Worasa/Daniel URL slug and stale SEO title do not determine current selected identity',()=>{
 assert.equal(direct123(page(prose,'Ethiopia Worasa Daniel Mijane')).uniqueH1,false);
 assert.equal(direct123(page().replace('</h1>','</h1><h1>Ethiopia Worasa Daniel Mijane</h1>')).uniqueH1,false);
});
test('notes or origin solely in related, menu, footer or script content never count as direct current product',()=>{
 const d=direct123(page('Select size and quantity',selected123.name,
 '<nav>'+prose+'</nav><aside>'+prose+'</aside><footer>'+prose+'</footer><script>'+prose+'</script>'));
 assert.ok(d.own.some(x=>!x.matched),JSON.stringify(d));
});
test('missing orange bitters cannot pass on just plum and florals',()=>{
 assert.ok(direct123(page(prose.replace('with an orange bitters note','with a clean finish'))).own.some(x=>!x.matched));
});
test('natural processing in a generic Guji context cannot override the selected explicit Washed spec',()=>{
 const valid={name:selected123.name,origin:'Guji, Ethiopia',process:'Washed',variety:'Dega, Kurume',
  elevation_m:'2280 MASL',producer:'Negusse Debla',tasting_notes:'fresh plum, florals, orange bitters'};
 assert.equal(fields123Ok(valid),true);
 assert.equal(fields123Ok({...valid,process:'Natural'}),false);
 assert.equal(fields123Ok({...valid,process:'Other/Unknown'}),false);
});
test('prior Worka Sakaro and stale Worasa identity, inferred roast and missing tasting note are rejected',()=>{
 const valid={name:selected123.name,origin:'Guji, Ethiopia',process:'Washed',variety:'Dega, Kurume',
  elevation_m:'2280 MASL',producer:'Negusse Debla',tasting_notes:'fresh plum, florals, orange bitters'};
 assert.equal(fields123Ok({...valid,name:'Ethiopia Worasa Daniel Mijane'}),false);
 assert.equal(fields123Ok({...valid,producer:'Daniel Mijane'}),false);
 assert.equal(fields123Ok({...valid,tasting_notes:'fresh plum, florals'}),false);
 assert.equal(fields123Ok({...valid,roast_level:'Light'}),false);
});
test('actual parser uses current product rather than stale Wix slug when exact schema product identity agrees',()=>{
 const product={'@context':'https://schema.org','@type':'Product',name:selected123.name,
   url:selected123.url,description:'Washed Guji Ethiopia. Fresh plum, florals and orange bitters.'};
 const html=page().replace('</head>','<script type="application/ld+json">'+JSON.stringify(product)+'</script></head>');
 const p=extractPublicCoffeeFacts(html,{source_url:selected123.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields?.name,selected123.name,JSON.stringify(p.fields));
});


const readable=raw=>String(raw).replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').trim();
const two='fresh plum and florals';
const refine=html=>refineSelectedCurrentTrailingFlavorNote(html,{clean:readable,notes:two});
test('direct selected current cup statement restores literal orange bitters after accepted two-note prefix',()=>{
 assert.equal(refine(page()), 'fresh plum, florals, orange bitters');
});
test('unselected recommendations, navigation, metadata and missing H1 cannot supply trailing flavor',()=>{
 assert.equal(refine(page('<p>We taste fresh plum and florals.</p>',selected123.name,
  '<aside>'+prose+'</aside><nav>'+prose+'</nav><footer>'+prose+'</footer>')),'');
 assert.equal(refine(page(prose,'Former coffee Wate')),'');
 assert.equal(refine(page().replace('</h1>','</h1><h1>Another coffee</h1>')),'');
});
test('conditional serving, earlier harvest and mismatched canonical prefix reject current trailing notes',()=>{
 const only='<p>In this coffee we are tasting fresh plum and florals with an orange bitters note that holds through the entire sip.</p>';
 assert.equal(refine(page(only.replace('In this coffee','When served with milk, in this coffee'))),'');
 assert.equal(refine(page(only.replace('In this coffee','Previously, in this coffee'))),'');
 assert.equal(refine(page(only.replace('fresh plum and florals','bright melon and florals'))),'');
});
test('generic texture, ambiguous extra notes and split across paragraphs cannot be promoted as flavor',()=>{
 assert.equal(refine(page('<p>In this coffee we are tasting fresh plum and florals with a smooth note.</p>')),'');
 assert.equal(refine(page('<p>In this coffee we are tasting fresh plum and florals with an orange bitters note.</p>'+
                          '<p>In this coffee we are tasting fresh plum and florals with a cherry note.</p>')),'');
 assert.equal(refine(page('<p>In this coffee we are tasting fresh plum and florals.</p><p>An orange bitters note.</p>')),'');
});
test('selected current parser includes three literal flavor notes without accepting historical URL name',()=>{
 const product={'@context':'https://schema.org','@type':'Product',name:selected123.name,url:selected123.url,
  description:'Washed, Guji Ethiopia, Dega and Kurume.'};
 const html=page().replace('</head>','<script type="application/ld+json">'+JSON.stringify(product)+'</script></head>');
 const p=extractPublicCoffeeFacts(html,{source_url:selected123.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields?.name,selected123.name,JSON.stringify(p.fields));
 const n=String(p.fields?.tasting_notes||'').toLowerCase();
 assert.ok(n.includes('fresh plum')&&n.includes('florals')&&n.includes('orange bitters'),JSON.stringify(p.fields));
});
