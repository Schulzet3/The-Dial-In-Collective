// Shared explicit-label vocabulary and bounded structural coffee specifications.
// No page scripts run, no cultivar dictionary is guessed, and no cross-product
// search occurs here. The caller supplies the already isolated product markup.
export const COFFEE_FIELD_ALIASES=Object.freeze({
 origin:['origin','origins','countries','country','country of origin','region','coffee origin','région','location','growing region','país','pais','país de origen','origen','origine','pays','región'],
 elevation_m:['elevation','altitude','elevation m','altitude masl','grown at','altitude (masl)','altura','altitud','growing altitude'],
 process:['process','processing','processing method','processing style','traitement','treatment','process method','proceso','procesamiento','processo'],
 variety:['variety','varietal','cultivar','cultivars','varieties','varietals','variété','variété(s)','variétés','variedad','variedades','variedade','variedades'],
 producer:['producer','producers','farms','farm','farmer','grower','cooperative','co-op','farm/co-op','farm co-op','farm / co-op','producteur','washing station','productor','productora','finca','produtor'],
 roast_level:['roast','roast level','roast profile'],
 tasting_notes:['tasting notes','taste notes','flavor notes','flavour notes','cup notes','flavors','flavours','notes','reminds us of','tastes like','tasting profile','flavor profile','flavour profile','cupping notes','nota de cata','notas de cata','notas de sabor','sabores'],
 release_label:['harvest','harvest year','harvest date','crop year','lot','lot number','release','release year','cosecha','fecha de cosecha']
});
const EXTRA_ALIASES={
 agtron:['roast color','agtron','ground agtron'],
 recommended_rest:['best rested','recommended rest'],drying_method:['drying method'],
 harvest_season:['harvest season'],preferred_extraction:['preferred extraction'],
 production_roaster:['production roaster'],processing_detail:['process detail']
};
const keyOf=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases=new Map(Object.entries({...COFFEE_FIELD_ALIASES,...EXTRA_ALIASES})
 .flatMap(([key,values])=>[key,...values].map(value=>[keyOf(value),key])));
