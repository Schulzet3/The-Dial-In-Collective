// Review-only published evidence. Unknown labels and full product descriptions
// survive extraction without becoming canonical coffee fields or instructions.
// No model, OCR service, browser execution, additional fetch, or API key is used.
import {removeElements,removeComments} from '../../supabase/functions/_shared/html-scan.mjs';
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
import {coffeeFieldKey,extractSemanticCoffeeSpecs} from './coffee-semantic-specs.mjs';
import {coffeeHtmlAttributes,productMarkup} from './coffee-product-scope.mjs';
import {isRecurringCoffeeHarvestWindow,isGenericCoffeeLotLabel} from '../../supabase/functions/_shared/coffee-release-label.mjs';
import {collectSupplementaryStructuredCoffeeFacts} from './coffee-supplementary-source-evidence.mjs';

export const MAX_SOURCE_FACTS=384;
export const MAX_SOURCE_FACT_CHARACTERS=192_000;
export const MAX_SOURCE_FACT_PARTS=128;
const MAX_VALUE=1600,MAX_LABEL=100,MAX_PURCHASE_VARIANTS=128;
const MAX_SOURCE_FACT_CANDIDATES=MAX_SOURCE_FACTS*2;
const STRUCTURED_FORMATS=new Set(['json','projection','reference']);
const BLOCKED=new Set(['script','style','nav','footer','header','aside','template','noscript','svg','canvas','button','select','option','textarea','iframe']);
const CONTENT=new Set(['p','li','dt','dd','th','td','div','span','strong','b','em','label','small','h2','h3','h4','h5','h6','summary']);
const LATIN=Object.fromEntries('aacute:á agrave:à acirc:â atilde:ã auml:ä aring:å aelig:æ ccedil:ç eacute:é egrave:è ecirc:ê euml:ë iacute:í igrave:ì icirc:î iuml:ï ntilde:ñ oacute:ó ograve:ò ocirc:ô otilde:õ ouml:ö oslash:ø oelig:œ uacute:ú ugrave:ù ucirc:û uuml:ü yacute:ý yuml:ÿ szlig:ß'.split(' ').map(pair=>pair.split(':')));
const ENTITIES={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ',ndash:'–',mdash:'—',bull:'•',bullet:'•',rsquo:'’',lsquo:'‘',deg:'°',times:'×',plusmn:'±',euro:'€',pound:'£',hellip:'…'};
const normalized=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
// Each exported fragment must itself be valid Unicode, even before the
// consumer rejoins a structured value. UTF-16 offsets can bisect an emoji.
function codePointEnd(value,end){
 if(end>0&&end<value.length&&/[\uD800-\uDBFF]/.test(value[end-1])&&/[\uDC00-\uDFFF]/.test(value[end]))return end-1;
 return end;
}
const prefix=(value,end)=>value.slice(0,codePointEnd(value,end));
function withoutTags(html){
 const chunks=[],tag=/<\/?[a-z][a-z0-9:-]*(?=[\s/>])|<!doctype\b/gi;let cursor=0,match;
 while((match=tag.exec(html))){
  const start=match.index;let end=tag.lastIndex,quote='';
  for(;end<html.length;end++){
   const char=html[end];
   if(quote){if(char===quote)quote='';}
   else if(char==='"'||char==="'")quote=char;
   else if(char==='>')break;
   else if(char==='<')break;
  }
  chunks.push(html.slice(cursor,start),' ');
  // A fully quoted attribute may contain arbitrarily long product JSON or
  // angle brackets. It is markup, never published body text. Unterminated
  // quoted markup is withheld; the structural caller reports truncation.
  if(end>=html.length)return chunks.join('');
  cursor=html[end]==='>'?end+1:end;tag.lastIndex=cursor;
 }
 chunks.push(html.slice(cursor));return chunks.join('');
}
function decoded(value){
 return String(value??'').replace(/&(#x[0-9a-f]{1,8}|#[0-9]{1,8}|[a-z]{1,24});/gi,(whole,key)=>{
  const lower=key.toLowerCase();
  if(Object.hasOwn(ENTITIES,lower))return ENTITIES[lower];
  if(Object.hasOwn(LATIN,lower))return key[0]===key[0].toUpperCase()?LATIN[lower].toUpperCase():LATIN[lower];
  if(lower[0]==='#'){
   const hex=lower[1]==='x',point=Number.parseInt(lower.slice(hex?2:1),hex?16:10);
   if(point>0&&point<=0x10ffff&&!(point>=0xd800&&point<=0xdfff))return String.fromCodePoint(point);
  }
  return whole;
 });
}
function plain(value,max=64_000){
 if(typeof value!=='string'&&typeof value!=='number')return '';
 return prefix(decoded(withoutTags(removeElements(removeComments(String(value)),['script','style','svg','iframe']))
  .replace(/[\u0000-\u001f\u007f]/g,' '))
  .replace(/\s+/g,' ').trim(),max);
}
function scalar(value,depth=0,onTruncate=()=>{}){
 if(depth>4){if(value!=null)onTruncate();return '';}
 if(typeof value==='string'||typeof value==='number'){
  const text=plain(value,MAX_SOURCE_FACT_CHARACTERS+2);
  if(text.length>MAX_SOURCE_FACT_CHARACTERS)onTruncate();
  return prefix(text,MAX_SOURCE_FACT_CHARACTERS);
 }
 if(typeof value==='boolean')return value?'Yes':'No';
 if(Array.isArray(value)){
  if(value.length>128)onTruncate();
  const text=value.slice(0,128).map(item=>scalar(item,depth+1,onTruncate)).filter(Boolean).join(', ');
  if(text.length>MAX_SOURCE_FACT_CHARACTERS)onTruncate();
  return prefix(text,MAX_SOURCE_FACT_CHARACTERS);
 }
 if(value&&typeof value==='object'){
  const primary=scalar(value.name??value.value??value.text??'',depth+1,onTruncate);
  const unit=scalar(value.unitText??value.unitCode??'',depth+1,onTruncate);
  return primary+(primary&&unit?' '+({GRM:'g',KGM:'kg',LBR:'lb',ONZ:'oz'}[unit]||unit):'');
 }
 return '';
}
function evidencePriority(item){
 // Keep conflicts and labeled specifications reviewable, then complete public
 // endpoint objects and primary product prose. Educational popovers and
 // repeated paragraph copies must not consume the entire bounded preview.
 if(item?.conflicting===true)return 0;
 if(/^Supplementary page panel(?: \/|$)/.test(item?.section||''))return 8;
 if(item?.section==='Published page metadata')return 3.5;
 if(item?.section==='Roaster general coffee guidance')return 3.75;
 let endpoint=false;
 if(STRUCTURED_FORMATS.has(item?.format))try{
  const url=new URL(item.source_url);endpoint=/\.(?:js|json)$/.test(url.pathname)||url.pathname.includes('/wp-json/wc/store/');
 }catch{}
 if(item?.format==='projection')return item.source_locator||endpoint?1.5:4.5;
 if(item?.format==='json'||item?.format==='reference'){
  if(/^\/(?:images?|media|video)(?:\/|$)/.test(item.source_path||'')||/\/(?:gallery_images_html|woosb_image)$/.test(item.source_path||''))return 7;
  if(endpoint&&/^\/(?:price(?:_min|_max|_varies)?|compare_at_price(?:_min|_max)?|currency|priceCurrency|available|is_in_stock|prices|options|attributes|selling_plan_groups|requires_selling_plan|quantity_rule|quantity_price_breaks)$/.test(item.source_path||''))return 1.25;
  if(item.source_locator)return 2;
  if(endpoint)return 2;
  // The literal shared child completes its original parent. Additional
  // destination references follow the cores and other original page JSON,
  // so completing more parents cannot evict their source-supported fields.
  if(/^\/hasVariant\/(?:0|[1-9][0-9]{0,2})\/[A-Za-z0-9_.-]{1,80}$/.test(item.source_path||''))return item.format==='reference'?5.25:4.4;
  return 5;
 }
 if(/^Published primary product text(?: \(continued \d+\))?$/.test(item?.label||''))return 0.5;
 if(/^Published product text(?: \(continued \d+\))?$/.test(item?.label||''))return item?.section==='Complete page scope'?4:0.5;
 if(/^Product (?:text \d+|description|summary)(?: \(continued \d+\))?$/.test(item?.label||''))return 6;
 if(/^Product image (?:description|title)(?: \(continued \d+\))?$/.test(item?.label||''))return 6;
 // These generated summaries repeat data already retained at exact typed
 // purchase pointers. Do not let dozens of summaries displace variant IDs,
 // SKUs, prices, option associations or subscription/quantity records.
 if(/^Purchase option: /.test(item?.label||''))return 5.5;
 return 1;
}
function flag(array,truncated){
 Object.defineProperty(array,'truncated',{value:!!truncated,enumerable:false});
 return array;
}
function sourceUrl(value){
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&value.length<=3000?url.toString():undefined;}catch{return undefined;}
}
function groupedReferencePaths(fact,target){
 if(!Object.hasOwn(target,'destinations'))return Object.keys(target).length===1?[fact.source_path]:null;
 if(Object.keys(target).length!==2||!Array.isArray(target.destinations)||target.destinations.length<2||
  target.destinations.length>MAX_PURCHASE_VARIANTS||target.destinations[0]!==fact.source_path||
  new Set(target.destinations).size!==target.destinations.length)return null;
 // A compact reference is an explicit list of original child pointers, not
 // a wildcard or permission to infer missing rows. Keep every destination
 // and target inside the same selected array/form and literal child key.
 const parse=path=>typeof path==='string'?path.match(/^\/(variants\/|hasVariant\/)?(0|[1-9][0-9]{0,2})\/([A-Za-z0-9_.-]{1,80})$/):null;
 const origin=parse(target.source_path);
 if(!origin||Number(origin[2])>=MAX_PURCHASE_VARIANTS)return null;
 for(const path of target.destinations){
  const item=parse(path);
  if(!item||Number(item[2])>=MAX_PURCHASE_VARIANTS||item[1]!==origin[1]||item[3]!==origin[3]||path===target.source_path)return null;
 }
 return target.destinations;
}
function purchaseSummary(variant){
 if(!variant||typeof variant!=='object'||Array.isArray(variant))return null;
 const title=scalar(variant.title)||scalar(variant.name)||'Product option',details=[];
 if(variant.price!=null)details.push('price '+scalar(variant.price)+(typeof variant.price==='number'?' (currency minor units)':''));
 if(variant.weight!=null&&variant.weight>0)details.push('shipping weight '+scalar(variant.weight)+' '+(scalar(variant.weight_unit)||(typeof variant.price==='number'?'g (Shopify)':'(source unit not specified)')));
 else if(variant.grams!=null&&variant.grams>0)details.push('shipping weight '+scalar(variant.grams)+' g');
 if(typeof variant.available==='boolean')details.push(variant.available?'available':'unavailable');
 if(!details.length)return null;
 // The title is published data; only the surrounding summary label is
 // generated. Keep a long title in the value instead of rejecting the
 // whole summary at the label bound. Typed variant records remain exact.
 return 'Purchase option: '.length+title.length<=MAX_LABEL?
  {label:'Purchase option: '+title,value:details.join('; ')}:
  {label:'Purchase option: Published variant',value:'title '+title+'; '+details.join('; ')};
}
function completeJsonChunks(chunks){
 const ordered=chunks.toSorted((a,b)=>a.part-b.part);
 if(!ordered.length||ordered.some((chunk,i)=>chunk.part!==i))return null;
 try{return {value:JSON.parse(ordered.map(chunk=>chunk.value).join('')),ordered};}catch{return null;}
}
function generatedProjectionLabel(fact){
 if(fact.format!=='projection'||!Number.isSafeInteger(fact.part)||fact.part<0||fact.part>=MAX_SOURCE_FACT_PARTS)return '';
 if(fact.field||fact.conflicting||fact.section&&fact.section!=='Selected product form: data-product_variations')return '';
 const match=(fact.source_path||'').match(/^\/(variants\/|hasVariant\/)?(0|[1-9][0-9]{0,2})$/);
 if(!match||Number(match[2])>=MAX_PURCHASE_VARIANTS||(!match[1]&&!fact.source_locator))return '';
 const start='Purchase variant '+(Number(match[2])+1),end=fact.part?' (continued '+(fact.part+1)+')':'';
 const compact='Fields for #'+(Number(match[2])+1)+end;
 return [start+' public fields'+end,start+' fields'+end,'Variant '+(Number(match[2])+1)+' fields'+end,compact].includes(fact.label)?compact:'';
}
const originalImageCaption=fact=>!fact.format&&fact.section==='Published image caption'&&
 ['Product image description','Product image title'].includes(fact.label);
