// Extract only evidence-backed roast levels from untrusted PUBLIC page markup.
// Never guess a category from a mere Light-to-Medium graphic axis or roast
// colour photograph. Explicit labels follow the owner's Locked seven tiers.
import {productCoffeeProse,NONCURRENT_COFFEE_PROSE} from './coffee-product-prose.mjs';
import {productMarkup,coffeeHtmlAttributes} from './coffee-product-scope.mjs';
import {literalCoffeeSourcePlaces} from './coffee-identity-evidence.mjs';
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
import {removeElements,removeComments} from '../../supabase/functions/_shared/html-scan.mjs';
const MAX_LABEL=90;
function plain(s){
 return String(s??'').replace(/<[^<>]{0,2000}>/g,' ').replace(/&(?:nbsp|#160);/gi,' ')
  .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
  .replace(/\s+/g,' ').trim().slice(0,MAX_LABEL);
}
export function normalizeRoastLabel(value){
 let v=plain(value).toLowerCase()
  .replace(/^\s*(?:roast\s*(?:level|profile|degree|type)|coffee\s*roast|roast)\s*[:=]\s*/,'')
  .replace(/^\s*(?:roast\s*level|roast\s*profile|coffee\s*roast)\s*/,'')
  .replace(/\broasted\b/g,'roast')
  .replace(/^((?:ultra |very )?light(?:[ -]medium)?|medium(?:[ -](?:light|dark))?|dark)\s*[—–]\s*(?!light\b|medium\b|dark\b).+$/,'$1')
  .replace(/[.:]+\s*$/,'')
  .replace(/\s*\((?:light to extra dark|light to dark)\)\s*$/,'')
  .replace(/\s+roast$/,'')
  .replace(/[\u2010-\u2015]/g,'-').replace(/[_/-]+/g,' ').replace(/\s+/g,' ').trim();
 v=v.replace(/^special\s+(dark)$/,'$1')
  .replace(/^(light|medium|dark)\s+smooth$/,'$1');
 const qualifiedSentence=v.match(/^(ultra light|very light|light medium|medium light|medium dark|dark medium|light|medium|dark),\s+(?:keeping|with)\b(.+)$/);
 if(qualifiedSentence&&!/\b(?:light|medium|dark|not|rather|instead)\b/.test(qualifiedSentence[2]))v=qualifiedSentence[1];
 // A merchant may print its traditional label beside an explicit supported
 // category. The category is evidence; Full City by itself remains unmapped.
 const qualified=v.match(/^(ultra light|very light|light medium|medium light|medium dark|dark medium|light|medium|dark)\s*\([^()]{1,45}\)$/)||
  v.match(/^[^()]{1,45}\s*\((ultra light|very light|light medium|medium light|medium dark|dark medium|light|medium|med|dark)\)$/);
 if(qualified)v=qualified[1]==='med'?'medium':qualified[1];
 const lookup=new Map([
  ['ultra light','Ultra Light'],['very light','Very Light'],['light','Light'],
  ['light medium','Medium-Light'],['medium light','Medium-Light'],
  ['medium','Medium'],['medium dark','Medium-Dark'],['dark medium','Medium-Dark'],
  ['dark','Dark']
 ]);
 // Never infer an Ultra Light roast from a roaster's brand/reputation,
 // flavor profile, marketing terms or an unlabeled graphical marker.
 return lookup.get(v)||null;
}
export function roastLabelHint(value){
 const v=plain(value);
 if(!v||v.length>70||!/(?:light|medium|dark|blonde|city)/i.test(v))return '';
 if(normalizeRoastLabel(v))return '';
 // Strictly represent roaster-provided text; no silent canonical coercion.
 if(/^(?:extra[\s-]?light|nordic[\s-]?light|(?:light|medium|dark)\+|lighter|darker|full[ -]city)\s*(?:roast)?$/i.test(v))
  return 'Roaster describes the coffee as '+v+'. Choose the closest supported level manually.';
 return '';
}
function attrs(tag){
 const source=String(tag||'').replace(/^\s*<[a-z][a-z0-9:-]*\b/i,'').replace(/\/?>\s*$/,''),out=Object.create(null),seen=new Set();
 if(source.length>12000)return out;
 const attribute=/\s*([A-Za-z_:][A-Za-z0-9_:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/y;
 let at=0,count=0;
 while(at<source.length&&count++<128){
  if(!source.slice(at).trim())break;
  if(source.slice(at).trim()==='/'){at=source.length;break;}
  attribute.lastIndex=at;const match=attribute.exec(source);
  // Never resume searching inside a malformed or oversized quoted value.
  if(!match||match.index!==at)return Object.create(null);
  at=attribute.lastIndex;const key=match[1].toLowerCase(),value=match[2]??match[3]??match[4]??'';
  out[key]=seen.has(key)||/[<>]|&(?:lt|gt|#0*60|#0*62|#x0*3c|#x0*3e);/i.test(value)?null:plain(value);seen.add(key);
 }
 if(at<source.length&&source.slice(at).trim())return Object.create(null);
 return out;
}
function roastLabelInPhrase(s){
 const v=plain(s);
 const p=v.match(/\b(?:roast(?:ing)?\s*(?:level|profile|degree)|roast)\s*[:\-–]?\s*((?:ultra[\s-]*light|very[\s-]*light|light[\s-]?medium|medium[\s-]?light|medium[\s-]?dark|light|medium|dark))\b/i);
 if(p&&!/^\s*(?:\+|to\s+(?:light|medium|dark)|[/&])/i.test(v.slice(p.index+p[0].length)))return normalizeRoastLabel(p[1]);
 const q=v.match(/^((?:ultra[\s-]*light|very[\s-]*light|light[\s-]?medium|medium[\s-]?light|medium[\s-]?dark|light|medium|dark))\s+roast\b/i);
 return q?normalizeRoastLabel(q[1]):null;
}
function cropProduct(html){
 const page=productMarkup(html),{nodes}=coffeeHtmlElements(page),ranges=[];
 for(const node of nodes){
  if(node.tag!=='a'||node.start<(ranges.at(-1)?.[1]??-1))continue;
  const a=coffeeHtmlAttributes(node.attributes);
  if(!/(?:^|\/)products?\//i.test(String(a.href||'')))continue;
  // A product description can recommend another coffee inline. The linked
  // product's title must not donate its roast to this one, even when nested
  // spans make that title appear to be an independent prose block.
  let parent=node.parent;
  for(let depth=0;parent!==null&&parent!==undefined&&depth<6;depth++){
   const ancestor=nodes[parent];
   if(['p','div','li'].includes(ancestor.tag)&&ancestor.contentEnd-ancestor.headEnd<=6000){
    const prefix=page.slice(Math.max(ancestor.headEnd,node.start-1200),node.start)
     .replace(/<[^<>]{0,2000}>/g,' ').replace(/&(?:nbsp|#160);/gi,' ').replace(/\s+/g,' ').trim();
    if(/\b(?:try|shop(?: for)?|see|also available(?: with caffeine| as)?(?: in)?)\s*$/i.test(prefix))ranges.push([node.start,node.end]);
    break;
   }
   parent=ancestor.parent;
  }
 }
 let end=0,out='';
 for(const [start,stop] of ranges){out+=page.slice(end,start);end=stop;}
 return out+page.slice(end);
}
function withoutRoastLegends(html){
 const page=cropProduct(html),{nodes}=coffeeHtmlElements(page),ranges=[];
 for(const node of nodes){
  if(node.start<(ranges.at(-1)?.[1]??-1))continue;
  const a=coffeeHtmlAttributes(page.slice(node.start+node.tag.length+1,node.headEnd-1));
  const identity=[a.class,a.id].filter(Boolean).join(' ');
  const namedRoastScale=/(?:^|[\s_-])roast(?:$|[\s_-])/i.test(identity)&&
   /(?:^|[\s_-])(?:scale|slider|track|gauge|meter|legend|labels|gradient|spectrum)(?:$|[\s_-])/i.test(identity);
  // Some themes reuse a generic comparison chart for several metrics. It
  // is a roast legend only when its own bounded content supplies at least
  // two different roast endpoints. Selected accessible labels are still
  // read from the original page by the visual evidence reader.
  const comparison=/(?:^|[\s_-])(?:comparative[\s_-]scale|comparison[\s_-]chart)(?:$|[\s_-])/i.test(identity);
  const endpoints=comparison&&node.contentEnd-node.headEnd<=12000?
   [...page.slice(node.headEnd,node.contentEnd).matchAll(/\b((?:ultra\s+|very\s+)?light|medium(?:[ -](?:light|dark))?|dark)\s+roast\b/gi)]
    .map(match=>normalizeRoastLabel(match[1])):[];
  if(namedRoastScale||new Set(endpoints.filter(Boolean)).size>=2)ranges.push([node.start,node.end]);
 }
 let end=0,out='';
 for(const [start,stop] of ranges){out+=page.slice(end,start);end=stop;}
 return out+page.slice(end);
}
const ROAST_WORDS=String.raw`(?:ultra[\s-]+light|very[\s-]+light|light\s*[-/– ]\s*medium|medium\s*[-/– ]\s*light|medium\s*[-/– ]\s*dark|dark\s*[-/– ]\s*medium|light|medium|dark)`;
const sensoryContext=prefix=>{
 const sensory=prefix.match(/\b(?:(?:(?:tasting|taste|flavou?r|cupping|cup)\s+)?notes?\s*(?:of|:)|flavou?rs?\s*(?:of|:)|tastes?\s+like)\s*[^.!?;]{0,350}$/i);
 if(!sensory)return false;
 const assertion=prefix.match(/\b(?:together they deliver|(?:this|the) (?:coffee|blend|lot) (?:is|has|delivers)|we roast)\b[^.!?]{0,100}$/i);
 return !assertion||assertion.index<sensory.index;
};
function explicitProseRoasts(html){
 const clean=(value,max=6001)=>String(value||'').replace(/<[^<>]{0,2000}>/g,' ')
  .replace(/&(?:nbsp|#160);/gi,' ').replace(/&amp;/gi,'&').replace(/&#39;|&apos;/gi,"'")
  .replace(/\s+/g,' ').trim().slice(0,max);
 const found=[],blocks=productCoffeeProse(withoutRoastLegends(html),clean),titles=blocks.filter(block=>block.tag==='h1').map(block=>block.text.toLowerCase());
 // A merchant can explicitly define its own selected label on this page.
 // The supported category comes from that literal definition, never from
 // a universal synonym table or the nearby Agtron number.
 const selectedAliases=new Set(),definitions=new Map();
 for(const block of blocks){
  if(!block.educational&&block.text.length<=220){
   const selected=block.text.match(/\broast (?:level|profile)\s*[:=]\s*([\p{L}][\p{L} -]{1,30})[.!]?$/iu)||
    block.text.match(/^([\p{L}][\p{L} -]{1,30})(?:\s+Agtron\s*#?\s*\d{1,3})?\s+ROAST LEVEL$/iu);
   if(selected&&!normalizeRoastLabel(selected[1]))selectedAliases.add(selected[1].trim().toLowerCase());
  }
  if(!/\broast(?:ing)?\b/i.test(block.text)||NONCURRENT_COFFEE_PROSE.test(block.text))continue;
  const definition=block.text.match(new RegExp('\\breferring to ('+ROAST_WORDS+') as ([\\p{L}][\\p{L} -]{1,30}?) is an intentional choice\\b','iu'));
  if(definition){
   const key=definition[2].trim().toLowerCase(),values=definitions.get(key)||new Set();
   values.add(normalizeRoastLabel(definition[1]));definitions.set(key,values);
  }
 }
 for(const alias of selectedAliases)for(const value of definitions.get(alias)||[])if(value)found.push(value);
 const hasTaxonomy=blocks.filter(candidate=>/^[\p{L}]+(?:\s+[\p{L}]+){0,3}\s+Roast\s*:/iu.test(candidate.text)).length>=3;
 for(const block of blocks){
  if(block.educational)continue;
  const taxonomy=block.text.match(/^([\p{L}]+(?:\s+[\p{L}]+){0,3})\s+Roast\s*:/iu);
  if(taxonomy&&hasTaxonomy){
   const category=taxonomy[1].toLowerCase();
   const identifiesCategory=titles.some(title=>title.includes(category+' roast')||
    title.split(/\s*[,;:|–—]\s*|\s+-\s+/).some(part=>part.trim()===category));
   if(!identifiesCategory)continue;
  }
  for(const sentence of block.text.split(/(?<=[.!?])\s+/u)){
   if(sentence.length>1600)continue;
   // A contrast can expressly distinguish this coffee from the company's
   // general roasting style. Accept only its complete, current assertion.
   const current=sentence.match(new RegExp('^(?:While|Although)\\b[^.!?;]{1,650}\\broast\\b[^.!?;]{0,300},\\s*this (?:coffee|blend|lot) is\\s+(?:(?:a|an)\\s+)?('+ROAST_WORDS+')\\s*(?:roast)?[.!]?$','i'));
   if(current){found.push(normalizeRoastLabel(current[1]));continue;}
   const context=sentence.replace(/\bnot only\b/gi,'')
    .replace(/^not for (?:the )?faint[ -]?hearted(?: coffee drinker)?\s*,\s*/i,'')
    .replace(/\bwithout chaos\b/gi,'');
   if(NONCURRENT_COFFEE_PROSE.test(context)||
    /\b(?:light|medium|dark)\s+to\s+(?:light|medium|dark)\b|\bmedium\s*\/\s*medium[ -]dark\b/i.test(sentence)||
    /\b(?:roast (?:levels|scale|spectrum|options|range)|range (?:of|from)|from light to|between light and|than|for (?:fans|lovers) of|if you (?:like|prefer)|each coffee|every coffee|every bean|our specialty|specialty has been|roast specialists|roast coffees|other decaf|average beans|also available as|guided brew|brewing preset|(?:ideal|suited|suitable) for|touch of|roast component)\b/i.test(sentence))continue;
   const patterns=[
    new RegExp('\\b('+ROAST_WORDS+')\\s*[- ]?\\s*(?:smooth\\s+)?roast(?:ed)?\\b','gi'),
    new RegExp('\\broast(?:ed)?\\s+(?:(?:to|at)\\s+(?:(?:a|an|the|developed)\\s+)?)?(?:special\\s+)?('+ROAST_WORDS+')\\b(?!\\+)','gi'),
    new RegExp('\\broasted\\s+in\\s+(?:a|the)\\s+('+ROAST_WORDS+')\\s+profile\\b','gi'),
    new RegExp('\\bwe\\s+roast(?:ed)?\\s+(?:this(?:\\s+(?:coffee|lot))?|it|[\\p{L}][\\p{L}’\'-]{1,45})\\s+('+ROAST_WORDS+')\\b','giu')
   ];
   for(const pattern of patterns)for(const match of sentence.matchAll(pattern)){
    // "medium-light roast" must not additionally contribute a bare Light
    // assertion; every pattern consumes the compound category as a whole.
    const before=sentence.slice(0,match.index),after=sentence.slice(match.index+match[0].length);
    if(/\b(?:version|alternative|equivalent|counterpart)\s+of\s+(?:our|the|their)\s*$/i.test(before))continue;
    const explicitCoffeeBean=/^\s+(?:(?:colombian|columbian|brazilian|ethiopian|guatemalan|honduran|nicaraguan|peruvian|mexican|sumatran)\s+)?(?:coffee|beans?)\b/i.test(after);
    if(sensoryContext(before)&&!explicitCoffeeBean)continue;
    const value=normalizeRoastLabel(match[1]);if(value)found.push(value);
   }
   for(const match of sentence.matchAll(/\blightly\s+roasted\b/gi))if(!sensoryContext(sentence.slice(0,match.index)))found.push('Light');
   const choices=sentence.match(new RegExp('\\b('+ROAST_WORDS+')\\s+(?:and|or|&)\\s+('+ROAST_WORDS+')\\s+roast\\b','i'));
   if(choices&&!sensoryContext(sentence.slice(0,choices.index)))for(const value of choices.slice(1))found.push(normalizeRoastLabel(value));
  }
 }
 return [...new Set(found)];
}
function selectedScaleAnchors(page,nodes){
 // These two explicit DOM layouts print endpoint/center labels and mark
 // one discrete position. Read only a marked position coinciding with a
 // printed label. Positions between labels are not interpolated into the
 // application's seven categories, and a percentage is never a category.
 const found=[],classes=new Map(nodes.map(node=>[node,new Set(String(coffeeHtmlAttributes(node.attributes).class||'').split(/\s+/))]));
 const hasClass=(node,token)=>classes.get(node)?.has(token)||false;
 const labeledAncestor=node=>{
  for(let parent=node.parent,depth=0;parent!==null&&depth<3;depth++){
   const candidate=nodes[parent];if(!candidate||candidate.contentEnd-candidate.headEnd>10000)return false;
   const before=plain(page.slice(candidate.headEnd,node.start));
   if(/^(?:roast level|roast profile)$/i.test(before))return true;
   if(before)return false;
   parent=candidate.parent;
  }
  return false;
 };
 for(let index=0;index<nodes.length;index++){
  const node=nodes[index],meter=hasClass(node,'product-attribute-meter'),guide=hasClass(node,'guide');
  if((!meter&&!guide)||node.contentEnd-node.headEnd>10000)continue;
  const descendants=[];
  for(let at=index+1;at<nodes.length&&nodes[at].start<node.contentEnd;at++)descendants.push(nodes[at]);
  let positions=[],selected=-1,labels=[];
  if(meter){
   if(!labeledAncestor(node))continue;
   positions=descendants.filter(child=>hasClass(child,'product-attribute-meter__segment'));
   if(positions.length<3||positions.length>11||positions.length%2!==1)continue;
   const states=positions.map(child=>hasClass(child,'active'));
   selected=states.lastIndexOf(true);
   if(selected<0||states.some((state,at)=>state!==(at<=selected)))continue;
   labels=descendants.filter(child=>hasClass(child,'product-attribute-meter__label'));
   if(labels.length!==3||!hasClass(labels[1],'product-attribute-meter__label-middle'))continue;
  }else{
   const headings=descendants.filter(child=>hasClass(child,'guide__heading'));
   if(headings.length!==1||!/^(?:roast level|roast profile)$/i.test(plain(page.slice(headings[0].headEnd,headings[0].contentEnd))))continue;
   const lines=descendants.filter(child=>hasClass(child,'guide__line'));if(lines.length!==1)continue;
   const line=lines[0];
   positions=descendants.filter(child=>child.tag==='span'&&child.start>=line.headEnd&&child.end<=line.contentEnd);
   if(positions.length<3||positions.length>11||positions.length%2!==1||positions.some((child,at)=>plain(page.slice(child.headEnd,child.contentEnd))!==String(at+1)))continue;
   const selectedPositions=positions.map((child,at)=>hasClass(child,'is-active')?at:-1).filter(at=>at>=0);
   if(selectedPositions.length!==1)continue;selected=selectedPositions[0];
   for(const token of ['guide__left','guide__middle','guide__right']){
    const matches=descendants.filter(child=>hasClass(child,token));
    if(matches.length!==1){labels=[];break;}
    labels.push(matches[0]);
   }
   if(labels.length!==3)continue;
  }
  const values=labels.map(label=>normalizeRoastLabel(page.slice(label.headEnd,label.contentEnd)));
  if(values.some(value=>!value)||new Set(values).size!==3)continue;
  const anchor=[0,(positions.length-1)/2,positions.length-1].indexOf(selected);
  found.push({value:anchor>=0?values[anchor]:null,
   note:'Roast graphic marks step '+(selected+1)+' of '+positions.length+'; printed labels are '+values.join(' / ')+
    (anchor>=0?'. The marked step aligns with '+values[anchor]+'.':'. This step lies between printed labels; select the supported level manually.')});
 }
 return found;
}
export function extractRoastVisualEvidence(html){
 if(typeof html!=='string'||html.length>2_000_000)return {value:null,confidence:'none',source:null,hint:''};
 const page=cropProduct(html),pageNodes=coffeeHtmlElements(page).nodes,found=[],hints=[];
 const offer=(value,source,confidence='explicit')=>{
  const v=normalizeRoastLabel(value)||roastLabelInPhrase(value);
  if(v)found.push({value:v,source,confidence});
  else {
   const hint=roastLabelHint(value);
   if(hint)hints.push(hint);
  }
 };
 // Keep literal unsupported labels reviewable, including plus levels. A
 // printed Light+ is not silently coerced to a supported Light category.
 for(const block of productCoffeeProse(page,(value,max)=>String(value).replace(/<[^<>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max))){
  if(block.educational||block.text.length>160)continue;
  const label=block.text.match(/^roast(?:\s+(?:level|profile|degree|type))?\s*[:=–—-]\s*(.{2,70})[.!]?$/i);
  if(label){const hint=roastLabelHint(label[1]);if(hint)hints.push(hint);}
 }
 // Meta tags are included only with explicitly roast-specific names, NOT
 // generic SEO descriptions which often mention several roast levels.
 const metaPage=removeComments(removeElements(html,['script','style','template','noscript']));
 for(const node of coffeeHtmlElements(metaPage).nodes){
  if(node.tag!=='meta')continue;
  const a=attrs(node.attributes),k=(a.name||a.property||a['itemprop']||'').toLowerCase();
  if(/^(?:(?:coffee|product)[:._-])?(?:roast[_-]?level|roast[_-]?profile|roast)$/.test(k))
   offer(a.content,'product_meta');
 }
 // Explicit product attributes in the cropped product section, including
 // accessible image/SVG descriptions (without requesting image bytes).
 const evidenceTags=new Set(['div','span','p','section','figure','img','svg','input','label','button','meter','output']);
 for(const node of pageNodes){
  if(!evidenceTags.has(node.tag))continue;
  const a=attrs(node.attributes);
  for(const k of ['data-roast-level','data-roast','data-roast-profile','data-roast_label','data-coffee-roast','data-product-roast','data-roast-intensity']){
   if(a[k])offer(a[k],'product_attribute');
  }
  const label=a['aria-label']||a.alt||a.title||'';
  if(/\broast\b/i.test(label))offer(label,'graphic_accessible_label');
 }
 // Inline SVG titles/tags can express the graphic's value without OCR.
 const svgNodes=new Set();
 for(const [index,node] of pageNodes.entries()){
  if(node.tag==='svg'||svgNodes.has(node.parent))svgNodes.add(index);
  if(!svgNodes.has(index)||!['title','desc'].includes(node.tag)||node.contentEnd-node.headEnd>160)continue;
  const value=page.slice(node.headEnd,node.contentEnd);
  if(/\broast\b/i.test(value))offer(value,'inline_svg_title');
 }
 // A current product's concise country / roast badge may print the two
 // facts in adjacent spans, with no word "roast" in the badge. Admit only
 // this known product-specific badge structure, a literally named source
 // country and a supported *complete* roast level, never navigation menus,
 // foreign product cards, blend recipes or generic numeric variants.
 for(const node of pageNodes){
  if(node.tag!=='div'||node.contentEnd-node.headEnd>350)continue;
  const classNames=new Set(String(attrs(node.attributes).class||'').split(/\s+/));
  if(!classNames.has('gld-product-variant-text-price'))continue;
  const content=page.slice(node.headEnd,node.contentEnd);
  const split=content.match(/^\s*<span\b[^<>]{0,350}>\s*([\p{L}\p{M} .'-]{2,65})\s*<\/span>\s*<span\b[^<>]{0,350}>\s*\|\s*((?:Ultra\s+Light|Very\s+Light|Light(?:[- ]Medium)?|Medium(?:[- ](?:Light|Dark))?|Dark))\s*<\/span>\s*$/iu);
  if(!split)continue;
  const country=split[1].trim();
  const places=literalCoffeeSourcePlaces(country);
  if(places.length!==1||places[0].normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()!==country.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase())continue;
  offer(split[2],'selected_product_country_roast_badge');
 }
 // Some Shopify products print the current coffee as "Sumatra Medium" or
 // "Colombia Medium" in its single selected-product H1, without the word
 // "roast" in nearby text. The last *complete* word is the literal roast
 // category and the prefix must itself be a single explicitly recognized
 // geographic name. Do not parse related H1s, marketing headings, scales,
 // flavor text, or a product with multiple competing H1 titles.
 const h1s=pageNodes.filter(node=>node.tag==='h1'&&node.contentEnd-node.headEnd<=220);
 if(h1s.length===1){
  const heading=plain(page.slice(h1s[0].headEnd,h1s[0].contentEnd));
  const title=heading.match(/^([\p{Lu}][\p{L}\p{M}'’ .-]{2,65}?)\s+(Ultra Light|Very Light|Light|Medium(?:[- ](?:Light|Dark))?|Dark)$/iu);
  if(title){
   const geography=title[1].trim(),places=literalCoffeeSourcePlaces(geography);
   const key=value=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
   if(places.length===1&&key(places[0])===key(geography))
    offer(title[2],'selected_product_geography_roast_title');
  }
 }
 // Detect the selected class/ARIA state of a discrete roast-level selector.
 // The heading must be nearby; avoid unrelated site-wide filter controls.
 const actualStarts=new Set(pageNodes.map(node=>node.start));
 let markerScanAt=0;
 for(const m of page.matchAll(/(?:Roast\s+Level|Roast\s+Profile)\b[\s\S]{0,2600}/gi)){
  const snippet=m[0].slice(0,2600).split(/<\/(?:section|fieldset|article)>/i)[0];
  for(const item of snippet.matchAll(/<(span|div|button|label|option|li)\b([^<>]{0,850})>([^<>]{1,120})<\/\1>/gi)){
   if(!actualStarts.has(m.index+item.index))continue;
   const a=attrs(item[2]),v=plain(item[3]);
   const state=[a.class,a['aria-pressed'],a['aria-selected'],a['aria-current'],a['data-selected'],a['data-state']].filter(Boolean).join(' ');
   if(/(?:^|[\s_-])(?:selected|active|current|checked|is-active|is-selected)(?:$|[\s_-])|\btrue\b/i.test(state))
    offer(v,'selected_roast_indicator');
  }
  // Do not convert a raw graphic marker percentage to a roast category:
  // roaster-specific endpoints/curves are not standardized.
  const inline=snippet.match(/<(?:meter|progress|input)\b[^<>]{0,500}(?:aria-label\s*=\s*["'][^"']{0,2000}roast[^"']{0,2000}["'][^<>]{0,2000}|data-label\s*=\s*["']roast["'][^<>]{0,2000})>/i);
  const markerValues=new Set();
  while(markerScanAt<pageNodes.length&&pageNodes[markerScanAt].start<m.index)markerScanAt++;
  for(let at=markerScanAt;at<pageNodes.length&&pageNodes[at].start<m.index+snippet.length;at++){
   const node=pageNodes[at];if(node.end>m.index+snippet.length)continue;
   const style=attrs(node.attributes).style||'';
   for(const match of style.matchAll(/(?:^|;)\s*(?:left|--roast-position|--roast-level|--progress)\s*:\s*(\d{1,3}(?:\.\d+)?)%|\btranslateX\(\s*(\d{1,3}(?:\.\d+)?)%/gi)){
    const value=match[1]||match[2];if(Number(value)<=100)markerValues.add(value);
   }
  }
  const marker=markerValues.size===1?[...markerValues][0]:null;
  if((marker||inline)&&/\blight\b/i.test(snippet)&&/\bmedium\b/i.test(snippet))
   hints.push('Roast graphic uses a Light–Medium scale'+(marker!==null?' with a published marker at '+marker+'%':'')+'; verify its marker before selecting a level.');
 }
 const selectedScales=selectedScaleAnchors(page,pageNodes);
 for(const scale of selectedScales)if(scale.value)
  found.push({value:scale.value,source:'selected_roast_anchor',confidence:'explicit'});
 const scaleNote=[...new Set(selectedScales.map(scale=>scale.note))].slice(0,3).join(' ');
 if(scaleNote)hints.unshift(scaleNote);
 // Explicit words in the current coffee's title or description are source
 // evidence too. This does not interpret an unlabeled graph, bean color or
 // traditional roast name and never derives roast from flavor/body words.
 for(const value of explicitProseRoasts(html))found.push({value,source:'product_explicit_text',confidence:'explicit'});
 const unique=[...new Set(found.map(x=>x.value))];
 if(unique.length===1){
  const ev=found.find(x=>x.value===unique[0]);
  return {value:ev.value,confidence:ev.confidence,source:ev.source,hint:scaleNote};
 }
 if(unique.length>1)return {value:null,confidence:'conflict',source:null,
  hint:'Conflicting roast labels were found. Check the roaster’s page before choosing a roast level.'};
 if(hints.length)return {value:null,confidence:'uncertain',source:null,hint:hints[0]};
 // A graphic with "Light" and "Medium" labels alone isn't evidence that
 // either endpoint is the roast value; allow member to select manually.
 const roastHeading=page.match(/(?:Roast\s+Level|Roast\s+Profile)[\s\S]{0,750}/i);
 if(roastHeading&&/\bLight\b/.test(roastHeading[0])&&/\bMedium\b/.test(roastHeading[0])){
  return {value:null,confidence:'uncertain',source:null,
   hint:'The roast graphic’s selected position does not by itself identify a roast level. Review the roaster’s label.'};
 }
 return {value:null,confidence:'none',source:null,hint:''};
}
