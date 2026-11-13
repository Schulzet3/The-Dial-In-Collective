#!/usr/bin/env node
// Issue #33 R181: bounded exact original603 #257 current selected-product evidence.
// Never treat a slug, menu card, sister estate, or mill as current chosen facts.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const norm=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen257=Object.freeze({number:257,name:'Hacienda Rio Negro',url:'https://pinewoodcoffeeco.com/products/hacienda-rio-negro'});
export function source257(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const body=norm(removeElements(selected,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<[^>]{0,3000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' '));
 return {headings,identity:headings.length===1&&norm(headings[0])===norm(chosen257.name),
  origin:body.includes('coto brus')&&body.includes('costa rica'),
  selected_story:body.includes('hacienda rio negro')&&body.includes('beneficio rio negro')&&body.includes('hacienda la minita'),
  direct_process:/\b(?:this )?washed coffee\b/.test(body)||body.includes('process washed'),
  altitude:(body.includes('1 000')&&body.includes('1 300'))||(body.includes('1000')&&body.includes('1300')),
  direct_profile:body.includes('cantelope')&&body.includes('brown sugar')&&body.includes('silky'),
  narrative_toffee:body.includes('notes of toffee'),
  selected_cultivar:body.includes('cultivar mixed')};
}
if(process.env.DIC_ISSUE33_R181_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,summary,html;
 try{raw=readFileSync(join(dir,'focused-current-evidence.json'));summary=JSON.parse(raw.toString('utf8'))}catch{}
 try{html=readFileSync(join(dir,'case-257.html'))}catch{}
 const record=summary?.records?.find(x=>x.number===257)||{},f=record.current_fields||{};
 const selected=source257(html?.toString('utf8')||'');
 const failures=[],check=(passed,why)=>{if(!passed)failures.push(why)};
 check(JSON.stringify(summary?.case_numbers)==='[257]'&&summary?.records?.length===1,'one_exact_original257');
 check(summary?.source_sha===process.env.GITHUB_SHA,'exact_checked_out_source_commit');
 check(summary?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_register');
 check(summary?.original_corpus_modified===false&&summary?.manual_certified===0&&summary?.production_operations===0,'immutable_oracle_and_no_provider_writes');
 check(record.official_url===chosen257.url,'exact_archived_official_url');
 check(record.status==='FETCHED'&&record.parser_ok===true,'guarded_official_fetch_actual_parser');
 check(!!html&&sha(html)===record.html_sha256&&html.length===record.html_bytes,'raw_official_html_digest_bytes');
 check(selected.identity&&record.selected_heading_identity_verified===true,'current_selected_h1_identity_not_old_slug_or_other_product');
 check(selected.origin&&selected.direct_process&&selected.altitude&&selected.direct_profile&&selected.selected_cultivar&&selected.narrative_toffee,'selected_current_direct_facts_complete');
 check(norm(f.name)===norm(chosen257.name)&&norm(f.roaster).includes('pinewood'),'selected_name_and_roaster');
 check(f.process==='Washed','direct_washed_processing');
 check(norm(f.origin).includes('coto brus')&&norm(f.origin).includes('costa rica'),'direct_selected_origin');
 check(norm(f.variety).includes('mixed'),'direct_selected_cultivar');
 check(norm(f.elevation_m).includes('1000')&&norm(f.elevation_m).includes('1300'),'direct_selected_elevation');
 check(['cantelope','brown sugar'].every(x=>norm(f.tasting_notes).includes(x)),'current_selected_labeled_flavor_profile');
 check(!f.decaffeination_method&&!f.espresso_recipe,'unpublished_decaf_recipe_unfilled');
 check(record.add_coffee_ui_rendered===true&&record.source_review_rendered===true,'explicit_add_coffee_and_source_review');
 check(!(record.seo_fallback_fields||[]).some(x=>['name','origin','process','tasting_notes','producer'].includes(x)),'no_unverified_seo_fallback_for_direct_facts');
 const p=html?extractPublicCoffeeFacts(html.toString('utf8'),{source_url:chosen257.url}):null;
 const notes=norm(p?.fields?.tasting_notes);
 const toffeeFacts=(p?.source_facts||[]).filter(x=>['tasting_notes','sensory_context'].includes(x.field)&&norm(x.value).includes('toffee'));
 // This qualification is intentionally diagnostic until full literal semantic
 // reconciliation: title, mill and sister-estate claims cannot be producers.
 const toffeeRecognized=notes.includes('toffee')||toffeeFacts.length>0;
 const report={case:257,source_sha:summary?.source_sha||null,passed:failures.length===0,failures,
  selected_source:selected,fields:f,conflicts:record.conflicts||[],seo_fallback_fields:record.seo_fallback_fields||[],
  toffee_direct_description_source_present:selected.narrative_toffee,
  toffee_canonical_or_tasting_source_fact:toffeeRecognized,
  toffee_source_fact_count:toffeeFacts.length,
  qualification:toffeeRecognized?null:'Selected current description prints notes of toffee; parser tasting notes and sensory review provenance lack that literal. Not individually certified.',
  raw_html_sha256:html?sha(html):null,raw_html_bytes:html?.length||0,
  evidence_sha256:raw?sha(raw):null,original_603_individual_certification:false,production_operations:0};
 writeFileSync(join(dir,'r181-257-afterproof.json'),JSON.stringify(report,null,2)+'\n');
 console.log('[ISSUE33 R181 #257 STRICT SELECTED SOURCE] '+JSON.stringify(report));
 if(failures.length)process.exitCode=1;
}