function completeBoundedSourceFacts(out,omitted,characters,restoreSources){
 const key=fact=>[fact.source_url||'',fact.source_locator||'',fact.source_path||''].join('\0');
 const cost=fact=>['label','value','section','source_path','source_locator'].reduce((n,k)=>n+(fact[k]?.length||0),0);
 const existing=new Set(out),groups=new Map(),redundant=new Set(),summaryProofs=new Set();
 for(const fact of [...out,...omitted])if(['json','projection'].includes(fact.format)&&fact.source_url&&fact.source_path){
  const id=key(fact),group=groups.get(id)||[];group.push(fact);groups.set(id,group);
 }
 // Every summarized value must survive in a complete retained JSON record
 // or exact-property projection at the same variant pointer and source.
 // A projection need not contain unrelated fields, but missing summary
 // properties, mixed chunks, other URLs/forms or values cannot be proof.
 for(const chunks of groups.values()){
  const first=chunks[0];
  if(!/^\/variants\/(?:0|[1-9][0-9]{0,2})$/.test(first.source_path)||first.source_locator||
   chunks.some(f=>!existing.has(f)||f.format!==first.format||f.source_type!==first.source_type))continue;
  const complete=completeJsonChunks(chunks),summary=complete&&purchaseSummary(complete.value);
  if(!summary)continue;
  summaryProofs.add([first.source_url,first.source_type,summary.label,summary.value].join('\0'));
 }
 const summaryKeys=new Set(['label','value','source_type','source_url','supporting_sources']);
 for(const fact of out)if(Object.keys(fact).every(key=>summaryKeys.has(key))&&/^Purchase option: /.test(fact.label)){
  // Canonical associations, conflicts, pointers, parts and other metadata
  // are independent evidence even when the visible summary text matches.
  const sources=[{source_url:fact.source_url,source_type:fact.source_type},...(fact.supporting_sources||[])];
  // A deduplicated summary may support several observed URLs. Every one
  // needs its own exact typed proof; one source cannot lend attribution.
  if(sources.every(source=>summaryProofs.has([source.source_url,source.source_type,fact.label,fact.value].join('\0'))))redundant.add(fact);
 }
 const restore=missing=>{
  const extra=missing.reduce((n,f)=>n+cost(f),0),removable=out.filter(f=>redundant.has(f)).reverse();
  const remove=[],compact=[];let removedCharacters=0,savedCharacters=0;
  const fits=()=>out.length-remove.length+missing.length<=MAX_SOURCE_FACTS&&characters-removedCharacters-savedCharacters+extra<=MAX_SOURCE_FACT_CHARACTERS;
  for(const fact of removable){if(fits())break;remove.push(fact);removedCharacters+=cost(fact);}
  // Under character pressure only, the generated label can name the fields
  // and index briefly: the exact variant pointer and projection format keep
  // the object role. Compact no source-authored label or unique fact.
  if(out.length-remove.length+missing.length<=MAX_SOURCE_FACTS)for(const fact of out){
   if(fits())break;
   const label=generatedProjectionLabel(fact);
   if(label&&label!==fact.label){compact.push({fact,label});savedCharacters+=fact.label.length-label.length;}
  }
  if(!fits())return false;
  for(const fact of remove){out.splice(out.indexOf(fact),1);redundant.delete(fact);existing.delete(fact);}
  for(const {fact,label} of compact)fact.label=label;
  out.push(...missing);for(const fact of missing){existing.add(fact);restoreSources(fact);}
  characters+=extra-removedCharacters-savedCharacters;
  return true;
 };
 // Complete original JSON groups and selected-product root properties or
 // direct children of retained projections before redundant summaries.
 // Evidence keeps its own URL/pointer; only already-proven redundancy frees
 // space. Do not promote new variant cores or remove unique source facts.
 const pending=[];
 for(const chunks of groups.values()){
  const first=chunks[0],missing=chunks.filter(f=>!existing.has(f));
  if(!missing.length||chunks.some(f=>f.format!=='json')||!completeJsonChunks(chunks))continue;
  if(missing.length===chunks.length&&!/^\/[A-Za-z_][A-Za-z0-9_.-]{0,79}$/.test(first.source_path)){
   const slash=first.source_path.lastIndexOf('/'),parentPath=first.source_path.slice(0,slash),child=first.source_path.slice(slash+1);
   const parent=groups.get([first.source_url,first.source_locator||'',parentPath].join('\0'))||[];
   const complete=parent.length&&parent.every(f=>f.format==='projection'&&existing.has(f))&&completeJsonChunks(parent);
   if(!complete||!complete.value||typeof complete.value!=='object'||Array.isArray(complete.value)||Object.hasOwn(complete.value,child))continue;
  }
  pending.push({facts:missing,priority:evidencePriority(first)});
 }
 // Keep an original image-caption role when exact purchase evidence has
 // made its generated summary redundant. Retained prose wording alone
 // does not preserve that separate attribution.
 for(const fact of omitted)if(originalImageCaption(fact)&&!existing.has(fact))pending.push({facts:[fact],priority:evidencePriority(fact)});
 // The same evidence ordering governs reclaimed capacity: an original
 // caption must not lose its role to a lower-priority gallery completion.
 for(const item of pending.sort((a,b)=>a.priority-b.priority))restore(item.facts);
 return characters;
}
export function mergeCoffeeSourceFacts(...arrays){
 const out=[],omitted=[],omittedBySignature=new Map(),omittedSources=new Map(),seen=new Map();let characters=0,supportingCharacters=0,truncated=false;
 const type=value=>/^(?:html|product_json|image_text)$/.test(value)?value:'html';
 const rememberSources=(target,item)=>{
  const extra=Array.isArray(item.supporting_sources)?item.supporting_sources:[];
  if(extra.length>3)truncated=true;
  for(const entry of [{source_url:item.source_url,source_type:item.source_type},...extra.slice(0,3)]){
   const url=sourceUrl(entry?.source_url);if(!url)continue;
   const source_type=type(entry.source_type);
   if(!target.source_url){target.source_url=url;target.source_type=source_type;continue;}
   if(target.source_url===url&&target.source_type===source_type)continue;
   const sources=target.supporting_sources||[];
   if(sources.some(row=>row.source_url===url&&row.source_type===source_type))continue;
   // Source links are metadata, with their own aggregate bound. Repeated
   // prose is stored once without discarding observed source attribution.
   if(sources.length>=3||supportingCharacters+url.length+source_type.length>32_000){truncated=true;continue;}
   sources.push({source_url:url,source_type});target.supporting_sources=sources;
   supportingCharacters+=url.length+source_type.length;
  }
 };
 const candidates=[];
 for(const array of arrays){
  if(!Array.isArray(array))continue;
  if(array.truncated)truncated=true;
  if(array.length>MAX_SOURCE_FACT_CANDIDATES)truncated=true;
  candidates.push(...array.slice(0,MAX_SOURCE_FACT_CANDIDATES));
 }
 // Stable ordering preserves original order inside each evidence category.
 candidates.sort((a,b)=>evidencePriority(a)-evidencePriority(b));
 for(const item of candidates){
   if(!item||typeof item!=='object')continue;
   const structured=STRUCTURED_FORMATS.has(item.format);
   if(structured&&item.part!==undefined&&(!Number.isSafeInteger(item.part)||item.part<0||item.part>=MAX_SOURCE_FACT_PARTS)){
    truncated=true;continue;
   }
   const rawLabel=plain(item.label,MAX_LABEL+2),rawValue=structured?
    prefix(String(item.value??'').replace(/[\u0000-\u001f\u007f]/g,' '),MAX_VALUE+2):plain(item.value,MAX_VALUE+2);
   if(!rawLabel||!rawValue)continue;
   if(rawLabel.length>MAX_LABEL||rawValue.length>MAX_VALUE)truncated=true;
   const label=prefix(rawLabel,MAX_LABEL),value=prefix(rawValue,MAX_VALUE);
   const rawSection=plain(item.section,MAX_LABEL+2);
   if(rawSection.length>MAX_LABEL)truncated=true;
   const section=prefix(rawSection,MAX_LABEL);
   const sourcePath=typeof item.source_path==='string'&&/^\/(?:[A-Za-z0-9_~./-]){0,300}$/.test(item.source_path)?item.source_path:'';
   const url=sourceUrl(item.source_url);
   const locator=typeof item.source_locator==='string'&&/^form\[data-product_variations\]\[data-product_id="[0-9]{1,20}"\]$/.test(item.source_locator)?item.source_locator:'';
   const field=typeof item.field==='string'&&/^[a-z][a-z0-9_.]{0,70}$/.test(item.field)?item.field:'';
   // A terminal label colon is layout punctuation. Preserve the first
   // published label and all explicit source URLs while collapsing these
   // duplicate text facts only inside the same section and exact value.
   // Structured record labels/pointers retain their original namespace.
   // Compact and ordinary generated projection labels name the same exact
   // record across nested bounded merges. Arbitrary source labels keep
   // their existing identity; only the index/part-matched standard label
   // has this generated alias.
   const generatedLabel=generatedProjectionLabel({label,format:item.format,source_path:sourcePath,source_locator:locator,part:item.part,field,section,conflicting:item.conflicting});
   const labelKey=normalized(structured?(generatedLabel||label):label.replace(/\s*[:：]\s*$/u,''));
   const signature=normalized(section)+'\0'+labelKey+'\0'+(structured?value:normalized(value))+'\0'+sourcePath+
    (structured?'\0'+(url||'')+'\0'+locator+'\0'+item.format+'\0'+(item.part??0)+(generatedLabel?'\0'+type(item.source_type):''):'\0'+field+'\0'+locator);
   if(seen.has(signature)){
    const previous=seen.get(signature);
    if(item.conflicting===true)previous.conflicting=true;
    if(!structured)rememberSources(previous,item);
    continue;
   }
   const fact={label,value,source_type:type(item.source_type)};
   if(url)fact.source_url=url;
   if(field)fact.field=field;
   if(item.conflicting===true)fact.conflicting=true;
   if(section)fact.section=section;
   if(sourcePath)fact.source_path=sourcePath;
   if(structured)fact.format=item.format;
   if(locator)fact.source_locator=locator;
   if(Number.isSafeInteger(item.part)&&item.part>=0&&item.part<MAX_SOURCE_FACT_PARTS)fact.part=item.part;
   let addedCharacters=fact.label.length+value.length+section.length+sourcePath.length+locator.length;
   // A ProductGroup core must not lose its own source fields to the newly
   // retained shared literal child. Reclaim generated label overhead for
   // that dependency only; keep the established packing order elsewhere.
   if(fact.format==='projection'&&/^\/hasVariant\/(?:0|[1-9][0-9]{0,2})$/.test(sourcePath)&&
    out.length<MAX_SOURCE_FACTS&&characters+addedCharacters>MAX_SOURCE_FACT_CHARACTERS){
    const compact=[];let savings=0;
    for(const prior of [...out,fact]){
     const short=generatedProjectionLabel(prior);
     if(short&&short!==prior.label){compact.push({prior,short});savings+=prior.label.length-short.length;}
     if(characters+addedCharacters-savings<=MAX_SOURCE_FACT_CHARACTERS)break;
    }
    if(characters+addedCharacters-savings<=MAX_SOURCE_FACT_CHARACTERS){
     for(const {prior,short} of compact){
      if(prior===fact)addedCharacters-=prior.label.length-short.length;else characters-=prior.label.length-short.length;
      prior.label=short;
     }
    }
   }
   if(out.length>=MAX_SOURCE_FACTS||characters+addedCharacters>MAX_SOURCE_FACT_CHARACTERS){
    truncated=true;
    if(fact.format==='json'||originalImageCaption(fact)){
     let pending=omittedBySignature.get(signature);
     if(!pending&&omitted.length<MAX_SOURCE_FACT_CANDIDATES){pending=fact;omitted.push(fact);omittedBySignature.set(signature,fact);}
     if(pending&&!structured){
      const sources=omittedSources.get(pending)||[];
      if(sources.length<4)sources.push(item);
      omittedSources.set(pending,sources);
     }
    }
    continue;
   }
   if(!structured)rememberSources(fact,item);
   characters+=addedCharacters;out.push(fact);seen.set(signature,fact);
 }
 characters=completeBoundedSourceFacts(out,omitted,characters,fact=>{
  for(const original of omittedSources.get(fact)||[])rememberSources(fact,original);
 });
 // References are reviewable only when their exact original target survives
 // the same bound. Never leave a dangling pointer looking like retained data.
 const jsonGroups=new Map(),complete=new Map(),claimedPaths=new Map();
 const key=(item,path=item.source_path)=>[item.source_url||'',item.source_locator||'',path||''].join('\0');
 for(const fact of out)if(fact.format&&fact.source_path){
  let paths=[fact.source_path];
  if(fact.format==='reference')try{
   const target=JSON.parse(fact.value);paths=groupedReferencePaths(fact,target)||paths;
  }catch{}
  for(const path of paths){
   const id=key(fact,path),claims=claimedPaths.get(id)||new Set();
   claims.add(fact.format+'\0'+fact.source_path+(fact.format==='reference'?'\0'+fact.value:''));claimedPaths.set(id,claims);
  }
 }
 for(const fact of out)if(fact.format==='json'&&fact.source_path){
  const group=jsonGroups.get(key(fact))||[];group.push(fact);jsonGroups.set(key(fact),group);
 }
 const retained=out.filter(fact=>{
  if(fact.format!=='reference')return true;
  let target;try{target=JSON.parse(fact.value);}catch{truncated=true;return false;}
  const destinations=target&&typeof target==='object'&&!Array.isArray(target)?groupedReferencePaths(fact,target):null;
  if(fact.part!==0||!destinations||typeof target.source_path!=='string'||
   destinations.some(path=>(claimedPaths.get(key(fact,path))?.size||0)>1)){
   truncated=true;return false;
  }
  const targetKey=key(fact,target.source_path);
  if((claimedPaths.get(targetKey)?.size||0)>1){truncated=true;return false;}
  if(!complete.has(targetKey)){
   const chunks=(jsonGroups.get(targetKey)||[]).toSorted((a,b)=>a.part-b.part);
   let ok=chunks.length>0&&chunks.every((chunk,index)=>chunk.part===index);
   if(ok)try{JSON.parse(chunks.map(chunk=>chunk.value).join(''));}catch{ok=false;}
   complete.set(targetKey,ok);
  }
  if(!complete.get(targetKey)){truncated=true;return false;}
  return true;
 });
 return flag(retained,truncated);
}
function collector({source_url,source_type='html'}={}){
 const rows=[];let truncated=false;
 const append=item=>{
  if(rows.length<MAX_SOURCE_FACT_CANDIDATES){rows.push(item);return true;}
  truncated=true;
  // A late selected-product fact must be able to displace an earlier
  // educational panel. Bound the intermediate collection by priority too.
  let worst=0;
  for(let i=1;i<rows.length;i++)if(evidencePriority(rows[i])>=evidencePriority(rows[worst]))worst=i;
  if(evidencePriority(item)>=evidencePriority(rows[worst]))return false;
  rows.splice(worst,1);rows.push(item);return true;
 };
 const add=(rawLabel,rawValue,field,section)=>{
  const label=plain(rawLabel,MAX_LABEL+2),value=scalar(rawValue,0,()=>{truncated=true;});
  if(!label||!value)return;
  if(field==='release_label'&&isRecurringCoffeeHarvestWindow(value))field='harvest_season';
  if(field==='release_label'&&isGenericCoffeeLotLabel(value))field='lot_type';
  if(label.length>MAX_LABEL){truncated=true;return;}
  // Do not silently erase the rest of a long product story. Split it into
  // reviewable text chunks, recording any aggregate bound honestly.
  for(let at=0,part=0;at<value.length;part++){
   let end=codePointEnd(value,Math.min(at+MAX_VALUE,value.length));
   if(end<value.length){const space=value.lastIndexOf(' ',end);if(space>at+MAX_VALUE/2)end=space;}
   if(!append({label:part?prefix(label,MAX_LABEL-22)+' (continued '+(part+1)+')':label,
    value:value.slice(at,end).trim(),source_type,...(source_url?{source_url}:{}),...(field?{field}:{}),...(section?{section}:{})}))break;
   at=end;while(value[at]===' ')at++;
  }
 };
 // Retain bounded public purchase/specification objects exactly, including
 // zero, false and null. Display text alone loses variant attribution, raw
 // currency units, subscription terms and quantity rules. JSON chunks carry
 // a pointer and part number so an exported review can reconstruct them.
 const addJson=(label,value,source_path,{format='json',source_locator,section}={})=>{
  let encoded;try{encoded=JSON.stringify(value);}catch{truncated=true;return;}
  if(typeof encoded!=='string')return;
  if(encoded.length>MAX_SOURCE_FACT_CHARACTERS){encoded=prefix(encoded,MAX_SOURCE_FACT_CHARACTERS);truncated=true;}
  for(let at=0,part=0;at<encoded.length;part++){
   if(part>=MAX_SOURCE_FACT_PARTS){truncated=true;break;}
   const end=codePointEnd(encoded,Math.min(at+MAX_VALUE,encoded.length));
   if(!append({label:part?prefix(label,MAX_LABEL-22)+' (continued '+(part+1)+')':label,
    value:encoded.slice(at,end),source_type,source_url,source_path,format,part,
    ...(source_locator?{source_locator}:{}),...(section?{section}:{})}))break;
   at=end;
  }
 };
 return {add,addJson,finish:()=>{const result=mergeCoffeeSourceFacts(rows);return flag([...result],truncated||result.truncated);},limit:()=>{truncated=true;}};
}
const NO_LABEL=/^(?:quantity|qty|add to cart|add to bag|buy now|share|search|login|sign in|subscribe|newsletter|privacy|terms|cookies|email|password|reviews?|rating|navigation|menu|shipping policy|refund policy|you may also like|related products)$/i;
const labelLike=label=>label.length>=2&&label.length<=80&&/\p{L}/u.test(label)&&
 !/[.!?]$/.test(label)&&label.split(/\s+/).length<=10&&!NO_LABEL.test(label);

