// Deterministic official-product evidence parser. No AI calls, no HTML execution.
// This file is shared by Deno Edge and the Node regression suite.
export function normalizeWords(value) {
 return String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
function decodeHtml(value) {
 return String(value??'').replace(/&#(?:x([0-9a-f]+)|([0-9]+));/gi,(_m,h,d)=>{
  const code=Number.parseInt(h||d,h?16:10);
  return code>0&&code<=0x10ffff?String.fromCodePoint(code):'';
 }).replace(/&(?:amp|quot|apos|lt|gt|nbsp);/gi,v=>({
  '&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' '
 })[v.toLowerCase()]||v);
}
export function officialProductUrl(raw,registeredDomain) {
 if(typeof raw!=='string'||raw.length>4000||!registeredDomain||!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(registeredDomain))return null;
 try {
  const u=new URL(raw);
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||!['',null].includes(u.hash))return null;
  if(![registeredDomain,'www.'+registeredDomain].includes(u.hostname.toLowerCase()))return null;
  if(!/^\/(?:products|product)\/[a-z0-9][a-z0-9._~%+-]*(?:\/)?$/i.test(u.pathname))return null;
  if(u.search.length>600)return null;
  for(const [key,value] of u.searchParams){
   const lower=key.toLowerCase();
   if(!(lower==='variant'||lower==='srsltid'||lower==='gclid'||lower==='fbclid'||
       lower==='msclkid'||/^utm_[a-z0-9_]{1,60}$/.test(lower))||value.length>200)return null;
  }
  return u.toString();
 } catch {return null;}
}
function walkProduct(data,products,limit=0) {
 if(limit>8||!data||typeof data!=='object')return;
 if(Array.isArray(data)){for(const d of data.slice(0,30))walkProduct(d,products,limit+1);return;}
 const types=Array.isArray(data['@type'])?data['@type']:[data['@type']];
 if(types.some(t=>String(t||'').toLowerCase()==='product')&&typeof data.name==='string')
  products.push({name:decodeHtml(data.name),description:decodeHtml(data.description||''),url:typeof data.url==='string'?data.url:null,kind:'jsonld_product',attributes:data.additionalProperty});
 if(Array.isArray(data['@graph']))walkProduct(data['@graph'],products,limit+1);
}
function metas(html) {
 const out={};
 for(const tag of html.match(/<meta\b[^>]{0,1800}>/gi)||[]){
  const attributes={};
  for(const x of tag.matchAll(/([a-z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi))
   attributes[x[1].toLowerCase()]=decodeHtml(x[2]??x[3]);
  const key=(attributes.property||attributes.name||'').toLowerCase();
  if(key==='og:title'||key==='og:type'||key==='description')out[key]=attributes.content||'';
 }
 return out;
}
function uniqueProductHeading(html,sourceUrl,meta){
 // Metadata-poor roasters often publish an obvious product H1 but omit JSON-LD.
 // Use H1 ONLY for an already trusted, exact-host official /products/{slug}
 // source verified by the calling worker (not for arbitrary scraped webpages).
 try{
  const url=new URL(sourceUrl);
  if(!/^\/(?:products|product)\/[a-z0-9][a-z0-9._~%+-]*\/?$/i.test(url.pathname))return null;
 }catch{return null;}
 const headings=[...html.matchAll(/<h1\b[^>]{0,400}>([\s\S]{0,320}?)<\/h1>/gi)]
  .map(x=>({index:x.index,name:decodeHtml(x[1].replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim()}))
  .filter(x=>x.name&&!/^(shop|products?|coffees?|search|home|menu)$/i.test(x.name));
 if(headings.length!==1)return null;
 const heading=headings[0];
 const local=html.slice(heading.index,heading.index+4800);
 const bounded=local.split(/<footer\b|<h[2-4]\b[^>]*>\s*(?:more coffees|related products|you may also like)/i)[0];
 const description=decodeHtml(bounded.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]*>/g,' ').replace(/\s+/g,' ')).slice(0,1000);
 return {name:heading.name,description:description||meta.description||'',url:sourceUrl,
  kind:'official_product_page',attributes:null};
}
function explicitReleaseYears(product){
 const years=new Set(normalizeWords(product.name).match(/\b(?:19|20)\d\d\b/g)||[]);
 // Keep sentence punctuation: "our company started in 2025. Harvest 2024"
 // must not turn a nearby unrelated year into release evidence.
 const description=String(product.description||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/<[^>]*>/g,' ').slice(0,1000);
 const date='(?:19|20)\\d\\d(?:\\s*[/–—-]\\s*(?:(?:19|20)?\\d\\d))?';
 const label='(?:harvest|crop|release|season|selection)';
 const before=new RegExp('\\b'+label+'(?:\\s+year)?(?:\\s+(?:for|of|in|from))?\\s*[:–—-]?\\s*('+date+')\\b','g');
 const after=new RegExp('\\b('+date+')\\s+'+label+'\\b','g');
 for(const pattern of [before,after]){
  for(const match of description.matchAll(pattern)){
   const parts=match[1].match(/\d+/g)||[];
   for(const part of parts)years.add(part.length===2?parts[0].slice(0,2)+part:part);
  }
 }
 return [...years];
}
function hasReleaseProof(entered,product){
 if(!entered)return true;
 const value=normalizeWords(entered);
 const snippet=normalizeWords(product.name+' '+product.description.slice(0,1000));
 if(!value)return false;
 const fullLabel=(' '+snippet+' ').includes(' '+value+' ');
 const words=value.split(' '),year=/^(?:19|20)\d\d$/;
 const years=words.filter(word=>year.test(word));
 // A year may establish a plain harvest label, but never an unproved lot,
 // batch, or named release that happens to share that year. Such labels
 // require the full identity above; ambiguous evidence stays Pending.
 const plainHarvest=words.every(word=>year.test(word)||/^(?:harvest|crop|release|season|year)$/.test(word));
 const provedYears=explicitReleaseYears(product);
 // A bare year is proof only in the product title or explicit harvest/crop/
 // release/selection text. Conflicting release years never auto-promote.
 if(years.length&&provedYears.some(y=>!years.includes(y)))return false;
 if(plainHarvest)return years.length>0&&years.every(y=>provedYears.includes(y));
 // Lot, batch and named releases require the complete literal label.
 return fullLabel;
}
export function productNameMatches(entered,productName) {
 const q=normalizeWords(entered),p=normalizeWords(productName);
 if(q.length<4||!p)return false;
 if(p===q)return true;
 if(!(' '+p+' ').includes(' '+q+' '))return false;
 // Critical qualifiers cannot be silently introduced (including different
 // harvest years or decaf status). Matching Bavyeyi IV in longer official
 // "Burundi | Bavyeyi IV | Bourbon | Natural" remains allowed.
 for(const t of ['decaf','decaffeinated','caffeine free']){
  if((' '+p+' ').includes(' '+t+' ')!==(' '+q+' ').includes(' '+t+' '))return false;
 }
 const qyears=(q.match(/\b(?:19|20)\d\d\b/g)||[]).sort();
 const pyears=(p.match(/\b(?:19|20)\d\d\b/g)||[]).sort();
 if(pyears.length&&JSON.stringify(qyears)!==JSON.stringify(pyears))return false;
 return true;
}
export function extractOfficialEvidence(html,submitted) {
 if(typeof html!=='string'||html.length>950000)return {ok:false,reason:'page_too_large'};
 const products=[];
 for(const [,attrs,payload] of html.matchAll(/<script\b([^>]{0,1000})>([\s\S]*?)<\/script\s*>/gi)){
  if(!/\btype\s*=\s*["']application\/ld\+json["']/i.test(attrs)||payload.length>180000)continue;
  try{walkProduct(JSON.parse(payload),products);}catch{ /* Broken source markup never becomes approval evidence. */ }
 }
 const meta=metas(html);
 if(/^product(?:\.|$)/i.test(meta['og:type']||'')&&meta['og:title']){
  products.push({name:meta['og:title'],description:meta.description||'',url:null,kind:'official_product_page',attributes:null});
 }
 // Accept a single exact official product heading only when structured metadata
 // is absent. Never let a weak H1 override contradictory JSON-LD/OG products.
 if(!products.length&&submitted.source_url){
  const heading=uniqueProductHeading(html,submitted.source_url,meta);
  if(heading)products.push(heading);
 }
 const matching=products.filter(p=>productNameMatches(submitted.name,p.name));
 // Choose evidence strength before release checks. Weak same-title OG metadata
 // must not bypass a contradictory or unproved structured Product release.
 const strong=matching.filter(x=>x.kind==='jsonld_product');
 const candidates=strong.length?strong:matching;
 if(candidates.length!==1)return {ok:false,reason:candidates.length?'ambiguous_product':'product_title_not_verified'};
 const chosen=candidates[0];
 if(!hasReleaseProof(submitted.release_label,chosen))return {ok:false,reason:'product_title_not_verified'};
 if(chosen.url&&submitted.source_url){
  try{
   const declared=new URL(submitted.source_url),linked=new URL(chosen.url,declared.origin);
   if(linked.hostname!==declared.hostname&&linked.hostname!=='www.'+declared.hostname&&declared.hostname!=='www.'+linked.hostname)
    return {ok:false,reason:'structured_product_url_mismatch'};
   if(linked.pathname.replace(/\/$/,'')!==declared.pathname.replace(/\/$/,''))
    return {ok:false,reason:'structured_product_url_mismatch'};
  }catch{return {ok:false,reason:'invalid_product_url'};}
 }
 let officialProcess='';
 if(Array.isArray(chosen.attributes)){
  for(const row of chosen.attributes){
   if(String(row?.name||'').toLowerCase()==='process') officialProcess=String(row?.value||'');
  }
 }
 const expected=normalizeWords(submitted.process||''),actual=normalizeWords(officialProcess);
 const incompatibleProcess=Boolean(expected&&actual&&expected!==actual);
 if(incompatibleProcess)return {ok:false,reason:'process_conflict'};
 const release=String(submitted.release_label||'').trim();
 return {
  ok:true,
  evidence_kind:chosen.kind,
  product_name:chosen.name.slice(0,250),
  title_matches:true,
  release_label:release||null,
  contradictory_facts:false,
  verified_fields:{name:chosen.name.slice(0,200),...(actual?{process:officialProcess.slice(0,100)}:{})},
  evidence_excerpt:'Official product metadata: '+chosen.name.slice(0,160)
 };
}
