#!/usr/bin/env node
// Issue #33 R76 independent same-source fail-closed actual-parser verification.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {selectedWoodshed592DirectFacts} from './issue33-r76-592-selected-contract.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
if(!process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR)throw Error('missing_source_capture_directory');
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR);mkdirSync(dir,{recursive:true});
const failures=[],check=(ok,reason)=>{if(!ok)failures.push(reason);};
let sourceBytes=null,source={},htmlBytes=null;
try{sourceBytes=readFileSync(join(dir,'focused-current-evidence.json'));source=JSON.parse(sourceBytes.toString('utf8'));}catch{}
check(Boolean(sourceBytes),'selected_source_json_missing');
check(JSON.stringify(source.case_numbers)==='[592]'&&source.records?.length===1,'original603_case_scope_changed');
check(Boolean(source.source_sha)&&source.source_sha===process.env.GITHUB_SHA,'wrong_exact_source_sha');
check(source.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_frozen_csv_changed');
check(source.manual_certified===0&&source.production_operations===0&&source.real_auth===false&&source.original_corpus_modified===false,'unsupported_certification_or_production_operation');
const r=source.records?.[0]||{},official='https://www.woodshedroast.com/products/decaf-honduran-swiss-water®-process-copy';
check(r.number===592&&r.official_url===official&&r.archived_coffee==='Honduran Decaf | Swiss Water® Processed','original_selected_row_drift');
let chosen;try{chosen=new URL(r.final_url);}catch{}
let expected;try{expected=new URL(official);}catch{}
check(chosen?.protocol==='https:'&&chosen?.hostname==='www.woodshedroast.com'&&
  chosen?.pathname===expected?.pathname&&!chosen?.search&&!chosen?.hash,'selected_official_product_redirect_drift');
check(r.status==='FETCHED'&&r.parser_ok===true,'public_source_or_parser_unavailable');
try{htmlBytes=readFileSync(join(dir,'case-592.html'));}catch{}
check(Boolean(htmlBytes)&&htmlBytes.length===r.html_bytes&&hash(htmlBytes)===r.html_sha256,'current_raw_html_sha_mismatch');
const selected=productMarkup(htmlBytes?.toString('utf8')||'');
const headings=selectedProductHeadings(selected);
const direct=selectedWoodshed592DirectFacts(selected,headings);
check(r.selected_heading_identity_verified===true&&direct.selectedIdentity,'current_selected_product_identity_unconfirmed');
for(const [key,value] of Object.entries(direct))if(key!=='selectedIdentity')check(value,'missing_current_selected_'+key);
const f=r.current_fields||{},notes=String(f.tasting_notes||'').toLowerCase();
check(String(f.name||'').trim()==='Honduran Decaf | Swiss Water® Processed','current_parser_name_mismatch');
check(/\bCopan\b/iu.test(String(f.origin||''))&&/\bHonduras\b/iu.test(String(f.origin||'')),'current_parser_selected_origin_mismatch');
check(notes.includes('citrus')&&notes.includes('fruity sweetness'),'current_parser_selected_sensory_missing');
check(/water process|swiss water/iu.test(String(f.decaffeination_method||'')),'current_parser_decaffeination_missing');
check(!f.process||/^(?:other\/unknown|unknown)$/iu.test(String(f.process)),'decaffeination_misrepresented_as_cherry_process');
check(!f.roast_level,'unselected_roast_dropdown_promoted_to_fact');
check(!/Timor|Sumatra|Colombian Decaf|Ethiopian Decaf/iu.test(JSON.stringify(f)),'unselected_other_decaf_contamination');
check(!(r.conflicts||[]).some(c=>/name|origin|process|roast|tasting|decaf/iu.test(JSON.stringify(c))),'selected_parser_field_conflict');
check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'add_coffee_or_source_review_not_rendered');
const verdict={kind:'ISSUE33_R76_592_CURRENT_WOODSHED_HONDURAN_DECAF',
  source_sha:source.source_sha||null,original603_csv_sha256:source.original603_register_sha256||null,
  source_json_sha256:sourceBytes?hash(sourceBytes):null,selected_html_sha256:htmlBytes?hash(htmlBytes):null,
  manual_certified:0,production_operations:0,passed:failures.length===0,failures,
  selected_headings:headings,current_direct:direct,observed_parser_fields:f,
  selected_url:r.final_url||null,conflicts:r.conflicts||[],
  add_coffee:r.add_coffee_ui_rendered===true,source_review:r.source_review_rendered===true};
writeFileSync(join(dir,'r76-592-woodshed-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R76 #592 CURRENT SELECTED OFFICIAL] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
