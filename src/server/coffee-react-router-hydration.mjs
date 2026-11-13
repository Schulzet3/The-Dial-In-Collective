// Bounded, non-executing exact-product reader for public React Router/Hydrogen
// server hydration. Only the selected shop.products.$handle loader route is
// authoritative; the same payload can include dozens of related products.
import {rawElements} from '../../supabase/functions/_shared/html-scan.mjs';
import {safeCoffeeUrl,coffeeProductHandle} from './coffee-url-guard.mjs';

const MAX_INLINE_BYTES=250_000;
const MAX_FLAT_ITEMS=6_000;
const HYDRATION_PREFIX='window.__reactRouterContext.streamController.enqueue(';
const SELECTED_ROUTE='routes/shop.products.$handle';
const textAt=(flat,index,max=180)=>Number.isSafeInteger(index)&&index>=0&&index<flat.length&&
 typeof flat[index]==='string'&&flat[index].length<=max?flat[index]:null;
function attributesAt(flat,index){
 if(!Number.isSafeInteger(index)||index<0||index>=flat.length||
  !flat[index]||Array.isArray(flat[index])||typeof flat[index]!=='object')return null;
 const source=flat[index],keys=Object.keys(source);
 if(keys.length>90)return null;
 const out=new Map();
 for(const encoded of keys){
  if(!/^_\d{1,5}$/.test(encoded))return null;
  const name=textAt(flat,Number(encoded.slice(1)),100);
  if(!name||out.has(name))return null;
  out.set(name,source[encoded]);
 }
 return out;
}
function selectedPayload(flat){
 if(!Array.isArray(flat)||flat.length<20||flat.length>MAX_FLAT_ITEMS)return null;
 const root=attributesAt(flat,0),loaders=attributesAt(flat,root?.get('loaderData'));
 const route=attributesAt(flat,loaders?.get(SELECTED_ROUTE));
 const product=attributesAt(flat,route?.get('product'));
 const coffee=attributesAt(flat,product?.get('coffee'));
 return product&&coffee?{product,coffee}:null;
}
function wordsAt(flat,index){
 const list=flat[index];
 if(!Array.isArray(list)||!list.length||list.length>10)return [];
 const values=list.map(ref=>textAt(flat,ref,85)?.trim());
 if(values.some(word=>!word||/[<>\u0000-\u001f]/u.test(word))||
  new Set(values.map(s=>s.toLowerCase())).size!==values.length)return [];
 return values;
}
function productHandleFromUrl(raw){
 const url=safeCoffeeUrl(raw);if(!url)return null;
 const match=url.pathname.match(/^\/shop\/products\/([^/]+)\/?$/i);
 return match?coffeeProductHandle(match[1]):null;
}
function readStreamArray(block){
 if(!block.closed||block.body.length>MAX_INLINE_BYTES||
  !block.body.startsWith(HYDRATION_PREFIX))return null;
 const content=block.body.slice(HYDRATION_PREFIX.length).trim();
 if(!/^"(?:\\.|[^"\\])*"\);?$/su.test(content))return null;
 try{
  const outer=JSON.parse(content.replace(/\);?$/u,''));
  if(typeof outer!=='string'||outer.length>MAX_INLINE_BYTES||outer[0]!=='[')return null;
  return JSON.parse(outer);
 }catch{return null;}
}
const identity=value=>String(value||'').normalize('NFKC').trim().replace(/\s+/gu,' ').toLowerCase();
export function extractSelectedReactRouterCoffeeHydration(html,{source_url,expected_name,expected_roaster}={}){
 if(typeof html!=='string'||html.length>2_000_000)return null;
 const handle=productHandleFromUrl(source_url);
 if(!handle||!expected_name||!expected_roaster)return null;
 let selected=null,blocks=0;
 for(const block of rawElements(html)){
  if(++blocks>48)break;
  const flat=readStreamArray(block);if(!flat)continue;
  const result=selectedPayload(flat);if(!result)continue;
  const {product,coffee}=result;
  const name=textAt(flat,product.get('title'));
  const vendor=textAt(flat,product.get('vendor'));
  const selectedHandle=textAt(flat,product.get('handle'));
  const id=textAt(flat,product.get('id'));
  if(!name||!vendor||!selectedHandle||!id||
     !/^gid:\/\/shopify\/Product\/\d{5,20}$/.test(id)||
     identity(name)!==identity(expected_name)||identity(vendor)!==identity(expected_roaster)||
     coffeeProductHandle(selectedHandle)!==handle)continue;
  const notes=wordsAt(flat,coffee.get('tastingNotes'));
  const roast=textAt(flat,coffee.get('roastLevel'),35);
  const fields={};
  if(notes.length&&notes.join(', ').length<=260)fields.tasting_notes=notes.join(', ');
  if(/^(?:light|light-medium|medium-light|medium|medium-dark|dark)$/i.test(roast||''))fields.roast_level=roast;
  if(!Object.keys(fields).length)continue;
  // Two distinct selected-route payloads in the same response are ambiguous.
  if(selected)return null;
  selected={fields,source_type:'product_json',source:'exact_selected_hydrogen_loader'};
 }
 return selected;
}
