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
const roastId=s=>String(s||'').toLowerCase().replace(/\s+roast\b/g,'')
 .replace(/[\s–—_]+/g,'-').trim();
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
  const m=text.match(/\b(?:this\s+coffee\s+has|we\s+taste|notes?\s*(?:of|:))\s+([\w\s-]{3,130}?)\s+notes?\b/i);
  if(m)return m[1].trim().replace(/\s+and\s+/gi,', ').replace(/\s*,\s*/g,', ');
 }
 return '';
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
 const variants=ids.slice(0,7).map(id=>{
  const sections=matchSegment(text,id);
  const notes=noteOf(sections),ratings=sensory(sections),recipe=espresso(sections);
  return {...labels[id],fields:{roast_level:labels[id].roast_level,...(notes?{tasting_notes:notes}:{})},
   ...(ratings?{sensory:ratings}:{}),
   ...(recipe?{roaster_recipe:recipe}:{})};
 });
 if(variants.filter(v=>v.fields.tasting_notes).length<2)return [];
 return variants;
}
