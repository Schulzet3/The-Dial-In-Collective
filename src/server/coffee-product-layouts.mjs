// Bounded, evidence-only extraction for coffee-specific storefront layouts.
// Representative source patterns: Proud Mary, Queen City Collective, Onyx,
// PERC, SEY, The Picky Chemist, Black & White, Little Wolf and Heart.
// This is a parser, not a roaster-specific source-verification allowlist.
// Never infer roast tier from an Agtron reading, roaster brand, hue or taste.
const leaf=/<(h[2-6]|p|div|span|strong|small|label|dt|dd|li|b)\b[^>]{0,420}>([^<>]{1,400})<\/\1\s*>/gi;
const allowedExtra=new Set(['agtron','recommended_rest','drying_method','harvest_season','preferred_extraction','processing_detail','production_roaster']);
const aliases=new Map(Object.entries({
 'Tasting Notes':'tasting_notes','Taste Notes':'tasting_notes','Cup Notes':'tasting_notes',
 'Reminds Us Of':'tasting_notes','Notes':'tasting_notes',
 'Process':'process','Process Method':'process','Processing Method':'process',
 'Processing':'process','Traitement':'process','Treatment':'process',
 'Origin':'origin','Country':'origin','Region':'origin','Région':'origin','Location':'origin',
 'Elevation':'elevation_m','Altitude':'elevation_m','Altitude Masl':'elevation_m',
 'Variety':'variety','Varietal':'variety','Varieties':'variety','Variété':'variety',
 'Producer':'producer','Producteur':'producer','Farm':'producer','Farmer':'producer',
 'Farm Co-op':'producer','Farm / Co-op':'producer','Washing Station':'producer',
 'Harvest':'release_label','Harvest Year':'release_label','Crop Year':'release_label',
 'Release':'release_label','Lot':'release_label',
 'Roast Level':'roast_level','Roast':'roast_level','Roast Profile':'roast_level',
 'Roast Color':'agtron','Agtron':'agtron','Ground Agtron':'agtron',
 'Best Rested':'recommended_rest','Recommended Rest':'recommended_rest',
 'Drying Method':'drying_method','Harvest Season':'harvest_season',
 'Preferred Extraction':'preferred_extraction','Production Roaster':'production_roaster',
 'Process Detail':'processing_detail'
 }).map(([key,value])=>[key.replace(/[\p{M}]/gu,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''),value]));
