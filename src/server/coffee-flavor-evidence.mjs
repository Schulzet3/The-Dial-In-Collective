import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
import {productMarkup} from './coffee-product-scope.mjs';
import {productCoffeeProse,NONCURRENT_COFFEE_PROSE} from './coffee-product-prose.mjs';
import {explicitCoffeeVarietyList,extractCoffeeTitleOrigin,literalCoffeeSourcePlaces} from './coffee-identity-evidence.mjs';
// Bounded product-specific flavor evidence. No AI, cross-page navigation,
// guessed flavor dictionary or related-product tasting notes.
const flavorPage=html=>removeElements(productMarkup(html),['svg','canvas','audio','button']);
const fold=value=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 .replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const flavorCleaner=clean=>(value,max)=>clean(String(value||'').replace(/<\/?(?:span|strong|b|em|i|small|sup|sub|a|u|s|mark|abbr)\b[^<>]{0,2000}>/gi,''),max);
const SENSORY_ROLE=/\b(?:chocolat(?:e?y|e)?|cocoa|cacao|caramel|toffee|honey|tea|floral|florals|citrus|nutty|almonds?|hazelnuts?|pecans?|walnuts?|praline|cherr(?:y|ies)|cinnamon|apples?|lemons?|oranges?|grapes?|peach(?:es)?|plums?|pears?|melon|mango|guava|papaya|lychee|jasmine|vanilla|sugar|spice|spicy|earthy|winey|juicy|sweet|velvety|[a-z]*berr(?:y|ies)|[a-z]*fruit)\b/i;