function shortcodeMapFacts(raw,result){
 if(typeof raw!=='string')return;
 // A current product can publish a map as an unrendered WordPress shortcode.
 // Keep its explicitly written marker, never infer origin from coordinates
 // or fetch an embedded map/API. Ignore executable and commented markup.
 // The selected HTML is already bounded at 2 MB. Scan that same bounded
 // scope, including a literal shortcode after large public variation data.
 // A smaller unconditional prefix limit falsely hid later map evidence.
 if(raw.length>2_000_000)result.limit();
 const text=decoded(removeElements(removeComments(raw.slice(0,2_000_000)),['script','style','template','noscript']))
  .replace(/[“”″]/g,'"');
 let count=0;
 for(const shortcode of text.matchAll(/\[[A-Za-z][A-Za-z0-9_-]{0,60}\b[^\[\]]{0,12000}\]/g)){
  const marker=shortcode[0].match(/\bmap_markers\s*=\s*(?:"([^"\]]{1,4000})"|'([^'\]]{1,4000})')/i);
  if(!marker)continue;
  if(count++>=16){result.limit();break;}
  result.add('Published map marker',marker[1]??marker[2],undefined,'Published map data');
 }
}

export function collectCoffeePageMetaSourceFacts(metadata,{source_url}={}){
 const result=collector({source_url});
 if(!metadata||typeof metadata!=='object'||Array.isArray(metadata))return result.finish();
 // Product purchase metadata is public evidence. Do not copy arbitrary head
 // tags, session/bootstrap data, tracking IDs or account tokens.
 const labels={
  'product:price:amount':'Published price','product:price:currency':'Price currency',
  'product:original_price:amount':'Published original price','product:original_price:currency':'Original price currency',
  'product:sale_price:amount':'Published sale price','product:sale_price:currency':'Sale price currency',
  'product:availability':'Published availability','product:retailer_item_id':'Product retailer item ID',
  'product:condition':'Product condition','og:price:amount':'Published price','og:price:currency':'Price currency'
 };
 for(const [key,label] of Object.entries(labels))if(Object.hasOwn(metadata,key)&&typeof metadata[key]==='string')result.add(label,metadata[key]);
 // Public SEO/social descriptions can contain additional details or stale
 // alternate claims. Retain their explicit context for review only, never as
 // a substitute for the selected coffee's canonical specifications.
 for(const [key,label] of Object.entries({description:'Page description','og:description':'Open Graph description',
  'twitter:description':'Social description','og:title':'Open Graph title','twitter:title':'Social title'})){
  if(Object.hasOwn(metadata,key)&&typeof metadata[key]==='string')result.add(label,metadata[key],undefined,'Published page metadata');
 }
 return result.finish();
}

