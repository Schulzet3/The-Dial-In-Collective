
// Safe, repeatable public product-endpoint smoke probe. No beta credentials,
// Supabase quota, raw HTML dump, cookies, tokens or production mutations.
// Pages and storefronts can change; every unavailable source is reported.
import {extractEcwidProduct} from '../../src/server/coffee-ecwid-snapshot.mjs';
import {extractShopifyProduct,shopifyProductRequest} from '../../src/server/coffee-shopify-ajax.mjs';
import {extractWooProduct} from '../../src/server/coffee-woocommerce-store.mjs';
import {fetchPublicCoffeeJson} from '../../src/server/coffee-url-guard.mjs';
import {ecwidProductRequest} from '../../src/server/coffee-ecwid-snapshot.mjs';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const cases=[
 ['Mango Tree Blend','ecwid','https://www.mangotreecoffee.org/shop/Mango-Tree-Blend-p734210068'],
 ['Corvus Echo Gesha','shopify','https://www.corvuscoffee.com/products/echo-gesha'],
 ['PERC Mara Estate','shopify','https://perccoffee.com/products/kenya-mara-estate'],
 ['Sweet Bloom Wuri','shopify','https://sweetbloomcoffee.com/products/wuri'],
 ['Heart Phono','shopify','https://www.heartroasters.com/products/phono'],
 ['Makers Colombia San Agustin','woo','https://makerscoffee.com/product/colombia-san-agustin/'],
 ['Park City Ethiopia','woo','https://pcroaster.com/product/ethiopia-single-origin/']
];
const results=[];
for(const [name,platform,url] of cases){
 try{
  const preview=platform==='ecwid'?await extractEcwidProduct(url):
   platform==='woo'?await extractWooProduct(url):await extractShopifyProduct(url);
  const ok=preview?.ok===true;
  const facts=ok?Object.fromEntries(Object.entries(preview.fields||{})
   .map(([k,v])=>[k,typeof v==='string'?v.slice(0,220):v])):{};
  let shopifyDiagnostic=null;
  if(platform==='shopify'&&!ok){
   const target=shopifyProductRequest(url);
   const data=target?await fetchPublicCoffeeJson(target.url):null;
   let parsed=null;
   if(data?.ok){
    try{
     const raw=JSON.parse(data.json);
     parsed={handle:typeof raw.handle==='string'?raw.handle:null,
      title:typeof raw.title==='string'?raw.title.slice(0,140):null,
      has_description:typeof raw.description==='string'&&raw.description.length>0};
    }catch{parsed={malformed_json:true};}
   }
   shopifyDiagnostic={path:target?.url?new URL(target.url).pathname:null,
    transport:data?.ok?'json':data?.reason||'no_product_handle',
    ...(parsed?{product:parsed}:{})};
  }
  results.push({name,platform,ok,fields:facts,
   conflict_keys:preview?.conflicts||[],reason:ok?null:'source_missing_unavailable_or_not_exact',
   ...(shopifyDiagnostic?{diagnostic:shopifyDiagnostic}:{})});
 }catch(error){
  results.push({name,platform,ok:false,reason:'probe_exception',kind:String(error?.name||'Error')});
 }
}
console.log('[DIC PUBLIC PRODUCT ENDPOINTS] '+JSON.stringify({attempts:results.length,
 parsed:results.filter(x=>x.ok).length,results,source_type:'public_no_token',
 no_raw_page_retention:true,production_mutations:0,authentication_requests:0}));
// Temporary, isolated identity-encoding diagnostic to distinguish a current
// Ecwid product-source change from gzip/br transport incompatibility.
async function mangoEncodingEvidence(){
 const url='https://www.mangotreecoffee.org/shop/Mango-Tree-Blend-p734210068';
 const exact=ecwidProductRequest(url);
 if(!exact)return {recognized:false};
 const compressed=await fetchPublicCoffeeJson(exact.requestUrl);
 const path=mkdtempSync(join(tmpdir(),'dic-encoding-check-'));
 try{
  const source=readFileSync(new URL('../../src/server/coffee-url-guard.mjs',import.meta.url),'utf8');
  const search="'Accept-Encoding':'gzip, br'";
  if(source.split(search).length!==2)throw Error('Transport changed, cannot compare');
  const file=join(path,'guard.mjs');
  writeFileSync(file,source.replace(search,"'Accept-Encoding':'identity'"));
  const guard=await import(pathToFileURL(file).href);
  const identity=await guard.fetchPublicCoffeeJson(exact.requestUrl);
  const digest=response=>{
   if(!response?.ok)return {status:response?.reason||'missing'};
   try{
    const data=JSON.parse(response.json);
    return {status:'ok',size:Buffer.byteLength(response.json),
     title:typeof data.title==='string'?data.title:null,
     hasTargetProduct:[data.title,data.htmlCode,data.metaDescriptionHtml,data.jsonLDHtml,data.ogTagsHtml]
      .some(s=>typeof s==='string'&&/Mango Tree Blend/i.test(s)),
     htmlLength:String(data.htmlCode||'').length,
     jsonLdLength:String(data.jsonLDHtml||'').length,
     titleHtmlLength:String(data.titleHtml||'').length,
     lastUpdated:data.lastUpdated||null};
   }catch{return {status:'invalid_json'};}
  };
  return {recognized:true,compressed:digest(compressed),identity:digest(identity)};
 }finally{rmSync(path,{recursive:true,force:true});}
}
console.log('[DIC ECWID ENCODING DIFFERENCE] '+JSON.stringify(await mangoEncodingEvidence()));

const mango=results.find(x=>x.name==='Mango Tree Blend');
if(mango?.ok){
 if(mango.fields.name!=='Mango Tree Blend'||mango.fields.roast_level!=='Medium'||
  !/Ethiopia.+Brazil/i.test(mango.fields.origin||'')||
  !/Pear.+Molasses.+Acai/i.test(mango.fields.tasting_notes||''))
  throw Error('Mango Tree public coffee fields changed or regressed; owner review required');
}else console.log('[DIC MANGO LIVE LIMIT] Static public endpoint unavailable; synthetic regression remains independent.');
