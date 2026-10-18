import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractProductPreview} from '../supabase/functions/dic-preview-coffee/preview.mjs';

const url='https://perccoffee.com/products/kenya-mara-estate';
const product=(values={},extra={})=>({
 '@context':'https://schema.org','@type':'Product',
 name:extra.name||'Kenya Mara Estate',url,
 description:extra.description||'This anaerobic natural lot comes from Mara Estate, fermented in sealed tanks.',
 additionalProperty:[
  {name:'Processing',value:values.process??'Adv Natural'},
  {name:'Agtron',value:values.agtron??'78.4 Agtron'},
  ...(values.roast?[{name:'Roast Level',value:values.roast}]:[])
 ]
});
const parse=p=>extractProductPreview('<script type="application/ld+json">'+JSON.stringify(p)+'</script>',{source_url:url,roaster:'PERC COFFEE'});
test('official JWT preview interprets explicit Agtron, anaerobic product description and corroborated estate producer',()=>{
 const r=parse(product());
 assert.equal(r.ok,true);
 assert.equal(r.fields.name,'Kenya Mara Estate');
 assert.equal(r.fields.producer,'Mara Estate');
 assert.equal(r.fields.process,'Anaerobic');
 assert.equal(r.roaster_details.agtron,'78.4');
 assert.equal(r.fields.roast_level,'Light');
 assert.match(r.roast_hint,/Provisional/);
 assert.equal(r.source,'official_roaster_product_metadata');
});
test('official explicit roast wins over numeric inferred roast',()=>{
 const r=parse(product({roast:'Very Light'}));
 assert.equal(r.fields.roast_level,'Very Light');
 assert.match(r.roast_hint,/explicitly labels Very Light/);
});
test('official process keeps ambiguous blends unspecified',()=>{
 const r=parse(product({process:'Washed & Natural',agtron:'666 Agtron'}));
 assert.equal(r.fields.process,undefined);
 assert.equal(r.roaster_details,undefined);
 assert.equal(r.fields.roast_level,undefined);
});
test('an Agtron score without matching scale/sample must be treated as provisional',()=>{
 const r=parse(product({agtron:'64.3 (Commercial Ground) Agtron'}));
 assert.equal(r.fields.roast_level,'Very Light');
 assert.equal(r.roaster_details.agtron_scale,'commercial');
 assert.equal(r.roaster_details.agtron_sample,'ground');
 assert.doesNotMatch(r.roast_hint,/Provisional/);
});
test('the Edge Agtron algorithm is an identical copy of the app algorithm',()=>{
 const app=readFileSync(new URL('../src/server/agtron-roast.mjs',import.meta.url),'utf8');
 const edge=readFileSync(new URL('../supabase/functions/dic-preview-coffee/agtron-roast.mjs',import.meta.url),'utf8');
 assert.equal(edge,app);
});