export function collectCoffeePageGuidanceFacts(html,{source_url}={}){
 const result=collector({source_url});
 if(typeof html!=='string'||html.length>2_000_000)return flag([],typeof html==='string'&&html.length>2_000_000);
 const {nodes,truncated}=coffeeHtmlElements(html);if(truncated)result.limit();
 const blocked=new Set(),summaries=new Map(),excluded=[];
 for(let i=0;i<nodes.length;i++){
  const node=nodes[i],attrs=coffeeHtmlAttributes(node.attributes);
  if(blocked.has(node.parent)||['script','style','nav','header','aside','template','noscript','dialog'].includes(node.tag)||
   Object.hasOwn(attrs,'hidden')||/^true$/i.test(attrs['aria-hidden']||'')||/\bdisplay\s*:\s*none\b/i.test(attrs.style||'')||
   /(?:^|[\s_-])(?:reviews?|testimonials?|quick[-_ ]?view|upsells?|cross[-_ ]?sells?|related[-_ ]?(?:products?|coffees?))(?=$|[\s_-])/i.test([attrs.class,attrs.id].join(' '))||
   ['product-recommendations','recommendations'].includes(node.tag)||
   /\b(?:product[-_ ]recommendations|recommended[-_ ]products)\b/i.test([attrs.class,attrs.id].join(' '))||
   /(?:^|\s)jdgm-/.test(attrs.class||''))blocked.add(i);
  if(blocked.has(i)&&!blocked.has(node.parent))excluded.push([node.start,node.end]);
  if(node.tag==='summary'&&node.parent!=null&&nodes[node.parent].tag==='details'&&!blocked.has(i))summaries.set(node.parent,node);
 }
 let count=0,budget=24_000;
 for(const [index,summary] of summaries){
  const node=nodes[index];if(blocked.has(index)||summary.contentEnd-summary.headEnd>1000)continue;
  const question=plain(html.slice(summary.headEnd,summary.contentEnd),MAX_LABEL+2);
  // Only explicit questions about coffee handling/packaging. Shipping,
  // returns, account information and availability placeholders stay out.
  if(question.length>MAX_LABEL||!/[?？]$/.test(question)||
   /\b(?:password|account|email|payment|credit card|refund|return|shipping|delivery|tracking)\b/i.test(question)||
   !/\b(?:stor(?:e|age)|refrigerat\w*|freez\w*|freshness|rest(?:ing)?|degass\w*|brew(?:ing)?|grind|ground|whole[ -]?bean|packag(?:e|ing)|bags?|nitrogen)\b/i.test(question))continue;
  const length=node.contentEnd-summary.end;
  if(length>10_000||length>budget||count>=16){result.limit();continue;}
  const pieces=[];let at=summary.end;
  for(const [start,end] of excluded){
   if(end<=at)continue;if(start>=node.contentEnd)break;
   pieces.push(html.slice(at,Math.max(at,start)));at=Math.min(node.contentEnd,end);
  }
  pieces.push(html.slice(at,node.contentEnd));
  const value=plain(pieces.join(' '),10_002);
  if(!value||value.length>10_000)continue;
  result.add(question,value,undefined,'Roaster general coffee guidance');count++;budget-=length;
 }
 return result.finish();
}

