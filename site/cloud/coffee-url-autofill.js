import {e} from '../lib/ui.js';

// Match the bounded public evidence allowance. Individual structured chunks
// retain their existing size and part limits for compatible local exports.
export const MAX_SOURCE_REVIEW_FACTS=384;

export const autofillFields=[
 ['name','Coffee Name'],['roaster','Roaster'],['release_label','Release / Harvest'],
 ['origin','Origin'],['roast_level','Roast Level'],['elevation_m','Elevation'],
 ['process','Process'],['variety','Variety'],['producer','Producer'],
 ['tasting_notes','Tasting Notes']
];
// Identity has already been confirmed by the matching flow. Preserve that
// identity and carry only the submitted descriptive differences into review.
export function coffeeSourceDifferences(submitted,current){
 const same=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en');
 return autofillFields.filter(([key])=>!['name','roaster','release_label'].includes(key))
  .filter(([key])=>typeof submitted?.[key]==='string'&&submitted[key].trim()&&same(submitted[key])!==same(current?.[key]))
  .map(([key,label])=>({key,label,current:String(current?.[key]??''),submitted:submitted[key].trim()}));
}
// A preview never authorizes a canonical edit. Source candidates are
// explicitly presented for the member's manual decision, never auto-applied.
const REVIEW_FIELDS=new Map(autofillFields.filter(([key])=>!['name','roaster'].includes(key)));
// Source review is public evidence: strip pasted query credentials/tracking
// while retaining a numeric Shopify variant that identifies a selected option.
function publicReviewSourceUrl(value){
 if(typeof value!=='string'||value.length>3000)return null;
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password)return null;
  const variant=url.searchParams.get('variant');
  url.search='';url.hash='';
  if(variant&&/^\d{1,20}$/.test(variant))url.searchParams.set('variant',variant);
  return url.href;
 }catch{return null;}
}
export function coffeeConflictReviewOptions(result){
 if(!result?.ok)return [];
 const facts=Array.isArray(result.source_facts)?result.source_facts.slice(0,MAX_SOURCE_REVIEW_FACTS):[];
 return [...new Set(Array.isArray(result.conflicts)?result.conflicts:[])].filter(key=>REVIEW_FIELDS.has(key)).map(field=>{
  const options=[],seen=new Map();
  const add=(value,label,source_url='')=>{
   if(typeof value!=='string'||!value.trim()||value.length>220)return;
   const text=value.trim(),sig=text.normalize('NFKC').toLowerCase().replace(/\s+/g,' ');
   const verifiedUrl=typeof source_url==='string'&&source_url===result.source_url?
    publicReviewSourceUrl(source_url):null;
   // The first structured value retains its label; a matching literal fact
   // can enrich its provenance rather than disappearing as a duplicate.
   if(seen.has(sig)){
    const previous=options[seen.get(sig)];
    if(!previous.source_url&&verifiedUrl)previous.source_url=verifiedUrl;
    return;
   }
   if(options.length>=8)return;
   seen.set(sig,options.length);
   options.push({value:text,label:String(label||'Published source').slice(0,100),
    source_url:verifiedUrl||''});
  };
  for(const row of (Array.isArray(result.conflict_options?.[field])?result.conflict_options[field]:[]).slice(0,16))
   add(row?.value,row?.label,row?.source_url);
  for(const fact of facts){
   if(fact?.field===field&&!['json','projection','reference'].includes(fact.format))
    add(fact.value,fact.label,fact.source_url);
   if(field==='roast_level'&&fact?.label==='Published product tags'&&
     fact.format==='json'&&fact.value?.length<=4000){
    try{
     const tags=JSON.parse(fact.value);
     if(Array.isArray(tags))for(const tag of tags.slice(0,80))if(typeof tag==='string'&&
      /^(?:Coffee_)?(?:(?:Ultra|Very)[ -]Light|Light[ -]Medium|Medium[ -](?:Light|Dark)|Light|Medium|Dark)[ -]Roast$/i.test(tag))
      add(tag,'Selected product roast tag',fact.source_url);
    }catch{/* Original literal JSON remains in published source details. */}
   }
  }
  return {field,label:REVIEW_FIELDS.get(field),options};
 });
}
export function elevationWithDefaultMeters(value){
 // An elevation field is already source-bound. Only a complete number or
 // range without a unit gets the owner-approved default meters label.
 const raw=String(value||'').trim();
 if(!/^(?:(?:[~><]=?|[≥≤])\s*)?(?:\d{1,2}(?:[,. ]\d{3}){1,2}|\d{1,5})(?:\s*(?:-|–|—|to|and|&)\s*(?:\d{1,2}(?:[,. ]\d{3}){1,2}|\d{1,5}))?\+?$/.test(raw))return raw;
 return raw+' m';
}
const reasons={
 invalid_url:'Enter a secure HTTPS link to a public coffee product page.',
 unrecognized_official_roaster:'This source could not be recognized or accessed. Enter coffee details manually if needed.',
 unsupported_official_product_url:'That link is not a supported official coffee product page. Try the specific product page or enter details manually.',
 ambiguous_or_missing_product:'We could not identify one specific coffee from the page metadata. Enter the details manually to avoid mixing different releases.',
 source_unavailable:'The roaster page is temporarily unavailable. You can enter the details manually.',
 source_fetch_failed:'The roaster page could not be checked right now. You can enter details manually.',
 redirect_requires_review:'The roaster redirects this URL. Paste the final official product URL or enter details manually.',
 preview_cooldown:'Please wait 30 seconds between coffee URL lookups.',
 daily_preview_limit:'The URL preview limit has been reached for today. You can still add coffees manually.',
 preview_rate_limited:'Too many URL checks. Try again later.',
 page_too_large:'This page is too large for automatic extraction. Add details manually.',
 not_html:'The URL must point to a coffee product web page, not a download.',
 admitted_member_required:'Sign in with an admitted beta account to check URLs.'
};

