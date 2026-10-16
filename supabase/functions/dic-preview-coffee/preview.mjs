// Bounded, deterministic preview of metadata from a trusted official roaster URL.
// Not a canonical verification; never writes public coffee facts or uses AI.
import {normalizeWords} from '../dic-verify-coffee/evidence.mjs';

const trim=(v,max=240)=>String(v??'').replace(/<[^>]{0,800}>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const urlHost=h=>String(h||'').toLowerCase().replace(/^www\./,'');
export function officialPreviewUrl(raw,officialHost){
 if(typeof raw!=='string'||raw.length>4000||!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(officialHost||''))return null;
 try{
  const u=new URL(raw);
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)return null;
  if(urlHost(u.hostname)!==officialHost)return null;
  if(!/^\/(?:products?\/|coffee\/|shop\/|collections\/[^/]+\/products?\/)[a-z0-9][a-z0-9._~%+\/-]*\/?$/i.test(u.pathname)||u.pathname.length>360)return null;
  for(const [k,v] of u.searchParams){
   if(!/^(?:variant|sku|utm_[a-z0-9_]{1,60}|gclid|fbclid|msclkid|srsltid)$/i.test(k)||v.length>200)return null;
  }
  if(u.search.length>600)return null;
  return u.toString();
 }catch{return null;}
}
function decode(s){
 return trim(String(s??'').replace(/&(?:amp|quot|apos|lt|gt|nbsp);|&#(?:x[0-9a-f]+|[0-9]+);/gi,t=>{
  const lookup={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' '};
  const v=t.toLowerCase();
  if(lookup[v])return lookup[v];
  if(v.startsWith('&#')){const hex=v.startsWith('&#x'),num=Number.parseInt(v.slice(hex?3:2,-1),hex?16:10);return num>0&&num<=0x10ffff?String.fromCodePoint(num):'';}
  return t;
 }),500);
}
function productsFrom(data,out,depth=0){
 if(depth>8||!data||typeof data!=='object')return;
 if(Array.isArray(data)){for(const row of data.slice(0,30))productsFrom(row,out,depth+1);return;}
 const types=Array.isArray(data['@type'])?data['@type']:[data['@type']];
 if(types.some(x=>String(x||'').toLowerCase()==='product')&&typeof data.name==='string')
  out.push({name:decode(data.name),url:typeof data.url==='string'?data.url:'',
   attributes:Array.isArray(data.additionalProperty)?data.additionalProperty.slice(0,40):[],description:decode(data.description||'')});
 if(data['@graph'])productsFrom(data['@graph'],out,depth+1);
}
function metaAttrs(html){
 const out={};
 for(const tag of html.match(/<meta\b[^>]{0,1800}>/gi)||[]){
  const obj={};
  for(const m of tag.matchAll(/([a-z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi))obj[m[1].toLowerCase()]=decode(m[2]??m[3]);
  const key=(obj.property||obj.name||'').toLowerCase();
  if(['og:type','og:title','description'].includes(key))out[key]=obj.content||'';
 }
 return out;
}
function samePath(declared,target){
 try{const t=new URL(target),u=new URL(declared,t.origin);
  return urlHost(t.hostname)===urlHost(u.hostname)&&u.pathname.replace(/\/$/,'')===t.pathname.replace(/\/$/,'');
 }catch{return false;}
}
const fieldsByKey={
 origin:'origin',country:'origin',countryoforigin:'origin',
 variety:'variety',varietal:'variety',cultivar:'variety',
 process:'process',processing:'process',processingmethod:'process',
 producer:'producer',farm:'producer',farmer:'producer',
 altitude:'elevation_m',elevation:'elevation_m',elevationm:'elevation_m',
 roast:'roast_level',roastlevel:'roast_level',
 tastingnotes:'tasting_notes',tastenotes:'tasting_notes',flavornotes:'tasting_notes',flavournotes:'tasting_notes',cupnotes:'tasting_notes',
 harvest:'release_label',harvestyear:'release_label',cropyear:'release_label',lot:'release_label',releaselabel:'release_label'
};
const roastMap=new Map(['Light','Light-Medium','Medium','Medium-Dark','Dark'].map(v=>[normalizeWords(v),v]));
const processMap=new Map(['Washed','Natural','Honey','Anaerobic','Other/Unknown'].map(v=>[normalizeWords(v),v]));
export function extractProductPreview(html,{source_url,roaster}={}){
 if(typeof html!=='string'||html.length>950000||!source_url||!roaster)return {ok:false,reason:'invalid_source'};
 const products=[];
 for(const [,attrs,payload] of html.matchAll(/<script\b([^>]{0,1000})>([\s\S]*?)<\/script\s*>/gi)){
  if(!/\btype\s*=\s*["']application\/ld\+json["']/i.test(attrs)||payload.length>180000)continue;
  try{productsFrom(JSON.parse(payload),products);}catch{/* malformed markup cannot become evidence */}
 }
 const matched=products.filter(p=>p.url&&samePath(p.url,source_url));
 const candidates=matched.length?matched:products.filter(p=>!p.url);
 const unique=[...new Map(candidates.map(p=>[normalizeWords(p.name),p])).values()];
 let candidate=null;
 if(unique.length===1)candidate=unique[0];
 else if(!unique.length){
  const meta=metaAttrs(html);
  if(/^product(?:\.|$)/i.test(meta['og:type']||'')&&meta['og:title'])candidate={name:meta['og:title'],attributes:[],description:meta.description||''};
 }
 if(!candidate||!candidate.name)return {ok:false,reason:'ambiguous_or_missing_product'};
 const fields={name:trim(candidate.name,200),roaster:trim(roaster,200)};
 if(!fields.name||!fields.roaster)return {ok:false,reason:'missing_identity'};
 for(const row of candidate.attributes){
  const key=normalizeWords(row?.name).replace(/ /g,'');
  const field=fieldsByKey[key];if(!field||fields[field])continue;
  const value=trim(row?.value,field==='tasting_notes'?700:200);if(!value)continue;
  if(field==='roast_level'){const mapped=roastMap.get(normalizeWords(value));if(mapped)fields[field]=mapped;}
  else if(field==='process'){const mapped=processMap.get(normalizeWords(value));if(mapped)fields[field]=mapped;}
  else fields[field]=value;
 }
 return {ok:true,source:'official_roaster_product_metadata',fields,available:Object.keys(fields),
  note:'Official product metadata is a preview, not a confirmed canonical coffee identity.'};
}
