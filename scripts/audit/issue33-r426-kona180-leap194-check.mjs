#!/usr/bin/env node
// #33 R426: bounded original603 #180 context and #194 missing-literal evidence, not whole-corpus certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';

const hash=v=>createHash('sha256').update(v).digest('hex');
const norm=v=>String(v??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/\s+/gu,' ').trim();
const decode=v=>String(v??'').replace(/&(?:amp|#0*38|#x0*26);/giu,'&')
  .replace(/&(?:nbsp|#0*160|#x0*a0);/giu,' ');
const selectedText=html=>decode(productMarkup(html).replace(/<[^>]*>/gu,' ')).replace(/\s+/gu,' ').trim();
const products={
  180:{name:'Lū‘au',url:'https://konacoffee.nyc/products/lu-au'},
  194:{name:'Decaf Coffee',url:'https://leapcoffeeroasters.com/products/decaf-coffee'}
};
export function selectedCurrentOriginalR426Failures(number,selected,fields={}){
  const p=products[number];if(!p)return ['out_of_original180_194_scope'];
  const s=norm(selected),f=norm(fields.tasting_notes),fail=[];
  if(norm(fields.name)!==norm(p.name)||!s.includes(norm(p.name)))
    fail.push('selected_original_identity_not_confirmed');
  if(number===180){
    if(!/tasting notes:\s*stone fruits,\s*caramel,\s*cacao/iu.test(s)||
       !/origin\s*:\s*various/iu.test(s)||
       !/varietal:\s*caturra,\s*typica,\s*castillo/iu.test(s)||
       !/elevation:\s*1300\s*[-–]\s*1650\s*masl/iu.test(s)||
       !/process:\s*washed/iu.test(s)||
       !/signature house blend/iu.test(s))
      fail.push('chosen_blend_direct_description_or_specs_missing');
    if(!['stone fruits','caramel','cacao'].every(x=>f.includes(x)))
      fail.push('chosen_blend_direct_notes_omitted');
    if(!['caturra','typica','castillo'].every(x=>norm(fields.variety).includes(x))||
       !/1300\s*[-–]\s*1650/.test(String(fields.elevation_m||''))||
       fields.process!=='Washed')
      fail.push('chosen_blend_published_specs_omitted');
    if(/\b(?:hawaii|kona|single origin|kenya|brazil)\b/iu.test(String(fields.origin||'')))
      fail.push('blend_unknown_origin_fabricated');
    if(/\b(?:honey|natural|anaerobic)\b/iu.test(String(fields.process||'')))
      fail.push('another_processing_method_invented');
  }else{
    if(!/swiss water.{0,22}process is a 100% chemical free decaffeination process/iu.test(s)||
       !/tasting notes:\s*characteristically smooth,\s*mellow,\s*and sweet/iu.test(s)||
       !/slight caramel note and pleasant acidity/iu.test(s))
      fail.push('selected_decaf_direct_description_missing');
    if(!['smooth','mellow','sweet','caramel','pleasant acidity'].every(x=>f.includes(x)))
      fail.push('selected_decaf_direct_notes_omitted');
    if(fields.decaffeination_method!=='Water Process')
      fail.push('selected_named_swiss_water_method_omitted');
    if(fields.process||fields.roast_level||fields.origin||fields.producer||fields.variety||
       fields.elevation_m||fields.release_label)
      fail.push('unpublished_decaf_green_process_roast_origin_or_lot_invented');
  }
  if(fields.release_label||fields.decaffeination_method&&number===180)
    fail.push('unpublished_lot_or_blend_decaf_invented');
  if(/\b(?:reviewer|customer|other coffee|recommended products)\b/iu.test(f))
    fail.push('other_coffee_or_review_notes_contamination');
  return fail;
}

if(process.env.DIC_ISSUE33_R426_RUN==='1'){
  const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR,head=process.env.DIC_EXPECTED_SHA;
  if(!dir||!/^[a-f0-9]{40}$/u.test(head||''))throw Error('missing_source_sha_or_artifact_dir');
  const report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
  const failures=[],out=[];
  const need=(ok,why)=>{if(!ok)failures.push(why)};
  need(report.source_sha===head,'exact_runner_source_sha_mismatch');
  need(JSON.stringify(report.case_numbers)==='[180,194]'&&report.records?.length===2,
    'case_set_not_exact_original180_194');
  need(report.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353',
    'frozen_original603_csv_hash_changed');
  need(report.original_corpus_modified===false&&report.manual_certified===0&&
    report.production_operations===0,'frozen_corpus_or_provider_write');
  for(const number of [180,194]){
    const target=products[number],r=report.records?.find(x=>x.number===number);
    if(!r){failures.push('missing_original'+number);continue}
    need(r.official_url===target.url&&r.final_url?.replace(/\/$/u,'')===target.url,
      'different_selected_official_url_'+number);
    need(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true&&
      r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,
      'required_exact_selected_official_parser_unsaved_UI_'+number);
    let html;try{html=readFileSync(join(dir,'case-'+number+'.html'),'utf8')}
    catch{failures.push('current_official_HTML_unavailable_'+number);continue}
    const digest=hash(html),p=extractPublicCoffeeFacts(html,{source_url:r.final_url||target.url});
    need(r.html_sha256===digest&&/^[a-f0-9]{64}$/u.test(digest),
      'current_raw_HTML_digest_disagreement_'+number);
    need(p?.ok===true&&norm(p.fields?.name)===norm(target.name)&&
      norm(r.current_fields?.name)===norm(target.name),'current_selected_parser_identity_'+number);
    for(const field of ['name','roaster','origin','producer','variety','process',
        'tasting_notes','roast_level','elevation_m','decaffeination_method','release_label'])
      need(String(p?.fields?.[field]??'')===String(r.current_fields?.[field]??''),
        'raw_HTML_parser_report_mismatch_'+number+'_'+field);
    for(const issue of selectedCurrentOriginalR426Failures(number,selectedText(html),r.current_fields||{}))
      failures.push(number+'_'+issue);
    need(!p?.roaster_recipe?.dose_g&&!p?.roaster_recipe?.yield_g,
      'unpublished_espresso_recipe_'+number);
    out.push({number,source_url:target.url,raw_html_sha256:digest,bytes:Buffer.byteLength(html),
      chosen_headings:r.selected_h1,current_fields:r.current_fields,
      conflicts:r.conflicts||[],add_coffee_unsaved:r.add_coffee_ui_rendered,
      source_review:r.source_review_rendered});
  }
  const after={source_sha:head,original_cases:[180,194],manual_certified:0,
    provider_writes:0,failures,records:out};
  writeFileSync(join(dir,'r426-selected-afterproof.json'),JSON.stringify(after,null,2)+'\n');
  console.log('[DIC33 R426 CURRENT SELECTED AFTERPROOF] '+JSON.stringify(after));
  if(failures.length)process.exitCode=1;
}
