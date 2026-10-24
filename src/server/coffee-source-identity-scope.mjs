import {rawElements} from '../../supabase/functions/_shared/html-scan.mjs';
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
import {coffeeIdentityKey,coffeeIdentityText} from './coffee-product-identity.mjs';

// This receives an already selected product/description. It is deliberately
// narrower than a general language classifier: a current explicit multi-country
// blend list, a positively named different coffee outside that list, and its
// corroborating labeled specification cohort must all be present.
const MAX_HTML=2_000_000,MAX_CLAIMS=64,MAX_LABELS=4096;
const COUNTRY='Papua New Guinea|Democratic Republic of the Congo|Dominican Republic|United States|Costa Rica|El Salvador|East Timor|Timor-Leste|Puerto Rico|DR Congo|Ethiopia|Colombia|Kenya|Brazil|Brasil|Guatemala|Honduras|Nicaragua|Panama|Peru|Rwanda|Burundi|Mexico|Ecuador|Bolivia|Indonesia|Uganda|Tanzania|Yemen|India|Thailand|Vietnam|China|Taiwan|Laos|Myanmar|Venezuela|Philippines|Malawi|Zambia|Nepal|Australia|Cuba|Haiti|Jamaica|Cameroon';
const COUNTRY_RE=new RegExp('\\b('+COUNTRY+')\\b','gi');
const LABEL_RE=/\b(Cupping Notes?|Tasting Notes?|Flavou?r Notes?|Producer|Farm|Country(?: of Origin)?|Origin|Region|Variet(?:y|ies|al|als)|Cultivars?|Process(?:ing)?(?: Method)?|Altitudes?|Elevations?|Roast(?: Level)?|Harvest(?: Year)?|Coffee Grading)\s*[:：]\s*/gi;
const BLOCK=/^(?:p|li|div|section|article|blockquote|h[1-6]|dt|dd|tr|td|th|br)$/;
const IGNORE=new Set(['nav','footer','aside','template','noscript','textarea','select','svg','canvas']);
const fieldOf=label=>/^(?:country|origin|region)/i.test(label)?'origin':
 /^(?:producer|farm)/i.test(label)?'producer':/^(?:variet|cultivar)/i.test(label)?'variety':
 /^process/i.test(label)?'process':/^(?:altitude|elevation)/i.test(label)?'elevation_m':
 /^(?:cupping|tasting|flavou?r)/i.test(label)?'tasting_notes':/^roast/i.test(label)?'roast_level':
 /^harvest/i.test(label)?'release_label':null;
