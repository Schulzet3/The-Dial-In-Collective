#!/usr/bin/env node
// #33 R313: exact original603 #42 fresh guarded seller H1 / raw hash / actual parser and UI.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r313';
const url='https://brickhouseroasters.com/products/el-corazon-certified-organic-coffee';
const name='El Corazón',errors=[];
const must=(v,id)=>{if(!v)errors.push(id)};
const hash=b=>createHash('sha256').update(b).digest('hex');
let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){errors.push('report_missing_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[42]'&&report?.records?.length===1,'only_original603_42');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_csv');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_mutation_or_manual_claim');
must(report?.source_sha===process.env.DIC_R313_EVENT_SHA,'event_sha_bound');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R313_CHECKOUT_SHA,'checkout_sha_bound');
must(requiredFocusedSourceFailures([42],report?.records||[]).length===0,'source_parser_ui_acceptance');
const r=report?.records?.[0]||{},f=r.current_fields||{};
must(r.official_url===url&&r.final_url===url,'exact_original_selected_url_no_replacement');
let raw;try{raw=readFileSync(join(dir,'case-42.html'))}catch(e){errors.push('raw_missing_'+(e.code||e.message))}
const html=raw?.toString('utf8')||'',scoped=productMarkup(html);
const heads=selectedProductHeadings(scoped);
const direct=scoped.replace(/<(?:script|style|nav|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|footer)>/gi,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp|#39);/gi,' ').replace(/\s+/g,' ').toLowerCase();
must(r.status==='FETCHED'&&r.parser_ok===true,'live_guarded_source_and_parser');
must(raw?.length>0&&r.html_bytes===raw.length&&r.html_sha256===hash(raw),'raw_source_byte_hash');
must(r.archived_coffee===name&&f.name===name&&heads.length>0&&heads.every(h=>identicalCurrentSelectedTitle(name,h,f.name)),'selected_product_h1_identity');
must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_member_add_coffee_and_source_review');
must(['honduras','lempira','flor del cafe','1650','washed','patio-dried','product substitution'].every(x=>direct.includes(x)),
 'selected_seller_own_direct_source_fields');
must(/washed/i.test(String(f.process||''))&&!/natural|anaerobic/i.test(String(f.process||'')),
 'selected_washed_green_processing_not_patio_drying');
must(/honduras/i.test(String(f.origin||''))&&!/guatemala|indianapolis/i.test(String(f.origin||'')),
 'chosen_origin_not_sibling_or_roaster_city');
must(!/decaf|blueberr|praline|antioxidant/i.test(String(f.tasting_notes||'')),
 'no_borrowed_sensory');
must(!f.decaffeination_method&&!f.release_label,'no_unpublished_decaf_or_lot');
must(!/medium|dark/i.test(String(f.roast_level||'')),'no_related_roast_tier');
must(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_seo_taste_fallback');
// Correct canonical fields are not sufficient: Source Review must cite
// each exact selected profile caption, not its preceding unrelated row.
for(const [field,value,heading] of [
 ['origin','Honduras','Country of Origin'],
 ['producer','Flor del Cafe','Producer'],
 ['process','Washed','Processing Method']
]){
 const rows=(r.source_facts||[]).filter(f=>f.field===field&&f.value===value);
 must(rows.some(f=>String(f.section||'').includes(heading)),
  'current_selected_own_source_heading_'+field);
}
const again=extractPublicCoffeeFacts(html,{source_url:url});
must(again?.ok===true&&again?.fields?.name===f.name,'replayed_actual_parser');
const out={passed:errors.length===0,errors,checkout_sha:process.env.DIC_R313_CHECKOUT_SHA,event_sha:process.env.DIC_R313_EVENT_SHA,
 manual_certified:0,production_operations:0,record:{number:42,url,html_sha256:r.html_sha256,html_bytes:r.html_bytes,
 h1:heads,current_fields:f,conflicts:r.conflicts||[],seo_fallback:r.seo_fallback_fields||[]}};
writeFileSync(join(dir,'r313-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R313 AFTERPROOF] '+JSON.stringify(out));
if(errors.length)process.exitCode=1;
