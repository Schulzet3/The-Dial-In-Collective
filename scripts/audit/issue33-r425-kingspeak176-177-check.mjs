#!/usr/bin/env node
// Issue #33 R425: exact selected original603 #176/#177, not a frozen603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';

const sha=value=>createHash('sha256').update(value).digest('hex');
const norm=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/\s+/gu,' ').trim();
export const decodeSelectedSellerTextEntities=value=>String(value??'')
 .replace(/&(?:amp|#0*38|#x0*26);/giu,'&')
 .replace(/&(?:nbsp|#0*160|#x0*a0);/giu,' ');
const selectedText=html=>decodeSelectedSellerTextEntities(productMarkup(html).replace(/<[^>]*>/gu,' '))
 .replace(/\s+/gu,' ').trim();
const cases={
 176:{name:'Mexico Finca Santa Cruz Geisha',
  url:'https://kingspeakcoffee.com/products/mexico-nayarit-anaerobic-process',
  notes:['sweet berries','honey','fig'],origin:['chiapas','mexico'],process:'Washed'},
 177:{name:'Nicaragua La Bastilla Coffee Estates',
  url:'https://kingspeakcoffee.com/products/nicaragua-finca-idealista',
  notes:['strawberries','honey'],origin:['jinotega','nicaragua'],process:'Natural'}
};
export function selectedKingsPeakDirectFailures(number,selected,fields={}){
 const e=cases[number],fail=[];if(!e)return ['outside_original176_177'];
 const text=norm(selected),name=norm(fields.name),notes=norm(fields.tasting_notes);
 if(!text.includes(norm(e.name))||name!==norm(e.name))fail.push('selected_current_coffee_identity');
 if(!e.notes.every(v=>text.includes(v)))fail.push('direct_selected_notes_not_printed');
 if(!e.notes.every(v=>notes.includes(v)))fail.push('direct_selected_notes_omitted');
 if(!e.origin.every(v=>norm(fields.origin).includes(v)))fail.push('direct_geography_not_retained');
 if(fields.process!==e.process)fail.push('direct_processing_not_retained');
 if(/nayarit|finca idealista/i.test(String(fields.name||'')+' '+String(fields.origin||'')+' '+String(fields.producer||'')))
  fail.push('recycled_handle_contaminated_current_selected_fields');
 if(fields.elevation_m||fields.decaffeination_method||fields.release_label)
  fail.push('unpublished_elevation_decaf_or_lot_inferred');
 if(number===176){
  if(!/single origin:\s*chiapas region/i.test(text)||!/producer:\s*jose arg[uü]ello/i.test(text)||
   !/tasting notes:\s*sweet berries,\s*honey\s*(?:&|and)\s*fig/i.test(text)||
   !text.includes('before being washed'))
   fail.push('direct_mx_specs_missing');
  if(!norm(fields.producer).includes('jose arguello')||!norm(fields.variety).includes('geisha'))
   fail.push('named_current_producer_or_variety_not_retained');
  if(fields.roast_level)fail.push('unpublished_mexico_roast_assumed');
  if(/anaerobic|nayarit/i.test(String(fields.process||'')))fail.push('legacy_slug_processing_leak');
 }else{
  if(!/process:\s*natural/i.test(text)||!/varietal:\s*catuai\s*(?:&|and)\s*caturra/i.test(text)||
   !/tasting notes:\s*strawberries\s*(?:&|and)\s*honey/i.test(text)||
   !text.includes('we roasted this light'))
   fail.push('direct_nicaragua_specs_missing');
  if(!norm(fields.variety).includes('catuai')||!norm(fields.variety).includes('caturra')||
   !norm(fields.producer).includes('la bastilla')||fields.roast_level!=='Light')
   fail.push('current_farm_variety_or_direct_light_missing');
  if(/idealista/i.test(String(fields.name||'')+' '+String(fields.producer||'')))
   fail.push('legacy_finca_idealista_inferred');
 }
 if(/reviewer|customer|another coffee|finca idealista/i.test(notes))
  fail.push('reviews_or_other_coffee_tasting_contamination');
 return fail;
}

if(process.env.DIC_ISSUE33_KINGSPEAK_R425_RUN==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'',head=process.env.DIC_EXPECTED_SHA||'';
 if(!dir||!/^[a-f0-9]{40}$/u.test(head))throw Error('missing_pinned_source_or_private_dir');
 const evidence=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
 const failures=[],out=[];
 const need=(test,why)=>{if(!test)failures.push(why)};
 need(evidence.source_sha===head,'runner_source_sha_mismatch');
 need(JSON.stringify(evidence.case_numbers)==='[176,177]'&&evidence.records?.length===2,
  'case_set_not_original176_177');
 need(evidence.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353',
  'original_frozen_csv_changed');
 need(evidence.original_corpus_modified===false&&evidence.manual_certified===0&&
  evidence.production_operations===0,'corpus_or_provider_write');
 for(const number of [176,177]){
  const e=cases[number],r=evidence.records?.find(v=>v.number===number);
  if(!r){failures.push('missing_case_'+number);continue}
  need(r.official_url===e.url&&r.final_url?.replace(/\/$/u,'')===e.url,
   'different_product_url_or_redirect_'+number);
  need(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true&&
   r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,
   'selected_source_parser_and_unsaved_ui_'+number);
  let html;
  try{html=readFileSync(join(dir,'case-'+number+'.html'),'utf8')}
  catch{failures.push('unavailable_raw_current_html_'+number);continue}
  const digest=sha(html),p=extractPublicCoffeeFacts(html,{source_url:r.final_url||e.url});
  need(r.html_sha256===digest&&/^[a-f0-9]{64}$/u.test(digest),'raw_html_sha256_mismatch_'+number);
  need(p?.ok===true&&norm(p.fields?.name)===norm(e.name)&&
   norm(r.current_fields?.name)===norm(e.name),'fresh_selected_parser_name_'+number);
  for(const field of ['name','roaster','origin','producer','variety','process',
   'tasting_notes','roast_level','elevation_m','decaffeination_method','release_label'])
   need(String(p?.fields?.[field]??'')===String(r.current_fields?.[field]??''),
    'raw_parser_report_disagrees_'+number+'_'+field);
  for(const failure of selectedKingsPeakDirectFailures(number,selectedText(html),r.current_fields||{}))
   failures.push(number+'_'+failure);
  need(!p?.roaster_recipe?.dose_g&&!p?.roaster_recipe?.yield_g,
   'unpublished_espresso_recipe_'+number);
  out.push({number,official_url:e.url,source_html_sha256:digest,
   bytes:Buffer.byteLength(html),selected_h1:r.selected_h1,fields:r.current_fields,
   conflicts:r.conflicts||[],unsaved_add_coffee:r.add_coffee_ui_rendered,
   source_review:r.source_review_rendered});
 }
 const report={source_sha:head,cases:[176,177],original603_manual_certified:0,
  production_writes:0,failures,records:out};
 writeFileSync(join(dir,'r425-kingspeak-afterproof.json'),JSON.stringify(report,null,2)+'\n');
 console.log('[DIC33 R425 SELECTED KING SPEAK] '+JSON.stringify(report));
 if(failures.length)process.exitCode=1;
}
