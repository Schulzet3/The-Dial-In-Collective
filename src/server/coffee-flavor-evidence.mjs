// Bounded product-specific flavor evidence. No AI, cross-page navigation,
// guessed flavor dictionary or related-product tasting notes.
const topOfProduct=(html)=>{
 const match=/<h1\b[^>]*>[\s\S]{0,12000}?<\/h1>/i.exec(html);
 return match?html.slice(match.index+match[0].length,match.index+match[0].length+16000):'';
};
function shortFlavorList(raw,clean){
 const text=clean(raw,200).trim();
 if(text.length<5||text.length>150||/\b(?:masl|variet(?:y|ies|al)|farm(?:ers?)?|producers?|co-?op|elevation|processing|fermented|relationship|espresso|coffee in|brew time|roast level|subscribe|shipping|quantity)\b/i.test(text))return '';
 if(/\d{2,}|[$@%]|\bhttps?:\b/i.test(text))return '';
 const parts=text.split(/\s*(?:,|&)\s*/).map(p=>p.trim().replace(/^and\s+/i,'')).filter(Boolean);
 if(parts.length<2||parts.length>7||parts.some(p=>p.length>38||p.split(/\s+/).length>4||/[.!?;:|/]/.test(p)))return '';
 return text;
}
function namedClassValue(html,tag,className,clean){
 const re=new RegExp('<'+tag+'\\b[^>]{0,850}\\bclass=["\\x27][^"\\x27]*\\b'+className+'\\b[^"\\x27]*["\\x27][^>]*>([\\s\\S]{0,1300}?)<\\/'+tag+'\\s*>','i');
 return clean(re.exec(html)?.[1]||'',200);
}
function sipComparisonNotes(html,clean){
 // A named TAKE A SIP section describes this one coffee's flavor.
 // Only explicit comparison nouns count, not arbitrary story adjectives.
 const at=html.search(/<strong\b[^>]*>\s*TAKE A SIP\s*[|:]\s*<\/strong>/i);
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
 const after=topOfProduct(html).replace(/<svg\b[^>]*>[\s\S]*?<\/svg\s*>/gi,' ');
 for(const m of after.matchAll(/<p\b[^>]{0,350}>([\s\S]{30,1600}?)<\/p\s*>/gi)){
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
export function extractProductFlavorEvidence(html,{clean}={}){
 if(typeof html!=='string'||typeof clean!=='function'||html.length>2_000_000)return '';
 // Named, merchant-owned product containers must be near the selected H1.
 // Avoid promotion of checkout/footer/related coffee names or vague SEO.
 const top=topOfProduct(html);
 const onyx=top.match(/<p\b[^>]{0,550}\bclass=["'][^"']*\btasting-notes\b[^"']*["'][^>]*>([\s\S]{0,2100}?)<\/p>/i);
 if(onyx){
  const notes=[...onyx[1].matchAll(/<span\b[^>]{0,550}\bclass=["'][^"']*\bnote\b[^"']*["'][^>]*>([\s\S]{0,150}?)<\/span>/gi)]
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
 const sip=sipComparisonNotes(html,clean);
 if(sip)return sip;
 const french=frenchProductSensoryNotes(html,clean);
 if(french)return french;
 return '';
}
