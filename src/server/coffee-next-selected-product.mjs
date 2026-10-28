// Bounded, inert selected-product extraction from Next.js / Sanity public state.
// Only the requested route's pageProps.conversion is eligible. Nearby product
// recommendations, cross-sells, brew guides and private account state are never
// traversed, executed, exported or treated as the requested coffee.
const text=value=>typeof value==='string'?value.normalize('NFKC').replace(/\s+/g,' ').trim():'';
const local=value=>{
 if(typeof value==='string')return text(value);
 if(!value||typeof value!=='object'||Array.isArray(value))return '';
 return text(value.eng);
};
const accepted=new Set(['Ultra Light','Very Light','Light','Medium-Light','Medium','Medium-Dark','Dark']);
const cleanRoast=value=>{
 const found=local(value).replace(/\s+Roast$/i,'');
 const canonical={'ultra light':'Ultra Light','very light':'Very Light','light':'Light',
  'medium light':'Medium-Light','medium-light':'Medium-Light','medium':'Medium',
  'medium dark':'Medium-Dark','medium-dark':'Medium-Dark','dark':'Dark'};
 return accepted.has(found)?found:(canonical[found.toLowerCase()]||'');
};
const selectedScript=html=>{
 if(!html.includes('__NEXT_DATA__'))return null;
 for(const m of html.matchAll(/<script\b([^<>]{0,1200})>([\s\S]{0,2300000}?)<\/script\s*>/gi)){
  const attrs=m[1];
  if(/\bid\s*=\s*["']__NEXT_DATA__["']/i.test(attrs)&&
   /\btype\s*=\s*["']application\/json["']/i.test(attrs))return m[2];
 }
 return null;
};
export function extractSelectedNextCoffeeProduct(html,{source_url}={}){
 if(typeof html!=='string'||html.length>2000000)return null;
 const raw=selectedScript(html);
 if(raw===null)return null;
 let url,content;
 try{url=new URL(source_url);content=JSON.parse(raw);}catch{return {ok:false,reason:'ambiguous_or_missing_product'};}
 if(url.protocol!=='https:'||url.username||url.password)return {ok:false,reason:'ambiguous_or_missing_product'};
 const path=url.pathname.match(/^\/([a-z]{2})\/([a-z]{3})\/product\/([a-z0-9][a-z0-9-]{1,100})\/?$/i);
 if(!path||content?.page!=='/[region]/[lang]/product/[slug]')return null;
 const props=content?.props?.pageProps;
 const selected=props?.conversion;
 // Fail closed on any mismatch even if productRecs contains a plausible
 // similarly named coffee. Never recursively search the state for products.
 if(props?.slug!==undefined&&props.slug!==path[3])return {ok:false,reason:'ambiguous_or_missing_product'};
 if(content?.query?.slug!==path[3]||content?.query?.region!==path[1]||
  content?.query?.lang!==path[2]||selected?.slug?.current!==path[3])
  return {ok:false,reason:'ambiguous_or_missing_product'};
 const name=local(selected?.name);
 if(!name||name.length>180||!/[a-z]/i.test(name))return {ok:false,reason:'ambiguous_or_missing_product'};
 const cleanUrl=new URL(url);cleanUrl.search='';cleanUrl.hash='';
 const source=cleanUrl.href,fields={name},facts=[];
 const add=(field,label,value,path)=>{
  const str=text(value);
  if(!str||str.length>220)return;
  fields[field]=str;
  facts.push({field,label,value:str,source_url:source,source_type:'product_json',
   source_path:path,section:'Exact selected product state'});
 };
 facts.push({label:'Selected product name',field:'name',value:name,source_url:source,
  source_type:'product_json',source_path:'/props/pageProps/conversion/name/eng',
  section:'Exact selected product state'});
 if(url.hostname==='bluebottlecoffee.com'||url.hostname==='www.bluebottlecoffee.com')
  fields.roaster='Blue Bottle Coffee';
 if(local(selected?.flavorProfile))add('tasting_notes','Flavor Profile',
  local(selected.flavorProfile),'/props/pageProps/conversion/flavorProfile/eng');
 const roast=(Array.isArray(selected?.roastLevel)?selected.roastLevel:[]).slice(0,8)
  .map(row=>cleanRoast(row?.label)).filter(Boolean);
 const uniqueRoasts=[...new Set(roast)];
 const processing=(Array.isArray(selected?.processing)?selected.processing:[]).slice(0,8)
  .map(row=>local(row?.description)).filter(Boolean);
 const uniqueProcesses=[...new Set(processing.map(x=>x.toLowerCase()))].map(x=>processing.find(v=>v.toLowerCase()===x));
 const conflicts=[],options={};
 if(uniqueRoasts.length===1)add('roast_level','Roast Level',uniqueRoasts[0],
  '/props/pageProps/conversion/roastLevel/0/label/eng');
 else if(uniqueRoasts.length>1){
  conflicts.push('roast_level');options.roast_level=uniqueRoasts.map(value=>({value,label:'Current product roast'}));
 }
 const processLookup={'washed':'Washed','natural':'Natural','honey':'Honey','anaerobic':'Anaerobic'};
 if(uniqueProcesses.length===1&&processLookup[uniqueProcesses[0].toLowerCase()])
  add('process','Processing',processLookup[uniqueProcesses[0].toLowerCase()],
   '/props/pageProps/conversion/processing/0/description/eng');
 else if(uniqueProcesses.length>1){
  conflicts.push('process');options.process=uniqueProcesses.map(value=>({value,label:'Current processing entry'}));
 }
 return {ok:true,source:'unverified_public_page',fields,available:Object.keys(fields),
  source_facts:facts,...(conflicts.length?{conflicts,conflict_options:options}:{}),
  ...(fields.roast_level?{roast_source:'current_selected_product_roast_label'}:{}),
  note:'Current publicly selected product state; confirm the exact coffee and release.'};
}