// Large variation records repeat the same image HTML or subscription terms.
// A projection contains exact selected properties, never a claimed full object.
// Every removed property is retained at its original child pointer; exact
// repeated values use explicit reference records. Consumers must reconstruct
// all children before treating the parent as a complete original object.
function addVariationRecords(result,variants,{root='/variants',source_locator,publicKeys}={}){
 const selected=variants.slice(0,MAX_PURCHASE_VARIANTS);if(variants.length>MAX_PURCHASE_VARIANTS)result.limit();
 const sizes=selected.map(value=>{try{return JSON.stringify(value).length;}catch{return 0;}});
 const decompose=!!publicKeys||sizes.some(size=>size>8000)||sizes.reduce((a,b)=>a+b,0)>24_000;
 const repeated=new Map(),retained=new Map();
 if(decompose)for(const original of selected){
  if(!original||typeof original!=='object'||Array.isArray(original))continue;
  for(const [key,value] of Object.entries(original).slice(0,128)){
   if(publicKeys&&!publicKeys.has(key))continue;
   let encoded;try{encoded=JSON.stringify(value);}catch{continue;}
   if(typeof encoded==='string'&&encoded.length>=192){
    const signature=key+'\0'+encoded;repeated.set(signature,(repeated.get(signature)||0)+1);
   }
  }
 }
 const context=source_locator?{source_locator,section:'Selected product form: data-product_variations'}:{};
 for(let i=0;i<selected.length;i++){
  const original=selected[i],path=root+'/'+i;
  if(!original||typeof original!=='object'||Array.isArray(original)||!decompose){
   if(!publicKeys)result.addJson('Purchase variant '+(i+1),original,path,context);
   continue;
  }
  const entries=Object.entries(original),core={},children=[];
  if(entries.length>128)result.limit();
  for(const [key,value] of entries.slice(0,128)){
   if(publicKeys&&!publicKeys.has(key))continue;
   let encoded;try{encoded=JSON.stringify(value);}catch{result.limit();continue;}
   if(typeof encoded!=='string')continue;
   // Preserve exact small values together, including false, zero and null.
   // Only safe original property names become child JSON pointers.
   if((encoded.length<=800&&(repeated.get(key+'\0'+encoded)||0)<2)||!/^[A-Za-z0-9_.-]{1,80}$/.test(key))Object.defineProperty(core,key,{value,enumerable:true});
   else children.push({key,value,encoded});
  }
  result.addJson('Purchase variant '+(i+1)+' public fields',core,path,{...context,format:'projection'});
  for(const {key,value,encoded} of children){
   const childPath=path+'/'+key,signature=key+'\0'+encoded,existing=retained.get(signature);
   if(existing)existing.destinations.push(childPath);
   else retained.set(signature,{key,value,path:childPath,index:i,destinations:[]});
  }
 }
 // Repeated public children (images and subscription terms) are retained
 // once at their original typed pointer. Compact explicit destination lists
 // keep dozens of identical references from exhausting the fact-count bound.
 // The encoded map still consumes the ordinary 1,600/64,000 character caps.
 for(const entry of retained.values()){
  result.addJson('Purchase variant '+(entry.index+1)+' '+entry.key,entry.value,entry.path,context);
  const flush=destinations=>{
   if(!destinations.length)return;
   const value={source_path:entry.path};if(destinations.length>1)value.destinations=destinations;
   result.addJson('Purchase variant shared '+entry.key,value,destinations[0],{...context,format:'reference'});
  };
  let batch=[];
  for(const path of entry.destinations){
   if(JSON.stringify({source_path:entry.path,destinations:[...batch,path]}).length>MAX_VALUE){flush(batch);batch=[];}
   batch.push(path);
  }
  flush(batch);
 }
}
const WOO_VARIATION_PUBLIC_KEYS=new Set(['attributes','availability_html','backorders_allowed','dimensions','dimensions_html',
 'display_price','display_regular_price','gallery_image_ids','gallery_images_html','image','image_id','is_downloadable',
 'is_in_stock','is_purchasable','is_sold_individually','is_virtual','max_qty','min_qty','price_html','sku',
 'variation_description','variation_id','variation_is_active','variation_is_visible','weight','weight_html',
 'display_name','gifting','woosb_image','wc_amazon_product_type']);
