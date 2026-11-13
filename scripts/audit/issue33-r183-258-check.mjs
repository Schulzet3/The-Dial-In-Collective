#!/usr/bin/env node
// Issue33 original603 #258 selected-source diagnostic. This is NOT 603-case certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const norm=v=>String(v??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen258=Object.freeze({number:258,name:'Kibaya',url:'https://pinewoodcoffeeco.com/products/kibaya'});
export function source258(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const body=norm(removeElements(selected,['script','style','noscript','template','nav','aside','footer','header','select'])
   .replace(/<[^>]{0,3000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' '));
 return {headings,identity:headings.length===1&&norm(headings[0])===norm(chosen258.name),
   smallholders:body.includes('smallholder farmers near kigali')&&body.includes('rwanda'),
   station:body.includes('rwamatamu washing station'),
   altitude:body.includes('1600')&&body.includes('2000'),
   washed:body.includes('process washed')||body.includes('washed coffee')||body.includes('processed at the rwamatamu'),
   cultivar:body.includes('red bourbon'),
   labeled_notes:['golden raisin','vanilla','blackberry jam'].every(x=>body.includes(x)),
   narrative_plum:body.includes('blackberry and plum'),narrative_allspice:body.includes('hints of allspice')};
}
if(process.env.DIC_ISSUE33_R183_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,summary,html;
 try{raw=readFileSync(join(dir,'focused-current-evidence.json'));summary=JSON.parse(raw.toString('utf8'))}catch{}
 try{html=readFileSync(join(dir,'case-258.html'))}catch{}
 const record=summary?.records?.find(x=>x.number===258)||{},f=record.current_fields||{};
 const source=source258(html?.toString('utf8')||'');
 const failures=[],check=(condition,reason)=>{if(!condition)failures.push(reason)};
 check(JSON.stringify(summary?.case_numbers)==='[258]'&&summary?.records?.length===1,'one_exact_original258');
 check(summary?.source_sha===process.env.GITHUB_SHA,'exact_checked_out_commit');
 check(summary?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_register');
 check(summary?.original_corpus_modified===false&&summary?.manual_certified===0&&summary?.production_operations===0,'no_oracle_or_provider_changes');
 check(record.official_url===chosen258.url,'exact_archived_url');
 check(record.status==='FETCHED'&&record.parser_ok===true,'guarded_current_html_actual_parser');
 check(!!html&&record.html_sha256===sha(html)&&record.html_bytes===html.length,'raw_html_bytes_sha256_match');
 check(source.identity&&record.selected_heading_identity_verified===true,'exact_selected_product_identity');
 check(source.smallholders&&source.station&&source.altitude&&source.cultivar&&source.labeled_notes&&source.narrative_plum&&source.narrative_allspice,'direct_selected_published_evidence');
 check(norm(f.name)===norm(chosen258.name)&&norm(f.roaster).includes('pinewood'),'selected_name_and_roaster');
 check(norm(f.origin).includes('rwanda'),'selected_rwanda');
 check(norm(f.process).includes('washed'),'selected_washed');
 check(norm(f.variety).includes('red bourbon'),'selected_cultivar');
 check(['golden raisin','vanilla','blackberry'].every(x=>norm(f.tasting_notes).includes(x)),'canonical_selected_labeled_notes');
 check(record.add_coffee_ui_rendered===true&&record.source_review_rendered===true,'explicit_add_coffee_and_review_ui');
 check(!f.decaffeination_method&&!f.espresso_recipe,'unpublished_decaf_method_and_recipe_blank');
 check(!/rwamatamu/i.test(String(f.producer||'')),'washing_station_not_a_farmer');
 check(!(record.seo_fallback_fields||[]).some(x=>['name','origin','process','tasting_notes','producer'].includes(x)),'no_seo_for_direct_fields');
 const actual=html?extractPublicCoffeeFacts(html.toString('utf8'),{source_url:chosen258.url}):null;
 const facts=(actual?.source_facts||[]).filter(x=>['tasting_notes','sensory_context'].includes(x.field));
 const plum=facts.filter(x=>norm(x.value).includes('plum'));
 const allspice=facts.filter(x=>norm(x.value).includes('allspice'));
 const report={case:258,source_sha:summary?.source_sha||null,passed:failures.length===0,failures,
   selected_source:source,fields:f,conflicts:record.conflicts||[],seo_fallback_fields:record.seo_fallback_fields||[],
   narrative_plum_recognized:plum.length>0||norm(f.tasting_notes).includes('plum'),
   narrative_allspice_recognized:allspice.length>0||norm(f.tasting_notes).includes('allspice'),
   narrative_provenance_status:(plum.length&&allspice.length)?'PRESENT':'REVIEW_PENDING_SOURCE_PRESENT_GAP',
   narrative_source_facts:facts.filter(x=>/plum|allspice/i.test(String(x.value||''))).slice(0,8),
   roast_level_observed:f.roast_level||null,producer_observed:f.producer||null,
   raw_html_sha256:html?sha(html):null,raw_html_bytes:html?.length||0,evidence_sha256:raw?sha(raw):null,
   original_603_individual_certification:false,production_operations:0};
 writeFileSync(join(dir,'r183-258-afterproof.json'),JSON.stringify(report,null,2)+'\n');
 console.log('[ISSUE33 R183 #258 CURRENT SELECTED SOURCE] '+JSON.stringify(report));
 if(failures.length)process.exitCode=1;
}
