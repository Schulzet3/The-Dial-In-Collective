
// Safe, repeatable public product-endpoint smoke probe. No beta credentials,
// Supabase quota, raw HTML dump, cookies, tokens or production mutations.
// Pages and storefronts can change; every unavailable source is reported.
import {extractEcwidProduct} from '../../src/server/coffee-ecwid-snapshot.mjs';
import {extractShopifyProduct} from '../../src/server/coffee-shopify-ajax.mjs';
const cases=[
 ['Mango Tree Blend','ecwid','https://www.mangotreecoffee.org/shop/Mango-Tree-Blend-p734210068'],
 ['Corvus Echo Gesha','shopify','https://www.corvuscoffee.com/products/echo-gesha'],
 ['PERC Mara Estate','shopify','https://perccoffee.com/products/kenya-mara-estate'],
 ['Sweet Bloom Wuri','shopify','https://sweetbloomcoffee.com/products/wuri'],
 ['Heart Phono','shopify','https://www.heartroasters.com/products/phono']
];
const results=[];
for(const [name,platform,url] of cases){
 try{
  const preview=platform==='ecwid'?await extractEcwidProduct(url):await extractShopifyProduct(url);
  const ok=preview?.ok===true;
  const facts=ok?Object.fromEntries(Object.entries(preview.fields||{})
   .map(([k,v])=>[k,typeof v==='string'?v.slice(0,220):v])):{};
  results.push({name,platform,ok,fields:facts,
   conflict_keys:preview?.conflicts||[],reason:ok?null:'source_missing_unavailable_or_not_exact'});
 }catch(error){
  results.push({name,platform,ok:false,reason:'probe_exception',kind:String(error?.name||'Error')});
 }
}
console.log('[DIC PUBLIC PRODUCT ENDPOINTS] '+JSON.stringify({attempts:results.length,
 parsed:results.filter(x=>x.ok).length,results,source_type:'public_no_token',
 no_raw_page_retention:true,production_mutations:0,authentication_requests:0}));
const mango=results.find(x=>x.name==='Mango Tree Blend');
if(mango?.ok){
 if(mango.fields.name!=='Mango Tree Blend'||mango.fields.roast_level!=='Medium'||
  !/Ethiopia.+Brazil/i.test(mango.fields.origin||'')||
  !/Pear.+Molasses.+Acai/i.test(mango.fields.tasting_notes||''))
  throw Error('Mango Tree public coffee fields changed or regressed; owner review required');
}else console.log('[DIC MANGO LIVE LIMIT] Static public endpoint unavailable; synthetic regression remains independent.');
