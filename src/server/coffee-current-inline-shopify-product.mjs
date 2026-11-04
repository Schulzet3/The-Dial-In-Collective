// Exact selected Shopify Product's PUBLIC inline data, never store navigation or related SKUs.
// This is supplemental identity-bound roast evidence only; taxonomy region is NOT growing origin.
import {rawElements} from '../../supabase/functions/_shared/html-scan.mjs';
const norm=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function balancedJsonEnd(input,start){
 const stack=[];let quoted=false,escaped=false;
 for(let i=start;i<input.length&&i<start+150000;i++){
  const c=input[i];
  if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
  if(c==='"'){quoted=true;continue;}
  if(c==='{'||c==='['){stack.push(c);if(stack.length>24)return -1;}
  if(c==='}'||c===']'){
   if(stack.pop()!==(c==='}'?'{':'['))return -1;
   if(!stack.length)return i+1;
  }
 }
 return -1;
}
export function selectedCurrentInlineShopifyRoastTag(html,{name='',roaster='',source_url=''}={}){
 if(typeof html!=='string'||html.length>2_000_000||typeof name!=='string'||name.length>220||
   typeof roaster!=='string'||!roaster||roaster.length>220)return null;
 let handle='';
 try{
  const u=new URL(source_url);
  if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
  handle=u.pathname.match(/(?:^|\/)products\/([a-z0-9][a-z0-9-]{1,120})\/?$/i)?.[1]||'';
 }catch{return null;}
 if(!handle)return null;
 const matched=[];let assignments=0;
 for(const script of rawElements(html)){
  if(!script.closed||script.body.length>500000||/\bsrc\s*=/i.test(script.attributes))continue;
  const marker=/(?:^|[;\n])\s*theme\.product\s*=\s*(\{)/g;
  while(marker.exec(script.body)){
   if(++assignments>6)return null;
   const start=marker.lastIndex-1,end=balancedJsonEnd(script.body,start);
   if(end<=start||!/^\s*;/.test(script.body.slice(end,end+15)))return null;
   let product;
   try{product=JSON.parse(script.body.slice(start,end));}catch{return null;}
   if(!product||typeof product!=='object'||Array.isArray(product)||
     !Number.isSafeInteger(product.id)||product.id<=0||
     typeof product.title!=='string'||norm(product.title)!==norm(name)||
     typeof product.handle!=='string'||product.handle.toLowerCase()!==handle.toLowerCase())continue;
   matched.push(product);
  }
 }
 if(matched.length!==1)return null;
 const product=matched[0];
 if(typeof product.vendor!=='string'||norm(product.vendor)!==norm(roaster)||
   !Array.isArray(product.tags)||product.tags.length>100)return null;
 const roastTags=product.tags.filter(tag=>typeof tag==='string'&&tag.length<85)
  .map(tag=>tag.trim().match(/^roast(?: level)?\s*:\s*(medium[- ]light|medium[- ]dark|light|medium|dark)(?:\s+roast)?$/i))
  .filter(Boolean).map(row=>row[1].replace(/[- ]/g,'').toLowerCase());
 if(!roastTags.length||new Set(roastTags).size!==1)return null;
 const table={light:'Light',mediumlight:'Medium-Light',medium:'Medium',mediumdark:'Medium-Dark',dark:'Dark'};
 const value=table[roastTags[0]];
 return value?{value,source:'exact_selected_shopify_inline_product_roast_taxonomy'}:null;
}
