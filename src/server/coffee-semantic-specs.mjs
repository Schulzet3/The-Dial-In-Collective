// Shared explicit-label vocabulary and bounded structural coffee specifications.
// No page scripts run, no cultivar dictionary is guessed, and no cross-product
// search occurs here. The caller supplies the already isolated product markup.
import {coffeeHtmlElements} from './coffee-html-structure.mjs';
import {productMarkup,coffeeHtmlAttributes} from './coffee-product-scope.mjs';
import {parseCoffeeElevation} from './coffee-elevation-evidence.mjs';
import {normalizeRoastLabel} from './roast-level-evidence.mjs';
import {normalizeExplicitCoffeeTastingNotes} from './coffee-flavor-evidence.mjs';
import {isEducationalCoffeeHeading} from './coffee-product-prose.mjs';
export const COFFEE_FIELD_ALIASES=Object.freeze({
 origin:['origin','origin/region','country/region','the blend','origins','countries','country','country of origin','region','regions','region/municipality','region/city','department','province','state','district','municipality','subregion','sub-region','city','village','geography','coffee origin','région','location','growing region','país','pais','país de origen','origen','origine','pays','región'],
 elevation_m:['elevation','elevations','altitude','altitudes','altitude/elevation','elevation/altitude','masl','msnm','elevation m','altitude masl','grown at','altitude (masl)','altura','altitud','growing altitude','growing elevation','coffee growing altitude','coffee growing elevation'],
 process:['process','processes','the process','production method','processing type','proc. method','proc method','processing','processing method','processing style','milling','milling process','traitement','treatment','process method','proceso','procesamiento','processo'],
 variety:['variety','variety/cultivar(s)','the bean','tree variety','tree varieties','arabica varieties','arabica variety','varietal','cultivar','cultivars','varieties','varietals','variété','variété(s)','variétés','variedad','variedades','variedade','variedades'],
 producer:['producer','producers','produced by','coffee farmer','meet the producer','meet the farm behind the coffee','farm name','farm names','farm/mill','farm / mill','farmers','growers','growing community','farms','farm','farmer','farmer/farm','farmer / farm','grower','owner','farm owner','cooperative','co-op','farm/co-op','farm co-op','farm / co-op','producer / farm','farm / producer','farmer partner','farmer cooperative','estate name','estate names','micromill','wet mill','dry mill','mill','producteur','washing station','productor','productora','finca','produtor'],
 roast_level:['roast','coffee roast','roast level','roast profile','roast type','roast degree','the roast',"roaster's level"],
 tasting_notes:['tasting notes','tasting notes of','taste notes','flavor notes','flavour notes','cup notes','flavor','flavour','taste','tasting','we taste','we taste notes of',"we're tasting",'we’re tasting',"what we're tasting",'what we’re tasting',"what you'll taste in your cup",'what you’ll taste in your cup','primary descriptors','coffee flavor profile','coffee flavour profile','in the cup','the cup','notes of','flavors','flavours','notes','reminds us of','tastes like','tasting profile','flavor profile','flavour profile','cupping notes','nota de cata','notas de cata','notas de sabor','sabores'],
 release_label:['harvest','harvest year','harvest date','harvest period','crop year','lot','lot number','release','release year','cosecha','fecha de cosecha']
});
const EXTRA_ALIASES={
 origin_process:['origin & process','origin and process','origin / process'],
 agtron:['roast color','agtron','ground agtron'],
 recommended_rest:['best rested','recommended rest'],drying_method:['drying method'],
 harvest_season:['harvest season'],preferred_extraction:['preferred extraction'],
 production_roaster:['production roaster'],processing_detail:['process detail','decaffeination method','decaffeination process']
};
const keyOf=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases=new Map(Object.entries({...COFFEE_FIELD_ALIASES,...EXTRA_ALIASES})
 .flatMap(([key,values])=>[key,...values].map(value=>[keyOf(value),key])));
