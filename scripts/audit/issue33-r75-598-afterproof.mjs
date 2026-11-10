#!/usr/bin/env node
// Issue33 R75 fail-closed exact live official #598, source-hashed selected/parser verification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {selectedYellowstone598DirectFacts} from './issue33-r75-598-selected-contract.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
if(!process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR)throw Error('source_artifact_directory_required');
const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR);mkdirSync(dir,{recursive:true});
const failures=[],check=(ok,reason)=>{if(!ok)failures.push(reason);};
let sourceBytes=null,source={},htmlBytes=null;
try{sourceBytes=readFileSync(join(dir,'focused-current-evidence.json'));source=JSON.parse(sourceBytes.toString('utf8'));}catch{}
check(Boolean(sourceBytes),'current_source_json_missing');
check(JSON.stringify(source.case_numbers)==='[598]'&&source.records?.length===1,'original_case_scope_changed');
check(Boolean(source.source_sha)&&source.source_sha===process.env.GITHUB_SHA,'not_exact_workflow_sha');
check(source.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen603_csv_hash_changed');
check(source.manual_certified===0&&source.production_operations===0&&source.real_auth===false&&source.original_corpus_modified===false,'unearned_certification_or_disallowed_change');
const r=source.records?.[0]||{},official='https://yellowstonecoffee.com/products/bolivia-la-paz';
check(r.number===598&&r.official_url===official&&r.archived_coffee==='BOLIVIA LA PAZ - ORGANIC','original_row_identity_changed');
let finalUrl;try{finalUrl=new URL(r.final_url);}catch{}
check(finalUrl?.protocol==='https:'&&['yellowstonecoffee.com','www.yellowstonecoffee.com'].includes(finalUrl?.hostname)&&finalUrl?.pathname==='/products/bolivia-la-paz'&&!finalUrl?.search&&!finalUrl?.hash,'redirect_or_selected_product_changed');
check(r.status==='FETCHED'&&r.parser_ok===true,'current_public_source_or_parser_unavailable');
try{htmlBytes=readFileSync(join(dir,'case-598.html'));}catch{}
check(Boolean(htmlBytes)&&htmlBytes.length===r.html_bytes&&hash(htmlBytes)===r.html_sha256,'selected_source_raw_bytes_or_hash_mismatch');
const selected=productMarkup(htmlBytes?.toString('utf8')||''),headings=selectedProductHeadings(selected);
const direct=selectedYellowstone598DirectFacts(selected,headings);
check(r.selected_heading_identity_verified===true&&direct.selectedIdentity,'current_selected_identity_not_proven');
for(const [key,value] of Object.entries(direct)){if(key!=='selectedIdentity')check(value,'selected_direct_'+key+'_unproven');}
const f=r.current_fields||{},notes=String(f.tasting_notes||'').toLowerCase();
check(String(f.name||'').trim().toUpperCase()==='BOLIVIA LA PAZ - ORGANIC','actual_parser_selected_name_mismatch');
check(f.roast_level==='Dark','actual_parser_direct_dark_roast_not_retained');
check(/La Paz,\s*Bolivia/iu.test(String(f.origin||'')),'actual_parser_selected_origin_wrong');
check(/^Washed(?: and Sun Dried)?$/iu.test(String(f.process||'')),'actual_parser_selected_washed_process_missing');
check(/Cooperativa Agropecuaria Alto Sajama/iu.test(String(f.producer||'')),'actual_parser_current_named_cooperative_missing');
check(['cherry','jam','allspice'].every(n=>notes.includes(n)),'actual_parser_three_selected_tasting_notes_missing');
check(!/Rutas del Inca|PRODECOOP|Lima Coffee|Small local cooperatives in Popayan/i.test(JSON.stringify(f)),'other_coffee_fields_contaminated');
check(!(r.conflicts||[]).some(c=>/name|origin|roast|process|tasting|producer/iu.test(JSON.stringify(c))),'current_selected_parser_conflicts');
check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'actual_add_coffee_or_source_review_not_rendered');
const verdict={kind:'ISSUE33_R75_598_CURRENT_YELLOWSTONE_BOLIVIA',source_sha:source.source_sha||null,
 original603_csv_sha256:source.original603_register_sha256||null,
 source_json_sha256:sourceBytes?hash(sourceBytes):null,selected_html_sha256:htmlBytes?hash(htmlBytes):null,
 manual_certified:0,production_operations:0,passed:failures.length===0,failures,
 selected_headings:headings,current_direct:direct,observed_parser_fields:f,selected_url:r.final_url||null,
 conflicts:r.conflicts||[],add_coffee:r.add_coffee_ui_rendered===true,source_review:r.source_review_rendered===true};
writeFileSync(join(dir,'r75-598-bolivia-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R75 #598 CURRENT SELECTED OFFICIAL] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
