#!/usr/bin/env node
// #33 R423: two original603 High Point exact selected products only.
// A current raw capture is NOT 603-case manual certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'',expected=process.env.DIC_EXPECTED_SHA||'';
if(!dir||!/^[0-9a-f]{40}$/u.test(expected))throw Error('r423_exact_source_or_dir_missing');
const source=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const sha=value=>createHash('sha256').update(value,'utf8').digest('hex');
const failures=[],inspected=[];
const need=(ok,reason)=>{if(!ok)failures.push(reason);};
need(source.source_sha===expected,'exact_source_mismatch');
need(JSON.stringify(source.case_numbers)==='[149,150]'&&source.records?.length===2,'wrong_original603_subset');
need(source.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_register_modified');
need(source.original_corpus_modified===false&&source.manual_certified===0&&source.production_operations===0,'corpus_or_provider_integrity');
for(const item of [
 {n:149,name:'Campfire Blend',handle:'campfire-blend',sku:'HPR-CF'},
 {n:150,name:'Stearman Blend',handle:'the-stearman-blend',sku:'HPR-Stearman'}
]){
 const r=source.records?.find(x=>x.number===item.n);
 if(!r){failures.push('missing_original_'+item.n);continue;}
 const original='https://highpointroasters.com/product/'+item.handle;
 need(r.official_url===original&&r.final_url?.replace(/\/$/u,'')===original,'exact_selected_official_url_or_redirect_'+item.n);
 need(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true&&
  r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'required_official_identity_parser_unsaved_UI_'+item.n);
 let html;
 try{html=readFileSync(join(dir,'case-'+item.n+'.html'),'utf8');}
 catch{failures.push('missing_raw_official_selected_HTML_'+item.n);continue;}
 const digest=sha(html);
 need(digest===r.html_sha256&&/^[0-9a-f]{64}$/u.test(digest),'selected_HTML_digest_mismatch_'+item.n);
 need(r.selected_h1?.includes(item.name),'exact_selected_product_H1_'+item.n);
 const selected=productMarkup(html).replace(/<[^>]*>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ')
  .replace(/\s+/gu,' ').trim();
 need(selected.includes(item.name)&&selected.includes(item.sku),'selected_H1_SKU_not_in_product_scope_'+item.n);
 const parsed=extractPublicCoffeeFacts(html,{source_url:r.final_url||original});
 const f=r.current_fields||{},p=parsed?.fields||{};
 need(parsed?.ok===true&&p.name===item.name&&f.name===item.name,'actual_parser_selected_identity_'+item.n);
 for(const key of ['producer','origin','roast_level','tasting_notes','process','variety','elevation_m','decaffeination_method'])
  need((p[key]||'')===(f[key]||''),'actual_parser_report_parity_'+item.n+'_'+key);
 need(!f.release_label&&!f.decaffeination_method&&!f.process&&!f.variety&&!f.elevation_m,
  'unpublished_release_decaf_process_variety_elevation_'+item.n);
 need(!parsed?.roaster_recipe?.dose_g&&!parsed?.roaster_recipe?.yield_g,
  'invented_espresso_recipe_'+item.n);
 const allFields=Object.values(f).join(' ');
 need(!/Chocolate Marshmallow|Zambia Lupili|Trifecta Blend|Cold Brew Blend/iu.test(allFields),
  'related_other_coffee_contamination_'+item.n);
 if(item.n===149){
  need(/dark roasted African and Central American coffees/iu.test(selected),
   'original149_selected_direct_roast_geography_missing');
  need(f.roast_level==='Dark','original149_selected_dark_roast_unretained_or_conflicted');
  need(/Africa/iu.test(f.origin||'')&&/Central America/iu.test(f.origin||''),
   'original149_selected_broad_origin_unretained');
  need(!f.producer&&!f.tasting_notes,'original149_club_endorsement_or_flavor_invented');
  need(!/John Henry Hunt Club/iu.test(f.producer||''),
   'original149_club_is_not_coffee_grower');
 }else{
  need(/developed by Carey Hardin, a Stearman pilot/iu.test(selected),
   'original150_selected_blend_creator_role_missing');
  need(/two beans grown half a world apart/iu.test(selected),
   'original150_selected_aviation_description_missing');
  need(!f.producer&&!f.origin&&!f.roast_level&&!f.tasting_notes,
   'original150_pilot_or_altitude_miscast_as_coffee_facts');
  need(!/Carey Hardin/iu.test(f.producer||''),
   'original150_blend_creator_not_farmer');
 }
 inspected.push({number:item.n,original_url:original,final_url:r.final_url,
  selected_h1:r.selected_h1,selected_sku:item.sku,html_sha256:digest,html_bytes:Buffer.byteLength(html),
  current_fields:f,conflicts:r.conflicts||[],unsaved_add_coffee:r.add_coffee_ui_rendered,
  source_review:r.source_review_rendered});
}
const verdict={source_sha:source.source_sha,originals:[149,150],manual_certified:0,
 real_official_selected_html_digest_independently_calculated:true,provider_writes:0,failures,inspected};
writeFileSync(join(dir,'r423-strict-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R423 HIGH POINT SELECTED] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
