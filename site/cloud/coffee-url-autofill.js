import {e,button} from '../lib/ui.js';

export const autofillFields=[
 ['name','Name / Bag Label'],['roaster','Roaster'],['release_label','Release / Harvest'],
 ['origin','Origin'],['roast_level','Roast Level'],['elevation_m','Elevation'],
 ['process','Process'],['variety','Variety'],['producer','Producer'],
 ['tasting_notes','Tasting Notes']
];
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
export function coffeeUrlPreviewMarkup(result,{applied=false}={}){
 if(!result?.ok)return `<div class="coffee-url-message" role="status">${e(reasons[result?.reason]||'We could not retrieve trustworthy details. Enter the coffee information manually.')}</div>`;
 const fields=autofillFields.filter(([name])=>typeof result.fields?.[name]==='string'&&result.fields[name].trim());
 const existing=result.match?.classification==='exact_verified'?'This page also matches an existing verified coffee. Choosing Add Coffee will reuse its canonical record after the identity check.':
  result.match?.classification==='needs_confirmation'?'A similar verified coffee exists. You will be asked to confirm the right release before linking any records.':'';
 const official=result.source==='official_roaster_product_metadata';
 const heading=official?'Details Found On Official Roaster Page':'Suggested Details From Webpage';
 const sourceLabel=official?'Official Source Preview':'Unverified Page';
 const caution=official?'Review these suggestions; a page preview alone does not verify the exact release.':'The webpage is not yet a verified official source. Review these extracted suggestions and leave unconfirmed facts blank.';
 // Noncanonical supplementary facts remain visible in a compact disclosure,
 // not silently saved as a roast classification or verified source metadata.
 const detailsLabels={
  agtron:'Roaster Agtron',recommended_rest:'Recommended Rest',
  drying_method:'Drying Method',harvest_season:'Harvest Season',
  preferred_extraction:'Preferred Extraction',processing_detail:'Processing Detail'
 };
 const extras=Object.entries(detailsLabels).filter(([key])=>typeof result.roaster_details?.[key]==='string'&&result.roaster_details[key]);
 const fullRecipe=!!(result.roaster_recipe&&Number.isFinite(result.roaster_recipe.dose_g)&&Number.isFinite(result.roaster_recipe.yield_g)&&Number.isFinite(result.roaster_recipe.time_s_min));
 const publishedRecipe=fullRecipe?`${e(result.roaster_recipe.dose_g)} g in, ${e(result.roaster_recipe.yield_g)} g out, ${e(result.roaster_recipe.time_s_min)}–${e(result.roaster_recipe.time_s_max)} s${result.roaster_recipe.temperature?', '+e(result.roaster_recipe.temperature):''}`:
  Number.isFinite(result.roaster_recipe?.ratio)?'Espresso ratio 1:'+e(result.roaster_recipe.ratio)+' (dose and time not supplied)':'';
 return `<section class="coffee-url-preview">
  <div class="coffee-url-preview-title"><strong>${e(heading)}</strong><span class="coffee-source-label">${e(sourceLabel)}</span></div>
  <p class="helper">${e(caution)} Fields you already entered will not be overwritten.</p>
  <dl class="coffee-url-fields">${fields.map(([key,label])=>`<div><dt>${e(label)}</dt><dd>${e(result.fields[key])}</dd></div>`).join('')}</dl>
  ${result.roast_hint?`<p class="helper" role="note"><strong>Roast graphic:</strong> ${e(result.roast_hint)}</p>`:''}
  ${publishedRecipe?`<p class="helper"><strong>Roaster's published espresso ${fullRecipe?'recipe':'reference'}:</strong> ${publishedRecipe}. Reference only; not applied or saved automatically.</p>`:''}
  ${extras.length?`<details class="coffee-url-supplement"><summary>Other published details (${extras.length})</summary><dl class="coffee-url-fields">${extras.map(([key,label])=>`<div><dt>${e(label)}</dt><dd>${e(result.roaster_details[key])}</dd></div>`).join('')}</dl><p class="helper">Source information only. Not a calibrated roast classification or saved coffee field.</p></details>`:''}
  ${existing?`<p class="helper coffee-match-alert">${e(existing)}</p>`:''}
  ${applied?'<p class="helper">Available details filled into the form. Review or correct them, then click Add Coffee.</p>':button('Apply Suggested Details','apply-coffee-url','','secondary compact')}
 </section>`;
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
  field.value=value;field.dispatchEvent(new Event('change',{bubbles:true}));filled++;
 }
 return {filled,skipped};
}