export const coffeeFieldKey=value=>{
 const key=keyOf(value);
 if(/^\s*(?:farm\s*\/\s*region|region\s*\/\s*farm)\s*[:：]?\s*$/i.test(value))return 'farm_region';
 if(/^(?:varietycultivars?|varietalcultivars?|cultivars?variety)$/.test(key))return 'variety';
 return aliases.get(key);
};
const MAX_HTML=2_000_000,MAX_NODES=40_000,MAX_DEPTH=128,MAX_FRAGMENT=2400,MAX_FACTS=256;
const VOID=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const BLOCKED=new Set(['script','style','nav','footer','aside','template','noscript','svg','canvas','select','option','button','textarea']);
const INLINE=new Set(['span','strong','b','em','i','small','a','sup','sub','br','code','u','s','label','abbr']);
const INLINE_INERT=new Set(['meta','link','wbr']);
const CONTENT=new Set(['p','li','dt','dd','th','td','div','span','strong','b','em','label','small','h2','h3','h4','h5','h6']);
const isRoast=value=>!!normalizeRoastLabel(value);
const PERIOD=/[.!?]\s*$/;
const SECTION=/^(?:about(?:\s+this)?(?:\s+coffee)?|the (?:story|details|deets)|coffee (?:story|details|specifications)|learn|explore|shop|related|more coffees|our coffees|relationship|shipping|subscribe|add to cart)\b/i;
const INLINE_STYLE_TAG=/<\/?(?:span|strong|b|em|i|small|sup|sub|a|u|s|mark|abbr)\b[^<>]{0,2000}>/gi;
const COMPOSITE_PROCESS=/^(.{2,140}?)\s*\((wet[ -]+hulled|semi[ -]+washed|fully[ -]+washed|pulped[ -]+natural|washed|natural|honey|anaerobic(?:[ -]+(?:natural|washed|honey))?)(?:\s+process(?:ed|ing)?)?\)\.?$/i;
function factualVarietyValue(kind,value){
 if(['variety','producer'].includes(kind)&&/^[\p{L}\p{M}\d ,;&/'()+\-–]+\.$/u.test(value)&&
    !/\b(?:is|are|was|were|this|these|those|from|of|grows?|derived|typically|generally|refers|which|that|we|our)\b/i.test(value))
  return value.slice(0,-1).trim();
 return value;
}
function plausible(kind,value,{suffix=false}={}){
 value=factualVarietyValue(kind,value);
 if(value.length<2||value.length>240||coffeeFieldKey(value)||SECTION.test(value))return false;
 if(['producer','variety','origin','release_label'].includes(kind)&&/^(?:amount|quantity|size|weight|price|read more|learn more|view details)$/i.test(value))return false;
 if(kind==='origin_process'){
  const parts=COMPOSITE_PROCESS.exec(value);
  return !!parts&&plausible('origin',parts[1])&&plausible('process',parts[2]);
 }
 if(kind==='farm_region'){
  const values=value.split(/\s*\/\s*/);
  return values.length===2&&values.every(value=>plausible('producer',value)&&plausible('origin',value));
 }
 if(['producer','variety','origin','release_label'].includes(kind)&&
   (PERIOD.test(value)||value.split(/\s+/).length>17))return false;
 if(['producer','release_label'].includes(kind)&&
   /^(?:since|est(?:ablished)?\.?|founded)\b/i.test(value))return false;
 if(kind==='producer'&&/^\d/.test(value)&&! /\b(?:farmers?|growers?|producers?|farms?|cooperatives?|community|famil(?:y|ies)|small[ -]?holders?|farm[ -]?holders?)\b/i.test(value))return false;
 if(kind==='variety'&&(/\b(?:masl|msnm|met(?:er|re)s?|agtron|roast)\b/i.test(value)||
   (!/\p{L}/u.test(value)&&!/^\d{3,6}(?:\s*(?:,|\/|&|\+|and)\s*\d{3,6})*$/i.test(value))))return false;
 if(kind==='elevation_m'&&!parseCoffeeElevation(value))return false;
 if(kind==='roast_level'&&!isRoast(value))return false;
 if(suffix&&(value.split(/\s+/).length>10||
   /\b(?:is|are|was|were|has|have|can|may|will|learn|about|explore|our|this|these|that|different|types?|coffee|coffees|include[sd]?|with|grown|cultivated)\b/i.test(value)||
   !/^[\p{L}\p{M}\d][\p{L}\p{M}\d ,&/'().+\-–]{1,120}$/u.test(value)))return false;
 return true;
}
function parseTree(html){
 const root={tag:'root',start:0,openEnd:0,end:html.length,closeStart:html.length,closed:true,children:[]};
 const nodes=[],mapped=new Map(),scan=coffeeHtmlElements(html);
 root.end=root.closeStart=Math.min(scan.scannedEnd,scan.nodes[MAX_NODES]?.start??html.length);
 // Share the quote-aware structural scanner with product scoping. A > in
 // a quoted attribute cannot end a card and attach its label to another one.
 for(const [index,source] of scan.nodes.slice(0,MAX_NODES).entries()){
  const parent=source.parent===null?root:mapped.get(source.parent);
  if(!parent)continue;
  const depth=(parent.depth||0)+1;if(depth>MAX_DEPTH)continue;
  const empty=VOID.has(source.tag)||source.contentEnd===source.headEnd;
  const closed=source.end<=root.end&&(empty||html.slice(source.contentEnd,source.end).toLowerCase().startsWith('</'+source.tag));
  const node={tag:source.tag,start:source.start,openEnd:source.headEnd,
   end:source.end,closeStart:source.contentEnd,closed,children:[],parent,depth,
   blocked:parent.blocked||BLOCKED.has(source.tag)};
  parent.children.push(node);nodes.push(node);mapped.set(index,node);
 }
 return {root,nodes};
}
function prefix(line){
 const m=line.match(/^([\p{L}][\p{L}\p{M} .&/'()_-]{1,55})\s*(?:[:：|=]|\s+[-–—]{1,3}\s*|\s+\/{2,3}\s+)\s*(.*)$/u);
 const kind=m&&coffeeFieldKey(m[1]);
 return kind?{kind,label:m[1],value:m[2].trim()}:null;
}
function labeledSegments(line){
 // A separator inside a cultivar/place value is data. Split only when it
 // begins another recognized caption, after HTML entities were decoded.
 const points=[];
 for(const match of line.matchAll(/(?:^|[|;,])\s*([\p{L}][\p{L}\p{M} .&/'()_-]{1,55})\s*(?:[:：=]|\s+\/{2,3}\s+)\s*/gu))
  if(coffeeFieldKey(match[1]))points.push({at:match.index,start:match.index+(/[|;,]/.test(match[0][0])?1:0)});
 // A compact geographic row may put two independently typed levels on
 // the same line without punctuation between them. Require a complete
 // sequence of literal place values; ordinary prose is not a spec row.
 if(prefix(line)?.kind==='origin'){
  const geographic=[{at:0,start:0}];
  for(const match of line.matchAll(/\s+(country(?: of origin)?|region|department|province|state|district|municipality|sub[ -]?region|city|village)\s*[:：=]\s*/gi))
   geographic.push({at:match.index,start:match.index+match[0].search(/\S/)});
  const parts=geographic.map((point,index)=>prefix(line.slice(point.start,geographic[index+1]?.at??line.length).trim()));
  if(parts.length>=2&&parts.length<=8&&parts.every(part=>part?.kind==='origin'&&
    plausible('origin',part.value)&&/^[\p{Lu}\d][\p{L}\p{M}\d\s'’.,()\/-]{1,160}$/u.test(part.value)&&
    !/\b(?:this|these|those|is|are|was|were|grows?|grown|discuss(?:es|ed)?|means?|describes?)\b/i.test(part.value)))
   for(const point of geographic)if(!points.some(prior=>prior.start===point.start))points.push(point);
 }
 points.sort((a,b)=>a.start-b.start);
 if(points.length<2)return [line];
 return points.map((point,index)=>line.slice(point.start,points[index+1]?.at??line.length).trim());
}
export function extractSemanticCoffeeSpecs(html,{clean}={}){
 const result={facts:[],handledRanges:[]};
 if(typeof html!=='string'||html.length>MAX_HTML||typeof clean!=='function')return result;
 html=productMarkup(html);
 const {root,nodes}=parseTree(html),seen=new Set(),inlineParents=new Set(),suffixFacts=new Set();
 // Exclude blocked decoration from the bounded text view without changing
 // the source offsets used by facts and handled ranges.
 const blockedFragments=nodes.filter(node=>node.blocked&&!node.parent?.blocked);
 const visibleFragment=node=>{
  let low=0,high=blockedFragments.length;
  while(low<high){const mid=(low+high)>>>1;if(blockedFragments[mid].end<=node.openEnd)low=mid+1;else high=mid;}
  let cursor=node.openEnd,length=0;const parts=[];
  for(let index=low;index<blockedFragments.length;index++){
   const blocked=blockedFragments[index];if(blocked.start>=node.closeStart)break;
   if(blocked.start<cursor||blocked.end>node.closeStart)return '';
   const size=blocked.start-cursor;if(length+size+1>MAX_FRAGMENT)return '';
   parts.push(html.slice(cursor,blocked.start),' ');length+=size+1;cursor=blocked.end;
  }
  if(length+node.closeStart-cursor>MAX_FRAGMENT)return '';
  parts.push(html.slice(cursor,node.closeStart));return parts.join('');
 };
 const text=node=>{
  if(node.text!==undefined)return node.text;
  if(!node.closed||node.blocked)return node.text='';
  const fragment=visibleFragment(node);if(!fragment)return node.text='';
  if((node.tag==='ul'||node.tag==='ol')&&node.children.length&&node.children.length<=12&&
    node.children.every(child=>child.tag==='li'&&text(child)))
   return node.text=node.children.map(text).join(', ');
  if(node.tag==='div'&&node.children.length>=2&&node.children.length<=12){
   const a=coffeeHtmlAttributes(html.slice(node.start+node.tag.length+1,node.openEnd-1));
   const identity=[a.class,a.id].filter(Boolean).join(' ');
   // An already labeled notes field may use block chips instead of LI.
   // Preserve their printed boundaries; ordinary inline typography and
   // paragraphs containing sentences are not silently changed into lists.
   if(/(?:^|[\s_-])notes?(?:$|[\s_-])/i.test(identity)&&
    node.children.every(child=>['div','p','li'].includes(child.tag)&&text(child).length<=80&&
     normalizeExplicitCoffeeTastingNotes(text(child))))
    return node.text=node.children.map(text).join(', ');
  }
  return node.text=clean(fragment.replace(INLINE_STYLE_TAG,''),300);
 };
 const educationalNodes=new Set();let sectionLevel=7,educational=false;
 for(const node of nodes){
  if(/^h[2-6]$/.test(node.tag)){
   const level=Number(node.tag[1]),isEducation=isEducationalCoffeeHeading(text(node));
   if(level<=sectionLevel||isEducation){sectionLevel=level;educational=isEducation;}
  }
  if(educational)educationalNodes.add(node);
 }
 const protect=(start,end)=>result.handledRanges.push({start,end});
 const add=(kind,value,start,end,label=kind,options={})=>{
  value=factualVarietyValue(kind,value.trim().replace(/\s+([,;])/g,'$1'));if(!plausible(kind,value,options)||result.facts.length>=MAX_FACTS)return;
  if(kind==='origin_process'){
   const parts=COMPOSITE_PROCESS.exec(value);
   add('origin',parts[1],start,end,'Origin');add('process',parts[2],start,end,'Process');return;
  }
  if(kind==='farm_region'){
   const values=value.split(/\s*\/\s*/),labels=label.replace(/[:：]\s*$/,'').split(/\s*\/\s*/);
   if(labels.length!==2)return;
   for(const [index,caption] of labels.entries())add(/^farm$/i.test(caption.trim())?'producer':'origin',values[index],start,end,caption.trim());
   return;
  }
  if(kind==='harvest_season'&&/\b20\d{2}\b/.test(value))add('release_label',value,start,end,'Harvest');
  const signature=kind+'\0'+value;if(seen.has(signature))return;seen.add(signature);
  const fact={kind,label,value,start,end};result.facts.push(fact);
  if(options.suffix)suffixFacts.add(fact);
 };
 // A two-row table can put captions across columns. Require one complete
 // value row; multiple product rows cannot be combined into one coffee.
 const tableRows=new Map();
 for(const node of nodes){
  if(node.tag!=='tr'||node.blocked||!node.closed)continue;
  let parent=node.parent;
  for(let depth=0;parent&&parent.tag!=='table'&&depth<MAX_DEPTH;depth++)parent=parent.parent;
  if(parent?.tag!=='table')continue;
  const rows=tableRows.get(parent)||[];if(rows.length<21)rows.push(node);tableRows.set(parent,rows);
 }
 for(const [table,rows] of tableRows){
  if(rows.length!==2)continue;
  const cells=rows.map(row=>row.children.filter(child=>child.tag==='td'||child.tag==='th'));
  if(cells[0].length<2||cells[0].length>12||cells[1].length!==cells[0].length||cells.flat().some(cell=>!cell.closed||cell.blocked))continue;
  const labels=cells[0].map(cell=>text(cell)),kinds=labels.map(label=>coffeeFieldKey(label.replace(/[:：]\s*$/,'')));
  if(kinds.filter(Boolean).length<2||new Set(kinds.filter(Boolean)).size!==kinds.filter(Boolean).length)continue;
  const values=cells[1].map(cell=>text(cell));if(values.some(value=>coffeeFieldKey(value)))continue;
  protect(table.start,table.end);
  for(const [index,kind] of kinds.entries())if(kind)add(kind,values[index],cells[0][index].start,cells[1][index].end,labels[index]);
 }
 // Some product tables put several stacked captions in the left cell and
 // exactly corresponding stacked values in the right cell. Keep that
 // two-dimensional alignment; Producer must never pair with Amount.
 const stacked=cell=>{
  const values=[],pending=[cell];
  while(pending.length&&values.length<=12){
   const node=pending.shift();
   if(node.blocked||!node.closed)continue;
   if(CONTENT.has(node.tag)&&node.children.every(child=>INLINE.has(child.tag))){
    const value=text(node);if(value)values.push({node,value});
   }else pending.unshift(...node.children);
  }
  return values;
 };
 for(const rows of tableRows.values())for(const row of rows){
  const cells=row.children.filter(child=>child.tag==='td'||child.tag==='th');if(cells.length!==2)continue;
  const labels=stacked(cells[0]),values=stacked(cells[1]);
  if(labels.length<2||labels.length>12||labels.length!==values.length)continue;
  const kinds=labels.map(item=>coffeeFieldKey(item.value.replace(/[:：]\s*$/,'')));
  const commerce=/^(?:amount|quantity|size|weight|price|availability|stock)$/i;
  if(!kinds.some(Boolean)||labels.some((item,index)=>!kinds[index]&&!commerce.test(item.value))||
     values.some(item=>coffeeFieldKey(item.value)||commerce.test(item.value)))continue;
  protect(row.start,row.end);
  for(const [index,kind] of kinds.entries())if(kind)add(kind,values[index].value,row.start,row.end,labels[index].value);
 }
 // A rich paragraph can contain several BR-delimited facts, or a label on
 // one line followed by its emphasized value. Keep the next label separate.
 for(const node of nodes){
  if(!CONTENT.has(node.tag)||!text(node)||node.children.some(child=>!INLINE.has(child.tag)&&!INLINE_INERT.has(child.tag)))continue;
  const lines=html.slice(node.openEnd,node.closeStart).split(/<br\b[^<>]{0,2000}>/gi)
   .slice(0,80).map(part=>clean(part.replace(INLINE_STYLE_TAG,''),300)).filter(Boolean).flatMap(labeledSegments);
  let pending=null;
  const flush=()=>{if(pending?.values.length)add(pending.kind,pending.values.join(', ').replace(/,\s*,/g,','),node.start,node.end,pending.label);pending=null;};
  for(const line of lines){
   const pair=prefix(line),kind=coffeeFieldKey(line.replace(/[:：]\s*$/,''));
   if(pair){flush();protect(node.start,node.end);inlineParents.add(node);
    if(pair.value)add(pair.kind,pair.value,node.start,node.end,pair.label);
    else pending={...pair,values:[]};
   }else if(kind){flush();if(lines.length>1){protect(node.start,node.end);inlineParents.add(node);pending={kind,label:line,values:[]};}}
   else if(pending){
    if(pending.values.length<5&&plausible(pending.kind,line))pending.values.push(line);else flush();
   }
  }
  flush();
  if(lines.length!==1||prefix(lines[0])||educationalNodes.has(node))continue;
  // A compact production metric can publish a green-coffee method and a
  // separate decaffeination stage without a leading Process caption.
  if(/^(?:wet|dry)[ -]+process(?:ed|ing)?\s*(?:&|and|\/)\s*(?:sugar[ -]?cane(?:\s+ethyl[ -]+acetate)?|ethyl[ -]+acetate|swiss[ -]+water|mountain[ -]+water)\s+decaffeination$/i.test(lines[0])){
   add('process',lines[0],node.start,node.end,'Process');continue;
  }
  // Explicit suffix labels preserve unfamiliar compound cultivar names.
  // A sentence about a cultivar or a generic variety lesson is not a fact.
  const suffix=lines[0].match(/^(.{2,120}?)\s+(variet(?:y|ies|al|als)|cultivars?|variétés?|variedades?|variedade|process(?:ing)?(?: method)?)$/iu);
  if(suffix){
   const kind=coffeeFieldKey(suffix[2]);
   const generic=kind==='variety'&&/^(?:(?:regional|local|mixed|various|native|indigenous)\s*)+$/i.test(suffix[1]);
   // Wet/Dry Process are complete method names, not a bare adjective
   // followed by a removable caption. Keep the published phrase intact.
   const method=kind==='process'&&/\b(?:wet|dry)\s*$/i.test(suffix[1]);
   if(kind==='variety'||kind==='process')add(kind,generic||method?lines[0]:suffix[1],node.start,node.end,suffix[2],{suffix:true});
  }
 }
 // Pair direct siblings only. Transparent one-child formatting wrappers can
 // expose their semantic heading/caption tag, but cannot connect two cards.
 const unit=node=>{
  const value=text(node);let semantic=node;
  for(let i=0;i<8&&semantic.children.length===1;i++){
   const child=semantic.children[0];if(text(child)!==value)break;semantic=child;
  }
  const roastLegend=new Set((node.children||[]).map(child=>text(child)).filter(isRoast).map(normalizeRoastLabel)).size>1;
  return {node,text:value,tag:semantic.tag,roastLegend,kind:CONTENT.has(semantic.tag)||semantic.tag==='text'?
   coffeeFieldKey(value.replace(/[:：]\s*$/,'')):undefined};
 };
 for(const parent of [root,...nodes]){
  if(parent.blocked||inlineParents.has(parent)||!parent.closed||!parent.children.length||parent.children.length>180)continue;
  const siblings=[];let cursor=parent.openEnd;
  const bare=(start,end)=>{
   if(end<=start||end-start>320)return;
   const value=html.slice(start,end);if(value.includes('<'))return;
   const visible=clean(value,300);if(visible)siblings.push({tag:'text',text:visible,start,end,closed:true,children:[]});
  };
  for(const child of parent.children){bare(cursor,child.start);siblings.push(child);cursor=child.end;}
  bare(cursor,parent.closeStart);
  const units=siblings.map(unit).filter(u=>u.text&&!u.node.blocked);
  if(units.length<2)continue;
  const reversedDivs=units.filter((u,i)=>i&&u.kind&&u.tag==='div'&&units[i-1].tag==='div'&&
   /^[A-Z][A-Z /-]{3,}$/.test(u.text)&&!units[i-1].kind).length>=2;
  for(let i=0;i<units.length;i++){
   const label=units[i];if(!label.kind)continue;
   const prior=units[i-1],next=units[i+1];protect(label.node.start,label.node.end);
   const nearby=u=>u&&!u.kind&&!(['roast_level','tasting_notes'].includes(label.kind)&&u.roastLegend)&&
    // A profile heading above Acidity:, Body:, Aroma: or another named
    // attribute groups those rows. Their values are not an extra competing
    // flavor list, and a nested Flavor: row is parsed on its own merits.
    !(label.kind==='tasting_notes'&&/^[\p{L}][\p{L}\p{M} .&/'()_-]{1,55}\s*[:：|=]/u.test(u.text))&&Math.abs(u.node.start-label.node.end)<=MAX_FRAGMENT&&
    plausible(label.kind,u.text);
   const reverse=nearby(prior)&&(
    (/^h[2-6]$/.test(prior.tag)&&/^(?:p|span|small|label|text)$/.test(label.tag))||
    (reversedDivs&&label.tag==='div')||
    (units.length===2&&i===1&&label.tag==='div'&&prior.tag==='div'));
   let forward=nearby(next);
   if(reverse&&(reversedDivs||units[i+2]?.kind))forward=false;
   if(label.kind==='roast_level'){
    const options=[prior,next,units[i+2],units[i+3]].filter(u=>u&&!u.kind&&!u.roastLegend&&isRoast(u.text)&&
     Math.abs(u.node.start-label.node.end)<=MAX_FRAGMENT);
    if(new Set(options.map(u=>keyOf(u.text))).size!==1)continue;
   }
   // If both sides are plausible without a clear card direction, neither
   // arbitrary first/last choice is justified by the markup.
   if(reverse&&forward&&keyOf(prior.text)!==keyOf(next.text))continue;
   let value=reverse?prior:forward?next:null;if(!value)continue;
   if(forward&&!reverse){
    const inline=INLINE.has(label.tag)&&parent.children.every(child=>INLINE.has(child.tag)||INLINE_INERT.has(child.tag));
    const varietyRows=label.kind==='variety'&&/^(?:p|div|li)$/.test(next.tag);
    const flavorRows=label.kind==='tasting_notes'&&/^(?:p|div|li)$/.test(next.node.tag)&&normalizeExplicitCoffeeTastingNotes(next.text.replace(/^[•·,]\s*/,''));
    if(inline||varietyRows||flavorRows){
     const following=[];
     for(let j=i+1;j<units.length&&following.length<12;j++){
      const candidate=units[j];
      if(candidate.kind||prefix(candidate.text)||candidate.node.end-label.node.end>MAX_FRAGMENT)break;
      // An independent emphasized caption can name a field outside our
      // canonical vocabulary (Certifications, Storage, Packaging, etc.).
      // After an ordinary value row it terminates the preceding field;
      // do not append the caption and its answer as extra tasting notes.
      const caption=/^(?:strong|b|label|h[2-6])$/.test(candidate.tag)&&
       !/^(?:strong|b|label|h[2-6])$/.test(next.tag)&&candidate.text.length<=64&&
       candidate.text.split(/\s+/).length<=7&&!/[.!?;,]/.test(candidate.text);
      if(j>i+1&&caption)break;
      if(!inline&&(!/^(?:p|div|li)$/.test(flavorRows?candidate.node.tag:candidate.tag)||(flavorRows?!normalizeExplicitCoffeeTastingNotes(candidate.text.replace(/^[•·,]\s*/,'')):!plausible('variety',candidate.text,{suffix:true}))))break;
      following.push(candidate);
     }
     if(following.length>1){
      const end=following.at(-1).node.end;
      const complete=inline?clean(html.slice(label.node.end,end),300):following.map(u=>flavorRows?u.text.replace(/^[•·,]\s*/,''):u.text).join(', ');
      if(plausible(label.kind,complete))value={node:{start:next.node.start,end},text:complete};
     }
    }
   }
   protect(Math.min(label.node.start,value.node.start),Math.max(label.node.end,value.node.end));
   add(label.kind,value.text,Math.min(label.node.start,value.node.start),Math.max(label.node.end,value.node.end),label.text);
  }
 }
 // A value can legitimately end in the word "cultivars" or "varieties".
 // When its enclosing explicit row says Variety: Local Cultivars, the
 // inner suffix must not manufacture a competing value "Local".
 result.facts=result.facts.filter(fact=>!suffixFacts.has(fact)||!result.facts.some(other=>
  other!==fact&&!suffixFacts.has(other)&&other.kind===fact.kind&&other.start<=fact.start&&other.end>=fact.end));
 result.facts=result.facts.filter(fact=>fact.kind!=='tasting_notes'||!result.facts.some(other=>
  other!==fact&&other.kind===fact.kind&&other.start<=fact.start&&other.end>=fact.end&&
  other.value.length>fact.value.length&&keyOf(other.value).startsWith(keyOf(fact.value))));
 return result;
}


// Canonical geography follows the same explicit educational-heading boundary
// as narrative geography. Keep the original markup for supplementary evidence;
// this offset-preserving view removes only geographic specifications.
export function withoutEducationalCoffeeGeography(html,{clean}={}){
 if(typeof html!=='string'||html.length>MAX_HTML||typeof clean!=='function')return html;
 const {nodes}=coffeeHtmlElements(html),sections=[];
 let start=-1,level=7;
 for(const node of nodes){
  if(!/^h[2-6]$/.test(node.tag)||node.contentEnd-node.headEnd>1500)continue;
  const nextLevel=Number(node.tag[1]),education=isEducationalCoffeeHeading(clean(html.slice(node.headEnd,node.contentEnd),300));
  if(nextLevel>level&&!education)continue;
  if(start>=0)sections.push({start,end:node.start});
  start=education?node.start:-1;level=nextLevel;
 }
 if(start>=0)sections.push({start,end:html.length});
 if(!sections.length)return html;
 const ranges=extractSemanticCoffeeSpecs(html,{clean}).facts
  .filter(fact=>['origin','origin_process','farm_region'].includes(fact.kind)&&
   sections.some(section=>fact.start>=section.start&&fact.end<=section.end))
  .sort((a,b)=>a.start-b.start||b.end-a.end);
 const chunks=[];let cursor=0;
 for(const range of ranges){
  if(range.end<=cursor)continue;
  const begin=Math.max(cursor,range.start);
  chunks.push(html.slice(cursor,begin),' '.repeat(range.end-begin));cursor=range.end;
 }
 chunks.push(html.slice(cursor));return chunks.join('');
}
