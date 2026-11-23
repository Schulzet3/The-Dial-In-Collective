#!/usr/bin/env node
// #33 R424: only frozen originals 173/174; current first-party seller facts,
// not customer reviews, related-product inventory or archived SEO.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const ownText=html=>productMarkup(html).replace(/<[^>]*>/gu,' ')
 .replace(/&(?:nbsp|amp);|&#160;/giu,' ').replace(/\s+/gu,' ').trim();
const expected={
 173:{name:'PAPUA NEW GUINEA Highlands',url:'https://katicoffee.com/products/papua-new-guinea-highlands',
  notes:['dark chocolate','black cherry','mild spice']},
 174:{name:'TANZANIA Peaberry',url:'https://katicoffee.com/products/tanzania-peaberry',
  notes:['blackberry','nutmeg','floral']}
};
export function selectedKatiDirectFailures(n,text,fields){
 const e=expected[n];if(!e)return ['case_outside_original173_174'];
 const f=fields||{},t=String(text||'').toLowerCase(),notes=String(f.tasting_notes||'').toLowerCase();
 const failures=[];
 if(!t.includes(e.name.toLowerCase()))failures.push('selected_name_absent');
 if(!e.notes.every(x=>t.includes(x)))failures.push('seller_direct_tasting_not_printed');
 if(!e.notes.every(x=>notes.includes(x)))failures.push('published_selected_tasting_omitted');
 if(n===174){
  if(!/roast level:\s*lighter\b/iu.test(text))failures.push('selected_current_lighter_not_printed');
  if(f.roast_level)failures.push('relative_lighter_not_absolute_roast');
 }else{
  if(!/roast level:\s*darker\b/iu.test(text))failures.push('selected_darker_not_printed');
  if(f.roast_level)failures.push('relative_darker_not_absolute_roast');
 }
 if(/caramel|crema|hollander|customer review|rooftop/iu.test(notes))
  failures.push('shopper_review_or_other_coffee_sensory_contamination');
 if(f.producer||f.elevation_m||f.variety||f.process||f.release_label||f.decaffeination_method)
  failures.push('unpublished_grower_elevation_variety_process_release_decaf');
 return failures;
}
if(process.env.DIC_ISSUE33_KATI_R424_RUN==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'';
 const head=process.env.DIC_EXPECTED_SHA||'';
 if(!dir||!/^[0-9a-f]{40}$/u.test(head))throw Error('missing_exact_source_or_dir');
 const evidence=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
 const failures=[],records=[];
 const need=(ok,why)=>{if(!ok)failures.push(why);};
 need(evidence.source_sha===head,'source_sha_not_checkout');
 need(JSON.stringify(evidence.case_numbers)==='[173,174]'&&evidence.records?.length===2,'wrong_case_subset');
 need(evidence.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original_csv_changed');
 need(evidence.original_corpus_modified===false&&evidence.manual_certified===0&&evidence.production_operations===0,'original_corpus_or_provider_write');
 for(const n of [173,174]){
  const r=evidence.records?.find(x=>x.number===n),item=expected[n];
  if(!r){failures.push('missing_record_'+n);continue;}
  need(r.official_url===item.url&&r.final_url?.replace(/\/$/u,'')===item.url,'exact_url_or_redirect_'+n);
  need(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true&&
  r.selected_embedded_product_identity?.method==='shopify_main_product_variant_h3_own_richtext'&&
   r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'first_party_parser_identity_unsaved_UI_'+n);
  let html;
  try{html=readFileSync(join(dir,'case-'+n+'.html'),'utf8');}
  catch{failures.push('missing_raw_html_'+n);continue;}
  const digest=sha(html),p=extractPublicCoffeeFacts(html,{source_url:r.final_url||item.url});
  need(r.html_sha256===digest&&/^[0-9a-f]{64}$/u.test(digest),'raw_official_sha256_mismatch_'+n);
  need(p?.ok===true&&p.fields?.name?.toLowerCase()===item.name.toLowerCase()&&
   r.current_fields?.name?.toLowerCase()===item.name.toLowerCase(),'chosen_parser_identity_'+n);
  for(const field of ['roast_level','tasting_notes','origin','producer','variety','process','elevation_m','release_label','decaffeination_method'])
   need(String(p?.fields?.[field]||'')===String(r.current_fields?.[field]||''),'raw_parser_report_parity_'+n+'_'+field);
  const selected=ownText(html);
  for(const f of selectedKatiDirectFailures(n,selected,r.current_fields||{}))
   failures.push('case_'+n+'_'+f);
  need(!p?.roaster_recipe?.dose_g&&!p?.roaster_recipe?.yield_g,'unpublished_customer_espresso_recipe_'+n);
  need(String(r.current_fields?.origin||'').toLowerCase().includes(n===174?'tanzania':'papua new guinea'),
   'selected_country_not_retained_'+n);
  records.push({number:n,official_url:item.url,final_url:r.final_url,selected_h1:r.selected_h1,
   selected_h2:r.selected_form_h2,source_html_sha256:digest,bytes:Buffer.byteLength(html),
   current_fields:r.current_fields,conflicts:r.conflicts||[],unsaved_UI:r.add_coffee_ui_rendered,
   source_review:r.source_review_rendered});
 }
 const report={source_sha:head,originals:[173,174],raw_html_verified:true,manual_certified:0,
  provider_writes:0,failures,records};
 writeFileSync(join(dir,'r424-kati-afterproof.json'),JSON.stringify(report,null,2)+'\n');
 console.log('[DIC33 R424 KATI CURRENT SELECTED] '+JSON.stringify(report));
 if(failures.length)process.exitCode=1;
}