const getKey=str=>aliases.get(String(str||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''));
const isInfoText=s=>s.length>=2&&s.length<=240&&!/^(?:add to cart|shop|read more|next|size|quantity|subscribe|search|all coffee|more coffees|customer reviews|related products|regular price)$/i.test(s);
const cleanValue=(s,clean,max=230)=>clean(s,max).replace(/^\s*[:\-|–]\s*/,'').trim();
const normalizedProcess=s=>{
 const lower=s.toLowerCase();
 const flags=[
  ['Washed',/\bwashed\b|\blavado\b/i],
  ['Natural',/\bnatural(?:[\s-]processed)?\b/i],
  ['Honey',/\bhoney\b/i],
  ['Anaerobic',/\banaerobic\b/i]
 ].filter(([,regex])=>regex.test(lower));
 return flags.length===1?flags[0][0]:'';
};
function addExtra(extras,kind,value){
 if(!allowedExtra.has(kind)||extras[kind]||!value)return;
 extras[kind]=value;
}
function field(fields,label,value,add,extras,clean){
 const kind=getKey(label),raw=cleanValue(value,clean,260);
 if(!kind||!isInfoText(raw))return;
 // An adjacent coffee story is never a producer/variety/origin name.
 if(['producer','variety','origin','release_label'].includes(kind)&&
   (/[.!?]\s*$/.test(raw)||raw.split(/\s+/).length>17))return;
 if(kind==='variety'&&/\b(?:masl|meters?|agtron)\b/i.test(raw))return;
 if(kind==='agtron'){
  const x=raw.match(/(?:\b(?:agtron)\s*#?\s*(\d{1,3}(?:\.\d{1,2})?)\b|\b(\d{1,3}(?:\.\d{1,2})?)\s*(?:agtron)\b)/i);
  if(x)addExtra(extras,'agtron',x[1]||x[2]);
  return;
 }
 if(kind==='recommended_rest'){
  const m=raw.match(/\b(\d{1,3})\s*[-–]\s*(\d{1,3})\s*days?\b|\b(\d{1,3})\s*days?\b/i);
  if(m)addExtra(extras,kind,m[1]?m[1]+'–'+m[2]+' days':m[3]+' days');
  return;
 }
 if(kind==='harvest_season'||kind==='drying_method'||kind==='preferred_extraction'||kind==='production_roaster'){
  addExtra(extras,kind,raw.slice(0,105));return;
 }
 if(kind==='processing_detail'){addExtra(extras,kind,raw.slice(0,160));return;}
 // Processing can be an elaborate treatment with multiple stages:
 // the single-select field must never misrepresent a blended process.
 if(kind==='process'){
  const value=normalizedProcess(raw);
  if(value)add(kind,value);
  if(raw.length<=90&&raw.toLowerCase()!==value.toLowerCase())
    addExtra(extras,'processing_detail',raw.slice(0,160));
  return;
 }
 // Long narrative process paragraphs, roaster navigation or unrelated SEO
 // must not become a numeric/identity field via a generic label.
 if(raw.length>175&&kind!=='tasting_notes')return;
 if(kind==='elevation_m'&&!/\b\d{3,4}\b/.test(raw))return;
 if(kind==='roast_level')add(kind,raw);
 else add(kind,raw);
}
function parsePairs(tokens,fields,add,extras,clean){
 // Onyx-style all-caps DIV captions follow their metric values. Other sites
 // (Proud Mary, PERC and SEY) put labels BEFORE values. Establish layout
 // direction first, instead of mistaking the previous field's value for
 // the next field's value.
 const reverseLayout=tokens.filter((t,i)=>i>0&&t.tag==='div'&&
  tokens[i-1].tag==='div'&&getKey(t.text)&&
  /^[A-Z][A-Z ]{3,}$/.test(t.text)).length>=2;
 // First trust value-then-metric layouts (Onyx). A subsequent unrelated
 // metric must never overwrite an earlier explicit reverse-layout value.
 // Preserve exact category evidence without relying on numeric roast color.
 for(let i=1;i<tokens.length;i++){
  if(!reverseLayout)break;
  const label=tokens[i],kind=getKey(label.text);
  if(!kind||!['roast_level','origin','variety','process','elevation_m','agtron','drying_method','harvest_season','preferred_extraction'].includes(kind))continue;
  const prior=tokens[i-1];
  if(label.at-prior.end>260||getKey(prior.text)||!isInfoText(prior.text))continue;
  if(kind==='roast_level'&&!/^(Ultra Light|Very Light|Light|Light-Medium|Medium.Light|Medium|Medium-Dark|Dark)$/i.test(prior.text))continue;
  if(kind==='elevation_m'&&!/\b\d{3,4}\b/.test(prior.text))continue;
  if(kind==='variety'&&/\b(?:masl|meters?|agtron)\b/i.test(prior.text))continue;
  field(fields,label.text,prior.text,add,extras,clean);
 }
 // Also support heading-then-value sections (PERC and SEY), but never
 // convert unlabeled Light/Medium spectrum endpoints into a roast choice.
 for(let i=0;i<tokens.length;i++){
  const tok=tokens[i],kind=getKey(tok.text);
  if(!kind)continue;
  if(reverseLayout&&tok.tag==='div'&&/^[A-Z][A-Z ]{3,}$/.test(tok.text))continue;
  for(let j=i+1;j<Math.min(i+5,tokens.length);j++){
   const next=tokens[j];
   if(next.at-tok.end>650)break;
   if(getKey(next.text))break;
   if(!isInfoText(next.text))continue;
   // Skip decorative SVG and empty layout blocks; do not combine values.
   if(next.text.length>190 && kind!=='tasting_notes')break;
   if(kind==='roast_level'){
    const labels=tokens.slice(i+1,i+6).filter(x=>
     /^(?:Ultra Light|Very Light|Light|Light-Medium|Medium.Light|Medium|Medium-Dark|Dark)$/i.test(x.text));
    if(labels.length!==1)break;
   }
   if(kind==='variety'&&/\b(?:masl|meters?|agtron)\b/i.test(next.text))break;
   field(fields,tok.text,next.text,add,extras,clean);
   break;
  }
 }

}
function selectedMarkup(html){
 const s=String(html||'').replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,' ')
  .replace(/<nav\b[^>]*>[\s\S]*?<\/nav\s*>/gi,' ')
  .replace(/<footer\b[^>]*>[\s\S]*?<\/footer\s*>/gi,' ');
 // Limit scanning to visible product-region markup. Preserve specification
 // blocks above the first product title (Proud Mary), but exclude related items.
 const start=Math.max(0,s.search(/<main\b|<article\b[^>]*\bproduct\b|<h1\b/i));
 let portion=s.slice(start,start+60000);
 const end=portion.search(/<h[2-5][^>]*>\s*(?:you may also like|related products|more coffees|customer reviews|recently viewed)\b/i);
 if(end>400)portion=portion.slice(0,end);
 return portion;
}
export function extractLayoutEvidence(html,{fields,addField,clean}){
 const extras={},page=selectedMarkup(html);
 const onyxMetric=/<div\b[^>]*class=["'][^"']*a-stat[^"']*["'][^>]*data-name=["']roast-level["']/i.test(html);
 if(onyxMetric){
  // Onyx publishes many general education sections on the product URL.
  // The actual coffee has named a-stat fields. Only read those source
  // blocks, never a distant paragraph titled "Producer"/"Extraction".
  for(const m of html.matchAll(/<div\b[^>]*class=["'][^"']*a-stat[^"']*["'][^>]*data-name=["'](roast-level|variety|process-method|elevation|origin|harvest-season|method|country|season|ferment|roaster)["'][\s\S]{0,2900}?<p\b[^>]*>([\s\S]{1,650}?)<\/p>/gi)){
   const kind=m[1],p=m[2],label=(p.match(/<label\b[^>]*>([^<>]{2,75})<\/label>/i)||[])[1];
   if(!label)continue;
   const value=p.split(/<br\s*\/?\s*>/i)[0];
   field(fields,clean(label,80),value,addField,extras,clean);
   if(kind==='roast-level'){
    const num=(p.match(/\bAgtron\s*#?\s*(\d{1,3}(?:\.\d{1,2})?)/i)||[])[1];
    if(num)addExtra(extras,'agtron',num);
   }
  }
  return extras;
 }
 // Proud Mary renders certain product attributes with the value inside an
 // <a> rather than a <p>. Read text only; never follow javascript: hrefs.
 for(const block of page.matchAll(/<div\b[^>]*class=["'][^"']*meta-info[^"']*["'][^>]*>([\s\S]{0,1150}?)<\/div>/gi)){
  const m=block[1].match(/<p\b[^>]*class=["'][^"']*meta-title[^"']*["'][^>]*>([^<>]{2,90})<\/p>[\s\S]{0,380}?<(?:a|p)\b[^>]*>([^<>]{1,220})<\/(?:a|p)>/i);
  if(m)field(fields,clean(m[1],80),m[2],addField,extras,clean);
 }
 // PERC Shopify layouts render headings and values several nested elements
 // apart; no arbitrary cross-heading pairing is allowed.
 for(const m of html.matchAll(/<h2\b[^>]*>([\s\S]{1,85}?)<\/h2>((?:(?!<h2\b)[\s\S]){0,5200}?)<h6\b[^>]*>([^<>]{2,190})<\/h6>/gi)){
  const label=clean(m[1],75);
  if(getKey(label))field(fields,label,m[3],addField,extras,clean);
 }
 // Onyx uses a named product metric followed by a <label> inside the same
 // compact <p>, e.g. "Ultra Light<br>Agtron #133<br><label>ROAST LEVEL".
 // Only the explicit selected value counts, not Agtron inferred darkness.
 for(const m of html.matchAll(/<div\b[^>]*class=["'][^"']*a-stat[^"']*["'][^>]*data-name=["'](?:roast-level|variety|process-method|elevation|origin|harvest-season)["'][\s\S]{0,2900}?<p\b[^>]*>([\s\S]{1,650}?)<\/p>/gi)){
  const label=(m[1].match(/<label\b[^>]*>([^<>]{2,75})<\/label>/i)||[])[1];
  if(!label)continue;
  const first=m[1].split(/<br\s*\/?\s*>/i)[0];
  field(fields,clean(label,80),first,addField,extras,clean);
  const agtron=(m[1].match(/\bAgtron\s*#?\s*(\d{1,3}(?:\.\d{1,2})?)/i)||[])[1];
  if(agtron)addExtra(extras,'agtron',agtron);
 }
 // SEY encodes process in a release-specific product title component:
 // ETHIOPIAN LANDRACE - WASHED, never as a generic roast/brand heuristic.
 const sey=(html.match(/<span\b[^>]*class=["'][^"']*coffeeTitle_varietyProcess[^"']*["'][^>]*>([^<>]{3,140})<\/span>/i)||[])[1];
 if(sey){
  const m=clean(sey,140).match(/\s[-–]\s(Washed|Natural|Honey|Anaerobic)\s*$/i);
  if(m&&!fields.process)addField('process',m[1]);
 }
 const tokens=[...page.matchAll(leaf)].slice(0,850).map(m=>({
  at:m.index,end:m.index+m[0].length,tag:m[1].toLowerCase(),text:clean(m[2],260)
 })).filter(m=>m.text);
 parsePairs(tokens,fields,addField,extras,clean);
 // Explicit inline paragraph style, including French and pipe-delimited specs.
 for(const t of tokens){
  const p=t.text.match(/^([\p{L}][\p{L} &/'-]{1,36})\s*(?:[:：|]|\s+[-–]\s+)\s*(.{2,240})$/u);
  if(p)field(fields,p[1],p[2],addField,extras,clean);
 }
 // Some roasters put the label and value into a single flat text node or
 // nested rich-text wrapper that leaf tokenization cannot match.
 const visible=page.replace(/<[^>]*>/g,'\n');
 const rows=visible.split(/\n/).map(x=>clean(x,280)).filter(Boolean).slice(0,450);
 for(const r of rows){
  const p=r.match(/^([\p{L}][\p{L} &/'-]{1,36})\s*(?:[:：|]|\s+[-–]\s+)\s*(.{2,230})$/u);
  if(p)field(fields,p[1],p[2],addField,extras,clean);
 }
 // Queen City product descriptions use two adjacent explicit facts:
 // "Natural-processed heirloom varietals // 2170 masl". Never infer
 // process from marketing copy; only this clearly delimited specification.
 for(const r of rows){
  const match=r.match(/^((?:fully\s+)?(?:washed|natural|honey|anaerobic)(?:-processed)?\s+[\w -]{2,85})\s*\/\/\s*(\d[\d,]*(?:\+)?\s*(?:masl|m))$/i);
  if(match){
   if(!fields.process){
    const p=normalizedProcess(match[1]);if(p)addField('process',p);
   }
   if(!fields.elevation_m)addField('elevation_m',match[2]);
   const varietal=match[1].match(/\b(heirloom|landrace|field blend)\s+varietals?\b/i);
   if(varietal&&!fields.variety)addField('variety',varietal[1]);
  }
 }
 // Only when the product title itself ends in an explicit processing tag,
 // use that value as a fallback; "Ultra Light" is NEVER inferred from title
 // brand, flavor notes or an unlabeled chart.
 if(!fields.process){
  const h1=page.match(/<h1\b[^>]*>([\s\S]{0,440}?)<\/h1>/i);
  const title=h1?clean(h1[1],250):'';
  const m=title.match(/(?:\s[-|]\s|\s\/\/\s)(Washed|Natural|Honey|Anaerobic)\s*$/i);
  if(m)addField('process',m[1]);
 }
 // Queen City-style "Banko Gotiti CWS // Gedeb, ... Ethiopia" is a
 // discrete country/locality specification; never concatenate other products.
 if(!fields.origin){
  for(const r of rows){
   const m=r.match(/^.{3,65}\s+\/\/\s+([A-Za-zÀ-ÿ' -]{3,55}(?:,\s*[A-Za-zÀ-ÿ' -]{3,50}){1,4})$/);
   if(m&&!/^(?:more|other)\s+coffees?\b/i.test(m[1])){addField('origin',m[1]);break;}
  }
 }
 // "In the cup we find ..." is explicit tasting prose. Strip punctuation
 // after one short sentence; do not turn the whole page into tasting notes.
 if(!fields.tasting_notes){
  const txt=page.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,17000);
  const m=txt.match(/\b(?:in the cup we find|notes of)\s+([A-Za-zÀ-ÿ][^.!?;]{8,130})[.!?;]/i);
  if(m&&/\b(?:and|,)\b/i.test(m[1]))addField('tasting_notes',m[1].trim());
 }
 return extras;
}
