import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
// Bounded product-specific flavor evidence. No AI, cross-page navigation,
// guessed flavor dictionary or related-product tasting notes.
const topOfProduct=(html)=>{
 const match=/<h1\b[^<>]{0,2000}>[\s\S]{0,12000}?<\/h1>/i.exec(html);
 return match?html.slice(match.index+match[0].length,match.index+match[0].length+16000):'';
};
function shortFlavorList(raw,clean){
 const text=clean(raw,200).trim();
 if(text.length<5||text.length>150||/\b(?:masl|variet(?:y|ies|al)|farm(?:ers?)?|producers?|co-?op|elevation|process|processing|fermented|fermentation|natural|washed|anaerobic|relationship|espresso|coffee in|brew time|roast level|subscribe|shipping|quantity)\b/i.test(text))return '';
 if(/\d{2,}|[$@%]|\bhttps?:\b/i.test(text))return '';
 const parts=text.split(/\s*(?:,|&)\s*/).map(p=>p.trim().replace(/^and\s+/i,'')).filter(Boolean);
 if(parts.length<2||parts.length>7||parts.some(p=>p.length>38||p.split(/\s+/).length>4||/[.!?;:|/]/.test(p)))return '';
 return text;
}
// Accessible image text is usable source evidence when it identifies the
// exact selected coffee and explicitly transcribes its profile. No image is
// downloaded or interpreted. A generic bag photo, filename, another product,
// or unlabeled color scale cannot create flavor or roast facts.
export function extractProductImageTextEvidence(html,{name,clean}={}){
 const empty={};
 if(typeof html!=='string'||html.length>2_000_000||typeof clean!=='function'||typeof name!=='string')return empty;
 const fold=value=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const identity=fold(name);
 if(identity.length<6||identity.length>180)return empty;
 const notes=new Map(),roasts=new Set();let count=0;
 for(const match of html.matchAll(/<img\b[^<>]{0,12000}>/gi)){
  if(++count>200)break;
  const raw=match[0].match(/\balt\s*=\s*(?:"([^"]{1,1000})"|'([^']{1,1000})')/i);
  if(!raw)continue;
  const alt=clean(raw[1]??raw[2],1000),normalized=fold(alt);
  if(!normalized.startsWith(identity+' '))continue;
  if(!/^(?:coffee(?: profile card)?|profile card)\b/.test(normalized.slice(identity.length+1)))continue;
  const list=alt.match(/\b(?:tasting\s+)?notes\s*(?:of\s+|:\s*)([^;.!?]{5,170})/i);
  const value=list?shortFlavorList(list[1],clean):'';
  if(value)notes.set(fold(value),value);
  const roast=alt.match(/(?:^|[;,.])\s*(Ultra Light|Very Light|Light[ -]Medium|Medium[ -]Light|Light|Medium[ -]Dark|Medium|Dark)\s+roast\b/i);
  if(roast)roasts.add(roast[1].toLowerCase().replace(/[ -]+/g,'-'));
 }
 const result={};
 if(notes.size===1)result.tasting_notes=[...notes.values()][0];
 if(roasts.size===1)result.roast_level=[...roasts][0];
 return result;
}
function namedClassValue(html,tag,className,clean){
 const re=new RegExp('<'+tag+'\\b[^<>]{0,850}\\bclass=["\\x27][^"\\x27]*\\b'+className+'\\b[^"\\x27]*["\\x27][^<>]{0,2000}>([\\s\\S]{0,1300}?)<\\/'+tag+'\\s*>','i');
 return clean(re.exec(html)?.[1]||'',200);
}
function sipComparisonNotes(html,clean){
 // A named TAKE A SIP section describes this one coffee's flavor.
 // Only explicit comparison nouns count, not arbitrary story adjectives.
 const at=html.search(/<strong\b[^<>]{0,2000}>\s*TAKE A SIP\s*[|:]\s*<\/strong>/i);
 if(at<0)return '';
 const block=html.slice(at,at+2600).split(/<\/p\s*>/i)[0];
 const text=clean(block,1700);
 const found=[];
 for(const match of text.matchAll(/\blike\s+([\p{L}][\p{L}\p{M}'’ -]{1,36}?)\s*(?=,|;|\.|$)/giu)){
  const phrase=match[1].trim();
  if(phrase)found.push(phrase);
 }
 const last=text.match(/\bas\s+[^.!?;]{0,50}?\s+as\s+([\p{L}][\p{L}\p{M}'’ -]{1,35}?)\s*(?=,|;|\.|$)/iu);
 if(last)found.push(last[1].trim());
 if(found.length<2||found.length>7)return '';
 return shortFlavorList([...new Set(found)].join(', '),clean);
}
// Explicit French sensory comparisons from the selected bag's short story.
// Keep the literal flavor nouns instead of machine-translating or guessing a
// dictionary. No neighboring coffee, general processing or education text.
function frenchProductSensoryNotes(html,clean){
 const after=removeElements(topOfProduct(html),['svg']);
 for(const m of after.matchAll(/<p\b[^<>]{0,350}>([\s\S]{30,1600}?)<\/p\s*>/gi)){
  const prose=clean(m[1],780);
  const cue=/\bnotes?\s+florales?[^.!?()]{0,90}\(([\p{L}\p{M}'’ -]{2,40})\)/iu.exec(prose);
  if(!cue)continue;
  const tail=prose.slice(cue.index+cue[0].length, cue.index+cue[0].length+170);
  const citrus=/\bdu\s+([\p{L}\p{M}'’ -]{3,45}?)\s+et\s+une\s+sucrosit/iu.exec(tail);
  const fruit=/\brappelant\s+la\s+([\p{L}\p{M}'’ -]{3,45})(?=[.!?]|$)/iu.exec(tail);
  if(!citrus||!fruit)continue;
  const names=[cue[1],citrus[1],fruit[1]].map(s=>s.trim());
  const accepted=shortFlavorList(names.join(', '),clean);
  if(accepted)return accepted;
 }
 return '';
}
// Explicit flavor-profile markup for the *selected* product; never global SEO,
// unlabeled marketing, footer content or nearby product recommendations.
function labeledFlavorChips(top,clean){
 const re=/<(p|div|ul|ol|section)\b([^<>]{0,950})>([\s\S]{0,2300}?)<\/\1\s*>/gi;
 const named=/\b(?:tasting[-_ ]?notes?|taste[-_ ]?notes?|flavou?r[-_ ]?notes?|flavou?r[-_ ]?profile|cupping[-_ ]?notes?)\b/i;
 for(const m of top.matchAll(re)){
  const props=[...m[2].matchAll(/\b(?:class|data-[\w-]+|aria-label)\s*=\s*(?:"([^"]{0,2000})"|'([^']{0,2000})')/gi)]
   .map(x=>x[1]??x[2]??'');
  if(!props.some(x=>named.test(x)))continue;
  const body=m[3];
  let value='';
  if(/^(?:ul|ol)$/i.test(m[1])){
   const parts=[...body.matchAll(/<li\b[^<>]{0,350}>([\s\S]{1,320}?)<\/li\s*>/gi)]
    .map(x=>clean(x[1],65)).filter(Boolean);
   if(parts.length>=2&&parts.length<=7)value=parts.join(', ');
  }else{
   const parts=[...body.matchAll(/<(?:span|li)\b[^<>]{0,350}>([^<>]{1,105})<\/(?:span|li)\s*>/gi)]
    .map(x=>clean(x[1],65)).filter(Boolean);
   value=parts.length>=2&&parts.length<=7?parts.join(', '):clean(body,175)
    .replace(/^(?:tasting|taste|flavou?r|cupping)\s*(?:notes?|profile)\s*[:\u2014-]\s*/i,'');
  }
  const accepted=shortFlavorList(value,clean);
  if(accepted)return accepted;
 }
 return '';
}

export function extractProductFlavorEvidence(html,{clean}={}){
 if(typeof html!=='string'||typeof clean!=='function'||html.length>2_000_000)return '';
 // Named, merchant-owned product containers must be near the selected H1.
 // Avoid promotion of checkout/footer/related coffee names or vague SEO.
 const top=topOfProduct(html);
 const onyx=top.match(/<p\b[^<>]{0,550}\bclass=["'][^"']{0,2000}\btasting-notes\b[^"']{0,2000}["'][^<>]{0,2000}>([\s\S]{0,2100}?)<\/p>/i);
 if(onyx){
  const notes=[...onyx[1].matchAll(/<span\b[^<>]{0,550}\bclass=["'][^"']{0,2000}\bnote\b[^"']{0,2000}["'][^<>]{0,2000}>([\s\S]{0,150}?)<\/span>/gi)]
   .map(m=>clean(m[1],55)).filter(Boolean);
  const value=notes.length?notes.join(', '):clean(onyx[1],160);
  const accepted=shortFlavorList(value,clean);
  if(accepted)return accepted;
 }
 for(const [tag,name] of [['em','product__ingredients'],['div','ProductMeta__Text']]){
  const value=shortFlavorList(namedClassValue(top,tag,name,clean),clean);
  if(value)return value;
 }
 // Shopfront's explicitly named tasting-description region, never the
 // similarly named shipping, processing, roasting or producer biographies.
 const chips=labeledFlavorChips(top,clean);
 if(chips)return chips;
 const sip=sipComparisonNotes(html,clean);
 if(sip)return sip;
 const french=frenchProductSensoryNotes(html,clean);
 if(french)return french;
 return '';
}