function addInlineWooVariations(html,nodes,blocked,result,source_url){
 let current;try{current=new URL(source_url);}catch{return;}
 const selectors=url=>{
  const params=new URLSearchParams(url.search);
  for(const key of [...params.keys()])if(/^(?:utm_[a-z0-9_]+|gclid|fbclid|srsltid|msclkid|mc_cid|mc_eid)$/i.test(key))params.delete(key);
  params.sort();return params.toString();
 };
 const forms=[],attributes=new Map(),visibility=new Map();let budget=1_000_000;
 const attrsFor=index=>{
  if(attributes.has(index))return attributes.get(index);
  const node=nodes[index];
  if(node.headEnd-node.start>512_000){result.limit();attributes.set(index,null);return null;}
  const attrs=coffeeHtmlAttributes(node.attributes||html.slice(node.start+node.tag.length+1,node.headEnd-1));
  attributes.set(index,attrs);return attrs;
 };
 const hiddenBranch=index=>{
  const chain=[];let at=index;
  while(at!=null&&!visibility.has(at)){chain.push(at);at=nodes[at].parent;}
  let hidden=at!=null&&visibility.get(at);
  for(const id of chain.reverse()){
   const attrs=attrsFor(id);
   hidden=hidden||blocked.has(id)||!attrs||Object.hasOwn(attrs,'hidden')||/^true$/i.test(attrs['aria-hidden']||'')||
    /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse))\s*(?:!\s*important)?\s*(?:;|$)/i.test(attrs?.style||'');
   visibility.set(id,!!hidden);
  }
  return visibility.get(index);
 };
 for(let i=0;i<nodes.length;i++){
  const node=nodes[i];if(node.tag!=='form'||blocked.has(i))continue;
  const length=node.headEnd-node.start;
  if(length>512_000||length>budget){result.limit();continue;}
  budget-=length;
  // General structural scanning deliberately stores only short attributes.
  // Read this selected, bounded form's real opening tag without raising that
  // global bound or searching scripts/session bootstrap objects.
  const attrs=attrsFor(i);
  if(!/(?:^|\s)variations_form(?:\s|$)/.test(attrs.class||'')||!Object.hasOwn(attrs,'data-product_variations'))continue;
  if(hiddenBranch(i))continue;
  if(!/^[0-9]{1,20}$/.test(attrs['data-product_id']||''))continue;
  let action;try{action=new URL(decoded(attrs.action||''),current);}catch{continue;}
  if(action.origin!==current.origin||action.pathname.replace(/\/$/,'')!==current.pathname.replace(/\/$/,'')||selectors(action)!==selectors(current))continue;
  const raw=decoded(attrs['data-product_variations']);
  if(raw.length>350_000){result.limit();continue;}
  if(raw==='false')continue; // The site did not expose variation data here.
  let values;try{values=JSON.parse(raw);}catch{result.limit();continue;}
  if(!Array.isArray(values))continue;
  forms.push({id:attrs['data-product_id'],raw,values});
  if(forms.length>=8){result.limit();break;}
 }
 if(new Set(forms.map(form=>form.id)).size>1||new Set(forms.map(form=>form.raw)).size>1){result.limit();return;}
 const seen=new Set();
 for(const form of forms){
  if(seen.has(form.raw))continue;seen.add(form.raw);
  const source_locator='form[data-product_variations][data-product_id="'+form.id+'"]';
  for(const variant of form.values.slice(0,MAX_PURCHASE_VARIANTS)){
   if(!variant||typeof variant!=='object'||Array.isArray(variant))continue;
   const options=variant.attributes&&typeof variant.attributes==='object'&&!Array.isArray(variant.attributes)?Object.values(variant.attributes):[];
   if(options.length>32)result.limit();
   const title=scalar(options.slice(0,32)).replaceAll(', ',' / ')||scalar(variant.display_name)||'Product option';
   const details=[];
   if(variant.display_price!=null)details.push('Published price '+scalar(variant.display_price));
   if(variant.display_regular_price!=null)details.push('Regular price '+scalar(variant.display_regular_price));
   if(typeof variant.is_in_stock==='boolean')details.push(variant.is_in_stock?'In stock':'Out of stock');
   if(typeof variant.is_purchasable==='boolean')details.push(variant.is_purchasable?'Purchasable':'Not purchasable');
   if(variant.min_qty!=null&&variant.min_qty!=='')details.push('Minimum quantity '+scalar(variant.min_qty));
   if(variant.max_qty!=null&&variant.max_qty!=='')details.push('Maximum quantity '+scalar(variant.max_qty));
   if(variant.weight!=null&&variant.weight!=='')details.push('Shipping weight '+scalar(variant.weight));
   if(details.length)result.add('Purchase option: '+prefix(title,75),details.join('; '),undefined,'Product form '+form.id);
  }
  addVariationRecords(result,form.values,{root:'',source_locator,publicKeys:WOO_VARIATION_PUBLIC_KEYS});
 }
}

// A complete selected-source review may merge several representations of one
// Shopify product (visible HTML, chosen JSON, and preserved prose). Normalize
// *review field attribution* only after those sources have merged: otherwise a
// second copy of "Farm | ..." can silently re-tag an actor as Producer.
// Never discard the seller's literal label, URL, value or text evidence.
export function reconcileSelectedCoffeeReviewActorRoles(facts,{source_url}={}){
 if(!Array.isArray(facts)||!source_url)return facts;
 const eligible=f=>f?.source_url===source_url&&f.source_type==='html'&&
  !f.conflicting&&!/different coffee|other coffee|previous (?:coffee|lot)|general guidance|educational/i.test(String(f.section||''));
 const normLabel=f=>normalized(String(f?.label||'').replace(/[|:：]\s*$/u,''));
 const labeledGrower=facts.some(f=>eligible(f)&&f.field==='producer'&&/^(?:grower|producer|farmer)$/.test(normLabel(f)));
 const methods=facts.filter(f=>eligible(f)&&f.field==='process'&&normLabel(f)==='process').map(f=>normalized(f.value));
 for(const fact of facts){
  if(!eligible(fact))continue;
  if(labeledGrower&&fact.field==='producer'&&normLabel(fact)==='farm')delete fact.field;
  if(methods.length&&fact.field==='process'&&normLabel(fact)==='processing'&&
   !methods.includes(normalized(fact.value))&&
   /^[\p{Lu}][\p{L}\p{M}.'’-]*(?:\s+[\p{Lu}][\p{L}\p{M}.'’-]*){0,4}$/u.test(fact.value)&&
   !/\b(?:washed|natural|honey|anaerobic|wet.?hulled|ferment|carbonic|maceration|dry.?process|wet.?process|decaf)\b/i.test(fact.value))delete fact.field;
 }
 return facts;
}

