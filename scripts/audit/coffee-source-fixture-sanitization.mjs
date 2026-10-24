// Audit-only preservation of public product facts in inert diagnostic fixtures.
// This does not fetch a URL, execute page scripts, or change application extraction.
import {compactCoffeeProductHtml} from '../../src/server/coffee-product-prep.mjs';
import {rawElements,removeElements} from '../../supabase/functions/_shared/html-scan.mjs';

const sensitiveKey=/(?:password|secret|token|csrf|authorization|cookie|customer|session|email|phone|cart|checkout)/i;
const numericVariant=/^[1-9]\d{0,29}$/;
const trackingKey=/^utm_|^(?:srsltid|gclid|fbclid|msclkid|mc_cid|mc_eid)$/i;
const hasType=(value,type)=>[].concat(value?.['@type']||[]).some(item=>typeof item==='string'&&item.toLowerCase()===type);

function httpsUrl(raw,base){
 if(typeof raw!=='string'||!raw||raw.length>3000||/[\u0000-\u0020\u007f]/.test(raw))return null;
 try{
  const url=new URL(raw,base);
  return url.protocol==='https:'&&!url.username&&!url.password&&!url.port?url:null;
 }catch{return null;}
}
function publicProductQuery(url){
 const variants=url.searchParams.getAll('variant');
 return variants.length<=1&&(!variants.length||numericVariant.test(variants[0]))&&
  [...url.searchParams.keys()].every(key=>key==='variant'||trackingKey.test(key));
}
function productUrl(raw,source){
 const url=httpsUrl(raw,source.href);
 if(!url||url.origin!==source.origin||!publicProductQuery(url)||
  url.pathname.replace(/\/+$/,'')!==source.pathname.replace(/\/+$/,''))return null;
 return url;
}
function selectedOfferVariant(offer,source,parentVariant){
 if(!offer||typeof offer!=='object'||!hasType(offer,'offer'))return null;
 // An explicit URL has priority. A contradictory URL must not be rescued
 // by a different ID; a URL-less schema Offer may use its exact #offer ID.
 const hasUrl=Object.hasOwn(offer,'url');
 const url=productUrl(hasUrl?offer.url:offer['@id'],source);
 if(!url||(url.hash&&(hasUrl||!/^#offer$/i.test(url.hash)))||
  [...url.searchParams.keys()].some(key=>key!=='variant'))return null;
 const variants=url.searchParams.getAll('variant');
 if(variants.length!==1||!numericVariant.test(variants[0])||
  (parentVariant&&parentVariant!==variants[0]))return null;
 return variants[0];
}
function publicTemplate(value,source,variant){
 if(typeof value!=='string'||!value.startsWith(source.origin+'/cart/add?')||value.includes('#'))return false;
 const url=httpsUrl(value);
 if(!url||url.origin!==source.origin||url.pathname!=='/cart/add'||url.hash)return false;
 const entries=[...url.searchParams];
 return entries.length===2&&entries.every(([key])=>key==='id'||key==='quantity')&&
  url.searchParams.getAll('id').length===1&&url.searchParams.getAll('quantity').length===1&&
  url.searchParams.get('id')===variant&&numericVariant.test(variant)&&
  /^(?:[1-9]|[1-9]\d)$/.test(url.searchParams.get('quantity')||'');
}
function selectedPublicOffers(value,source){
 const offers=new WeakMap(),seen=new WeakSet(),stack=[[value,0]];
 let visited=0;
 const addOffers=(item,parentVariant,depth=0)=>{
  if(!item||typeof item!=='object'||depth>8)return;
  if(Array.isArray(item)){for(const child of item.slice(0,512))addOffers(child,parentVariant,depth+1);return;}
  const variant=selectedOfferVariant(item,source,parentVariant);
  if(variant)offers.set(item,variant);
  else if(hasType(item,'aggregateoffer'))addOffers(item.offers,parentVariant,depth+1);
 };
 while(stack.length&&visited<20_000){
  const [item,depth]=stack.pop();
  if(!item||typeof item!=='object'||seen.has(item)||depth>32)continue;
  seen.add(item);visited++;
  if(!Array.isArray(item)&&(hasType(item,'product')||hasType(item,'productgroup'))){
   const url=productUrl(Object.hasOwn(item,'url')?item.url:item['@id'],source);
   if(url)addOffers(item.offers,url.searchParams.get('variant'));
  }
  for(const child of Object.values(item))if(child&&typeof child==='object')stack.push([child,depth+1]);
 }
 return offers;
}
export function sanitizePublicCoffeeJson(value,{source_url}={}){
 const source=httpsUrl(source_url);
 const offers=source&&publicProductQuery(source)?selectedPublicOffers(value,source):new WeakMap();
 return JSON.stringify(value,function(key,item){
  if(key==='checkoutPageURLTemplate'&&offers.has(this)&&publicTemplate(item,source,offers.get(this)))return item;
  return sensitiveKey.test(key)?undefined:item;
 }).replace(/</g,'\\u003c').replace(/>/g,'\\u003e');
}

// Consume every complete attribute, including unknown/numeric/event names,
// before recognizing a literal inert product-data marker. Text inside another
// quoted attribute never creates type/id/data-product-json attributes.
function fixtureAttributes(source){
 const out=Object.create(null);let index=0;
 while(index<source.length){
  while(/\s/.test(source[index]||''))index++;
  if(index>=source.length||source[index]==='/')break;
  const start=index;
  while(index<source.length&&!/[\s"'<>/=]/.test(source[index]))index++;
  if(index===start)break;
  const name=source.slice(start,index).toLowerCase();let value='';
  while(index<source.length&&/\s/.test(source[index]))index++;
  if(source[index]==='='){
   index++;while(index<source.length&&/\s/.test(source[index]))index++;
   if(source[index]==='"'||source[index]==="'"){
    const quote=source[index++],begin=index;
    while(index<source.length&&source[index]!==quote)index++;
    if(index>=source.length)break;
    value=source.slice(begin,index++);
   }else{
    const begin=index;
    while(index<source.length&&!/\s/.test(source[index]))index++;
    value=source.slice(begin,index);
   }
  }
  if(!Object.hasOwn(out,name))out[name]=value;
 }
 return out;
}
export function sanitizePublicCoffeeFixtureHtml(html,{source_url}={}){
 const compact=compactCoffeeProductHtml(html);
 if(!compact)return '';
 const chunks=[];let cursor=0;
 for(const block of rawElements(compact)){
  chunks.push(compact.slice(cursor,block.start));
  const attributes=fixtureAttributes(block.attributes),type=(attributes.type||'').toLowerCase();
  if(/^(?:application\/json|application\/ld\+json)$/.test(type)&&block.closed){
   const id=/^[a-z0-9_-]{1,160}$/i.test(attributes.id||'')?attributes.id:'';
   const marker=Object.hasOwn(attributes,'data-product-json')?' data-product-json':'';
   try{
    chunks.push('<script type="'+type+'"'+(id?' id="'+id+'"':'')+marker+'>'+
     sanitizePublicCoffeeJson(JSON.parse(block.body),{source_url})+'</script>');
   }catch{/* Invalid script data is not preserved as executable markup. */}
  }
  cursor=block.end;
 }
 chunks.push(compact.slice(cursor));
 // Keep selected product facts inside purchase forms; remove the form shell,
 // controls and active markup. The caller still requires complete fact parity.
 return removeElements(chunks.join(''),['iframe','noscript','select','textarea'])
  .replace(/<\/?form\b[^<>]{0,8000}>/gi,' ')
  .replace(/<input\b[^<>]{0,4000}>/gi,'')
  .replace(/\s(?:on[a-z]+|nonce)\s*=\s*(?:"[^"]{0,8000}"|'[^']{0,8000}'|[^\s>]{1,1000})/gi,'')
  .replace(/\b(href|src)\s*=\s*(["'])\s*javascript:[^"']{0,8000}\2/gi,'$1="#"')
  .replace(/<meta\b[^<>]{0,2000}(?:csrf|token|session)[^<>]{0,2000}>/gi,'');
}
