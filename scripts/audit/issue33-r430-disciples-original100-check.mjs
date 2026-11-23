#!/usr/bin/env node
// Issue #33 R430: original frozen #100 current selected official source only.
// Deliberately NOT manual certification of the original603 universe.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedCurrentInlineShopifyRoastTag} from '../../src/server/coffee-current-inline-shopify-product.mjs';

const name='Guatemala Honey Process - Organic Coffee Beans';
const url='https://disciplescoffee.com/products/guatemala';
const digest=x=>createHash('sha256').update(x).digest('hex');
const normalize=x=>String(x??'')
 .replace(/&(?:amp|#0*38|#x0*26);/giu,'&')
 .replace(/&(?:eacute|#0*233|#x0*e9);/giu,'é')
 .replace(/&(?:nbsp|#0*160);/giu,' ')
 .normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/[^a-z0-9]+/gu,' ').trim();
const digits=x=>String(x??'').replace(/[^0-9]/gu,'');
const selectedText=html=>productMarkup(html).replace(/<[^>]*>/gu,' ');

export function selectedR430Failures(n,selectedSource,fields={},evidence={}){
 if(n!==100)return ['not_selected_original603_case'];
 const text=normalize(selectedSource),errors=[],fact=key=>normalize(fields[key]);
 const has=x=>text.includes(normalize(x)),taste=x=>fact('tasting_notes').includes(normalize(x));
 if(fact('name')!==normalize(name)||!has(name))
  errors.push('changed_or_unmatched_selected_product_identity');
 for(const x of ['Joyabaj','Quiché','Guatemala','honey-processed','cherry','malt','anise','cinnamon','Light roast'])
  if(!has(x))errors.push('missing_selected_own_literal_'+normalize(x).replace(/ /gu,'_'));
 if(!fact('origin').includes('joyabaj')||!fact('origin').includes('quiche')||
    !fact('origin').includes('guatemala'))
  errors.push('direct_selected_precise_origin_omitted');
 if(fact('origin').includes('mexico'))
  errors.push('shopify_product_tag_geography_not_chosen_bean_origin');
 if(fact('process')!=='honey')
  errors.push('selected_honey_method_misread_as_educational_washed_or_natural');
 // The current SAME SELECTED PRODUCT makes two incompatible direct roast claims:
 // visible Light roast prose and exact title/handle/vendor-bound Shopify Medium tag.
 // Neither may silently override the other: leave canonical roast blank for review.
 if(evidence.inlineRoast!=='Medium'||!evidence.conflicts?.includes('roast_level'))
  errors.push('selected_same_product_roast_disagreement_not_proven_and_reviewable');
 if(fields.roast_level)
  errors.push('contradictory_selected_light_medium_roast_must_stay_blank');
 for(const word of ['cherry','malt','anise','cinnamon'])
  if(!taste(word))errors.push('selected_direct_taste_omitted_'+word);
 if(['caramel','apricot','milk chocolate','lemon'].some(word=>taste(word)))
  errors.push('shopify_taxonomy_flavor_from_different_or_unresolved_roast_tag_leak');
 if(!digits(fields.elevation_m).includes('1300')||!digits(fields.elevation_m).includes('2000'))
  errors.push('selected_altitude_range_omitted_or_wrong');
 if(fields.producer||fields.variety||fields.decaffeination_method||fields.release_label)
  errors.push('unpublished_product_grower_cultivar_decaf_or_lot_invented');
 return errors;
}
if(process.env.DIC_ISSUE33_R430_RUN==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR,sha=process.env.DIC_EXPECTED_SHA;
 if(!dir||!/^[0-9a-f]{40}$/u.test(sha||''))throw Error('exact_source_and_directory_required');
 const report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
 const failures=[],proof=[];
 const require=(ok,message)=>{if(!ok)failures.push(message)};
 require(report.source_sha===sha,'source_sha_not_exact');
 require(JSON.stringify(report.case_numbers)==='[100]'&&report.records?.length===1,
  'not_exact_selected_frozen100_case');
 require(report.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353',
  'immutable_original603_csv_changed');
 require(report.original_corpus_modified===false&&report.manual_certified===0&&
  report.production_operations===0,'forbidden_original_or_provider_mutation');
 const r=report.records?.[0];
 require(r?.official_url===url&&r?.final_url?.replace(/\/$/u,'')===url,
  'selected_original_url_or_redirect_identity_changed');
 require(r?.number===100&&r?.status==='FETCHED'&&r?.parser_ok===true&&
  r?.selected_heading_identity_verified===true&&r?.add_coffee_ui_rendered===true&&
  r?.source_review_rendered===true,'official_h1_current_parser_or_unsaved_ui_unverified');
 let html=null;
 try{html=readFileSync(join(dir,'case-100.html'),'utf8')}
 catch{failures.push('missing_actual_official_raw_html');}
 if(html!==null){
  const rawSha=digest(html),p=extractPublicCoffeeFacts(html,{source_url:r?.final_url||url});
  require(rawSha===r?.html_sha256,'actual_raw_html_sha256_mismatch');
  require(p?.ok===true&&normalize(p.fields?.name)===normalize(name),
   'actual_raw_parser_selected_product_identity_mismatch');
  for(const key of ['name','roaster','origin','producer','process','variety','roast_level',
   'tasting_notes','elevation_m','decaffeination_method','release_label'])
   require(String(p?.fields?.[key]??'')===String(r?.current_fields?.[key]??''),
    'raw_parser_report_field_parity_'+key);
  const tagged=selectedCurrentInlineShopifyRoastTag(html,{
   name:p?.fields?.name,roaster:p?.fields?.roaster,source_url:r?.final_url||url});
  require(tagged?.value==='Medium',
   'actual_selected_title_handle_vendor_bound_product_medium_roast_tag_missing');
  require((p?.source_facts||[]).some(f=>f.field==='roast_level'&&
   f.value==='Medium'&&f.source_type==='product_json'&&f.conflicting===true&&
   f.section==='Exact current selected Shopify inline Product roast tag'),
   'source_review_selected_product_roast_contradiction_not_retained');
  for(const reason of selectedR430Failures(100,selectedText(html),r?.current_fields||{},
   {inlineRoast:tagged?.value,conflicts:r?.conflicts||[]}))failures.push(reason);
  require(!p?.roaster_recipe?.dose_g&&!p?.roaster_recipe?.yield_g,
   'other_roaster_espresso_recipe_or_select_grind_leak');
  require(JSON.stringify(r?.conflicts||[])==='["roast_level"]',
   'selected_roast_disagreement_must_be_only_current_conflict');
  proof.push({original:100,official_url:url,sha256:rawSha,bytes:Buffer.byteLength(html),
   selected_headings:r?.selected_h1,current_fields:r?.current_fields,
   conflicts:r?.conflicts||[],add_coffee_unsaved:r?.add_coffee_ui_rendered===true,
   source_review:r?.source_review_rendered===true});
 }
 const result={source_sha:sha,original_numbers:[100],manual_certified:0,
  provider_writes:0,failures,proof};
 writeFileSync(join(dir,'r430-selected-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC ISSUE33 R430 SELECTED OFFICIAL AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