// A roast option belongs to the member's selected purchase, not to a
// conflicting second source. Keep the untouched preview for another choice.
export function coffeeRoastVariantPreview(base,id){
 if(!base?.ok||!Array.isArray(base.roast_variants))return base;
 const chosen=base.roast_variants.find(v=>v?.id===id);
 if(!chosen)return {...base,selected_roast_variant:null};
 return {...base,selected_roast_variant:id,
  fields:{...base.fields,...chosen.fields},
  ...(chosen.roaster_recipe?{roaster_recipe:chosen.roaster_recipe}:{})};
}
export function applyCoffeeRoastVariant(form,previous,next){
 let changed=0;
 for(const key of ['roast_level','tasting_notes']){
  const control=form?.elements?.namedItem?.(key);
  if(!control)continue;
  const oldValue=String(previous?.fields?.[key]||'');
  const nextValue=String(next?.fields?.[key]||'');
  // Never overwrite something the member typed, including corrections.
  if(String(control.value||'').trim()&&control.value!==oldValue)continue;
  if(control.tagName==='SELECT'&&nextValue&&![...control.options].some(x=>x.value===nextValue))continue;
  if(control.value===nextValue)continue;
  control.value=nextValue;
  control.dispatchEvent(new Event('change',{bubbles:true}));
  changed++;
 }
 return changed;
}
function roastVariantMarkup(result){
 const variants=Array.isArray(result.roast_variants)?result.roast_variants.filter(v=>
  v&&/^[a-z-]{1,25}$/.test(v.id)&&typeof v.label==='string'&&typeof v.fields?.roast_level==='string').slice(0,7):[];
 if(variants.length<2)return '';
 const current=variants.find(v=>v.id===result.selected_roast_variant);
 const headings=variants.map(v=>`<button type="button" class="secondary compact coffee-roast-option" data-action="choose-coffee-roast-variant" data-roast-variant="${e(v.id)}" aria-pressed="${current?.id===v.id}">${e(v.label)}</button>`).join('');
 const recipe=current?.roaster_recipe||{},sensory=current?.sensory;
 const metrics=sensory?`<p class="helper" aria-label="Roaster sensory ratings">Roaster sensory ratings: Sweetness ${e(sensory.sweetness)}/10 · Acidity ${e(sensory.acidity)}/10 · Body ${e(sensory.body)}/10${sensory.bitterness!=null?' · Bitterness '+e(sensory.bitterness)+'/10':''}</p>`:'';
 const dose=Number.isFinite(recipe.dose_g)&&Number.isFinite(recipe.yield_g)?`${e(recipe.dose_g)} g in / ${e(recipe.yield_g)} g out`:'Dose and yield not published';
 const brew=Number.isFinite(recipe.ratio)||recipe.temperature_reference?
  `<div class="coffee-roast-brew"><strong>Roaster's suggested espresso starting point</strong><p class="helper">Ratio: ${Number.isFinite(recipe.ratio)?'1:'+e(recipe.ratio):'not published'} · Temperature: ${e(recipe.temperature_reference||'not published')} · ${dose}. Shot time not published.</p><p class="helper">Published guidance, not a validated shot recipe. Not saved automatically.</p></div>`:'';
 return `<section class="coffee-roast-variants" aria-label="Choose purchased roast"><h3>Which roast did you buy?</h3><div class="coffee-roast-options" role="group" aria-label="Roast options">${headings}</div><p class="helper">Both options share the underlying coffee details. Choose one to populate its roast level and tasting notes; the other roast is not a conflict.</p>${current?`<div class="coffee-roast-selected" aria-live="polite"><strong>Selected roast: ${e(current.label)}</strong><p class="helper"><strong>Tasting notes:</strong> ${e(current.fields.tasting_notes||'Not published')}</p>${metrics}${brew}</div>`:'<p class="helper" role="status">Choose Light or Medium-dark to see its specific details. No roast was selected automatically.</p>'}</section>`;
}

