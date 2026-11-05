// A current processing facility address does not establish the farms' origin.
// Accept the exact selected H1 and a direct mill address; preserve both source
// facts for review rather than transferring a mill town to a growing region.
const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'')
 .toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const escapeRegex=v=>String(v).replace(/[.*+?^$()|[\]{}\\]/g,'\\$&');
const PLACE=String.raw`[\p{Lu}][\p{L}\p{M}'’.-]{2,45}(?:\s+[\p{Lu}][\p{L}\p{M}'’.-]{2,45}){0,2}`;
const MILL_TOWN=new RegExp(
 String.raw`\b(?:dry|wet)\s+mill\b[^.!?]{0,130}\b(?:located|situated)\s+in\s+(?:the\s+)?(?:town|city|municipality)\s+of\s+(`+PLACE+String.raw`)(?=[.!?;,]|$)`,'gu');
export function selectedProcessingSiteNotFarmOrigin({name='',origin='',blocks=[]}={}){
 if(typeof name!=='string'||name.length>180||typeof origin!=='string'||origin.length>125||
  !Array.isArray(blocks)||blocks.length>2500)return null;
 const parts=origin.match(/^([^,]{3,70}),\s*([^,]{3,45})$/u);
 if(!parts)return null;
 const [,town,country]=parts;
 if(!new RegExp('^'+escapeRegex(country)+'\\s+','iu').test(name))return null;
 const headings=blocks.filter(block=>block.tag==='h1');
 if(headings.length!==1||norm(headings[0].text)!==norm(name))return null;
 const current=blocks.filter(block=>!block.educational&&['p','li'].includes(block.tag)&&
  typeof block.text==='string'&&block.text.length<=1300&&
  !/\b(?:historical(?:ly)?|previous(?:ly)?|former(?:ly)?|another coffee|other lot|no longer|hypothetical|might|could|would)\b/iu.test(block.text)&&
  !/\b(?:related|recommended|other coffees|you may also like|general guidance|education)\b/iu.test(block.section||''));
 const townPattern=escapeRegex(town);
 const explicit=new RegExp('\\b(?:origin|growing\\s+region|region|location)\\s*[:：]\\s*'+townPattern+'(?=\\b|[,.;]|$)','iu');
 const grown=new RegExp('\\b(?:farms?|farmers?|growers?|producers?|this coffee|our coffee|these beans|this lot)\\b[^.!?]{0,110}\\b(?:grow(?:n|ing|s)?|cultivat(?:ed|ing)|harvest(?:ed|ing)|sourc(?:ed|ing)|farm(?:s|ing)?|located)\\b[^.!?]{0,90}\\b(?:in|at|around|near|from)\\s+(?:the\\s+)?'+townPattern+'\\b','iu');
 if(current.some(block=>explicit.test(block.text)||grown.test(block.text)))return null;
 const findings=[];
 for(const block of current)for(const match of block.text.matchAll(MILL_TOWN)){
  if(norm(match[1])!==norm(town))continue;
  findings.push(match[0]);
  if(findings.length>5)return null;
 }
 return findings.length===1?{country,town,quote:findings[0]}:null;
}
