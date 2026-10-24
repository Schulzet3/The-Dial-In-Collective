// Audit-only preservation of public product facts in inert diagnostic fixtures.
// This does not fetch a URL, execute page scripts, or change application extraction.
import {compactCoffeeProductHtml} from '../../src/server/coffee-product-prep.mjs';
import {rawElements,removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
import {coffeeHtmlAttributes} from '../../src/server/coffee-product-scope.mjs';
import {coffeeHtmlElements} from '../../src/server/coffee-html-structure.mjs';

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
// Preserve strictly public typed schema variants directly under the selected Product.
function rootSchemaIdentity(raw,source,type){
 if(typeof raw!=='string')return false;
 const prefix=source.origin+'/#/schema/'+type+'/';
 if(!raw.startsWith(prefix))return false;
 const url=httpsUrl(raw);
 const tail=raw.slice(prefix.length);
 return Boolean(url&&url.origin===source.origin&&url.pathname==='/'&&!url.search&&
  tail.length>=1&&tail.length<=200&&[...tail].every(char=>/[A-Za-z0-9._~-]/.test(char)));
}
function selectedOfferVariant(offer,source,parentVariant){
 if(!offer||typeof offer!=='object'||!hasType(offer,'offer'))return null;
 // An explicit URL has priority. A contradictory URL must not be rescued
 // by a different ID; a URL-less schema Offer may use its exact #offer ID.
 const hasUrl=Object.hasOwn(offer,'url');
 const url=productUrl(hasUrl?offer.url:offer['@id'],source);
 if(!url||(hasUrl?Boolean(url.hash):!/^#offer$/i.test(url.hash))||
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
 const addOffers=(item,parentVariant,depth=0,requireSchemaOffer=false)=>{
  if(!item||typeof item!=='object'||depth>8)return;
  if(Array.isArray(item)){for(const child of item.slice(0,512))addOffers(child,parentVariant,depth+1,requireSchemaOffer);return;}
  const variant=selectedOfferVariant(item,source,parentVariant);
  if(variant&&(!requireSchemaOffer||rootSchemaIdentity(item['@id'],source,'Offer')))offers.set(item,variant);
  else if(hasType(item,'aggregateoffer'))addOffers(item.offers,parentVariant,depth+1,requireSchemaOffer);
 };
 while(stack.length&&visited<20_000){
  const [item,depth]=stack.pop();
  if(!item||typeof item!=='object'||seen.has(item)||depth>32)continue;
  seen.add(item);visited++;
  if(!Array.isArray(item)&&(hasType(item,'product')||hasType(item,'productgroup'))){
   const url=productUrl(Object.hasOwn(item,'url')?item.url:item['@id'],source);
   if(url&&!(Object.hasOwn(item,'url')&&rootSchemaIdentity(item['@id'],source,'Product'))){
    addOffers(item.offers,url.searchParams.get('variant'));
    if(!url.searchParams.has('variant')){
     const variants=Array.isArray(item.hasVariant)?item.hasVariant:[item.hasVariant];
     for(const child of variants.slice(0,512)){
      if(!child||typeof child!=='object'||Array.isArray(child)||
         !hasType(child,'product')||Object.hasOwn(child,'url')||
         !rootSchemaIdentity(child['@id'],source,'Product'))continue;
      addOffers(child.offers,null,0,true);
     }
    }
   }
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

// Preserve the form/control boundaries used by the source parser, without
// retaining private controls or arbitrary prefilled input values. Attribute
// parsing is shared with product scoping so quoted text cannot forge a key.
function fixtureInputs(html){
 const {nodes,scannedEnd,truncated}=coffeeHtmlElements(html),chunks=[];
 const allowed=new Set(['type','name','id','class','form','checked','disabled','min','max','step','value']);
 const escape=value=>String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 let cursor=0;
 for(const node of nodes){
  if(node.tag!=='input')continue;
  chunks.push(html.slice(cursor,node.start));cursor=node.headEnd;
  const attrs=coffeeHtmlAttributes(node.attributes),type=(attrs.type||'text').toLowerCase();
  const privateControl=/^(?:password|email|tel|file)$/i.test(type)||
   [attrs.name,attrs.id,attrs.autocomplete].some(value=>sensitiveKey.test(value||'')||/\b(?:address|billing|shipping|contact)\b/i.test(value||''));
  if(privateControl){chunks.push(' ');continue;}
  const name=attrs.name||'',value=attrs.value||'';
  const numericControl=/^(?:id|variant(?:_id)?|product(?:_id|-id)|selling_plan)$/i.test(name)&&numericVariant.test(value);
  const quantityControl=/^quantity$/i.test(name)&&/^(?:[1-9]|[1-9]\d)$/.test(value);
  const namedVariant=/^coffee_variant$/i.test(name)&&/^[a-z][a-z0-9 _-]{0,79}$/i.test(value);
  const keepValue=/^(?:hidden|radio|checkbox|number|text)$/i.test(type)&&(numericControl||quantityControl||namedVariant);
  let tag='<input';
  for(const [key,item] of Object.entries(attrs)){
   if(!allowed.has(key)||(key==='value'&&!keepValue)||item.length>600)continue;
   tag+=' '+key+'="'+escape(item)+'"';
  }
  chunks.push(tag+'>');
 }
 chunks.push(html.slice(cursor,truncated?scannedEnd:html.length));
 return chunks.join('');
}

export function sanitizePublicCoffeeFixtureHtml(html,{source_url}={}){
 const compact=compactCoffeeProductHtml(html);
 if(!compact)return '';
 const chunks=[];let cursor=0;
 for(const block of rawElements(compact)){
  chunks.push(compact.slice(cursor,block.start));
  const attributes=coffeeHtmlAttributes(block.attributes),type=(attributes.type||'').toLowerCase();
  if(/^(?:application\/json|application\/ld\+json)$/.test(type)&&block.closed){
   const id=/^[a-z0-9_-]{1,160}$/i.test(attributes.id||'')?attributes.id:'';
   const marker=['data-product-json','data-product','data-product-data','data-shopify-product']
    .filter(key=>Object.hasOwn(attributes,key)).map(key=>' '+key).join('');
   try{
    chunks.push('<script type="'+type+'"'+(id?' id="'+id+'"':'')+marker+'>'+
     sanitizePublicCoffeeJson(JSON.parse(block.body),{source_url})+'</script>');
   }catch{/* Invalid script data is not preserved as executable markup. */}
  }
  cursor=block.end;
 }
 chunks.push(compact.slice(cursor));
 // Preserve upstream's useful form and input boundaries. No action target,
 // executable handler or private input value is retained. The probe still
 // requires complete extraction equality before accepting a capture.
 return fixtureInputs(removeElements(chunks.join(''),['iframe','noscript','select','textarea']))
  .replace(/\s(?:on[a-z]+|nonce|action|formaction)\s*=\s*(?:"[^"]{0,8000}"|'[^']{0,8000}'|[^\s>]{1,1000})/gi,'')
  .replace(/\b(href|src)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\t\n\f\r "'<>]*)/gi,'$1="#"')
  .replace(/<meta\b[^<>]{0,2000}(?:csrf|token|session)[^<>]{0,2000}>/gi,'');
}
