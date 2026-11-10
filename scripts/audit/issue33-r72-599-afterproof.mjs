#!/usr/bin/env node
// Fail-closed exact current original603 #599 evidence. Audit-only, no parser changes.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {selectedYellowstone599DirectFacts} from './issue33-r72-599-selected-contract.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('public_source_directory_required');
const root=resolve(dir),failures=[],check=(yes,why)=>{if(!yes)failures.push(why);};
mkdirSync(root,{recursive:true});
let reportBytes=null,report={},record={},raw=null,html='';
try{reportBytes=readFileSync(join(root,'focused-current-evidence.json'));report=JSON.parse(reportBytes.toString('utf8'));}catch{}
check(Boolean(reportBytes),'focused_source_json_missing');
check(JSON.stringify(report.case_numbers)==='[599]'&&report.records?.length===1,'selected_original603_row_not_unique');
check(Boolean(report.source_sha)&&report.source_sha===process.env.GITHUB_SHA,'not_exact_ci_source_sha');
check(report.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_csv_changed');
check(report.manual_certified===0&&report.production_operations===0&&report.real_auth===false&&report.original_corpus_modified===false,'false_certification_or_disallowed_write');
record=report.records?.find(r=>r.number===599)||{};
const official='https://yellowstonecoffee.com/products/colombia-huila';
check(record.official_url===official,'selected_original_url_not_exact');
let finalUrl;try{finalUrl=new URL(record.final_url);}catch{}
check(finalUrl?.protocol==='https:'&&['yellowstonecoffee.com','www.yellowstonecoffee.com'].includes(finalUrl?.hostname)&&finalUrl?.pathname==='/products/colombia-huila'&&!finalUrl?.search&&!finalUrl?.hash,'merchant_redirect_changed_product_identity');
check(record.status==='FETCHED'&&record.parser_ok===true,'official_source_or_actual_parser_unverified');
try{raw=readFileSync(join(root,'case-599.html'));html=raw.toString('utf8');}catch{}
check(Boolean(raw)&&raw.length===record.html_bytes&&hash(raw)===record.html_sha256,'raw_current_html_digest_mismatch');
const selected=productMarkup(html),headings=selectedProductHeadings(selected),direct=selectedYellowstone599DirectFacts(selected,headings);
check(direct.selectedIdentity&&record.selected_heading_identity_verified===true,'selected_current_product_heading_not_verified');
for(const k of ['directRoast','directNotes','labeledCurrentOrigin','labeledWashedSunDried','labeledSaladoBlancoCoops','selectedTownNarrative'])
 check(direct[k],'current_selected_direct_'+k+'_not_proven');
const f=record.current_fields||{},notes=String(f.tasting_notes||'');
check(/^colombia huila$/iu.test(String(f.name||'').trim()),'parser_selected_name_wrong');
check(f.roast_level==='Medium-Light','parser_did_not_retain_selected_medium_light_roast');
check(/(?:^|,\s*)Huila,\s*Colombia$/iu.test(String(f.origin||'')),'parser_selected_huila_origin_missing');
check(/^Washed(?: and Sun Dried)?$/iu.test(String(f.process||'')),'parser_selected_washed_process_missing');
check(['Dried Cherry','Citrus','Custard'].every(n=>notes.toLowerCase().includes(n.toLowerCase())),'parser_selected_three_notes_missing');
check(!/(?:^|\b)(?:Nicasius Ndambiri|One(s)?mus Njagi|Abiyot Ageze)(?:\b|$)/iu.test(String(f.producer||'')),'producer_from_other_coffee_contamination');
check(!(record.conflicts||[]).some(c=>/\b(?:name|origin|roast_level|process|tasting_notes|producer)\b/iu.test(String(typeof c==='string'?c:JSON.stringify(c)))),'current_selected_canonical_conflict');
check(record.add_coffee_ui_rendered===true&&record.source_review_rendered===true,'add_coffee_or_source_review_missing');
const verdict={kind:'ISSUE33_R72_599_YELLOWSTONE_SELECTED_HUILA',source_sha:report.source_sha||null,
 original603_csv_sha256:report.original603_register_sha256||null,
 source_json_sha256:reportBytes?hash(reportBytes):null,manual_certified:0,production_operations:0,
 passed:failures.length===0,failures,
 observed:{number:599,official_url:record.official_url||null,final_url:record.final_url||null,
 selected_h1:record.selected_h1||[],selected_headings:headings,html_bytes:raw?.length||null,
 html_sha256:raw?hash(raw):null,direct_current_selected:direct,parser_fields:f,
 conflicts:record.conflicts||[],add_coffee:record.add_coffee_ui_rendered===true,source_review:record.source_review_rendered===true}};
writeFileSync(join(root,'r72-599-selected-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R72 #599 SELECTED OFFICIAL] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