export function collectCoffeeSourceFacts(html,{name='',source_url}={}){
 const result=collector({source_url});
 if(typeof html!=='string'||html.length>2_000_000)return flag([],typeof html==='string'&&html.length>2_000_000);
 const {nodes,truncated,scannedEnd}=coffeeHtmlElements(html);if(truncated)result.limit();
 html=html.slice(0,scannedEnd);
 const children=new Map(),positions=new Map(),blocked=new Set(),texts=new Map();let textBudget=4_000_000;
 for(let i=0;i<nodes.length;i++){
  const node=nodes[i];
  if(BLOCKED.has(node.tag)||blocked.has(node.parent))blocked.add(i);
  const list=children.get(node.parent)||[];positions.set(i,list.length);list.push(i);children.set(node.parent,list);
 }
 addInlineWooVariations(html,nodes,blocked,result,source_url);
 shortcodeMapFacts(html,result);
 const text=i=>{
  if(texts.has(i))return texts.get(i);
  const node=nodes[i];
  const length=node.contentEnd-node.headEnd;
  if(!blocked.has(i)&&length<=32_000&&length>textBudget){result.limit();texts.set(i,'');return '';}
  const eligible=!blocked.has(i)&&length<=32_000;
  if(eligible)textBudget-=length;
  const value=eligible?plain(html.slice(node.headEnd,node.contentEnd),32_000):'';
  texts.set(i,value);return value;
 };
 // A filter guide and an espresso guide can publish the same labels. Retain
 // their actual section/control names so review evidence never merges them.
 const controls=new Map();
 for(let i=0;i<nodes.length&&controls.size<128;i++){
  const node=nodes[i];if(!['button','a'].includes(node.tag))continue;
  const attrs=coffeeHtmlAttributes(node.attributes),target=attrs['aria-controls']||attrs['data-guide'];
  if(!target||target.length>160||node.contentEnd-node.headEnd>1200)continue;
  const title=plain(html.slice(node.headEnd,node.contentEnd),100);
  if(/\b(?:espresso|filter|pour.?over|v60|aeropress|french press|brew|coffee details|specifications)\b/i.test(title))controls.set(target,title);
 }
 const sections=new Map(),panelSections=new Map(),secondaryPanels=new Set(),primaryExcluded=[],headings=[];
 for(let i=0;i<nodes.length;i++){
  const node=nodes[i],attrs=coffeeHtmlAttributes(node.attributes);
  // An independent storefront component may precede selected product H1.
  if(node.tag==='section'&&String(attrs.class||'').split(/\s+/).includes('shopify-section'))headings.length=0;
  const panel=controls.get(attrs.id)||(/\bguide-body\b/.test(attrs.class||'')?controls.get(attrs['data-guide']):'');
  const inherited=panel||panelSections.get(node.parent)||'';
  if(inherited)panelSections.set(i,inherited);
  const secondary=!inherited&&(node.tag==='dialog'||attrs.role==='dialog'||/(?:^|[\s_-])(?:modal|popover|tooltip)(?:$|[\s_-])/.test(attrs.class||''));
  if(secondary||secondaryPanels.has(node.parent)){
   secondaryPanels.add(i);
   if(!secondaryPanels.has(node.parent))primaryExcluded.push([node.start,node.end]);
  }
  // H1 establishes a new document/product section. Prior storefront heading
  // context (including testimonials) cannot label later selected coffee facts.
  if(node.tag==='h1'&&!blocked.has(i))headings.length=0;
  if(/^h[2-6]$/.test(node.tag)&&!blocked.has(i)){
   const heading=text(i),level=Number(node.tag[1]);
   if(heading&&heading.length<=100){headings.length=level;headings[level]=heading;}
  }
  const heading=inherited||headings.filter(Boolean).join(' / ').slice(0,100);
  sections.set(i,(secondaryPanels.has(i)?'Supplementary page panel / '+heading:heading).slice(0,100));
 }
 const sectionAt=start=>{
  let low=0,high=nodes.length;
  while(low<high){const mid=(low+high)>>>1;if(nodes[mid].start<=start)low=mid+1;else high=mid;}
  return sections.get(low-1)||'';
 };
 // Reserve the selected page's complete prose before iterating its many
 // individual labels. Supplementary dialogs remain available separately.
 if(primaryExcluded.length){
  const pieces=[];let at=0;
  for(const [start,end] of primaryExcluded){pieces.push(html.slice(at,start));at=end;}
  pieces.push(html.slice(at));
  const primaryText=plain(removeElements(pieces.join(' '),[...BLOCKED]),MAX_SOURCE_FACT_CHARACTERS+2);
  if(primaryText&&normalized(primaryText)!==normalized(name))result.add('Published primary product text',primaryText);
 }
 const fullText=plain(removeElements(html,[...BLOCKED]),MAX_SOURCE_FACT_CHARACTERS+2);
 if(fullText&&normalized(fullText)!==normalized(name))result.add('Published product text',fullText,undefined,primaryExcluded.length?'Complete page scope':undefined);
 const semantic=extractSemanticCoffeeSpecs(html,{clean:plain});
 // Semantic facts use productMarkup(html) offsets, not original document
 // offsets. Selected <main> can follow unrelated testimonials; do not label
 // selected facts from earlier full-document section coordinates.
 const semanticPage=productMarkup(html),semanticNodes=coffeeHtmlElements(semanticPage).nodes;
 // Controls and their owned content must use the same section label as the
 // full-page review ledger. Otherwise identical hidden-panel facts duplicate.
 const semanticControls=new Map(),semanticPanelSections=new Map();
 for(let i=0;i<semanticNodes.length&&semanticControls.size<128;i++){
  const node=semanticNodes[i];if(!['button','a'].includes(node.tag))continue;
  const attrs=coffeeHtmlAttributes(node.attributes),target=attrs['aria-controls']||attrs['data-guide'];
  if(!target||target.length>160||node.contentEnd-node.headEnd>1200)continue;
  const title=plain(semanticPage.slice(node.headEnd,node.contentEnd),100);
  if(/\b(?:espresso|filter|pour.?over|v60|aeropress|french press|brew|coffee details|specifications)\b/i.test(title))semanticControls.set(target,title);
 }
 const semanticBlocked=new Set(),semanticHeadings=[],semanticSections=[];
 for(let i=0;i<semanticNodes.length;i++){
  const node=semanticNodes[i];
  if(BLOCKED.has(node.tag)||semanticBlocked.has(node.parent))semanticBlocked.add(i);
  if(!semanticBlocked.has(i)&&node.tag==='section'&&
   String(coffeeHtmlAttributes(node.attributes).class||'').split(/\s+/).includes('shopify-section'))semanticHeadings.length=0;
  if(!semanticBlocked.has(i)&&node.tag==='h1')semanticHeadings.length=0;
  if(!semanticBlocked.has(i)&&/^h[2-6]$/.test(node.tag)&&node.contentEnd-node.headEnd<=2000){
   const heading=plain(semanticPage.slice(node.headEnd,node.contentEnd),101),level=Number(node.tag[1]);
   if(heading&&heading.length<=100){semanticHeadings.length=level;semanticHeadings[level]=heading;}
  }
  const attrs=coffeeHtmlAttributes(node.attributes);
  const owned=semanticControls.get(attrs.id)||(/\bguide-body\b/.test(attrs.class||'')?semanticControls.get(attrs['data-guide']):'');
  const inherited=owned||semanticPanelSections.get(node.parent)||'';
  if(inherited)semanticPanelSections.set(i,inherited);
  semanticSections.push([node.start,inherited||semanticHeadings.filter(Boolean).join(' / ').slice(0,100)]);
 }
 const semanticSectionAt=start=>{
  let low=0,high=semanticSections.length;
  while(low<high){const mid=(low+high)>>>1;if(semanticSections[mid][0]<=start)low=mid+1;else high=mid;}
  return semanticSections[low-1]?.[1]||'';
 };
 // Review-only roles distinguish named farms/facilities from current selected
 // producers and green methods. Exact source captions/values remain retained.
 const hasLabeledGrower=semantic.facts.some(fact=>fact.kind==='producer'&&/^(?:grower|producer|farmer)$/i.test(fact.label.trim()));
 const selectedProcessMethods=semantic.facts.filter(fact=>fact.kind==='process'&&/^process$/i.test(fact.label.trim())).map(fact=>normalized(fact.value));
 const sourceReviewField=(label,value,field)=>{
  const caption=normalized(label).replace(/\s*[|:：]\s*$/u,'');
  if(field==='producer'&&caption==='farm'&&hasLabeledGrower)return undefined;
  if(field==='process'&&caption==='processing'&&selectedProcessMethods.length&&!selectedProcessMethods.includes(normalized(value))&&
   /^[\p{Lu}][\p{L}\p{M}.'’-]*(?:\s+[\p{Lu}][\p{L}\p{M}.'’-]*){0,4}$/u.test(value)&&
   !/\b(?:washed|natural|honey|anaerobic|wet.?hulled|ferment|carbonic|maceration|dry.?process|wet.?process|decaf)\b/i.test(value))return undefined;
  return field;
 };
 for(const fact of semantic.facts)result.add(fact.label,fact.value,sourceReviewField(fact.label,fact.value,fact.kind),semanticSectionAt(fact.start));
 // Definition lists and tables preserve unfamiliar labels, units and values.
 for(let i=0;i<nodes.length;i++){
  const node=nodes[i];if(blocked.has(i))continue;
  const mapAttrs=coffeeHtmlAttributes(node.attributes);
  if(/(?:^|\s)map-marker(?:\s|$)/.test(mapAttrs.class||'')||Object.hasOwn(mapAttrs,'data-map-marker')){
   const latitude=decoded(mapAttrs['data-lat']??mapAttrs['data-latitude']??''),longitude=decoded(mapAttrs['data-lng']??mapAttrs['data-longitude']??'');
   if(/^[+-]?\d{1,3}(?:\.\d{1,16})?$/.test(latitude)&&/^[+-]?\d{1,3}(?:\.\d{1,16})?$/.test(longitude)){
    const title=plain(mapAttrs['data-mapinfo']??mapAttrs['data-title']??mapAttrs['aria-label']??'',1000);
    result.add('Published map marker',[latitude,longitude,title].filter(Boolean).join(' | '),undefined,'Published map data');
   }
  }
  if(node.tag==='img'){
   const attrs=coffeeHtmlAttributes(node.attributes);
   for(const key of ['alt','title']){
    const caption=typeof attrs[key]==='string'?plain(attrs[key],MAX_SOURCE_FACT_CHARACTERS+2):'';
    if(caption.length>=12&&normalized(caption)!==normalized(name)&&
      !/^(?:logo|icon|star|rating|payment|visa|mastercard|arrow|chevron|loading|placeholder)\b/i.test(caption))
     result.add('Product image '+(key==='alt'?'description':'title'),caption,undefined,'Published image caption');
   }
  }
  if(node.tag==='tr'){
   const cells=(children.get(i)||[]).filter(j=>/^(?:th|td)$/.test(nodes[j].tag)&&text(j));
   if(cells.length>=2&&cells.length<=12&&labelLike(text(cells[0])))
    {const label=text(cells[0]),value=cells.slice(1).map(text).join(' | ');result.add(label,value,sourceReviewField(label,value,coffeeFieldKey(label)),sections.get(i));}
  }
  if(node.tag==='dt'){
   const siblings=children.get(node.parent)||[],index=positions.get(i),values=[];
   for(let j=index+1;j<siblings.length&&values.length<12;j++){
    if(nodes[siblings[j]].tag!=='dd')break;
    if(text(siblings[j]))values.push(text(siblings[j]));
   }
   if(labelLike(text(i))&&values.length){const label=text(i),value=values.join(', ');result.add(label,value,sourceReviewField(label,value,coffeeFieldKey(label)),sections.get(i));}
  }
  if(!CONTENT.has(node.tag)||!text(i))continue;
  const childList=children.get(i)||[];
  // Leaf/inline blocks prevent repeatedly collecting the entire product as a
  // giant parent DIV, and preserve every BR-separated explicit label.
  if(childList.some(j=>!['span','strong','b','em','i','small','a','sup','sub','br','abbr'].includes(nodes[j].tag)))continue;
  const lines=html.slice(node.headEnd,node.contentEnd).split(/<br\b[^<>]{0,2000}>/gi).slice(0,128).map(line=>plain(line)).filter(Boolean);
  for(const line of lines){
   const pair=line.match(/^([\p{L}\p{N}][\p{L}\p{M}\p{N} /&()_.%+–-]{0,79}?)\s*[:：]\s*(.+)$/u);
   if(pair&&labelLike(pair[1]))result.add(pair[1],pair[2],sourceReviewField(pair[1],pair[2],coffeeFieldKey(pair[1])),sections.get(i));
  }
 }
 // Short heading/value sibling groups include metrics that have no colon.
 for(const siblings of children.values()){
  if(siblings.length>200)continue;
  for(let i=0;i<siblings.length-1;i++){
   const a=siblings[i],b=siblings[i+1],label=text(a),value=text(b);
   if(blocked.has(a)||blocked.has(b)||!labelLike(label)||!value||value===label)continue;
   if(!/^(?:h[2-6]|strong|b|label|summary)$/.test(nodes[a].tag))continue;
   if(!/^(?:p|div|span|ul|ol|dd)$/.test(nodes[b].tag))continue;
   if(nodes[b].start-nodes[a].end>1500)continue;
   result.add(label,value,sourceReviewField(label,value,coffeeFieldKey(label)),sections.get(a));
  }
 }
 // Retain product prose as evidence as well as classified facts. Paragraphs
 // are independently reviewable and can contain facts no vocabulary knows.
 const paragraphs=[],paragraphKeys=new Set();
 for(let i=0;i<nodes.length;i++){
  const node=nodes[i];if(blocked.has(i)||!['p','li'].includes(node.tag))continue;
  const value=text(i);
  if(value.length<24||normalized(value)===normalized(name)||NO_LABEL.test(value)||
     /^(?:sign up|subscribe to|join our newsletter|accept cookies|©|all rights reserved)\b/i.test(value))continue;
  if(node.tag==='li'&&(children.get(i)||[]).some(j=>['p','ul','ol'].includes(nodes[j].tag)))continue;
  const key=(sections.get(i)||'')+'\0'+value;
  if(!paragraphKeys.has(key)){
   if(paragraphs.length>=MAX_SOURCE_FACT_CANDIDATES){result.limit();break;}
   paragraphKeys.add(key);paragraphs.push({value,section:sections.get(i)});
  }
 }
 for(let i=0;i<paragraphs.length;i++)result.add('Product text '+(i+1),paragraphs[i].value,undefined,paragraphs[i].section);
 // Some storefronts put every specification, price and recipe measurement
 // in bare DIV/SPAN nodes. Preserve the complete sanitized product scope as
 // review text even when it has no recognized label or paragraph. The caller
 // has already removed recommendations and established the product scope.
 // This fallback is evidence only: it never becomes a canonical assertion.
 return result.finish();
}