export function coffeeUrlPreviewMarkup(result){
 if(!result?.ok)return `<div class="coffee-url-message" role="status">${e(reasons[result?.reason]||'We could not retrieve trustworthy details. Enter the coffee information manually.')}</div>`;
 const fields=autofillFields.filter(([name])=>typeof result.fields?.[name]==='string'&&result.fields[name].trim());
 const conflictGroups=coffeeConflictReviewOptions(result);
 const existing=result.match?.classification==='exact_verified'?'This page also matches an existing verified coffee. Choosing Add Coffee will reuse its canonical record after the identity check.':
  result.match?.classification==='needs_confirmation'?'A similar verified coffee exists. You will be asked to confirm the right release before linking any records.':'';
 const official=result.source==='official_roaster_product_metadata';
 const catalog=result.source==='approved_catalog';
 const heading=catalog?'Previously Approved Coffee Details':official?'Details Found On Official Roaster Page':'Suggested Details From Webpage';
 const sourceLabel=catalog?'Approved Catalog':official?'Official Source Preview':'Unverified Page';
 const caution=catalog?(result.refresh_reason?'The current roaster page could not be rechecked. Available catalog details are shown below; confirm the intended release.':'These details come from the approved coffee catalog. Confirm that this is the release you want.'):
  official?'Review these suggestions; a page preview alone does not verify the exact release.':'The webpage is not yet a verified official source. Review these extracted suggestions and leave unconfirmed facts blank.';
 // Noncanonical supplementary facts remain visible in a compact disclosure,
 // not silently saved as a roast classification or verified source metadata.
 const detailsLabels={
  agtron:'Roaster Agtron',agtron_scale:'Agtron Scale',agtron_sample:'Agtron Sample',production_roaster:'Production Roaster',recommended_rest:'Recommended Rest',
  drying_method:'Drying Method',harvest_season:'Harvest Season',
  preferred_extraction:'Preferred Extraction',processing_detail:'Processing Detail',farm:'Farm / Estate',named_producer:'Named Producer / Grower',blend_components:'Blend Components'
 };
 const extras=Object.entries(detailsLabels).filter(([key])=>typeof result.roaster_details?.[key]==='string'&&result.roaster_details[key]);
 const allPublishedFacts=Array.isArray(result.source_facts)?result.source_facts.slice(0,MAX_SOURCE_REVIEW_FACTS).filter(fact=>
  fact&&typeof fact.label==='string'&&fact.label.trim()&&typeof fact.value==='string'&&fact.value.trim()):[];
 const selectedSpecs=new Set(Array.isArray(result.current_product_spec_fields)?result.current_product_spec_fields:[]);
 const currentFacts=new Set(allPublishedFacts.filter(fact=>
  fact.field&&['html','product_json'].includes(fact.source_type)&&
  typeof result.fields?.[fact.field]==='string'&&
  String(fact.value||'').trim().toLowerCase()===result.fields[fact.field].trim().toLowerCase()
 ).map(fact=>fact.field));
 const publishedFacts=allPublishedFacts.filter(fact=>{
  if(['json','projection','reference'].includes(fact.format))return false;
  // SEO is fallback, not a competing selected-product detail. Keep raw
  // evidence in the optional source export, never in the ordinary review.
  if(['seo','page_meta','archived_metadata','html_meta'].includes(fact.source_type)&&
     fact.field&&(selectedSpecs.has(fact.field)||currentFacts.has(fact.field))&&
     typeof result.fields?.[fact.field]==='string'&&
     String(fact.value||'').trim().toLowerCase()!==result.fields[fact.field].trim().toLowerCase())return false;
  return true;
 });
 const structuredRecords=allPublishedFacts.filter(fact=>['json','projection','reference'].includes(fact.format));
 const recipe=result.roaster_recipe||{};
 const validYield=Number.isFinite(recipe.yield_g)||
  (Number.isFinite(recipe.yield_g_min)&&Number.isFinite(recipe.yield_g_max)&&recipe.yield_g_max>=recipe.yield_g_min);
 const measuredReference=Number.isFinite(recipe.dose_g)&&validYield;
 const fullRecipe=measuredReference&&Number.isFinite(recipe.time_s_min)&&
  Number.isFinite(recipe.time_s_max)&&recipe.time_s_max>=recipe.time_s_min;
 const doseText=Number.isFinite(recipe.dose_g_max)?e(recipe.dose_g)+'–'+e(recipe.dose_g_max):
  e(recipe.dose_g)+(Number.isFinite(recipe.dose_tolerance_g)?' ± '+e(recipe.dose_tolerance_g):'');
 const outputText=Number.isFinite(recipe.yield_g)?e(recipe.yield_g):e(recipe.yield_g_min)+'–'+e(recipe.yield_g_max);
 const publishedRecipe=measuredReference?
  doseText+' g in, '+outputText+' g out'+(fullRecipe?', '+e(recipe.time_s_min)+'–'+e(recipe.time_s_max)+' s':'')+
  (recipe.temperature?', '+e(recipe.temperature):recipe.temperature_reference?', temperature guidance: '+e(recipe.temperature_reference):'')+
  (fullRecipe?'':' (total shot time not published)'):
  Number.isFinite(recipe.ratio)?'Espresso ratio 1:'+e(recipe.ratio)+' (dose and time not supplied)':'';
 return `<section class="coffee-url-preview">
  <div class="coffee-url-preview-title"><strong>${e(heading)}</strong><span class="coffee-source-label">${e(sourceLabel)}</span></div>
  <p class="helper">${e(caution)} Fields you already entered will not be overwritten.</p>
  ${catalog?'<button type="button" class="secondary compact" data-action="preview-coffee-url-refresh">Check Current Roaster Page</button><p class="helper">Check for newer published details. Wait 30 seconds between checks; the usual URL lookup limit applies.</p>':''}
  ${result.origin_confirmation_required===true?`<div class="coffee-rotation-review" role="group" aria-label="Rotating origin confirmation"><p class="helper">This product explicitly says its origin rotates. Confirm the origin shown on your current bag or offering.</p><label class="checkline"><input id="coffee-rotating-origin-confirmed" type="checkbox"><span>I checked this coffee's current origin.</span></label></div>`:''}
  ${roastVariantMarkup(result)}
  ${conflictGroups.length?`<section class="coffee-source-conflicts" role="region" aria-label="Conflicting coffee information"><h3>Review conflicting details</h3><p class="helper">These published readings disagree. Nothing was selected automatically. Compare them with the roaster's label and type your choice in the matching field below.</p>${conflictGroups.map(group=>`<div id="coffee-conflict-${e(group.field)}" class="coffee-conflict-group"><strong>${e(group.label)}</strong>${group.options.length?`<ul>${group.options.map(option=>`<li><span class="coffee-conflict-value">${e(option.value)}</span><small>${e(option.label)}${option.source_url?' · <a href="'+e(option.source_url)+'" target="_blank" rel="noopener noreferrer">View Original Source</a>':''}</small></li>`).join('')}</ul>`:'<p class="helper">Exact alternatives could not be isolated. See the complete published source details below or check the product page.</p>'}</div>`).join('')}</section>`:''}
  <dl class="coffee-url-fields">${fields.map(([key,label])=>`<div><dt>${e(label)}</dt><dd>${e(key==='elevation_m'?elevationWithDefaultMeters(result.fields[key]):result.fields[key])}</dd></div>`).join('')}</dl>
  ${result.fields?.process==='Other/Unknown'&&result.roaster_details?.blend_components?'<p class="helper" role="note">This blend has multiple documented processing methods. Other/Unknown preserves that distinction; review the component details below.</p>':''}
  ${fields.some(([key])=>key==='elevation_m'&&elevationWithDefaultMeters(result.fields[key])!==result.fields[key])?'<p class="helper">The roaster omitted the elevation unit. Meters above sea level (m) are assumed, per the approved import rule.</p>':''}
  ${result.roast_hint?`<p class="helper" role="note"><strong>Roast graphic:</strong> ${e(result.roast_hint)}</p>`:''}
  ${publishedRecipe?`<p class="helper"><strong>Roaster's published espresso ${fullRecipe?'recipe':'reference'}:</strong> ${publishedRecipe}. Reference only; not applied or saved automatically.</p>`:''}
  ${extras.length?`<details class="coffee-url-supplement"><summary>Other published details (${extras.length})</summary><dl class="coffee-url-fields">${extras.map(([key,label])=>`<div><dt>${e(label)}</dt><dd>${e(result.roaster_details[key])}</dd></div>`).join('')}</dl><p class="helper">Source details are for review. Agtron-derived levels may assume Gourmet ground-coffee readings; supplementary measurements are not saved as coffee fields.</p></details>`:''}
  ${publishedFacts.length?`<details class="coffee-url-supplement"><summary>Published source information (${publishedFacts.length})</summary><p class="helper">Review the roaster's product text, specifications and purchase options. These details are not saved automatically.</p><dl class="coffee-url-fields">${publishedFacts.map(fact=>`<div><dt>${fact.section?e(fact.section)+' · ':''}${e(fact.label)}${fact.conflicting?' · conflicting sources':''}</dt><dd>${e(fact.value)}</dd></div>`).join('')}</dl></details>`:''}
  ${structuredRecords.length?'<p class="helper">The source review download also includes the original structured purchase options, prices and product records.</p>':''}
  ${result.source_facts_truncated||Array.isArray(result.source_facts)&&result.source_facts.length>MAX_SOURCE_REVIEW_FACTS?'<p class="helper" role="note">This page contains more information than the preview can display. Review the original product page for the remaining details.</p>':''}
  ${result.source_url?'<button type="button" class="secondary compact" data-action="download-coffee-source-review">Download Source Review</button><p class="helper">Keep the extracted details and source information as a file. Supplementary details are available in this preview and download; they are not stored in the shared coffee record.</p>':''}
  ${existing?`<p class="helper coffee-match-alert">${e(existing)}</p>`:''}
  <p class="helper">Available details filled into the form. Review or correct them, then click Add Coffee.</p>
 </section>`;
}
// An explicit local export keeps source evidence available after Add Coffee.
// Whitelist public preview data only: never export authentication, matching
// responses, private catalog records, session state or a member's typed form.
export function coffeeSourceReviewSnapshot(result,{checkedAt=new Date().toISOString()}={}){
 if(!result?.ok||typeof result.source_url!=='string')return null;
 const reviewUrl=publicReviewSourceUrl(result.source_url);
 if(!reviewUrl)return null;
 let truncated=result.source_facts_truncated===true;
 const bounded=(value,max)=>{
  if(value.length>max)truncated=true;
  const end=max<value.length&&/[\uD800-\uDBFF]/.test(value[max-1])&&/[\uDC00-\uDFFF]/.test(value[max])?max-1:max;
  return value.slice(0,end);
 };
 const fieldSuggestions=Object.fromEntries(autofillFields.filter(([key])=>typeof result.fields?.[key]==='string')
  .map(([key])=>[key,bounded(key==='elevation_m'?elevationWithDefaultMeters(result.fields[key]):result.fields[key],2000)]));
 const sourceFacts=Array.isArray(result.source_facts)?result.source_facts:[];
 if(sourceFacts.length>MAX_SOURCE_REVIEW_FACTS)truncated=true;
 const facts=sourceFacts.slice(0,MAX_SOURCE_REVIEW_FACTS).map(fact=>{
  const row={};
  for(const [key,max] of [['label',100],['value',1600],['section',100],['source_type',30],['source_url',3000],['source_path',301],['source_locator',200],['format',10],['field',71]])
   if(typeof fact?.[key]==='string')row[key]=bounded(fact[key],max);
  const publicSource=publicReviewSourceUrl;
  if(row.source_url){const safe=publicSource(row.source_url);if(safe)row.source_url=safe;else delete row.source_url;}
  if(Array.isArray(fact?.supporting_sources)){
   const sources=fact.supporting_sources.slice(0,3).flatMap(source=>{
    const source_url=publicSource(source?.source_url);
    return source_url&&/^(?:html|product_json|image_text)$/.test(source?.source_type)?[{source_url,source_type:source.source_type}]:[];
   });
   if(sources.length)row.supporting_sources=sources;
  }
  if(fact?.conflicting===true)row.conflicting=true;
  if(Number.isSafeInteger(fact?.part)&&fact.part>=0&&fact.part<128)row.part=fact.part;
  return row;
 }).filter(row=>row.label&&row.value);
 const details=Object.fromEntries(Object.entries(result.roaster_details||{}).slice(0,40)
  .filter(([key,value])=>/^[a-z_]{1,60}$/.test(key)&&typeof value==='string').map(([key,value])=>[key,bounded(value,4000)]));
 const recipe=Object.fromEntries(Object.entries(result.roaster_recipe||{}).slice(0,40)
  .filter(([key,value])=>/^[a-z_]{1,60}$/.test(key)&&(Number.isFinite(value)||typeof value==='string'))
  .map(([key,value])=>[key,typeof value==='string'?bounded(value,500):value]));
 const roastReviewNote=typeof result.roast_hint==='string'?bounded(result.roast_hint,2000):null;
 const conflictOptions=coffeeConflictReviewOptions(result).map(group=>({field:group.field,
  options:group.options.slice(0,8).map(option=>({value:bounded(option.value,220),label:bounded(option.label,100),
   ...(option.source_url?{source_url:option.source_url}:{})}))}));
 return {schema_version:1,type:'coffee_source_review',source_url:reviewUrl,checked_at:checkedAt,
  verification:'unverified_public_source_suggestions',field_suggestions:fieldSuggestions,
  published_source_information:facts,roaster_details:details,roaster_espresso_reference:recipe,
  conflicts:Array.isArray(result.conflicts)?result.conflicts.filter(key=>autofillFields.some(([field])=>field===key)):[],
  conflict_options:conflictOptions,source_information_truncated:truncated,
  ...(Array.isArray(result.roast_variants)?{roast_variants:result.roast_variants.slice(0,7).map(v=>({id:bounded(String(v.id||''),25),label:bounded(String(v.label||''),50),fields:{roast_level:bounded(String(v.fields?.roast_level||''),50),tasting_notes:bounded(String(v.fields?.tasting_notes||''),250)},...(v.sensory?{sensory:v.sensory}:{}) ,...(v.roaster_recipe?{roaster_recipe:v.roaster_recipe}:{})}))}:{}),
  ...(typeof result.selected_roast_variant==='string'?{selected_roast_variant:result.selected_roast_variant}:{}),
  ...(result.origin_confirmation_required===true?{origin_confirmation_required:true}:{}),
  ...(roastReviewNote!==null?{roast_review_note:roastReviewNote}:{}),
  limitations:'Extraction is a review aid. Image pixels, linked documents and unexposed dynamic content may contain additional or conflicting information. This file does not approve or update a shared coffee record.'};
}
export function downloadCoffeeSourceReview(snapshot){
 if(snapshot?.type!=='coffee_source_review')return false;
 const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}));
 const anchor=document.createElement('a');
 const name=String(snapshot.field_suggestions?.name||'Coffee').normalize('NFKD').replace(/[^a-z0-9]+/gi,'_').replace(/^_|_$/g,'').slice(0,90)||'Coffee';
 anchor.href=url;anchor.download=name+'_Source_Review.json';anchor.click();
 setTimeout(()=>URL.revokeObjectURL(url),30_000);return true;
}
export function applyCoffeeUrlFields(form,result){
 if(!form||!result?.ok)return {filled:0,skipped:0};
 let filled=0,skipped=0;
 for(const [key] of autofillFields){
  const value=result.fields?.[key];
  const field=form.elements.namedItem(key);
  if(!field||typeof value!=='string'||!value.trim())continue;
  if(String(field.value||'').trim()){skipped++;continue;}
  if(field.tagName==='SELECT'&&![...field.options].some(o=>o.value===value)){skipped++;continue;}
  field.value=key==='elevation_m'?elevationWithDefaultMeters(value):value;field.dispatchEvent(new Event('change',{bubbles:true}));filled++;
 }
 return {filled,skipped};
}
