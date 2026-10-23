import {rawElements} from '../_shared/html-scan.mjs';
// Bounded, deterministic preview of metadata from a trusted official roaster URL.
// Not a canonical verification; never writes public coffee facts or uses AI.
import {normalizeWords} from '../dic-verify-coffee/evidence.mjs';
import {interpretAgtron,agtronExplanation} from './agtron-roast.mjs';

const trim=(v,max=240)=>String(v??'').replace(/<[^<>]{0,800}>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
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
 for(const tag of html.match(/<meta\b[^<>]{0,1800}>/gi)||[]){
  const obj={};
  for(const m of tag.matchAll(/(?:^|[\s<])([a-z-]{1,64})\s*=\s*(?:"([^"]*)"|'([^']*)')/gi))obj[m[1].toLowerCase()]=decode(m[2]??m[3]);
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
const roastMap=new Map(['Ultra Light','Very Light','Light','Medium-Light','Medium','Medium-Dark','Dark'].map(v=>[normalizeWords(v),v]));
// Legacy equivalent spelling is a read-time alias; source prose is retained.
roastMap.set(normalizeWords('Light-Medium'),'Medium-Light');
const processMap=new Map(['Washed','Natural','Honey','Anaerobic','Other/Unknown'].map(v=>[normalizeWords(v),v]));
function officialProcess(value){
 const words=normalizeWords(value);
 if(/\b(?:anaerobic[\s-]+natural|natural[\s-]+anaerobic)\b/.test(words))return 'Anaerobic';
 if(/^adv(?:anced)?\s+natural$/.test(words))return 'Natural';
 if(/^adv(?:anced)?\s+washed$/.test(words))return 'Washed';
 return processMap.get(words)||'';
}
export function extractProductPreview(html,{source_url,roaster}={}){
 if(typeof html!=='string'||html.length>950000||!source_url||!roaster)return {ok:false,reason:'invalid_source'};
 const products=[];
 for(const block of rawElements(html)){
  if(!block.closed||block.attributes.length>1000)continue;
  const attrs=block.attributes,payload=block.body;
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
 const roaster_details={};
 let numericAgtron=null;
 for(const row of candidate.attributes){
  const key=normalizeWords(row?.name).replace(/ /g,'');
  if(/^(?:agtron|roastcolor|roastcolour|groundagtron|agtrongourmet|agtroncommercial)$/.test(key)){
   const measured=interpretAgtron(row?.value,{scale:row?.name||''});
   if(measured&&!numericAgtron){
    numericAgtron=measured;
    roaster_details.agtron=measured.display;
    if(measured.scale!=='unspecified')roaster_details.agtron_scale=measured.scale;
    if(measured.sample!=='unspecified')roaster_details.agtron_sample=measured.sample.replace('_',' ');
   }
   continue;
  }
  const field=fieldsByKey[key];if(!field||fields[field])continue;
  const value=trim(row?.value,field==='tasting_notes'?700:200);if(!value)continue;
  if(field==='roast_level'){const mapped=roastMap.get(normalizeWords(value));if(mapped)fields[field]=mapped;}
  else if(field==='process'){const mapped=officialProcess(value);if(mapped)fields[field]=mapped;}
  else fields[field]=value;
 }
 // Product JSON-LD descriptions belong to this selected lot, not other
 // products. A named estate/farm must be corroborated by the lot narrative.
 const narrative=trim(candidate.description||'',1200);
 if(/\banaerobic[\s-]+natural\b/i.test(narrative)&&fields.process==='Natural')
  fields.process='Anaerobic';
 if(!fields.producer&&narrative){
  const name=String(fields.name).replace(/^(?:Kenya|Ethiopia|Colombia|Peru|Rwanda|Honduras)\s+/i,'');
  if(/^[\p{L}\p{M}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}\p{M}'’.-]+){0,5}\s+(?:Estate|Farm)$/iu.test(name)&&
     narrative.toLocaleLowerCase().includes(name.toLocaleLowerCase()))
   fields.producer=name;
 }
 const roast_hint=numericAgtron?agtronExplanation(numericAgtron,fields.roast_level||''):'';
 if(numericAgtron?.roast&&!fields.roast_level)fields.roast_level=numericAgtron.roast;
 return {ok:true,source:'official_roaster_product_metadata',fields,available:Object.keys(fields),
  ...(Object.keys(roaster_details).length?{roaster_details}:{}),
  ...(roast_hint?{roast_hint}:{}),
  note:'Official product metadata is a preview, not a confirmed canonical coffee identity.'};
}
