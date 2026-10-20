// Extract only evidence-backed roast levels from untrusted PUBLIC page markup.
// Never guess a category from a mere Light-to-Medium graphic axis or roast
// colour photograph. Explicit labels follow the owner's Locked seven tiers.
const MAX_LABEL=90;
function plain(s){
 return String(s??'').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|#160);/gi,' ')
  .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
  .replace(/\s+/g,' ').trim().slice(0,MAX_LABEL);
}
export function normalizeRoastLabel(value){
 const v=plain(value).toLowerCase()
  .replace(/\b(?:roast\s*level|roast\s*profile|coffee\s*roast)\s*[:=]?\s*/g,'')
  .replace(/\broasted\b/g,'roast')
  .replace(/\s+roast$/,'')
  .replace(/[\u2010-\u2015]/g,'-').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
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
 if(/^(?:extra[\s-]?light|nordic[\s-]?light)\s*(?:roast)?$/i.test(v))
  return 'Roaster describes the coffee as '+v+'. Choose the closest supported level manually.';
 return '';
}
function attrs(tag){
 const out={};
 for(const m of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]{0,300})"|'([^']{0,300})')/g)){
  out[m[1].toLowerCase()]=plain(m[2]??m[3]);
 }
 return out;
}
function roastLabelInPhrase(s){
 const v=plain(s);
 const p=v.match(/\b(?:roast(?:ing)?\s*(?:level|profile|degree)|roast)\s*[:\-–]?\s*((?:ultra[\s-]*light|very[\s-]*light|light[\s-]?medium|medium[\s-]?light|medium[\s-]?dark|light|medium|dark))\b/i);
 if(p)return normalizeRoastLabel(p[1]);
 const q=v.match(/^((?:ultra[\s-]*light|very[\s-]*light|light[\s-]?medium|medium[\s-]?light|medium[\s-]?dark|light|medium|dark))\s+roast\b/i);
 return q?normalizeRoastLabel(q[1]):null;
}
function cropProduct(html){
 const heads=[...html.matchAll(/<h1\b[^>]{0,350}>[\s\S]{0,400}?<\/h1>/gi)];
 let body=heads.length===1?html.slice(heads[0].index):html.slice(0,40000);
 const m=body.search(/<footer\b|<h[2-4]\b[^>]*>\s*(?:more coffees|related products|you may also like|other products|recommended for you)\b/i);
 if(m>1000)body=body.slice(0,m);
 return body.slice(0,42000);
}
export function extractRoastVisualEvidence(html){
 if(typeof html!=='string'||html.length>2_000_000)return {value:null,confidence:'none',source:null,hint:''};
 const page=cropProduct(html),found=[],hints=[];
 const offer=(value,source,confidence='explicit')=>{
  const v=normalizeRoastLabel(value)||roastLabelInPhrase(value);
  if(v)found.push({value:v,source,confidence});
  else {
   const hint=roastLabelHint(value);
   if(hint)hints.push(hint);
  }
 };
 // Meta tags are included only with explicitly roast-specific names, NOT
 // generic SEO descriptions which often mention several roast levels.
 for(const tag of html.match(/<meta\b[^>]{0,1500}>/gi)||[]){
  const a=attrs(tag),k=(a.name||a.property||a['itemprop']||'').toLowerCase();
  if(/^(?:(?:coffee|product)[:._-])?(?:roast[_-]?level|roast[_-]?profile|roast)$/.test(k))
   offer(a.content,'product_meta');
 }
 // Explicit product attributes in the cropped product section, including
 // accessible image/SVG descriptions (without requesting image bytes).
 for(const match of page.matchAll(/<(?:div|span|p|section|figure|img|svg|input|label|button|meter|output)\b[^>]{0,1800}>/gi)){
  const a=attrs(match[0]);
  for(const k of ['data-roast-level','data-roast','data-roast-profile','data-roast_label','data-coffee-roast','data-product-roast','data-roast-intensity']){
   if(a[k])offer(a[k],'product_attribute');
  }
  const label=a['aria-label']||a.alt||a.title||'';
  if(/\broast\b/i.test(label))offer(label,'graphic_accessible_label');
 }
 // Inline SVG titles/tags can express the graphic's value without OCR.
 for(const match of page.matchAll(/<(?:title|desc)\b[^>]*>([\s\S]{1,160}?)<\/(?:title|desc)>/gi)){
  if(/\broast\b/i.test(match[1]))offer(match[1],'inline_svg_title');
 }
 // Detect the selected class/ARIA state of a discrete roast-level selector.
 // The heading must be nearby; avoid unrelated site-wide filter controls.
 for(const m of page.matchAll(/(?:Roast\s+Level|Roast\s+Profile)\b[\s\S]{0,2600}/gi)){
  const snippet=m[0].slice(0,2600).split(/<\/(?:section|fieldset|article)>/i)[0];
  for(const item of snippet.matchAll(/<(span|div|button|label|option|li)\b([^>]{0,850})>([^<>]{1,120})<\/\1>/gi)){
   const a=attrs(item[2]),v=plain(item[3]);
   const state=[a.class,a['aria-pressed'],a['aria-selected'],a['aria-current'],a['data-selected'],a['data-state']].filter(Boolean).join(' ');
   if(/(?:^|[\s_-])(?:selected|active|current|checked|is-active|is-selected)(?:$|[\s_-])|\btrue\b/i.test(state))
    offer(v,'selected_roast_indicator');
  }
  // Do not convert a raw graphic marker percentage to a roast category:
  // roaster-specific endpoints/curves are not standardized.
  const inline=snippet.match(/<(?:meter|progress|input)\b[^>]{0,500}(?:aria-label\s*=\s*["'][^"']*roast[^"']*["'][^>]*|data-label\s*=\s*["']roast["'][^>]*)>/i);
  const marker=snippet.match(/(?:left|translateX|--roast-position|--roast-level|--progress)\s*[:(]\s*(\d{1,3}(?:\.\d+)?)%/i);
  if((marker||inline)&&/\blight\b/i.test(snippet)&&/\bmedium\b/i.test(snippet))
   hints.push('Roast graphic uses a Light–Medium scale; verify its marker before selecting a level.');
 }
 const unique=[...new Set(found.map(x=>x.value))];
 if(unique.length===1){
  const ev=found.find(x=>x.value===unique[0]);
  return {value:ev.value,confidence:ev.confidence,source:ev.source,hint:''};
 }
 if(unique.length>1)return {value:null,confidence:'conflict',source:null,
  hint:'Conflicting roast labels were found. Check the roaster’s page before choosing a roast level.'};
 if(hints.length)return {value:null,confidence:'uncertain',source:null,hint:hints[0]};
 // A graphic with "Light" and "Medium" labels alone isn't evidence that
 // either endpoint is the roast value; allow member to select manually.
 const roastHeading=page.match(/(?:Roast\s+Level|Roast\s+Profile)[\s\S]{0,750}/i);
 if(roastHeading&&/\bLight\b/.test(roastHeading[0])&&/\bMedium\b/.test(roastHeading[0])){
  return {value:null,confidence:'uncertain',source:null,
   hint:'Roast graphic found, but its selected position is not available as a reliable text value. Choose the level shown on the roaster’s page.'};
 }
 return {value:null,confidence:'none',source:null,hint:''};
}
