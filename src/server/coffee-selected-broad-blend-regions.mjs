// Selected direct broad regional blend; never guess individual countries.
const direct=/\b(?:these|our|this)\s+(central american|south american|north american|east african|west african|african|asian)\s*(?:&(?:amp;)?|and|\/)\s*(central american|south american|north american|east african|west african|african|asian)\s+(?:coffee\s+)?(?:beans|blend|coffees?)\b/i;
const labels={'central american':'Central America','south american':'South America','north american':'North America','east african':'East Africa','west african':'West Africa','african':'Africa','asian':'Asia'};
const key=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function selectedLiteralBroadBlendRegions(blocks,{origin=''}={}){
 if(!Array.isArray(blocks)||blocks.length>2000)return null;
 for(const b of blocks){
  if(b?.educational||typeof b?.text!=='string'||b.text.length>2500||
   /related|recommend|other products|education|guide/i.test(String(b.section||'')))continue;
  const m=direct.exec(b.text);
  if(!m||m.index>80||/(?:another|different|previous|other)\s+(?:coffee|product|blend)/i.test(b.text.slice(0,m.index)))continue;
  const a=labels[key(m[1])],c=labels[key(m[2])];
  if(!a||!c||a===c||(key(origin)!==key(a)&&key(origin)!==key(c)))continue;
  return {value:a+', '+c,quote:m[0]};
 }
 return null;
}