export function collectStructuredCoffeeSourceFacts(data,{source_url,source_type='product_json'}={}){
 const result=collector({source_url,source_type});
 if(!data||Array.isArray(data)||typeof data!=='object')return result.finish();
 for(const key of ['description','body_html','short_description'])shortcodeMapFacts(data[key],result);
 const add=result.add;
 const explicit=['additionalProperty','attributes','metafields','metadata','specifications'];
 for(const key of explicit){
  const value=data[key];
  if(Array.isArray(value)){
   if(value.length>128)result.limit();
   for(const row of value.slice(0,128)){
    const label=row?.name??row?.key??row?.label,value=row?.value??row?.values??row?.options??row?.terms??row?.text;
    if(label&&value!=null)add(label,value,coffeeFieldKey(label));
   }
  }else if(value&&typeof value==='object'){
   if(key==='additionalProperty'&&typeof value.name==='string'&&value.value!=null){add(value.name,value.value,coffeeFieldKey(value.name));continue;}
   const entries=Object.entries(value);if(entries.length>128)result.limit();
   for(const [label,item] of entries.slice(0,128)){
    if(item==null||typeof item==='boolean')continue;
    if(typeof item==='object'&&!Array.isArray(item)&&!('value' in item)&&!('name' in item)&&!('text' in item)){
     const nestedEntries=Object.entries(item);if(nestedEntries.length>64)result.limit();
     for(const [nested,nestedValue] of nestedEntries.slice(0,64))add(nested,nestedValue,coffeeFieldKey(nested));
    }else add(label,item,coffeeFieldKey(label));
   }
  }
 }
 const directEntries=Object.entries(data);if(directEntries.length>256)result.limit();
 for(const [key,value] of directEntries.slice(0,256))if(coffeeFieldKey(key)&&value!=null)add(key,value,coffeeFieldKey(key));
 for(const [key,label] of Object.entries({description:'Product description',body_html:'Product description',short_description:'Product summary',weight:'Weight',size:'Size',material:'Packaging material',countryOfOrigin:'Country of origin',productionDate:'Production date',award:'Award',awards:'Awards',hasCertification:'Certification',certification:'Certification',certifications:'Certifications',grade:'Grade',screenSize:'Screen size',cuppingScore:'Cupping score',organic:'Organic',decaffeinated:'Decaffeinated',decaffeinationMethod:'Decaffeination method',gtin:'GTIN',gtin13:'GTIN-13',sku:'Product SKU'})){
  if(data[key]!=null)add(label,data[key],coffeeFieldKey(label));
 }
 const tags=Array.isArray(data.tags)?data.tags:typeof data.tags==='string'?data.tags.split(','):[];
 if(tags.length>128)result.limit();
 for(const tag of tags.slice(0,128)){
  if(typeof tag!=='string')continue;
  const pair=tag.match(/^([^:=]{2,80})\s*[:=]\s*(.{1,1600})$/);
  if(pair&&labelLike(pair[1]))add(pair[1],pair[2],coffeeFieldKey(pair[1]));
 }
 const offers=Array.isArray(data.offers)?data.offers:[data.offers];
 if(offers.length>64)result.limit();
 for(const offer of offers.slice(0,64)){
  if(!offer||typeof offer!=='object')continue;
  const read=value=>scalar(value,0,result.limit),label=read(offer.name)||'Price';
  if(offer.price!=null)add(label,read(offer.price)+' '+read(offer.priceCurrency));
  if(offer.lowPrice!=null||offer.highPrice!=null)add('Price range',[offer.lowPrice,offer.highPrice].filter(v=>v!=null).map(read).join(' – ')+' '+read(offer.priceCurrency));
  if(offer.availability)add('Availability',read(offer.availability).replace(/^https?:\/\/schema\.org\//,''));
  if(offer.priceValidUntil)add('Price valid until',offer.priceValidUntil);
 }
 // Shopify prices are minor units in the Ajax response, but catalog strings
 // and Woo prices have different units. Preserve units explicitly; never
 // silently reinterpret an unidentified integer as a dollar amount.
 if(data.prices&&typeof data.prices==='object'){
  const p=data.prices,digits=p.currency_minor_unit;
  for(const key of ['price','regular_price','sale_price'])if(p[key]!=null){
   const amount=typeof digits==='number'&&digits>=0&&digits<=4&&/^\d+$/.test(String(p[key]))?
    String(Number(p[key])/10**digits):String(p[key]);
   add(key.replaceAll('_',' '),amount+' '+scalar(p.currency_code));
  }
 }
 if(typeof data.available==='boolean')add('Availability',data.available?'Available':'Unavailable');
 if(typeof data.is_in_stock==='boolean')add('Availability',data.is_in_stock?'In stock':'Out of stock');
 if(Array.isArray(data.options)){
  if(data.options.length>20)result.limit();
  for(const option of data.options.slice(0,20))if(option&&typeof option==='object'&&option.name)add(option.name,option.values??option.options);
 }
 if(Array.isArray(data.variants)){
  if(data.variants.length>MAX_PURCHASE_VARIANTS)result.limit();
  for(const variant of data.variants.slice(0,MAX_PURCHASE_VARIANTS)){
   const summary=purchaseSummary(variant);if(summary)add(summary.label,summary.value);
  }
 }
 // Publicly returned product data has no member/account information. Keep
 // the original units and option associations rather than flattening every
 // price, roast variant or grind selection into one ambiguous value.
 for(const key of ['price','price_min','price_max','price_varies','compare_at_price','compare_at_price_min','compare_at_price_max',
  'currency','priceCurrency','available','is_in_stock','prices','dimensions','weight','options','attributes','additionalProperty',
  'metafields','metadata','specifications','tags','selling_plan_groups','requires_selling_plan','quantity_rule','quantity_price_breaks']){
  if(Object.hasOwn(data,key))result.addJson('Published product '+key,data[key],'/'+key);
 }
 if(Array.isArray(data.variants))addVariationRecords(result,data.variants);
 if(Array.isArray(data.hasVariant))addVariationRecords(result,data.hasVariant,{root:'/hasVariant'});
 else if(data.hasVariant&&typeof data.hasVariant==='object')result.addJson('Published product variant',data.hasVariant,'/hasVariant');
 if(data.offers!=null)result.addJson('Published offers',data.offers,'/offers');
 // Captions and original gallery/media records can contain source facts and
 // references for optional local image review. They never become canonical
 // facts merely because they appeared on a bag image or in its description.
 for(const key of ['image','images','media','video'])if(Object.hasOwn(data,key))result.addJson('Published product '+key,data[key],'/'+key);
 return mergeCoffeeSourceFacts(result.finish(),collectSupplementaryStructuredCoffeeFacts(data,{source_url,source_type}));
}