const countryKey=value=>coffeeIdentityKey(value).replace(/^brasil$/,'brazil');
const countries=value=>[...new Map([...String(value).matchAll(COUNTRY_RE)].map(match=>[countryKey(match[1]),match[1]])).keys()];
function mask(source,ranges){
 const chunks=[];let cursor=0;
 for(const range of ranges){
  if(range.end<=cursor)continue;
  const start=Math.max(cursor,range.start);
  chunks.push(source.slice(cursor,start),' '.repeat(range.end-start));cursor=range.end;
 }
 chunks.push(source.slice(cursor));return chunks.join('');
}
function withoutIgnored(source){
 let ranges=[...rawElements(source,['script','style','template','noscript','textarea','select','svg','canvas'])]
  .map(({start,end})=>({start,end}));
 let cursor=0,start;
 while((start=source.indexOf('<!--',cursor))>=0){
  const close=source.indexOf('-->',start+4),end=close<0?source.length:close+3;
  ranges.push({start,end});cursor=end;
 }
 ranges.sort((a,b)=>a.start-b.start||b.end-a.end);
 return mask(source,ranges);
}
function visible(source){
 const chunks=[],positions=new Uint32Array(source.length+1);let size=0,index=0;
 const append=(value,start,literal=false)=>{
  chunks.push(value);
  for(let i=0;i<value.length;i++)positions[size++]=literal?start+i:start;
 };
 while(index<source.length){
  if(source[index]==='<'){
   let end=index+1,quote='';
   for(;end<source.length;end++){
    const char=source[end];
    if(quote){if(char===quote)quote='';}
    else if(char==='"'||char==="'")quote=char;
    else if(char==='>')break;
   }
   const tag=source.slice(index,index+80).match(/^<\/?([a-z0-9:-]+)/i)?.[1]?.toLowerCase();
   append(BLOCK.test(tag||'')?'\n':' ',index);index=end+1;continue;
  }
  if(source[index]==='&'){
   const entity=source.slice(index,index+32).match(/^&(?:#x[0-9a-f]{1,8}|#[0-9]{1,9}|[a-z]{2,12});/i)?.[0];
   if(entity){append(coffeeIdentityText(entity),index);index+=entity.length;continue;}
  }
  const start=index++;
  while(index<source.length&&source[index]!=='<'&&source[index]!=='&')index++;
  append(source.slice(start,index),start,true);
 }
 positions[size]=source.length;
 return {text:chunks.join(''),positions:positions.subarray(0,size+1)};
}
function literalList(value){
 const found=[...value.matchAll(COUNTRY_RE)];
 if(found.length<2||found.length>8)return null;
 const rest=value.replace(COUNTRY_RE,'').replace(/\band\b/gi,'').replace(/[\s,;&/+]/g,'');
 const keys=countries(value);return !rest&&keys.length>1?keys:null;
}
function sentenceStart(text,index){
 const from=Math.max(0,index-900),before=text.slice(from,index);let start=from;
 for(const match of before.matchAll(/(?:\n|[.!?]\s+)/g))start=from+match.index+match[0].length;
 while(start<index&&/\s/.test(text[start]))start++;
 return start;
}
export function isolateCoffeeIdentityCohorts(input,{name=''}={}){
 if(typeof input!=='string')return {html:'',quarantined_fields:[],quarantined:[]};
 let source=input.slice(0,MAX_HTML),truncated=input.length>MAX_HTML;
 let analysis=withoutIgnored(source);
 const scan=coffeeHtmlElements(analysis);
 if(scan.truncated){source=source.slice(0,scan.scannedEnd);analysis=analysis.slice(0,scan.scannedEnd);truncated=true;}
 const ignored=scan.nodes.filter(node=>IGNORE.has(node.tag)&&node.start<source.length)
  .map(node=>({start:node.start,end:Math.min(node.end,source.length)}));
 analysis=mask(analysis,ignored);
 let {text,positions}=visible(analysis);
 const claims=[],claimPattern=/(?:^|[\n.!?]\s*)(?:This|Our|The)\s+(?:(?:ethically|responsibly|carefully|thoughtfully)\s+sourced\s+)?blend\s+(?:has\s+(?:multiple\s+)?origins?\s*:\s*|(?:comes?\s+from|is\s+(?:sourced\s+)?from|combines|contains|includes|is\s+made\s+(?:of|from))\s+)([^.!?\n]{4,350})/gi;
 const shorten=index=>{
  const stop=positions[index]??source.length;
  source=source.slice(0,stop);text=text.slice(0,index);positions=positions.subarray(0,index+1);truncated=true;
 };
 for(const match of text.matchAll(claimPattern)){
  if(claims.length>=MAX_CLAIMS){shorten(match.index);break;}
  const value=match[1].trim(),keys=literalList(value);
  if(keys)claims.push({start:match.index,end:match.index+match[0].length,value,keys});
 }
 const labelMatches=[];
 for(const match of text.matchAll(LABEL_RE)){
  if(labelMatches.length>=MAX_LABELS){shorten(match.index);break;}
  labelMatches.push({start:match.index,headEnd:match.index+match[0].length,label:match[1],field:fieldOf(match[1])});
 }
 const labels=labelMatches.map((label,index)=>{
  const stop=Math.min(labelMatches[index+1]?.start??text.length,text.indexOf('\n',label.headEnd)<0?text.length:text.indexOf('\n',label.headEnd));
  const raw=text.slice(label.headEnd,stop),value=raw.trim();
  return {...label,value,end:stop,valid:!!value&&value.length<=260};
 });
 const sets=new Set(claims.map(claim=>[...claim.keys].sort().join('|'))),quarantined=[],fields=new Set();
 const origin=sets.size===1?claims[0]?.value:undefined;
 const result=()=>({html:mask(source,quarantined),quarantined_fields:[...fields].sort(),quarantined,
  ...(origin?{origin}:{}),...(truncated?{truncated:true}:{})});
 if(!origin||!name||name.length>250)return result();
 const selected=coffeeIdentityKey(name),currentCountries=new Set(claims[0].keys);
 const resumes=scan.nodes.filter(node=>/^h[1-6]$/.test(node.tag)&&node.end<=source.length&&
  node.contentEnd-node.headEnd<=1200).filter(node=>{
   const content=analysis.slice(node.headEnd,node.contentEnd).replace(/<[^<>]{0,1000}>/g,' ');
   return coffeeIdentityKey(content)===selected;
  });
 const references=/\b[Oo]ur\s+(\p{Lu}[\p{L}\p{M}\d'’&/+.-]*(?:[ \t]+\p{Lu}[\p{L}\p{M}\d'’&/+.-]*){0,7})/gu;
 let referencesSeen=0;
 for(const mention of text.matchAll(references)){
  if(++referencesSeen>64){shorten(mention.index);break;}
  if(mention.index<claims[0].end||coffeeIdentityKey(mention[1])===selected)continue;
  const outside=countries(mention[1]).filter(country=>!currentCountries.has(country));
  if(outside.length!==1||/\b(?:farmer|family|cooperative|grower)\b/i.test(mention[1]))continue;
  const before=sentenceStart(text,mention.index),after=mention.index+mention[0].length;
  const sentence=text.slice(before,Math.min(text.length,after+350)).split(/\n|(?<=[.!?])\s/)[0];
  const following=text.slice(after,after+260);
  if(!/^(?:\s+(?:coffee|offering|selection)\b|\s+(?:has been selected|is|was)\b[\s\S]{0,200}\b(?:coffee|offering|selection)\b)/i.test(following))continue;
  if(/\b(?:unlike|compare|compared|comparison|example|component|ingredient|is not|isn['’]t|not our|never our)\b/i.test(sentence))continue;
  const position=positions[mention.index],resume=resumes.find(node=>node.start>position),end=resume?.start??source.length;
  const possible=labels.filter(label=>label.start>after&&label.start-after<=12000&&positions[label.start]<end);
  let cohort=null;
  for(let first=0;first<possible.length&&!cohort;first++){
   const group=[];
   for(let index=first;index<possible.length&&group.length<12;index++){
    const row=possible[index],prior=group.at(-1);
    if(!row.valid||row.start-possible[first].start>2000||prior&&text.slice(prior.end,row.start).trim())break;
    group.push(row);
   }
   if(new Set(group.map(row=>row.field).filter(Boolean)).size>=3&&group.some(row=>row.field==='origin'&&countries(row.value).includes(outside[0])))cohort=group;
  }
  if(!cohort)continue;
  let start=positions[before];
  // Keep the opening paragraph boundary when it contains only the foreign
  // sentence; never delete preceding current-product facts in the same node.
  const containers=scan.nodes.filter(node=>/^(?:p|li|blockquote)$/.test(node.tag)&&node.start<=position&&node.end>position&&node.start>positions[claims[0].end]);
  if(containers.length)start=containers.at(-1).start;
  if(quarantined.some(range=>start>=range.start&&start<range.end))continue;
  for(const row of labels)if(positions[row.start]>=start&&positions[row.start]<end&&row.field)fields.add(row.field);
  quarantined.push({start,end,reason:'different_named_coffee_after_explicit_blend_origins',
   quote:text.slice(before,Math.min(text.length,cohort.at(-1).end)).replace(/\s+/g,' ').trim().slice(0,1600)});
 }
 // A later analysis limit can shorten a previously proven quarantine.
 for(const range of quarantined)range.end=Math.min(range.end,source.length);
 return result();
}