export const coffeeFieldKey=value=>aliases.get(keyOf(value));
const MAX_HTML=2_000_000,MAX_NODES=24_000,MAX_DEPTH=64,MAX_FRAGMENT=2400,MAX_FACTS=256;
const VOID=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const BLOCKED=new Set(['script','style','nav','footer','aside','template','noscript','svg','canvas','select','option','button','textarea']);
const INLINE=new Set(['span','strong','b','em','i','small','a','sup','sub','br','code','u','s','label','abbr']);
const CONTENT=new Set(['p','li','dt','dd','th','td','div','span','strong','b','em','label','small','h2','h3','h4','h5','h6']);
const ROAST=/^(?:Ultra Light|Very Light|Light|Light-Medium|Medium[ -]Light|Medium|Medium-Dark|Dark)$/i;
const PERIOD=/[.!?]\s*$/;
const SECTION=/^(?:about(?:\s+this)?(?:\s+coffee)?|the (?:story|details|deets)|coffee (?:story|details|specifications)|learn|explore|shop|related|more coffees|our coffees|relationship|shipping|subscribe|add to cart)\b/i;
function plausible(kind,value,{suffix=false}={}){
 if(value.length<2||value.length>240||coffeeFieldKey(value)||SECTION.test(value))return false;
 if(['producer','variety','origin','release_label'].includes(kind)&&
   (PERIOD.test(value)||value.split(/\s+/).length>17))return false;
 if(['producer','release_label'].includes(kind)&&
   /^(?:since|est(?:ablished)?\.?|founded)\b/i.test(value))return false;
 if(kind==='producer'&&/^\d+(?:\.\d+)?$/.test(value))return false;
 if(kind==='variety'&&(/\b(?:masl|msnm|met(?:er|re)s?|agtron|roast)\b/i.test(value)||
   !/\p{L}/u.test(value)))return false;
 if(kind==='elevation_m'&&!/\b(?:\d{3,4}|\d,\d{3})\b/.test(value))return false;
 if(kind==='roast_level'&&!ROAST.test(value))return false;
 if(suffix&&(value.split(/\s+/).length>10||
   /\b(?:is|are|was|were|has|have|can|may|will|learn|about|explore|our|this|these|that|different|types?|coffee|coffees|include[sd]?|with|grown|cultivated)\b/i.test(value)||
   !/^[\p{L}\p{M}\d][\p{L}\p{M}\d ,&/'().+\-–]{1,120}$/u.test(value)))return false;
 return true;
}
function parseTree(html){
 const root={tag:'root',start:0,openEnd:0,end:html.length,closeStart:html.length,closed:true,children:[]};
 const nodes=[],stack=[root];let overflow=0;
 // Bounds on tag length and stack/node counts apply before examining text.
 // The scan advances monotonically even for unmatched or deeply nested tags.
 const tags=/<(\/?)([a-z][a-z0-9:-]{0,63})(?=[\s/>])[^<>]{0,2000}>/gi;
 let m;
 while((m=tags.exec(html))){
  const name=m[2].toLowerCase(),closing=!!m[1],empty=VOID.has(name)||/\/\s*>$/.test(m[0]);
  if(overflow){if(closing)overflow--;else if(!empty)overflow++;continue;}
  if(closing){
   let at=stack.length-1;while(at>0&&stack[at].tag!==name)at--;
   if(!at)continue;
   const node=stack[at];node.closeStart=m.index;node.end=tags.lastIndex;node.closed=true;
   stack.length=at;continue;
  }
  if(nodes.length>=MAX_NODES)break;
  if(stack.length>MAX_DEPTH){if(!empty)overflow=1;continue;}
  const parent=stack.at(-1),node={tag:name,start:m.index,openEnd:tags.lastIndex,
   end:tags.lastIndex,closeStart:tags.lastIndex,closed:empty,children:[],parent,
   blocked:parent.blocked||BLOCKED.has(name)||/(?:\s)hidden(?=\s|=|\/?>)|\saria-hidden\s*=\s*["']true["']/i.test(m[0])};
  parent.children.push(node);nodes.push(node);if(!empty)stack.push(node);
 }
 return {root,nodes};
}
function prefix(line){
 const m=line.match(/^([\p{L}][\p{L}\p{M} .&/'()_-]{1,55})\s*(?:[:：|]|\s+[-–]\s+)\s*(.*)$/u);
 const kind=m&&coffeeFieldKey(m[1]);
 return kind?{kind,label:m[1],value:m[2].trim()}:null;
}
export function extractSemanticCoffeeSpecs(html,{clean}={}){
 const result={facts:[],handledRanges:[]};
 if(typeof html!=='string'||html.length>MAX_HTML||typeof clean!=='function')return result;
 const {root,nodes}=parseTree(html),seen=new Set(),inlineParents=new Set();
 const text=node=>{
  if(node.text!==undefined)return node.text;
  if(!node.closed||node.blocked||node.closeStart-node.openEnd>MAX_FRAGMENT)return node.text='';
  if((node.tag==='ul'||node.tag==='ol')&&node.children.length&&node.children.length<=12&&
    node.children.every(child=>child.tag==='li'&&text(child)))
   return node.text=node.children.map(text).join(', ');
  return node.text=clean(html.slice(node.openEnd,node.closeStart),300);
 };
 const protect=(start,end)=>result.handledRanges.push({start,end});
 const add=(kind,value,start,end,label=kind,options={})=>{
  value=value.trim().replace(/\s+([,;])/g,'$1');if(!plausible(kind,value,options)||result.facts.length>=MAX_FACTS)return;
  const signature=kind+'\0'+value;if(seen.has(signature))return;seen.add(signature);
  result.facts.push({kind,label,value,start,end});
 };
 // A rich paragraph can contain several BR-delimited facts, or a label on
 // one line followed by its emphasized value. Keep the next label separate.
 for(const node of nodes){
  if(!CONTENT.has(node.tag)||!text(node)||node.children.some(child=>!INLINE.has(child.tag)))continue;
  const lines=html.slice(node.openEnd,node.closeStart).split(/<br\b[^<>]{0,2000}>/gi)
   .slice(0,20).map(part=>clean(part,300)).filter(Boolean);
  let pending=null;
  const flush=()=>{if(pending?.values.length)add(pending.kind,pending.values.join(', '),node.start,node.end,pending.label);pending=null;};
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
  if(lines.length!==1||prefix(lines[0]))continue;
  // Explicit suffix labels preserve unfamiliar compound cultivar names.
  // A sentence about a cultivar or a generic variety lesson is not a fact.
  const suffix=lines[0].match(/^(.{2,120}?)\s+(variet(?:y|ies|al|als)|cultivars?|variétés?|variedades?|variedade|process(?:ing)?(?: method)?)$/iu);
  if(suffix){
   const kind=coffeeFieldKey(suffix[2]);
   if(kind==='variety'||kind==='process')add(kind,suffix[1],node.start,node.end,suffix[2],{suffix:true});
  }
 }
 // Pair direct siblings only. Transparent one-child formatting wrappers can
 // expose their semantic heading/caption tag, but cannot connect two cards.
 const unit=node=>{
  const value=text(node);let semantic=node;
  for(let i=0;i<8&&semantic.children.length===1;i++){
   const child=semantic.children[0];if(text(child)!==value)break;semantic=child;
  }
  return {node,text:value,tag:semantic.tag,kind:CONTENT.has(semantic.tag)||semantic.tag==='text'?
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
   const nearby=u=>u&&!u.kind&&Math.abs(u.node.start-label.node.end)<=MAX_FRAGMENT&&
    plausible(label.kind,u.text);
   const reverse=nearby(prior)&&(
    (/^h[2-6]$/.test(prior.tag)&&/^(?:p|span|small|label|text)$/.test(label.tag))||
    (reversedDivs&&label.tag==='div')||
    (units.length===2&&i===1&&label.tag==='div'&&prior.tag==='div'));
   let forward=nearby(next);
   if(reverse&&(reversedDivs||units[i+2]?.kind))forward=false;
   if(label.kind==='roast_level'){
    const options=[prior,next,units[i+2],units[i+3]].filter(u=>u&&!u.kind&&ROAST.test(u.text)&&
     Math.abs(u.node.start-label.node.end)<=MAX_FRAGMENT);
    if(new Set(options.map(u=>keyOf(u.text))).size!==1)continue;
   }
   // If both sides are plausible without a clear card direction, neither
   // arbitrary first/last choice is justified by the markup.
   if(reverse&&forward&&keyOf(prior.text)!==keyOf(next.text))continue;
   let value=reverse?prior:forward?next:null;if(!value)continue;
   if(forward&&!reverse){
    const inline=INLINE.has(label.tag)&&parent.children.every(child=>INLINE.has(child.tag));
    const varietyRows=label.kind==='variety'&&/^(?:p|div|li)$/.test(next.tag);
    if(inline||varietyRows){
     const following=[];
     for(let j=i+1;j<units.length&&following.length<12;j++){
      const candidate=units[j];
      if(candidate.kind||prefix(candidate.text)||candidate.node.end-label.node.end>MAX_FRAGMENT)break;
      if(!inline&&(!/^(?:p|div|li)$/.test(candidate.tag)||!plausible('variety',candidate.text,{suffix:true})))break;
      following.push(candidate);
     }
     if(following.length>1){
      const end=following.at(-1).node.end;
      const complete=inline?clean(html.slice(label.node.end,end),300):following.map(u=>u.text).join(', ');
      if(plausible(label.kind,complete))value={node:{start:next.node.start,end},text:complete};
     }
    }
   }
   protect(Math.min(label.node.start,value.node.start),Math.max(label.node.end,value.node.end));
   add(label.kind,value.text,Math.min(label.node.start,value.node.start),Math.max(label.node.end,value.node.end),label.text);
  }
 }
 return result;
}