// Read actual attributes, not substrings of data-alt or of another quoted
// attribute. The shared scanner provides quote-aware opening-tag boundaries.
// Duplicate attributes are ambiguous evidence and cannot supply facts.
function attributesOf(node,page){
 const attributes=new Map();
 if(node.headEnd-node.start>12000)return attributes;
 const raw=page.slice(node.start+node.tag.length+1,node.headEnd-1);
 let at=0,count=0;
 while(at<raw.length&&count++<128){
  while(/\s/.test(raw[at]||'')&&at<raw.length)at++;
  if(at>=raw.length||raw[at]==='/')break;
  const key=/^[^\s"'<>/=\x60]+/.exec(raw.slice(at));
  if(!key)break;
  const name=key[0].toLowerCase();at+=key[0].length;
  while(/\s/.test(raw[at]||'')&&at<raw.length)at++;
  let value='';
  if(raw[at]==='='){
   at++;while(/\s/.test(raw[at]||'')&&at<raw.length)at++;
   const quote=raw[at];
   if(quote==='"'||quote==="'"){
    const end=raw.indexOf(quote,at+1);if(end<0)return new Map();
    value=raw.slice(at+1,end);at=end+1;
   }else{
    const found=/^[^\s"'<>\x60=]+/.exec(raw.slice(at));
    if(!found)return new Map();
    value=found[0];at+=value.length;
   }
  }
  attributes.set(name,attributes.has(name)?null:value);
 }
 return attributes;
}
function shortFlavorList(raw,clean,{allowSingle=false}={}){
 const text=clean(raw,401).trim(),body=text.replace(/[.]$/,'');
 if(text.length<2||text.length>350||/\b(?:masl|variet(?:y|ies|al)|farm(?:ers?)?|producers?|co-?op|elevation|process|processing|fermented|fermentation|washed|anaerobic|carbonic|maceration|relationship|espresso|coffee in|brew time|roast level|subscribe|shipping|sourcing|quantity|order|purchase|grind|brewing|recipe|certified|certifications?|fair trade|harvest competition)\b/i.test(text))return '';
 if(/\b(?:roasted coffee|whole beans?|ground coffee|each and every bean|each bean|every bean|(?:final|finished) brew|notes?|roast|decaf|pair perfectly|zoom|hover|expand|collapse|caption|click|swipe|navigation|every sip|each sip)\b/i.test(text)||
  /\b(?:not|never|without|allowing|walking|reminding|giving|bringing|bridging|finishing|preserving|resulting|delivering|expect|dance|dances|pair|pairs)\b/i.test(text)||
  /\b(?:this|that|these|those|which|your|you|our|their|we|it|its|he|she|they|his|her|is|are|has|have|was|were|offers?|features?|contains?|includes?|creates?|delivers?|mixes|crafted|savor|enjoy|experience|showcases?|highlights?|filled|grown|produced|single[ -]origin|(?:old|previous) release)\b/i.test(text)||
  /^(?:[-–—]|with\s+|full\s+of|(?:a|an|the)\s+|in\s+(?:character|the)|from\s+|for\s+|roast(?:ing|ed)\s+(?:medium|dark|light|for|to|at)\b)/i.test(body)||
  /\bcoffee$/i.test(body)||
  // A dangling preposition is incomplete prose. The suffix in a complete
  // descriptor such as "tea-like" is part of the roaster's literal flavor.
  (/\b(?:of|with|like|as|from|to|in|on|at|the|a|an)$/i.test(body)&&
   !/[\p{L}\p{M}][-‐‑]like$/iu.test(body))||
  /^(?:our|we|field|close|menu|submit|optional|required|choose|select|roaster['’]s|none|n\/?a|not available)$/i.test(body))return '';
 // A percentage belongs to an explicitly named chocolate/cacao flavor;
 // unrelated doses, prices, scores and other numbers remain excluded.
 let invalidPercentage=false;
 const noChocolatePercentage=text.replace(/\b(\d{1,3})%\s+(?:(?:dark|milk)\s+)?(?:chocolate|cocoa|cacao)\b/gi,(all,n)=>{
  if(Number(n)<=0||Number(n)>100)invalidPercentage=true;
  return 'chocolate';
 });
 if(invalidPercentage||/[\d$@%]|\bhttps?:\b/i.test(noChocolatePercentage))return '';
 const parts=body.split(/\s*(?:,|&|\||[•·;/]|\band\b)\s*/).map(p=>p.trim()).filter(Boolean);
 if(parts.length<(allowSingle?1:2)||parts.length>12||parts.some(p=>p.length>65||p.split(/\s+/).length>8||/[.!?:]/.test(p)))return '';
 return text.replace(/\s*[|•·;]\s*/g,', ');
}
const noteParts=value=>String(value||'').split(/\s*(?:,|&|\||[•·;/]|\band\b)\s*/).map(fold).filter(Boolean);
const noteKey=value=>[...new Set(noteParts(value))].sort().join('|');
const plainClean=(value,max=1000)=>String(value||'').replace(/<[^<>]{0,2000}>/g,' ').replace(/&amp;/gi,'&').replace(/&(?:nbsp|#160);/gi,' ').replace(/\s+/g,' ').trim().slice(0,max);
export function normalizeExplicitCoffeeTastingNotes(value,{allowProse=false}={}){
 let text=unconditionalFlavorPrefix(plainClean(value,401));
 if(!text||/\b(?:hypothetical(?:ly)?|fictional)\b/i.test(text))return '';
 // A merchant may put a list bullet immediately after the printed field label.
 // This helper is used only once that label/role has already been established.
 text=text.replace(/^[-–—•]\s*(?=[\p{L}\p{N}])/u,'');
 const prefixed=text.match(/^(?:(?:tasting|flavou?r)\s+)?notes?\s+of\s*:?\s+(.+)$/i);
 if(prefixed)text=prefixed[1].replace(/[.!?]+$/,'').trim();
 const compact=shortFlavorList(text,plainClean,{allowSingle:true});
 if(compact)return compact;
 if(!allowProse||text.length<8||text.length>350||NONCURRENT_COFFEE_PROSE.test(text)||
  !/\b(?:aroma|aromatic|flavou?r|notes?|acidity|body|bodied|mouthfeel|finish|sweetness|balanced)\b/i.test(text)||
  /[\d$@%]|https?:|\b(?:processing|ferment(?:ed|ation)?|roast|shipping|order|purchase|grind|brew(?:ing)?|recipe|producer|farm|variet(?:y|al)|origin|certified|certification|fair trade|refers? to|can be perceived|definition)\b/i.test(text)||
  /^tasting notes?\s+(?:are|is|mean|refer|describe)\b/i.test(text))return '';
 return text;
}
export function equivalentCoffeeTastingNotes(a,b){
 if(!a||!b)return false;
 return noteKey(a)===noteKey(b)||fold(a).replace(/\band\b/g,'').replace(/\s+/g,'')===fold(b).replace(/\band\b/g,'').replace(/\s+/g,'');
}
export function coffeeTastingNotesSubset(summary,complete){
 const left=new Set(noteParts(summary)),right=new Set(noteParts(complete));
 return left.size>=2&&left.size<right.size&&[...left].every(part=>[...right].some(full=>
  (' '+full+' ').includes(' '+part+' ')));
}
const roastKey=value=>{
 const key=value.toLowerCase().replace(/[ -]+/g,'-');
 return key==='light-medium'?'medium-light':key;
};
const ROAST='Ultra Light|Very Light|Light[ -]Medium|Medium[ -]Light|Light|Medium[ -]Dark|Medium|Dark';
const NONFACTUAL=/\b(?:not|never|without|neither|no|isn't|wasn't|doesn't|rather than|unlike|generally|for example|such as)\b/i;

// Accessible image text is usable source evidence when it identifies the
// exact selected coffee and explicitly transcribes its profile. No image is
// downloaded or interpreted. A generic bag photo, filename, another product,
// or unlabeled color scale cannot create flavor or roast facts.
export function extractProductImageTextEvidence(html,{name,clean}={}){
 if(typeof html!=='string'||html.length>2_000_000||typeof clean!=='function'||typeof name!=='string')return {};
 const identity=fold(name);
 if(identity.length<2||identity.length>180)return {};
 // Bag images may themselves be zoom buttons. Their exact-name alt text is
 // still source text; only their UI captions are excluded by flavorPage.
 const page=productMarkup(html),{nodes}=coffeeHtmlElements(page),notes=new Map(),roasts=new Set();
 for(const node of nodes){
  if(node.tag!=='img')continue;
  const raw=attributesOf(node,page).get('alt');
  if(!raw||raw.length>1200)continue;
  const alt=clean(raw,1200),normalized=fold(alt);
  if(!normalized.startsWith(identity+' '))continue;
  if(!/^(?:coffee(?: profile card)?|profile card)\b/.test(normalized.slice(identity.length+1)))continue;
  for(const list of alt.matchAll(/\b(?:tasting\s+)?notes\s*(?:of\s+|:\s*)([^;.!?]{2,180})/gi)){
   const start=Math.max(alt.lastIndexOf(';',list.index),alt.lastIndexOf('.',list.index),list.index-80);
   const context=alt.slice(start+1,list.index+list[0].length);
   const value=!NONFACTUAL.test(context)?shortFlavorList(list[1],clean,{allowSingle:true}):'';
   if(value)notes.set(noteKey(value),value);
  }
  for(const clause of alt.split(/[;.]/)){
   // A profile may print all endpoints of a roast scale. Those are a legend,
   // not contradictory assertions about the selected coffee's roast.
   if(NONFACTUAL.test(clause)||/\b(?:roast (?:levels|scale|spectrum|options|range)|(?:range|ranging) (?:of|from)|(?:lighter|darker) than)\b/i.test(clause))continue;
   const pattern=new RegExp('\\b('+ROAST+')\\s+roast\\b|\\broast(?: level)?\\s*[:=]\\s*('+ROAST+')\\b','gi');
   for(const match of clause.matchAll(pattern))roasts.add(roastKey(match[1]||match[2]));
  }
 }
 const result={},conflicts=[];
 if(notes.size===1)result.tasting_notes=[...notes.values()][0];
 else if(notes.size>1)conflicts.push('tasting_notes');
 if(roasts.size===1)result.roast_level=[...roasts][0];
 else if(roasts.size>1)conflicts.push('roast_level');
 if(conflicts.length)result.conflicts=conflicts;
 return result;
}
const hasClass=(attrs,name)=>String(attrs.get('class')||'').split(/\s+/).includes(name);
const FLAVOR_LABEL=/^(?:(?:coffee\s+)?(?:tasting|taste|flavou?r|cupping|cup)\s*(?:notes?|profile)|primary descriptors|what you['’]ll taste in your cup|tastes?\s+like|we\s+taste(?:\s+notes?\s+of)?|we['’]re\s+tasting|(?:in\s+)?the\s+cup|notes?\s+of|flavou?rs?|taste|tasting|reminds\s+us\s+of)\s*[:\u2014-]?\s*/i;
const EXPLICIT_FLAVOR_LABEL=/^(?:\d{1,4}\s+)?(?:(?:coffee\s+)?(?:tasting|taste|flavou?r|cupping|cup)\s*(?:notes?|profile)(?:\s+of)?|primary descriptors|what you['’]ll taste in your cup|tastes?\s+like|we\s+taste(?:\s+notes?\s+of)?|we['’]re\s+tasting|(?:in\s+)?the\s+cup|notes?\s+of|flavou?rs?|taste|tasting|reminds\s+us\s+of)\s*(?:[:：|.]|\/{2,}|[–—]{1,3}|-{1,3}(?=\s))\s*(.+)$/i;
function nonFlavorContainer(attrs){
 const identity=[attrs.get('class'),attrs.get('id')].filter(Boolean).join(' ');
 return /(?:^|[\s_-])(?:roast|acidity|intensity|body|brightness|scale|slider|attribute|attributes|geography|country|countries|region|regions|producer|process|sourcing)(?:$|[\s_-])/i.test(identity)||
  /(?:^|[\s_-])(?:headings?|titles?|images?|icons?)(?:$|[\s_-])/i.test(identity);
}
function namedFlavorContainer(node,attrs){
 if(nonFlavorContainer(attrs))return '';
 if(node.tag==='em'&&hasClass(attrs,'product__ingredients'))return 'text';
 if(node.tag==='div'&&hasClass(attrs,'ProductMeta__Text'))return 'text';
 if(node.tag==='p'&&hasClass(attrs,'tasting-notes'))return 'notes';
 if(!['p','div','ul','ol','section'].includes(node.tag))return '';
 const named=/(?:^|[\s_-])(?:tasting|taste|flavou?r|cupping)[-_ ]?(?:notes?|profile)(?:$|[\s_-])/i;
 for(const [key,value] of attrs){
  if(!value||!(/^(?:class|id|aria-label)$/.test(key)||key.startsWith('data-')))continue;
  if(/(?:^|[\s_-])(?:old|stale|archived|previous)(?:$|[\s_-])/i.test(value))continue;
  if(named.test(value))return 'chips';
 }
 return '';
}
function containerNotes(page,nodes,children,index,kind,clean){
 const node=nodes[index],body=page.slice(node.headEnd,node.contentEnd);
 if(body.length>12000)return '';
 if(kind==='text')return shortFlavorList(clean(body,220),clean,{allowSingle:true});
 const parts=[];let coveredUntil=node.headEnd;
 for(let at=index+1;at<nodes.length&&nodes[at].start<node.contentEnd;at++){
  const child=nodes[at];
  if(child.start<coveredUntil||!['span','li','div'].includes(child.tag)||child.contentEnd-child.headEnd>1400)continue;
  const attrs=attributesOf(child,page);
  if(nonFlavorContainer(attrs)){coveredUntil=child.end;continue;}
  if(kind==='notes'&&!hasClass(attrs,'note'))continue;
  // A span used solely as a wrapper around several chip spans is not one
  // merged flavor. Preserve a span with its own text and inline formatting.
  const direct=children.get(at)||[];
  if(['span','div'].includes(child.tag)&&direct.some(i=>['span','div','li'].includes(nodes[i].tag))){
   let cursor=child.headEnd,own='';
   for(const i of direct){own+=page.slice(cursor,nodes[i].start);cursor=nodes[i].end;}
   own+=page.slice(cursor,child.contentEnd);
   if(!/[\p{L}\p{N}]/u.test(clean(own,90)))continue;
  }
  if(child.tag==='div'&&direct.some(i=>!['span','a','em','strong','b','i','small','sup','sub','br','u','s','label','abbr'].includes(nodes[i].tag)))continue;
  const value=clean(page.slice(child.headEnd,child.contentEnd),90);
  if(!value||FLAVOR_LABEL.test(value)&&!value.replace(FLAVOR_LABEL,''))continue;
  if(!shortFlavorList(value,clean,{allowSingle:true}))continue;
  parts.push(value);coveredUntil=child.end;
  if(parts.length>12)return '';
 }
 const value=parts.length?parts.join(', '):clean(body.replace(/<br\s*\/?\s*>/gi,', '),220).replace(FLAVOR_LABEL,'');
 return shortFlavorList(value,clean,{allowSingle:true});
}
function detailsFlavorContainer(page,nodes,children,index,clean){
 const node=nodes[index];if(node.tag!=='details'||node.contentEnd-node.headEnd>12000)return '';
 const summaries=(children.get(index)||[]).filter(at=>nodes[at].tag==='summary');
 if(summaries.length!==1)return '';
 const summary=nodes[summaries[0]],label=clean(page.slice(summary.headEnd,summary.contentEnd),160);
 if(!/^(?:(?:tasting|taste|flavou?r|cupping|cup)\s*(?:notes?|profile))\s*[:\u2014-]?$/i.test(label))return '';
 return normalizeExplicitCoffeeTastingNotes(clean(page.slice(summary.end,node.contentEnd).replace(/<br\s*\/?\s*>/gi,', '),401),{allowProse:true});
}
function headingSensoryProfile(page,nodes,children,index,clean){
 const node=nodes[index];
 if(!/^h[1-6]$/.test(node.tag)||node.contentEnd-node.headEnd>300)return '';
 const label=clean(page.slice(node.headEnd,node.contentEnd),100);
 if(!/^what you['’]ll find in the cup\s*[:：]?$/i.test(label))return '';
 const siblings=children.get(node.parent)||[],next=nodes[siblings[siblings.indexOf(index)+1]];
 if(!next||!['p','blockquote'].includes(next.tag)||next.contentEnd-next.headEnd>3000||
  !/^\s*$/.test(page.slice(node.end,next.start)))return '';
 // This explicit heading gives one complete sensory paragraph a role.
 // Keep its literal flavor/aroma/finish wording rather than guessing a
 // union of nouns from several sentences or omitting their qualifiers.
 return normalizeExplicitCoffeeTastingNotes(clean(page.slice(next.headEnd,next.contentEnd),401),{allowProse:true});
}
function iconLabeledFlavorRows(page,nodes,children,clean,covered){
 const singles=[],cohorts=new Map();let coverAt=0;
 for(const node of nodes){
  if(node.tag!=='img')continue;
  while(coverAt<covered.length&&covered[coverAt].end<=node.start)coverAt++;
  if(covered[coverAt]?.start<=node.start&&covered[coverAt].end>=node.end)continue;
  const attrs=attributesOf(node,page),role=[attrs.get('alt'),attrs.get('title'),attrs.get('src')].filter(Boolean).join(' ');
  if(role.length>2400||!/(?:tasting|taste|flavou?r|cupping|cup)[\s_/-]*(?:notes?|profile)|(?:^|[/_.-])tasting\.(?:svg|png|jpe?g|webp)(?:[?#]|$)/i.test(role))continue;
  let at=node.parent;
  for(let depth=0;at!==null&&at!==undefined&&depth<6;depth++){
   const parent=nodes[at];if(parent.contentEnd-parent.headEnd>3000)break;
   const pAttrs=attributesOf(parent,page);
   const textIcon=parent.tag==='li'&&hasClass(pAttrs,'icon-with-text__item');
   if(nonFlavorContainer(pAttrs)&&!textIcon){at=parent.parent;continue;}
   const raw=clean(page.slice(parent.headEnd,parent.contentEnd),401).replace(FLAVOR_LABEL,'');
   // An explicitly labeled flavor icon can introduce a complete sensory
   // paragraph with several sentences, just like a printed text label.
   // Do not split its BR-separated notes/body/acidity into competing chips.
   const value=normalizeExplicitCoffeeTastingNotes(raw,{allowProse:true});
   if(value){
    if(parent.tag==='li'&&parent.parent!==null&&['ul','ol'].includes(nodes[parent.parent].tag)){
     const cohort=cohorts.get(parent.parent)||new Map();cohort.set(at,value);cohorts.set(parent.parent,cohort);
    }else singles.push({value,kind:'explicit_icon_label',start:parent.start,end:parent.end});
    break;
   }
   at=parent.parent;
  }
 }
 for(const [index,items] of cohorts){
  if(!items.size||items.size>12)continue;
  const node=nodes[index],value=shortFlavorList([...items.values()].join(', '),clean);
  if(value)singles.push({value,kind:'explicit_icon_label',start:node.start,end:node.end});
 }
 return singles;
}
function productHeroFlavorProfiles(page,nodes,clean){
 // A merchant often presents an unlabeled sensory list in its product
 // subtitle or the first heading of the product description. Require that
 // structural role, a compact literal list, and an existing sensory word.
 // The cue classifies text already printed by the merchant; it never adds
 // a flavor, translates one, or treats a cultivar/country list as notes.
 const found=[],descriptionBlocks=new Map();
 for(let index=0;index<nodes.length;index++){
  const node=nodes[index];if(!['p','span','div','h1','h2','h3','h4','h5','h6'].includes(node.tag)||node.contentEnd-node.headEnd>3500)continue;
  const attrs=attributesOf(node,page),classes=String(attrs.get('class')||'').split(/\s+/);
  let subtitle=classes.some(value=>['product__text','product__block__text','pdp__notes'].includes(value));
  let description=null,highlights=false;
  for(let parent=node.parent,depth=0;parent!==null&&parent!==undefined&&depth<8;depth++){
   const a=attributesOf(nodes[parent],page),identity=[a.get('class'),a.get('id')].filter(Boolean).join(' ');
   if(depth<2&&String(a.get('class')||'').split(/\s+/).includes('product__block__text'))subtitle=true;
   if(String(a.get('class')||'').split(/\s+/).includes('coffee-highlights-slider'))highlights=true;
   if(a.get('itemprop')==='description'||/(?:^|\s)(?:product[-_]description|product__description)(?:$|\s)/i.test(identity)){description=parent;break;}
   parent=nodes[parent].parent;
  }
  const raw=page.slice(node.headEnd,node.contentEnd);
  // Do not flatten a collection of child blocks or a product purchase form.
  if(/<(?:p|h[1-6]|div|ul|ol|li|table|form|button)\b/i.test(raw))continue;
  if(description!==null&&/^(?:p|h[2-6])$/.test(node.tag))descriptionBlocks.set(description,(descriptionBlocks.get(description)||0)+1);
  const earlyDescription=description!==null&&(descriptionBlocks.get(description)||0)<=8;
  const titleProfile=node.tag==='h1'&&/\|/.test(clean(raw,401));
  if(!subtitle&&!earlyDescription&&!titleProfile&&!highlights)continue;
  // A line break inside a sentence is typography, not the beginning of a
  // new hero profile. Otherwise "notes of fruit<br>punch, passion fruit..."
  // loses the first half of a compound flavor and overrides the full prose.
  const completeText=clean(raw,401);
  if(/<br\b/i.test(raw)&&/\b(?:notes?\s+of|flavou?rs?\s+of|tastes?\s+like)\b/i.test(completeText)&&
   !EXPLICIT_FLAVOR_LABEL.test(completeText))continue;
  for(const line of raw.split(/<br\b[^<>]{0,2000}>/gi).slice(0,12)){
   const bullet=/^[-•·]\s+/.test(clean(line,401));
   let text=clean(line,401).replace(/^[-•·]\s+/,'');
   if(titleProfile)text=text.split('|').at(-1).trim();
   const parts=noteParts(text);
   if(parts.length<3||!SENSORY_ROLE.test(text)||explicitCoffeeVarietyList(text)||parts.every(part=>extractCoffeeTitleOrigin(part)))continue;
   if(!subtitle&&!titleProfile&&!highlights&&!bullet&&!/^h[2-6]$/.test(node.tag)&&text!==text.toUpperCase()&&(descriptionBlocks.get(description)||0)!==1)continue;
   const value=shortFlavorList(text,clean);if(value)found.push({value,kind:'named_chips'});
  }
 }
 return found;
}
function sipComparisonNotes(html,clean){
 // A named TAKE A SIP section must describe this coffee's flavor, not a
 // metaphor about a memory, vacation or the shopping experience.
 const at=html.search(/<strong\b[^<>]{0,2000}>\s*TAKE A SIP\s*[|:]\s*<\/strong>/i);
 if(at<0)return '';
 const paragraphs=coffeeHtmlElements(html).nodes.filter(node=>node.tag==='p'&&node.contentEnd>at);
 const pieces=[];let size=0;
 for(const paragraph of paragraphs.slice(0,4)){
  const value=clean(html.slice(paragraph.headEnd,paragraph.contentEnd),6001);
  if(pieces.length&&/^(?:Origin|Country|Region|Producer|Farm|Variet(?:y|al)|Process|Roast|Brewing)\s*[:|–—-]/i.test(value))break;
  if((size+=value.length)>5000)return '';
  pieces.push(value);
 }
 const text=pieces.join(' ');
 if(!/\b(?:coffee|decaf|cup|flavou?r|taste|acidity|sweetness|finish)\b/i.test(text))return '';
 const found=[];
 const offer=(raw,sentence)=>{
  if(NONFACTUAL.test(sentence.replace(/\bnot only\b/gi,'')))return;
  const phrase=raw.trim().replace(/^(?:a|an|the)\s+/i,'');
  if(!/\b(?:your|my|our|their|favorite|memory|memories|experience|childhood|summer day|journey|adventure|walking|standing|visiting|factory|vacation)\b/i.test(phrase)&&
   shortFlavorList(phrase,clean,{allowSingle:true}))found.push(phrase);
 };
 for(const sentence of text.split(/(?<=[.!?])\s+/u)){
  // The suffix in "grape-like in character" is not the comparison word
  // "like". Scene metaphors such as walking into a factory are not flavors.
  for(const match of sentence.matchAll(/(?<![\p{L}-])\blike\s+([\p{L}][\p{L}\p{M}'’ -]{1,45}?)\s*(?=,|;|\.|[—–]|$)/giu))offer(match[1],sentence);
  for(const match of sentence.matchAll(/\bremind(?:ing)?\s+us\s+of\s+([^.!?;]{2,100}?)(?=,|\s+and (?:almost|that|this)\b|[.!?;]|$)/giu))offer(match[1],sentence);
  for(const match of sentence.matchAll(/\bgiving\s+us\s+(?:a |an )?(?:delightful |distinct |sweet )?([\p{L}][\p{L}\p{M}'’ -]{1,45}?)\s+notes?\b/giu))offer(match[1],sentence);
  const last=sentence.match(/\bas\s+[^.!?;]{0,50}?\s+as\s+([\p{L}][\p{L}\p{M}'’ -]{1,35}?)\s*(?=,|;|\.|$)/iu);
  if(last)offer(last[1],sentence);
 }
 if(found.length<2||found.length>7)return '';
 return shortFlavorList([...new Set(found)].join(', '),clean);
}
// Keep literal French sensory nouns, without translating or guessing them.
function frenchProductSensoryNotes(page,clean){
 for(const m of page.matchAll(/<p\b[^<>]{0,350}>([\s\S]{30,1600}?)<\/p\s*>/gi)){
  const prose=clean(m[1],780);
  if(NONFACTUAL.test(prose))continue;
  const cue=/\bnotes?\s+florales?[^.!?()]{0,90}\(([\p{L}\p{M}'’ -]{2,40})\)/iu.exec(prose);
  if(!cue)continue;
  const tail=prose.slice(cue.index+cue[0].length, cue.index+cue[0].length+170);
  const citrus=/\bdu\s+([\p{L}\p{M}'’ -]{3,45}?)\s+et\s+une\s+sucrosit/iu.exec(tail);
  const fruit=/\brappelant\s+la\s+([\p{L}\p{M}'’ -]{3,45})(?=[.!?]|$)/iu.exec(tail);
  if(!citrus||!fruit)continue;
  const accepted=shortFlavorList([cue[1],citrus[1],fruit[1]].map(s=>s.trim()).join(', '),clean);
  if(accepted)return accepted;
 }
 return '';
}

// These continuations are explicit relationships in one selected-product
// sentence. Keep their literal descriptors; do not turn conditional milk,
// brewing, historical or alternative profiles into unqualified notes.
// Preparation-dependent descriptions remain in complete source facts. They
// cannot become an unconditional profile simply because they say "notes of".
const PREPARATION_QUALIFIED_FLAVOR=/\b(?:(?:when|if|once|after|before|while)\s+(?:(?:(?:it|this coffee|the coffee|this cup)\s+is|it['’]s)\s+)?(?:served|prepared|brewed|mixed|combined|diluted|layered|cooled|heated|warmed)|(?:when|if|once|after|before|while)\s+(?:you|we)\s+(?:add|mix\s+in|stir\s+in)\s+(?:(?:some|extra|a\s+little)\s+)?milk|(?:served|prepared|brewed|mixed|combined|diluted|layered)\s+with\s+milk(?![ -]+chocolate\b))\b/i;
const CONDITIONAL_FLAVOR=/\b(?:if|unless|when|after|before|while|once|until|because|only|may|might|could|would|should|can|depending|served|prepared|brewed|added|adding|diluted|steeped|cooled|heated|warmed|either|or|otherwise|alternatively|instead)\b/i;
function unconditionalFlavorPrefix(value){
 // Semicolons and an explicit additive-notes relation can qualify only a
 // later clause. Slice the original prefix so earlier additions stay intact.
 let start=0,previousBoundary=0;
 for(const boundary of value.matchAll(/;|\s+with\s+additional\s+(?:sweet\s+)?notes?\s+of\s+/gi)){
  if(PREPARATION_QUALIFIED_FLAVOR.test(value.slice(start,boundary.index)))
   return value.slice(0,previousBoundary).trim();
  previousBoundary=boundary.index;start=boundary.index+boundary[0].length;
 }
 return PREPARATION_QUALIFIED_FLAVOR.test(value.slice(start))?value.slice(0,previousBoundary).trim():value;
}
function layeredComponentFlavor(sentence,clean){
 if(sentence.length>450||CONDITIONAL_FLAVOR.test(sentence))return '';
 const match=sentence.match(/^(.{2,100}?)\s+notes?\s+of\s+(?:our|the)\s+(.{2,80}?)\s+are\s+(?:(?:intricately|carefully|beautifully)\s+)?layered\s+with\s+(?:the\s+)?(.{2,140}?)\s+from\s+(?:our|the)\s+(.{2,80}?)[.!?]?$/i);
 if(!match||!extractCoffeeTitleOrigin(match[2])||!extractCoffeeTitleOrigin(match[4]))return '';
 const first=shortFlavorList(match[1],clean,{allowSingle:true}),second=shortFlavorList(match[3],clean,{allowSingle:true});
 if(!first||!second||!SENSORY_ROLE.test(first)||!SENSORY_ROLE.test(second))return '';
 return shortFlavorList(first+', '+second,clean,{allowSingle:true});
}
function straightShotFlavor(sentence,previous,clean){
 if(sentence.length>350||CONDITIONAL_FLAVOR.test(sentence)||CONDITIONAL_FLAVOR.test(previous||'')||NONCURRENT_COFFEE_PROSE.test(previous||'')||
  !/^Straight shots\b/i.test(previous||'')||/\b(?:camera|photograph|photography|shooting|lens)\b/i.test(previous||''))return '';
 const match=sentence.match(/^They\s+(?:begin|start)\s+with\s+(?:a |an )?(.{2,100}?)\s+(?:that|which)\s+is\s+(?:tamed|balanced|complemented)\s+with\s+(?:a |an )?(.{2,100}?)(?:,\s*and\s+(?:end|finish)\s+with\s+(?:a |an )?(.{2,100}?))?[.!?]?$/i);
 if(!match||!SENSORY_ROLE.test(match[1])||!/\b(?:sweetness|aroma|flavou?r)\b/i.test(match[1])||
  !/\b(?:nuttiness|sweetness|aroma|flavou?r)\b/i.test(match[2])||
  (match[3]&&!/\bfinish$/i.test(match[3])))return '';
 const parts=match.slice(1).filter(Boolean).map(value=>shortFlavorList(value,clean,{allowSingle:true}));
 return parts.every(Boolean)?shortFlavorList(parts.join(', '),clean,{allowSingle:true}):'';
}
function finishContinuation(sentence,first,clean){
 if(sentence.length>650||CONDITIONAL_FLAVOR.test(sentence)||/\b(?:with\s+milk|previously|formerly|historically|(?:last|previous)\s+season)\b/i.test(sentence))return '';
 const match=sentence.match(/\b(?:(?:tasting|taste|flavou?r|cupping|cup)\s+)?notes?\s+of\s*:?\s+([^.!?;]{2,250});\s*([^.!?;]{2,90}\bfinish)[.!?]?$/i)||
  sentence.match(/\b(?:(?:tasting|taste|flavou?r|cupping|cup)\s+)?notes?\s+of\s*:?\s+([^.!?;]{2,250}),\s*complemented\s+by\s+([^.!?;]{2,90}\bundertones)[.!?]?$/i);
 if(!match||fold(match[1])!==fold(first))return '';
 const tail=shortFlavorList(match[2],clean,{allowSingle:true});
 return tail&&SENSORY_ROLE.test(tail)?shortFlavorList(first+', '+tail,clean,{allowSingle:true}):'';
}

function primaryCurrentFlavor(sentence,clean){
 if(sentence.length>260||CONDITIONAL_FLAVOR.test(sentence)||NONCURRENT_COFFEE_PROSE.test(sentence))return '';
 const match=sentence.match(/^The\s+(?:dominant|primary)\s+(?:flavou?r|tasting)\s+note\s+of\s+this\s+coffee\s+that\s+we\s+taste\s+is\s+(.{2,80}?)(?:\s+but\s+think\s+[^.!?]{2,80})?[.!?]?$/i);
 return match?shortFlavorList(match[1],clean,{allowSingle:true}):'';
}
function coordinatedFlavorSentence(sentence,blockText,clean){
 if(sentence.length>700||CONDITIONAL_FLAVOR.test(sentence)||/\b(?:with\s+milk|previously|formerly|historically|(?:last|previous)\s+season)\b/i.test(sentence))return '';
 const combine=parts=>{
  const notes=parts.map(value=>shortFlavorList(value.trim(),clean,{allowSingle:true}));
  return notes.every(Boolean)?shortFlavorList(notes.join(', '),clean,{allowSingle:true}):'';
 };
 // Each relationship below explicitly coordinates descriptors in one current
 // sentence. Keep literal modifiers; never combine independent profiles.
 let match=sentence.match(/\b(?:this|our|the)\s+[^.!?]{0,80}\bcoffee\s+is\s+[^.!?]{0,60}\bwith\s+(.{2,100}?)\s+up\s+front\s+with\s+(.{2,100}?)\s+in\s+the\s+finish[.!?]?$/i);
 if(match&&SENSORY_ROLE.test(match[1]))return combine([match[1],match[2]]);
 match=sentence.match(/^(.{2,80}?)\s+undertones\s+(?:dance|blend|combine)\s+with\s+(.{2,80}?)\s+notes?\s+and\s+(?:a|an)\s+(.{2,80}?)\s+essence(?:\s*,\s*culminating\s+in\s+[^.!?]{2,100})?[.!?]?$/i);
 if(match&&SENSORY_ROLE.test(match[1]))return combine([match[1],match[2],match[3]]);
 match=sentence.match(/\b(?:this|our|the)\s+[^.!?]{0,80}\bcoffee\s+(?:boasts|offers|features)\s+(.{2,80}?)\s+notes?,\s*(.{2,80}?\bsweetness),\s*and\s+(?:a|an)\s+hint\s+of\s+(.{2,80}?)[.!?]?$/i);
 if(match&&SENSORY_ROLE.test(match[1])&&SENSORY_ROLE.test(match[2]))return combine([match[1],match[2],match[3]]);
 match=sentence.match(/\b(?:this|our|the)\s+[^.!?]{0,80}\bcoffee\s+(?:boasts|offers|features)\s+(.{2,240}?\bundertones(?:,\s*and\s+(?:a|an)\s+[^.!?]{2,60}\bsweetness)?)(?:,\s*all\s+captured\s+in\s+(?:a|an)\s+(?:light|medium|dark)\s+roast)?[.!?]?$/i);
 if(match&&/\bsweetness\b/i.test(match[1]))return combine([match[1]]);
 match=sentence.match(/\bcoffee\s+that\s+is\s+(.{2,180}?\bundertones)[.!?]?$/i);
 if(match&&SENSORY_ROLE.test(match[1]))return combine([match[1]]);
 // Named blend components can explicitly combine their own notes. Names alone
 // or a comparison with another coffee cannot establish this relationship.
 match=sentence.match(/^The\s+(.{2,80}?)\s+notes?\s+of\s+the\s+(\p{Lu}[\p{L}\p{M}'’ -]{1,70}?)\s+pair\s+perfectly\s+with\s+the\s+notes?\s+of\s+(.{2,80}?)\s+from\s+the\s+(\p{Lu}[\p{L}\p{M}'’ -]{1,70}?),\s+and\s+together\s+they\s+deliver\s+[^.!?]{2,120}[.!?]?$/u);
 const currentBlend=blockText.split(/(?<=[.!?])\s+/u).some(text=>
  /\b(?:this|our|the)\s+blend\b/i.test(text)&&!NONCURRENT_COFFEE_PROSE.test(text)&&
  !/\b(?:previously|formerly|historically|(?:last|previous)\s+season|with\s+milk|served|prepared|brewed|added|adding|mixed|combined|diluted)\b/i.test(text));
 if(match&&fold(match[2])!==fold(match[4])&&currentBlend&&
  SENSORY_ROLE.test(match[1])&&SENSORY_ROLE.test(match[3]))return combine([match[1],match[3]]);
 // A current coffee's standalone sensory sentence can pair literal flavor
 // nouns and then qualify the remaining fruit sweetness of its varietal.
 // That final descriptive qualifier is not another tasting-note ingredient.
 // Keep the paired words only; never infer post-roast flavor additives from
 // a separate fermentation explanation.
 match=sentence.match(/^([\p{L}\p{M}][^.!?;,]{2,130}?\s+and\s+[\p{L}\p{M}][^.!?;,]{2,90}?),\s+with\s+(?:the|a)\s+fruit\s+sweetness\s+of\s+(?:the|this)\s+varietal\s+still\s+sitting\s+underneath[.!?]?$/iu);
 if(match&&SENSORY_ROLE.test(match[1])&&noteParts(match[1]).length>=2)
  return combine([match[1]]);
 return '';
}

// A named assertion is current-product evidence only when its literal subject
// agrees with the selected H1. Country adjectives use the existing literal
// place reader; processing words alone never identify a coffee.
function selectedSensorySubject(subject,name,blendScope=false){
 if(!name||subject.length>110||name.length>220)return false;
 const subjectPlace=extractCoffeeTitleOrigin(subject),namePlace=extractCoffeeTitleOrigin(name);
 if(subjectPlace&&namePlace&&fold(subjectPlace.value)!==fold(namePlace.value))return false;
 if(/\bdecaf(?:feinated)?\b/i.test(subject)&&!/\bdecaf(?:feinated)?\b/i.test(name))return false;
 const processes=value=>new Set((value.match(/\b(?:washed|natural|honey)\b/gi)||[]).map(fold));
 const subjectProcesses=processes(subject),nameProcesses=processes(name);
 if(subjectProcesses.size&&nameProcesses.size&&![...subjectProcesses].every(value=>nameProcesses.has(value)))return false;
 if(/^(?:coffee|cup|lot|blend)$/i.test(subject))return true;
 // A named component of a selected blend cannot stand for its full profile.
 if(blendScope)return fold(subject)===fold(name);
 const selected=new Set(fold(name).split(' ')),tokens=fold(subject).split(' ').filter(value=>
  !/^(?:coffee|cup|lot|decaf|decaffeinated|fully|washed|natural|honey)$/.test(value));
 return tokens.length>0&&tokens.every(token=>{
  if(selected.has(token))return true;
  const place=extractCoffeeTitleOrigin(token);
  return place&&namePlace&&fold(place.value)===fold(namePlace.value);
 });
}
function currentSelectedBlend(block){
 if(block.educational||/^(?:about the region|regional (?:profile|characteristics)|coffee producers here)\b/i.test(block.text)||
  /^(?:about the region|regional (?:profile|characteristics))\b/i.test(block.section))return false;
 const text=block.text.split(/\bAbout the Region\b/i)[0];
 return text.split(/(?<=[.!?])\s+|(?<=[!?])(?=(?:This|Our|The)\s)/u).some(sentence=>
  (/^(?:this|our|the current)\s+blend\b/i.test(sentence)||
   /^(?:this|our|the current)\s+(?:coffee|espresso|lot|offering)\s+(?:is\s+(?:a|an)\s+blend\b|blends\b)/i.test(sentence)||
   /^we\s+blend\s+[^.!?;]{2,220}\s+for\s+(?:this|our|the current)\s+(?:coffee|espresso|lot|offering)\b/i.test(sentence))&&
  !NONCURRENT_COFFEE_PROSE.test(sentence)&&
  !CONDITIONAL_FLAVOR.test(sentence)&&!/\b(?:hypothetical(?:ly)?|fictional|previously|formerly|historically|(?:last|previous)\s+(?:season|year|release|harvest))\b/i.test(sentence));
}
const DIRECT_EXTRACTION_FLAVOR=/^(?:(?:pushing|adjusting|changing|increasing|reducing|lengthening|shortening)\s+(?:your|the)\s+extraction\b|(?:turbos?|turbo\s+(?:shots?|espresso))\s+(?:are|is|have|has|offer|offers|bring|brings|yield|yields)\b)/i;
// A country-qualified cup/variety assertion belongs to the selected coffee,
// not a named component of a blend. Keep the complete sensory phrase before
// the literal place; the existing country reader supplies no inferred place.
function placeQualifiedFlavor(raw,name,clean,blendScope,origin,originConflict){
 if(!name||blendScope||originConflict||raw.length>150)return '';
 const words=raw.trim().split(/\s+/),places=literalCoffeeSourcePlaces(origin||name);
 if(places.length!==1)return '';
 for(let count=1;count<=Math.min(4,words.length-1);count++){
  const place=extractCoffeeTitleOrigin(words.slice(-count).join(' '));
  if(!place)continue;
  if(fold(place.value)!==fold(places[0]))return '';
  const value=shortFlavorList(words.slice(0,-count).join(' '),clean,{allowSingle:true});
  // Eligibility is a printed sensory role, never a filtered list of expected
  // words. "Fruity" is the adjective form of the existing fruit role.
  if(value&&(SENSORY_ROLE.test(value)||/\bfruity\b/i.test(value))&&
   !/\b(?:body|mouthfeel|acidity|balance|balanced|organic|certified|rare|exclusive)\b/i.test(value))return value;
 }
 return '';
}
const NONCURRENT_SENSORY_SECTION=/^(?:(?:last|previous|past|former|historical)\b|(?:other|another|different)\s+(?:coffee|blend|lot|cup|profile)\b)/i;
function selectedLiteralFlavorSentence(sentence,name,clean,blendScope=false,{origin='',originConflict=false,section=''}={}){
 if(NONCURRENT_SENSORY_SECTION.test(section)||sentence.length>550||CONDITIONAL_FLAVOR.test(sentence)||NONCURRENT_COFFEE_PROSE.test(sentence)||
  /\b(?:hypothetical(?:ly)?|fictional|previously|formerly|historically|(?:last|previous)\s+season|with\s+milk(?![ -]+chocolate\b))\b/i.test(sentence))return '';
 let match=sentence.match(/^(?:This|Our)\s+(.{2,110}?)\s+is\s+(?:a|an)\s+[^.!?;]{0,70}\bcup,\s+with\s+(.{2,250}?)[.!?]?$/i);
 if(match&&selectedSensorySubject(match[1],name,blendScope)&&noteParts(match[2]).length>=2&&
  !/\b(?:body|mouthfeel|acidity|balance|balanced)\b/i.test(match[2]))return shortFlavorList(match[2],clean);
 match=sentence.match(/^Our\s+(.{2,110}?)\s+is\s+([^.!?;,]{2,70}\bforward),\s+(?:a|an)\s+([^.!?;,]{2,80}\bsweetness)\s+with\s+(?:a|an)\s+[^.!?;,]{2,60}\bbody[.!?]?$/i);
 if(match&&/\b(?:decaf(?:feinated)?|coffee)\b/i.test(match[1])&&selectedSensorySubject(match[1],name,blendScope)){
  const first=shortFlavorList(match[2],clean,{allowSingle:true}),second=shortFlavorList(match[3],clean,{allowSingle:true});
  return first&&second?shortFlavorList(first+', '+second,clean,{allowSingle:true}):'';
 }
 if(!name)return '';
 // These are complete current-product assertions. Optional flavor choices,
 // roast advice and an aroma-only sentence cannot extend their literal notes.
 match=sentence.match(/^(?:A|An)\s+(.{2,150}?)\s+(?:coffee|variety),\s+roasted\s+to\s+perfection\b[^.!?]{0,120}[.!?]?$/i)||
  sentence.match(/^This\s+(?:[\p{L}\p{M}'’ -]{1,40}\s+)?cup\s+of\s+(.{2,150}?)\s+goodness\b[^.!?]{0,150}[.!?]?$/iu);
 if(match)return placeQualifiedFlavor(match[1],name,clean,blendScope,origin,originConflict);
 match=sentence.match(/^Taste\s+the\s+complexity\s+of\s+([^.!?;]{2,220}?)\s+in\s+(?:every|each)\s+cup[.!?]?$/i);
 if(match&&!/\b(?:body|mouthfeel|acidity|balance|balanced)\b/i.test(match[1]))
  return shortFlavorList(match[1],clean,{allowSingle:true});
 // One explicit profile sentence separates aroma from flavor. The complete
 // flavor clause keeps its modifiers; the preceding aromas remain source text.
 match=sentence.match(/^Coffee\s+profile\s*:\s*Coffee\s+(?:features|offers|has)\s+[^.!?;]{2,220}?\baromas?\s+of\s+[^.!?;]{2,150}?,\s+with\s+([^.!?;]{2,220}?\bflavou?rs?\s+of\s+[^.!?;]{2,180})[.!?]?$/i);
 return match&&!/\b(?:body|mouthfeel|acidity|balance|balanced)\b/i.test(match[1])?
  shortFlavorList(match[1],clean,{allowSingle:true}):'';
}
function mixedCharacteristicsFlavor(segment,clean,section=''){
 if(NONCURRENT_SENSORY_SECTION.test(section))return '';
 const match=segment.match(/^Characteristics\s*[:–—-]\s*(.{2,650})$/i);
 if(!match)return '';
 const value=match[1].split(/\s+\b(?:Origin|Country|Region|Elevation|Altitude|Farm|Producer|Variet(?:y|ies|al)|Process(?:ing)?|Roast(?: Level)?|Harvest|Body|Acidity)\s*[:–—-]\s*/i)[0].trim();
 if(NONCURRENT_COFFEE_PROSE.test(value)||CONDITIONAL_FLAVOR.test(value)||PREPARATION_QUALIFIED_FLAVOR.test(value)||
  /\b(?:hypothetical(?:ly)?|fictional|previously|formerly|historically|(?:last|previous)\s+season|with\s+milk(?![ -]+chocolate\b))\b/i.test(value))return '';
 // The first clause identifies roast; only the separately coordinated
 // sweetness phrase has a flavor role. Do not turn body/acidity into notes.
 const sensory=value.match(/^(?:hints?\s+of\s+)?(?:light|medium|dark|lighter|darker|light[ -]medium|medium[ -]dark)\s+roast,\s*(?:and\s+)?([^.!?;,]{2,100}\bsweetness)[.!?]?$/i);
 if(sensory)return shortFlavorList(sensory[1],clean,{allowSingle:true});
 const roastTaste=value.match(/^(?:light|medium|dark|lighter|darker|light[ -]medium|medium[ -]dark)\s+roast\s+([^.!?;,]{2,90}\btaste),\s*([^.!?;,]{2,90}\bsweetness),\s*[^.!?;,]{2,60}\bbody[.!?]?$/i);
 if(roastTaste&&!/\b(?:body|mouthfeel|acidity|balance|balanced)\b/i.test(roastTaste.slice(1).join(' '))){
  const parts=roastTaste.slice(1).map(part=>shortFlavorList(part,clean,{allowSingle:true}));
  return parts.every(Boolean)?shortFlavorList(parts.join(', '),clean,{allowSingle:true}):'';
 }
 const revealed=value.match(/^(?:A|An)\s+[^.!?;,]{2,70}\bblend\s+of\s+[^.!?;,]{2,70}\bcoffees\s+roasted\s+(?:(?:special|very|ultra)\s+)?(?:light|medium|dark|light[ -]medium|medium[ -]dark)\s+to\s+reveal\s+(?:a|an)\s+([^.!?;]{2,90}\btaste,\s*[^.!?;]{2,90}\bundertones\s+and\s+[^.!?;]{2,90})[.!?]?$/i);
 return revealed&&!/\b(?:body|mouthfeel|acidity|balance|balanced)\b/i.test(revealed[1])?
  shortFlavorList(revealed[1],clean,{allowSingle:true}):'';
}

// A causal explanation of processing can describe a broad quality without
// asserting another cup profile. It is secondary only when this same selected
// product has a complete current named notes statement; otherwise retain the
// existing fallback, and never demote a separately asserted notes/flavor list.
function selectedNamedNoteStatement(sentence,name,blendScope,{origin='',originConflict=false,section=''}={}){
 if(originConflict||NONCURRENT_SENSORY_SECTION.test(section)||CONDITIONAL_FLAVOR.test(sentence)||
  NONCURRENT_COFFEE_PROSE.test(sentence)||/\b(?:previously|formerly|historically|hypothetical(?:ly)?|fictional)\b/i.test(sentence))return false;
 const named=new RegExp('^(?:This|Our)\\s+(?:(?:'+ROAST+')[ -]roasted\\s+)?(.{2,110}?)\\s+(?:features|offers|has)\\s+(?:[\\p{L}-]{1,20}\\s+){0,3}(?:(?:tasting|taste|flavou?r|cupping)\\s+)?notes?\\s+of\\b','iu').exec(sentence);
 if(!named||/^(?:coffee|cup|lot|blend)$/i.test(named[1])||!selectedSensorySubject(named[1],name,blendScope))return false;
 const declared=literalCoffeeSourcePlaces(named[1]),selected=literalCoffeeSourcePlaces(origin||name);
 return !declared.length||(selected.length===1&&declared.every(place=>fold(place)===fold(selected[0])));
}
function causalProcessingDescriptor(sentence,descriptor){
 // Only the broad fruit-forward category can qualify this causal mechanism.
 // Specific flavors, directional flavors and lists remain ordinary assertions.
 return /^fruit-forward$/i.test(descriptor)&&
  /^(?:The|This|Our)\s+[^.!?;]{0,55}\bprocess(?:ing)?\b/i.test(sentence)&&
  /\b(?:creating|producing|yielding)\s+[^.!?;]{0,70}\b(?:characteristics|qualities)\s+that\s+contribute(?:s)?\s+to\s+(?:its|the coffee['’]s)\b/i.test(sentence);
}

function flavorProse(page,clean,{origin='',originConflict=false}={}){
 const blocks=productCoffeeProse(page,clean),explicit=new Map(),genericProfiles=new Map(),tastingStatements=new Map(),narrative=new Map();
 const ordinaryNarrative=new Set(),selectedCurrentNotes=new Set();
 const rememberNarrative=(value,processingOnly=false)=>{
  const key=noteKey(value);narrative.set(key,value);
  if(!processingOnly)ordinaryNarrative.add(key);
 };
 const selectedNames=[...new Set(blocks.filter(block=>block.tag==='h1'&&!block.educational).map(block=>block.text))];
 const selectedName=selectedNames.length===1?selectedNames[0]:'';
 const blendScope=/\bblend\b/i.test(selectedName)||blocks.some(currentSelectedBlend);
 const roastVariants=new Set(blocks.flatMap(block=>[...block.text.matchAll(/\bas\s+(?:a|an)\s+((?:very\s+|ultra\s+)?light|medium(?:[ -](?:light|dark))?|dark)\s+roast\b/gi)].map(match=>fold(match[1]))));
 for(const block of blocks){
  if(block.educational||NONCURRENT_SENSORY_SECTION.test(block.section)||/^(?:about the region|regional (?:profile|characteristics)|coffee producers here)\b/i.test(block.text)||
   /^(?:about the region|regional (?:profile|characteristics))\b/i.test(block.section))continue;
  const regionAt=block.text.search(/\bAbout the Region\b/i),blockText=regionAt<0?block.text:block.text.slice(0,regionAt);
  // A visible, named profile has precedence over a marketing description.
  // Read each BR-separated labeled line independently, including inline
  // formatting, rather than swallowing the next Origin or Roast label.
  for(const line of block.html.split(/<br\b[^<>]{0,2000}>/gi).slice(0,24)){
   // productCoffeeProse has already bounded a complete visible block at
   // 6,000 characters. A second shorter slice can manufacture a partial
   // flavor and falsely contradict the same complete profile elsewhere.
   const value=clean(line,6001).replace(/\s+/g,' ').trim();
   const segments=EXPLICIT_FLAVOR_LABEL.test(value)?[value]:value.split(/(?<=[.!?])\s+/u).slice(0,32);
   for(const segment of segments){
    const characteristics=roastVariants.size<=1?mixedCharacteristicsFlavor(segment,clean,block.section):'';
    if(characteristics)genericProfiles.set(noteKey(characteristics),characteristics);
    const generic=segment.match(/^Profile\s*:\s*(.{2,300})$/i);
    // "We taste ..." in a sentence is a narrative supplement. A printed
    // label such as "We Taste: ..." is an explicit profile. Giving both
    // the same rank creates a false conflict when the story elaborates
    // on a concise profile. A generic "Profile" label is likewise a
    // fallback, because it can summarize body/acidity rather than notes.
    const match=segment.match(EXPLICIT_FLAVOR_LABEL)||segment.match(/^tastes?\s+like\s+(.+)$/i)||segment.match(/^(?:(?:tasting|taste|flavou?r|cupping)\s+notes?\s+of)\s*:?\s+(.+)$/i)||
     (generic&&SENSORY_ROLE.test(generic[1])&&noteParts(generic[1]).length>=2?generic:null);
    if(!match)continue;
    const raw=match[1].split(/\b(?:Origin|Country|Region|Elevation|Altitude|Farm|Producer|Variet(?:y|ies|al)|Process(?:ing)?|Roast(?: Level)?|Harvest)\s*:/i)[0]
     .split(/\s+[-–—]{1,3}\s+(?=(?:roast(?:ed)?|this|it|we|our|the coffee)\b)/i)[0].replace(/\s+[-–—]\s+/g,', ').trim();
    const notes=normalizeExplicitCoffeeTastingNotes(raw,{allowProse:true});
    const profiles=match===generic?genericProfiles:explicit;
    if(notes&&!profiles.has(noteKey(notes)))profiles.set(noteKey(notes),notes);
   }
  }
  const sentences=blockText.split(/(?<=[.!?])\s+|(?<=[!?])(?=(?:This|Our|The)\s)/u);
  for(const [sentenceIndex,fullSentence] of sentences.entries()){
   if(fullSentence.length>1800)continue;
   // A later semicolon clause can qualify just a finish. Keep an earlier
   // unconditional profile, but never promote that clause or later text.
   const sentence=unconditionalFlavorPrefix(fullSentence);
   if(!sentence||/\b(?:hypothetical(?:ly)?|fictional|previously|formerly|historically)\b/i.test(sentence)||NONCURRENT_COFFEE_PROSE.test(sentence.replace(/\bnot only\b|\bshould not be missed\b/gi,''))||
    /\b(?:regional|varietal|cultivar|designation of origin)\b[^.!?]{0,220}\b(?:known|boasts?|recognition)\b/i.test(sentence))continue;
   const primary=primaryCurrentFlavor(sentence,clean);
   if(primary){rememberNarrative(primary);continue;}
   if(roastVariants.size>1||DIRECT_EXTRACTION_FLAVOR.test(sentence))continue;
   const literal=selectedLiteralFlavorSentence(sentence,selectedName,clean,blendScope,{origin,originConflict,section:block.section});
   if(literal){rememberNarrative(literal);continue;}
   const coordinated=coordinatedFlavorSentence(sentence,blockText,clean);
   if(coordinated){rememberNarrative(coordinated);continue;}
   const continuation=layeredComponentFlavor(sentence,clean)||straightShotFlavor(sentence,sentences[sentenceIndex-1],clean);
   if(continuation)rememberNarrative(continuation);
   const forwardNoteIntroductions=[];
   const patterns=[
    /\b(?:in the cup[,]?\s+(?:we (?:find|taste)|you(?:['’]ll| will) (?:find|taste)|it (?:showcases?|features?))|we(?:['’]re| are) tasting|we taste)\s+([^.!?;]{2,350})/gi,
    /\b(?:take (?:one|a) sip|in this cup)[,:]?\s+you(?:['’]ll| will) find\s+([^.!?;]{2,350})/gi,
    /\b(?:(?:tasting|taste|flavou?r|cupping|cup)\s+)?notes?\s+of\s*:?\s+([^.!?;]{2,350})/gi,
    /\b(?:tastes?|tasting)\s+(?:like|of)\s+([^.!?;]{2,350})/gi,
    /\bflavou?rs?\s+of\s+([^.!?;]{2,350})/gi,
    /\b(?:this coffee|this cup|it) reminds us of\s+([^.!?;]{2,350})/gi,
    /\b(?:taste|flavou?r) profile (?:offers?|features?)\s+([^.!?;]{2,350})/gi,
    /\b(?:sensory journey of|we love this cup['’]s)\s+([^.!?;]{2,350})/gi,
    /\b(?:with|and) (?:a |an )?hints? of\s+([^.!?;]{2,350})/gi,
    /\b(?:blend|fusion)\s+of\s+([^.!?;]{2,220}?)\s+creates?\s+(?:an?\s+)?[^.!?;]{0,60}\b(?:flavou?r|taste)\b/gi,
    // A compact sensory bullet can introduce a literal noun list as a
    // bouquet. Its bullet role and noncommercial context are checked below;
    // a standalone flower description is not a coffee tasting statement.
    /^[-–—•]?\s*(?:(?:beautiful|lovely|delicate|complex)\s+)?(?:fruity|floral|aromatic|sensory)\s+bouquet\s+(?:of|including)\s+([^.!?;]{2,350})/gi
   ];
   for(const [patternIndex,pattern] of patterns.entries())for(const match of sentence.matchAll(pattern)){
    let raw=match[1].trim();
    if(patternIndex===9&&(!SENSORY_ROLE.test(raw)||noteParts(raw).length<2||
     /\b(?:coffee|beans?|origins?)\b/i.test(raw)||noteParts(raw).some(part=>extractCoffeeTitleOrigin(part))))continue;
    if(patternIndex===10&&((block.tag!=='li'&&!/^[-–—•]/.test(sentence))||!SENSORY_ROLE.test(raw)||
     /\b(?:gifts?|add[- ]ons?|additions|accessories|merchandise|arrangements?|weddings?|anniversar(?:y|ies)|birthdays?|sold|separately|included|shipping|delivery|orders?|purchases?|checkout|cart)\b/i.test(block.section+' '+sentence)))continue;
    // "Notes of X with additional notes of Y" is one explicitly additive
    // source statement. Preserve both literal lists instead of manufacturing
    // two competing profiles from the two grammatical cues. Separate
    // sentences, alternatives and invalid noun phrases stay unresolved.
    if(patternIndex===2){
     const additional=raw.match(/^(.{2,180}?)\s+with\s+additional\s+(?:sweet\s+)?notes?\s+of\s+(.{2,160})$/i);
     if(additional&&!/\b(?:if|unless|when|after|before|while|once|until|because|only|may|might|could|would|should|can|depending|served|prepared|brewed|blended|mixed|combined|added|adding|diluted|steeped|cooled|heated|warmed|either|or|otherwise|alternatively|instead)\b/i.test(sentence)&&
      !/\b(?:with|by|through|using|as)\b/i.test(additional[2])){
      const first=shortFlavorList(additional[1],clean,{allowSingle:true}),second=shortFlavorList(additional[2],clean,{allowSingle:true});
      if(first&&second)raw=first+', '+second;
     }
    }
    // One directly printed cup profile can add a literal sugar-sweetness
    // descriptor after two named notes, without another "notes of" label.
    // Reject milk/conditional profiles and preserve unrelated source facts.
    if(patternIndex===2&&!CONDITIONAL_FLAVOR.test(sentence)&&
       !PREPARATION_QUALIFIED_FLAVOR.test(sentence)){
     const sugar=raw.match(/^(.{2,180}?)\s+with\s+(?:a|an)\s+(unrefined\s+[\p{L}\p{M}'’ -]{2,45}\s+sweetness)$/iu);
     if(sugar){
      const first=shortFlavorList(sugar[1],clean,{allowSingle:true});
      const last=shortFlavorList(sugar[2],clean,{allowSingle:true});
      if(first&&last&&noteParts(first).length>=2&&SENSORY_ROLE.test(first))
       raw=first+', '+last;
     }
    }
    // A directly selected, unconditional note can say "stone fruit with a
    // lemony brightness". That qualifier is part of the same printed sensory
    // relationship, not incidental marketing. Preserve both literal phrases,
    // never infer "lemon" from "lemony", and reject conditional preparation.
    if(patternIndex===2&&!CONDITIONAL_FLAVOR.test(sentence)&&
       !PREPARATION_QUALIFIED_FLAVOR.test(sentence)){
     const brightness=raw.match(/^(.{2,180}?)\s+with\s+(?:a|an)\s+((?:lemony|limey|citrusy|floral|fruity|tart)\s+brightness)$/iu);
     if(brightness){
      const first=shortFlavorList(brightness[1],clean,{allowSingle:true});
      const last=shortFlavorList(brightness[2],clean,{allowSingle:true});
      if(first&&last&&SENSORY_ROLE.test(first))raw=first+', '+last;
     }
    }
    // Stop prose continuations at their grammatical boundary. This retains
    // literal descriptors and conjunctions, but not a brewing instruction,
    // buying suggestion or a sentence describing the whole experience.
    raw=raw.split(/\s+(?:with (?:a|an|the|additional)|which|that|making|creating|bringing|leaving|culminating|finishing|come out|lead(?:s)? the way|complemented by|followed by|alongside|from the|on the (?:finish|palate)|in (?:each|every|the) cup|this (?:is|will)|we (?:love|recommend))\b|\s+[-—–]{1,3}\s+(?=(?:roast(?:ed)?|this|it|we|our|the coffee)\b)|\s*[—–]\s+|,\s*(?:but\b|this\b|it\b|you\b|the coffee\b)/i)[0];
    raw=raw.replace(/\s*,\s*$/,'').replace(/\s+and\s*$/,'');
    const compactNotes=shortFlavorList(raw,clean,{allowSingle:true});
    const notes=patternIndex===2&&compactNotes?finishContinuation(sentence,compactNotes,clean)||compactNotes:compactNotes;
    if(notes){
     if(patternIndex===2&&!CONDITIONAL_FLAVOR.test(sentence)&&!/\b(?:with\s+milk|previously|formerly|historically|(?:last|previous)\s+season)\b/i.test(sentence))forwardNoteIntroductions.push([match.index,match.index+match[0].indexOf(match[1])]);
     if(patternIndex===2&&selectedNamedNoteStatement(sentence,selectedName,blendScope,{origin,originConflict,section:block.section}))
      selectedCurrentNotes.add(noteKey(notes));
     if(patternIndex<2)tastingStatements.set(noteKey(notes),notes);
     else rememberNarrative(notes);
    }
   }
   // Preserve the literal noun list before a sensory suffix. Try bounded
   // grammatical/comma boundaries, retaining the longest valid list once.
   for(const match of sentence.matchAll(/\b(?:(?:tasting|taste|flavou?r|cupping)\s+)?(?:notes|flavou?rs?|taste)\b(?!\s*:)/gi)){
    // In a parsed "fruit-forward notes of raspberry..." phrase, the
    // adjective describes those same notes; it is not a competing profile.
    if(forwardNoteIntroductions.some(([start,end])=>match.index>=start&&match.index<end))continue;
    const before=sentence.slice(0,match.index).trim();if(!before||before.length>700)continue;
    if(/\bwith\s+additional(?:\s+sweet)?$/i.test(before))continue;
    const starts=new Set([0]);
    for(const boundary of before.matchAll(/,\s*|\b(?:filled with|full of|loads of|with(?: (?:a|an|its|their))?|featuring|features?|highlighting|hints? of|offers?(?: an?)?|has(?: an?)?|showcases?|boasts?|savor(?: the)?(?: unique)?|results in|balance of|delivers?(?: an?)?|for a)\s+/gi)){
     starts.add(boundary.index+boundary[0].length);if(starts.size>=32)break;
    }
    const candidates=[...starts].map(start=>before.slice(start).replace(/^and\s+/i,'').trim())
     .map(raw=>shortFlavorList(raw,clean,{allowSingle:true})).filter(value=>value&&SENSORY_ROLE.test(value)&&
      !/\b(?:body|mouthfeel|acidity)\b/i.test(value)).sort((a,b)=>b.length-a.length);
    if(candidates[0])rememberNarrative(candidates[0],/^flavou?rs?$/i.test(match[0])&&causalProcessingDescriptor(sentence,candidates[0]));
   }
  }
 }
 // Two explicitly different printed profiles stay unresolved. Narrative
 // sentences are less authoritative than a complete labeled profile; retain
 // their original text in source_facts instead of fabricating a merged list.
 // Repeated grammar paths may find a tail of the same literal noun list.
 // Keep its complete source phrase instead of treating its own tail as a
 // second competing profile. Independent narrative phrases remain unresolved.
 const eligible=[...narrative].filter(([key])=>!selectedCurrentNotes.size||ordinaryNarrative.has(key)).map(([,value])=>value);
 const candidates=eligible.filter(value=>!eligible.some(other=>
  other!==value&&fold(other).includes(fold(value))));
 return {explicit:[...explicit.values()],narrative:genericProfiles.size===1?[...genericProfiles.values()][0]:
  !genericProfiles.size&&tastingStatements.size===1?[...tastingStatements.values()][0]:
   !genericProfiles.size&&!tastingStatements.size&&candidates.length===1?candidates[0]:''};
}

export function extractProductFlavorProfileEvidence(html,{clean}={}){
 if(typeof html!=='string'||typeof clean!=='function'||html.length>2_000_000)return [];
 clean=flavorCleaner(clean);
 const page=flavorPage(html),{nodes}=coffeeHtmlElements(page),found=[],lowPriority=[],children=new Map(),covered=[];
 for(let index=0;index<nodes.length;index++){
  const parent=nodes[index].parent,list=children.get(parent)||[];
  list.push(index);children.set(parent,list);
 }
 // Structural traversal finds explicitly named containers inside ordinary
 // wrappers and after decoration. Scope and scanner limits, not a raw-byte
 // slice after H1, define which selected-product evidence can be inspected.
 for(let index=0;index<nodes.length;index++){
  const node=nodes[index];
  if(node.start<(covered.at(-1)?.end??-1))continue;
  const heading=headingSensoryProfile(page,nodes,children,index,clean);
  if(heading)found.push({value:heading,kind:'explicit_label'});
  const detail=detailsFlavorContainer(page,nodes,children,index,clean);
  if(detail){found.push({value:detail,kind:'explicit_label'});covered.push({start:node.start,end:node.end});continue;}
  if(!['p','em','div','ul','ol','section'].includes(node.tag))continue;
  const kind=namedFlavorContainer(node,attributesOf(node,page));
  if(!kind)continue;
  const value=containerNotes(page,nodes,children,index,kind,clean);
  if(value){(kind==='text'?lowPriority:found).push({value,kind:'named_chips'});covered.push({start:node.start,end:node.end});}
  if(found.length>=128)break;
 }
 for(const row of iconLabeledFlavorRows(page,nodes,children,clean,covered))found.push({value:row.value,kind:row.kind});
 for(const value of flavorProse(page,clean).explicit)found.push({value,kind:'explicit_label'});
 if(!found.length)found.push(...productHeroFlavorProfiles(page,nodes,clean));
 if(!found.length)found.push(...lowPriority);
 const unique=new Map();
 for(const profile of found.slice(0,256)){
  const key=profile.kind+'\0'+noteKey(profile.value);if(!unique.has(key))unique.set(key,profile);
 }
 return [...unique.values()];
}
export function extractProductFlavorProfiles(html,options={}){
 return [...new Map(extractProductFlavorProfileEvidence(html,options).map(profile=>[noteKey(profile.value),profile.value])).values()];
}
// Only a current, explicitly named product's own sensory assertion can
// provide these descriptors. In particular, a country overview or another
// coffee's hero must never supply the selected coffee's Tasting Notes.
export function selectedFruityCoffeeNarrative(html,{clean}={}){
 if(typeof html!=='string'||typeof clean!=='function'||html.length>2_000_000)return '';
 const page=flavorPage(html);
 const blocks=productCoffeeProse(page,clean);
 const names=[...new Set(blocks.filter(b=>b.tag==='h1'&&!b.educational).map(b=>b.text))];
 if(names.length!==1)return '';
 const name=names[0],found=new Map();
 for(const block of blocks){
  if(block.educational||NONCURRENT_SENSORY_SECTION.test(block.section)||block.text.length>2000)continue;
  for(const sentence of block.text.split(/(?<=[.!?])\s+/u)){
   if(/\b(?:previously|historically|last year's|other coffee|another coffee|typically|usually)\b/i.test(sentence))continue;
   const match=sentence.match(/\bour\s+([\p{L}][\p{L}-]{2,32})\s+coffee\s+is\s+very\s+fruity\b[^.!?]{0,120}?\bwith\s+stone\s+fruits?\s+such\s+as\s+([\p{L}\p{M} ]{3,60}?)\s+with\s+(?:an?|the)\s+[^.!?]{1,50}\bfinish\b/iu);
   if(!match||!new RegExp('\\b'+match[1]+'\\b','i').test(name))continue;
   const descriptor=match[2].trim();
   const notes=shortFlavorList('fruity, stone fruits, '+descriptor,clean);
   if(notes)found.set(noteKey(notes),notes);
  }
 }
 return found.size===1?[...found.values()][0]:'';
}

export function extractProductFlavorEvidence(html,{clean,origin='',originConflict=false}={}){
 if(typeof html!=='string'||typeof clean!=='function'||html.length>2_000_000)return '';
 const profiles=extractProductFlavorProfiles(html,{clean});
 if(profiles.length===1)return profiles[0];
 if(profiles.length>1)return '';
 clean=flavorCleaner(clean);const page=flavorPage(html);
 return sipComparisonNotes(page,clean)||flavorProse(page,clean,{origin,originConflict}).narrative||selectedFruityCoffeeNarrative(page,{clean})||frenchProductSensoryNotes(page,clean)||'';
}
