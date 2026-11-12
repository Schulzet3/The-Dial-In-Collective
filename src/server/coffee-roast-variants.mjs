import {productMarkup,coffeeHtmlAttributes} from './coffee-product-scope.mjs';
// Explicit selected-coffee roast alternatives, never SEO or an unrelated
// product. Each option belongs to one purchase roast, not a source conflict.
const labels={
 light:{id:'light',label:'Light',roast_level:'Light'},
 'medium-light':{id:'medium-light',label:'Medium-light',roast_level:'Medium-Light'},
 medium:{id:'medium',label:'Medium',roast_level:'Medium'},
 'medium-dark':{id:'medium-dark',label:'Medium-dark',roast_level:'Medium-Dark'},
 dark:{id:'dark',label:'Dark',roast_level:'Dark'}
};
const tidy=s=>String(s||'').replace(/<[^<>]{0,2000}>/g,' ')
 .replace(/&(?:nbsp|amp|quot|apos);/gi,x=>({'&nbsp;':' ','&amp;':'&','&quot;':'"','&apos':"'"}[x.toLowerCase()]||x))
 .replace(/&#(\d{2,6});/g,(_,n)=>String.fromCodePoint(Math.min(0x10ffff,Number(n))))
 .replace(/\s+/g,' ').trim();
// Some current purchase options include an official alternate roast name,
// e.g. Medium Dark (Full City). That is still Medium-Dark, not a new level.
const roastId=s=>String(s||'').toLowerCase().replace(/\s*\(\s*full\s+city\s*\)\s*/g,'')
 .replace(/\s+roast\b/g,'').replace(/[\s–—_]+/g,'-').trim();
const matchSegment=(text,key)=>{
 const rx=/\bAs\s+(?:a|an)\s+(medium[\s-]dark|medium[\s-]light|light|medium|dark)\s+roast\s*[,.:]/gi;
 const markers=[...text.matchAll(rx)].map(m=>({at:m.index,end:m.index+m[0].length,id:roastId(m[1])}));
 return markers.filter(m=>m.id===key).map(m=>{
  const next=markers.find(x=>x.at>m.at);
  let section=text.slice(m.end,next?next.at:Math.min(text.length,m.end+2800));
  section=section.split(/\b(?:ABOUT THIS COFFEE|TRANSPARENCY|FLAVOR PROFILE|RECOMMENDED BREWING METHODS)\b/i)[0];
  return section.trim();
 });
};
function noteOf(sections){
 for(const text of sections){
  // Some selected roast variants publish the list AFTER "notes of"
  // instead of BEFORE "notes" (current Ketch Tier 3). It is not a
  // product-wide tasting list: matchSegment already scopes this paragraph
  // to one offered purchase roast. Stop before non-flavor cup commentary.
  const direct=[...text.matchAll(/\bthis\s+coffee\s+(?:has|had)\s+(?:(?:traditional|classic)\s+coffee\s+)?notes?\s+of\s+([^.!?;]{3,180})(?=[.!?;]|$)/gi)];
  if(direct.length){
   // Multiple incompatible current lists belong in member review, not a
   // first-encounter canonical selection. Nor should a past lot lend flavor.
   if(direct.length!==1)return '';
   const match=direct[0],context=text.slice(Math.max(0,match.index-40),match.index+match[0].length);
   if(/\b(?:previously|historically|last\s+(?:lot|year|harvest)|former|prior\s+(?:lot|harvest))\b/i.test(context))return '';
   const clause=match[1].replace(/\s+(?:and|but)\s+(?:is|was|are|were|has|have|remains|offers|provides)\b.*$/i,'')
    .replace(/\s+(?:which|while|whereas)\b.*$/i,'').trim();
   const items=clause.replace(/,\s*(?:and|&)\s+/gi,', ').replace(/\s+(?:and|&)\s+/gi,', ')
    .split(/\s*,\s*/).map(item=>item.trim()).filter(Boolean);
   if(!items.length||items.length>8||items.some(item=>item.length>45||/[\d<>]/.test(item)||
     /\b(?:coffee|cup|roast|brewing|extraction|ratio|temperature|process)\b/i.test(item)))return '';
   const note=items.join(', ');
   return note[0].toUpperCase()+note.slice(1);
  }
  // Preserve pre-existing "has floral and blackberry notes" behavior.
  const m=text.match(/\b(?:this\s+coffee\s+has|we\s+taste|notes?\s*(?:of|:))\s+([\w\s-]{3,130}?)\s+notes?\b/i);
  if(m){const note=m[1].trim().replace(/\s+and\s+/gi,', ').replace(/\s*,\s*/g,', ');return note[0].toUpperCase()+note.slice(1);}
 }
 return '';
}
// Read a directly labelled per-roast tasting list from the SELECTED product.
// The overarching "notes of ..." paragraph is less specific and must not
// donate flavors to a purchased roast when this list exists.
function printedRoastNotes(description, offeredIds){
 const text=tidy(description);
 const heading=/\bTasting\s+Notes\s+by\s+Roast\s*:\s*/i.exec(text);
 if(!heading)return new Map();
 const start=heading.index+heading[0].length;
 const excerpt=text.slice(start,start+1250).split(/\b(?:Ingredients|Care\s+In\s+Every\s+Cup|Shipping\s+Information|Frequently\s+Asked\s+Questions)\s*:?/i)[0];
 const marker=/\b(Medium\s*[- ]\s*Dark(?:\s*\(\s*Full\s+City\s*\))?|Medium\s*[- ]\s*Light|Medium|Dark|Light)\s*:\s*/gi;
 const labels=[...excerpt.matchAll(marker)].slice(0,12).map(m=>({id:roastId(m[1]),at:m.index,end:m.index+m[0].length}));
 const notes=new Map();
 for(let index=0;index<labels.length;index++){
  const item=labels[index];
  if(!offeredIds.includes(item.id)||notes.has(item.id))continue;
  const next=labels[index+1];
  const value=excerpt.slice(item.end,next?next.at:excerpt.length).trim();
  // A complete bounded notes line is a value, not a paragraph or a URL.
  // No-data placeholders are never flavor notes for any purchase roast.
  // In particular do not transform "flavor profile not published" into a
  // suggested tasting note or borrow a neighboring profile's words.
  const unpublished=/^(?:(?:tasting|flavou?r)\s+(?:notes?|profile)\s*(?:(?:are|is)\s+)?)?(?:not\s+(?:yet\s+)?(?:published|available|provided|listed|specified)|(?:currently\s+)?unavailable|unknown|none|tbd|tba|to\s+be\s+determined|coming\s+soon|n\s*\/\s*a)\s*[.!]?$/i;
  if(value.length>=3&&value.length<=240&&!/https?:\/\//i.test(value)&&!unpublished.test(value))
   notes.set(item.id,value);
 }
 return notes;
}

function sensory(sections){
 for(const text of sections){
  const match=n=>text.match(new RegExp('\\b'+n+'\\s+(?:at|of|is)\\s+(?:a\\s+)?(\\d+(?:\\s*[-–]\\s*\\d+)?)','i'));
  const sweetness=match('sweetness'),acidity=match('acidity'),body=match('body');
  if(sweetness&&acidity&&body)return {
   sweetness:sweetness[1].replace(/\s+/g,''),acidity:acidity[1].replace(/\s+/g,''),
   body:body[1].replace(/\s+/g,''),bitterness:/\bno\s+bitterness\b/i.test(text)?'0':null
  };
 }
 return null;
}
function espresso(sections){
 for(const text of sections){
  const esp=text.match(/\b(?:if\s+you\s+decide\s+to\s+brew\s+it\s+as\s+espresso|for\s+espresso)\b/i);
  if(!esp)continue;
  // e.g. within the selected roast's published espresso example is not
  // a section terminator: preserve its following temperature and ratio.
  const clause=text.slice(esp.index,esp.index+900),temp=clause.match(/\b(\d{2,3})\s*[-–]\s*(\d{2,3})\s*°?\s*F\b/i);
  const ratio=clause.match(/\b1\s*:\s*(\d+(?:\.\d+)?)\b/i);
  const dose=clause.match(/\b(\d+(?:\.\d+)?)\s*grams?\s+of\s+coffee\s+to\s+(\d+(?:\.\d+)?)\s*grams?/i);
  if(!temp&&!ratio&&!dose)continue;
  return {
   ...(ratio?{ratio:Number(ratio[1])}:{}),
   ...(temp?{temperature_reference:temp[1]+'–'+temp[2]+'°F'}:{}),
   ...(dose?{dose_g:Number(dose[1]),yield_g:Number(dose[2])}:{})
  };
 }
 return null;
}
function chosenRoastOptions(options){
 if(!Array.isArray(options))return [];
 const out=[];
 for(const option of options.slice(0,24)){
  if(!option||typeof option!=='object'||!/^(?:roast(?:\s+level)?|roast\s+profile)$/i.test(String(option.name||'').trim()))continue;
  const values=Array.isArray(option.values)?option.values:Array.isArray(option.options)?option.options:[];
  for(const value of values.slice(0,15)){
   const id=roastId(value);
   if(labels[id]&&!out.includes(id))out.push(id);
  }
 }
 return out;
}
export function extractSelectedCoffeeRoastVariants({description='',options=[]}={}){
 if(typeof description!=='string'||description.length>160000)return [];
 const text=tidy(description);
 if(text.length<80)return [];
 const ids=chosenRoastOptions(options);
 // Without explicit purchasable roast choices, leave ordinary story text
 // to the standard parser. This prevents educational comparisons from
 // creating fictional products or variant confirmations.
 if(ids.length<2)return [];
 const printed=printedRoastNotes(description,ids);
 const variants=ids.slice(0,7).map(id=>{
  const sections=matchSegment(text,id);
  const notes=printed.get(id)||noteOf(sections),ratings=sensory(sections),recipe=espresso(sections);
  return {...labels[id],fields:{roast_level:labels[id].roast_level,...(notes?{tasting_notes:notes}:{})},
   ...(ratings?{sensory:ratings}:{}),
   ...(recipe?{roaster_recipe:recipe}:{})};
 });
 if(variants.filter(v=>v.fields.tasting_notes).length<2)return [];
 return variants;
}

/* Sometimes the exact Shopify product JSON endpoint is unavailable or runs
   beyond the shared lookup deadline. The *visible product purchase controls*
   are sufficient to recover its real roast choices; generic descriptions,
   SEO, scripts, other products, and educational roast comparisons are not. */
export function extractSelectedCoffeeRoastVariantsFromHtml(html){
 if(typeof html!=='string'||html.length>2_000_000)return [];
 const main=html.match(/<main\b[^>]{0,1500}>[\s\S]*?<\/main\s*>/i);
 // No positive product-page scope, no invented purchasable variants.
 if(!main)return [];
 const controls=main[0]
  .replace(/<(?:script|style|template|noscript)\b[^>]*>[\s\S]*?<\/(?:script|style|template|noscript)\s*>/gi,' ')
  .slice(0,600000);
 const offered=[];
 const add=values=>{
  const options=[...new Set(values.map(roastId))].filter(id=>labels[id]);
  if(options.length>1)offered.push(options);
 };
 for(const item of controls.matchAll(/<fieldset\b[^>]{0,1500}>([\s\S]{0,18000}?)<\/fieldset\s*>/gi)){
  const opening=item[0].slice(0,item[0].indexOf('>')+1);
  if(/\s(?:hidden|aria-hidden\s*=\s*["']true["'])\b/i.test(opening))continue;
  const legend=item[1].match(/<legend\b[^>]*>([\s\S]{0,600}?)<\/legend\s*>/i);
  if(!legend||!/^Roast(?:\s+Level|\s+Profile)?$/i.test(tidy(legend[1])))continue;
  add([...item[1].matchAll(/<input\b([^>]{0,1500})>/gi)]
   .map(input=>coffeeHtmlAttributes(input[1]))
   .filter(attrs=>/^(?:radio|checkbox)$/i.test(attrs.type||'')&&
     !Object.hasOwn(attrs,'disabled'))
   .map(attrs=>attrs.value||''));
 }
 for(const item of controls.matchAll(/<select\b([^>]{0,1500})>([\s\S]{0,18000}?)<\/select\s*>/gi)){
  const attrs=coffeeHtmlAttributes(item[1]);
  if(!/^(?:options\[\s*roast(?:\s+level|\s+profile)?\s*\]|roast(?:\s+level|\s+profile)?)$/i.test(attrs.name||'')||
    Object.hasOwn(attrs,'disabled'))continue;
  add([...item[2].matchAll(/<option\b([^>]{0,1200})>([\s\S]{0,500}?)<\/option\s*>/gi)]
   .filter(option=>!Object.hasOwn(coffeeHtmlAttributes(option[1]),'disabled'))
   .map(option=>coffeeHtmlAttributes(option[1]).value||tidy(option[2])));
 }
 if(!offered.length)return [];
 // Multiple independent option controls must agree; never union unrelated
 // products or two conflicting purchase selectors into a fictional choice.
 const unique=offered.map(ids=>ids.slice().sort().join('|'));
 if(new Set(unique).size!==1)return [];
 const description=productMarkup(html);
 if(!description)return [];
 const anchor=description.search(/\b(?:Tasting\s+Notes\s+by\s+Roast|Flavor\s+Profile|As\s+(?:a|an)\s+(?:light|medium|dark))\b/i);
 const excerpt=description.length<=159000?description:
  anchor>=0?description.slice(anchor,anchor+159000):description.slice(0,159000);
 const variants=extractSelectedCoffeeRoastVariants({description:excerpt,
  options:[{name:'Roast Level',values:offered[0]}]});
 // The extractor requires directly attributed tasting notes for at least
 // two purchase options, so a generic "light vs dark" guide cannot pass.
 return variants;
}
