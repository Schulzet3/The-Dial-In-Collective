import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
// Evidence-only parser for paired coffee specifications such as
// "Producer // Region, Country" + "Washed-processed Variety // 2170 masl".
// A paired product specification is required; prose, navigation, importer
// biographies and product titles alone must not supply an identity fact.
const MAX_PAGE=60_000;
const PROCESS=/^(?:(?:fully|traditional(?:ly)?)\s+)?(washed|natural|honey|anaerobic)(?:[\s-]+processed)?\s+(.{2,100}?)\s*\/\/\s*(.{3,65})$/i;
const ALTITUDE=/^(\d{3,4}|\d,\d{3})(\+)?(?:\s*[-\u2013\u2014]\s*(\d{3,4}|\d,\d{3}))?\s*(?:m\.?a\.?s\.?l\.?|m|met(?:er|re)s?(?:\s+above\s+sea\s+level)?)$/i;
const COUNTRY=/(?:^|,\s*)(?:Ethiopia|Colombia|Honduras|Guatemala|Costa Rica|El Salvador|Nicaragua|Panama|Peru|Brazil|Brasil|Bolivia|Ecuador|Mexico|Kenya|Rwanda|Burundi|Uganda|Tanzania|DR Congo|Democratic Republic of (?:the )?Congo|Zambia|Malawi|Yemen|India|Indonesia|China|Vietnam|Thailand|Laos|Myanmar|Papua New Guinea|Timor[- ]Leste|Philippines|Jamaica|Haiti|Dominican Republic|United States|USA|Hawaii)$/i;
const cleanKey=s=>s.normalize('NFC').toLowerCase().replace(/\s+/g,' ').trim();
function detailsLine(line){
 const m=line.match(PROCESS);
 if(!m)return null;
 const altitude=m[3].match(ALTITUDE);
 if(!altitude)return null;
 const low=Number(altitude[1].replace(',',''));
 const high=altitude[3]?Number(altitude[3].replace(',','')):low;
 if(low<100||high>6000||high<low||(altitude[2]&&altitude[3]))return null;
 const variety=m[2].replace(/\s+variet(?:y|ies|al|als)\s*$/i,'').trim();
 // A second processing term is not a cultivar; do not collapse compound
 // treatments into the single-select process field or fabricate a variety.
 if(!/^[\p{L}\p{M}\d][\p{L}\p{M}\d ,&/'().-]{1,90}$/u.test(variety)||
    /\b(?:washed|natural|honey|anaerobic|process(?:ed|ing)?|ferment\w*|hours?|days?|roast)\b/i.test(variety)||
    variety.split(/\s+/).length>10)return null;
 return {process:m[1][0].toUpperCase()+m[1].slice(1).toLowerCase(),
  variety,elevation_m:m[3].trim()};
}
function identityLine(line){
 const parts=line.split(/\s*\/\/\s*/);
 if(parts.length!==2)return null;
 const [producer,origin]=parts.map(s=>s.trim());
 if(!/^[\p{L}\p{M}\d][\p{L}\p{M}\d &'().,-]{1,120}$/u.test(producer)||
    /^(?:shipping|delivery|sale|shop|espresso|filter|subscribe|navigation)\b/i.test(producer)||
    !/^[\p{L}\p{M}][\p{L}\p{M}\d ,&'().-]{3,175}$/u.test(origin)||
    !origin.includes(',')||!COUNTRY.test(origin))return null;
 return {producer,origin};
}
function sourceParagraphs(page,clean){
 // Inputs are bounded before applying regexes. No source scripts or hidden
 // fallback elements should become facts, even in a direct unit invocation.
 const visible=removeElements(page,['script', 'style', 'nav', 'footer', 'aside', 'template', 'noscript']);
 const headings=[...visible.matchAll(/<h[2-6]\b[^<>]{0,350}>([\s\S]{0,300}?)<\/h[2-6]>/gi)];
 const stop=headings.find(h=>/^(?:you may also like|related products|more coffees|customer reviews|recently viewed)\b/i.test(clean(h[1],180)));
 const scope=stop?visible.slice(0,stop.index):visible;
 const matches=[...scope.matchAll(/<p\b[^<>]{0,600}>([\s\S]{1,5000}?)<\/p\s*>/gi)].slice(0,80);
 return matches.map((m,i)=>({at:m.index,end:m.index+m[0].length,text:clean(m[1],4000),
   gapBefore:i?scope.slice(matches[i-1].index+matches[i-1][0].length,m.index):'',
   lines:m[1].split(/<br\s*\/?>/gi).slice(0,10).map(s=>clean(s,350)).filter(Boolean)}));
}
export function extractDelimitedCoffeeSpecs(page,{clean}={}){
 const empty=()=>({fields:{},details:{}});
 if(typeof page!=='string'||page.length>MAX_PAGE||typeof clean!=='function')return empty();
 const paragraphs=sourceParagraphs(page,clean),candidates=[];
 for(let i=0;i<paragraphs.length;i++){
  const p=paragraphs[i];
  for(let j=0;j<p.lines.length;j++){
   const identity=identityLine(p.lines[j]);
   if(!identity)continue;
   // Support inline formatting and a single break, or two immediately
   // adjacent short paragraphs. Never hop a story paragraph or a heading.
   let line=p.lines[j+1],end=p.end;
   if(!line&&p.lines.length===1){
    const next=paragraphs[i+1];
    if(!next||next.lines.length!==1||next.at-p.end>250||
       /<h[1-6]\b/i.test(next.gapBefore))continue;
    line=next.lines[0];end=next.end;
   }
   if(!line)continue;
   const specs=detailsLine(line);
   if(specs)candidates.push({fields:{...identity,...specs},end});
  }
 }
 const unique=new Map(candidates.map(c=>[JSON.stringify(Object.fromEntries(
  Object.entries(c.fields).map(([k,v])=>[k,cleanKey(v)]))),c]));
 // Multiple distinct specifications may belong to different lots. Do not
 // choose the first, merge coffees, or reinterpret a variant selector.
 if(unique.size!==1)return empty();
 const selected=[...unique.values()][0],details={};
 for(const p of paragraphs){
  if(p.at<selected.end||p.at-selected.end>6000)continue;
  const starts=p.text.match(/^For this (washed|natural|honey|anaerobic)[ -]process lot\b/i);
  if(!starts||starts[1].toLowerCase()!==selected.fields.process.toLowerCase())continue;
  // Capture the actual source wording, not an inferred brew recipe. Time
  // spent fermenting/drying is never used for shot time or recommended rest.
  const fermentation=p.text.match(/\b(?:submerged|fermented) in water tanks for (?:a )?\d{1,3}(?:-?\s+to\s+|\s*[-\u2013\u2014]\s*)\d{1,3}-hour fermentation(?: period)?\b/i);
  const drying=p.text.match(/\braised(?: African)? (?:drying )?beds(?: for (?:(?:roughly|about|approximately) )?\d{1,3}\s*(?:to|[-\u2013\u2014])\s*\d{1,3} days)?\b/i);
  if(fermentation&&fermentation[0].length<=160)details.processing_detail=fermentation[0];
  if(drying&&drying[0].length<=105)details.drying_method=drying[0];
  break;
 }
 return {fields:selected.fields,details};
}
