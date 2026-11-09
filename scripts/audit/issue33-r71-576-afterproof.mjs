#!/usr/bin/env node
// Strict R71 original603 #576 selected source proof; no 603-wide certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {selectedKarumandi576DirectFacts} from './issue33-r71-576-selected-contract.mjs';
const digest=value=>createHash('sha256').update(value).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('public_source_dir_required');
const root=resolve(dir),failures=[],check=(v,label)=>{if(!v)failures.push(label);};
mkdirSync(root,{recursive:true});
let reportBytes=null,report={},rec={},htmlBytes=null,html='';
try{reportBytes=readFileSync(join(root,'focused-current-evidence.json'));report=JSON.parse(reportBytes.toString('utf8'));}catch{}
check(Boolean(reportBytes),'focused_json_missing');
check(JSON.stringify(report.case_numbers)==='[576]'&&report.records?.length===1,'original603_selected_row_mismatch');
check(report.source_sha===process.env.GITHUB_SHA,'not_exact_source_sha');
check(report.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen603_csv_changed');
check(report.manual_certified===0&&report.production_operations===0&&report.real_auth===false&&report.original_corpus_modified===false,'false_certification_or_disallowed_operation');
rec=report.records?.find(r=>r.number===576)||{};
const official='https://www.stumptowncoffee.com/products/kenya-karumandi';
check(rec.official_url===official,'original_url_mismatch');
let final;try{final=new URL(rec.final_url);}catch{}
check(final?.protocol==='https:'&&['www.stumptowncoffee.com','stumptowncoffee.com'].includes(final?.hostname)&&final?.pathname==='/products/kenya-karumandi'&&!final?.search&&!final?.hash,'selected_redirect_identity_changed');
check(rec.status==='FETCHED'&&rec.parser_ok===true,'current_selected_fetch_or_parser_unverified');
try{const raw=readFileSync(join(root,'case-576.html'));htmlBytes=raw;html=raw.toString('utf8');}catch{}
check(Boolean(htmlBytes)&&htmlBytes.length===rec.html_bytes&&digest(htmlBytes)===rec.html_sha256,'selected_raw_html_size_or_digest_mismatch');
const scoped=productMarkup(html),headings=selectedProductHeadings(scoped),direct=selectedKarumandi576DirectFacts(scoped,headings);
check(direct.selectedIdentity&&JSON.stringify(rec.selected_h1)==='["Kenya Karumandi"]'&&rec.selected_heading_identity_verified===true,'exact_selected_H1_not_proven');
for(const key of ['ownTastingNotes','currentFactoryLocation','countryContext','cooperativeSmallholders','managerNotSingleFarmer','directWashedSequence','selectedStoryPresent'])
 check(direct[key],'current_selected_direct_'+key+'_missing');
const f=rec.current_fields||{},notes=String(f.tasting_notes||'');
check(f.name==='Kenya Karumandi','selected_name_not_current_H1');
check(f.origin==='Kenya','factory_geography_incorrectly_promoted_to_every_smallholder_origin');
check(f.process==='Washed','direct_wet_processing_omitted_or_changed');
check(['Red Currant','Blackberry','Dark Chocolate'].every(note=>notes.toLowerCase().includes(note.toLowerCase())),'direct_selected_tasting_notes_missing');
check(!/Nicasius|Ndambiri/iu.test(String(f.producer||'')),'factory_agronomist_misclassified_as_grower');
check(!/^(?:Light|Dark|Light & Bright|Dark & Bittersweet)$/iu.test(String(f.roast_level||'')),'roast_slider_endpoint_promoted_as_grade');
check(!(rec.conflicts||[]).some(c=>/\b(?:name|origin|process|tasting_notes|producer)\b/iu.test(String(typeof c==='string'?c:JSON.stringify(c)))),'source_bound_canonical_conflict');
check(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'add_coffee_or_source_review_missing');
const verdict={kind:'ISSUE33_R71_576_STUMPTOWN_FACTORY_VS_GROWERS',source_sha:report.source_sha||null,
 original603_csv_sha256:report.original603_register_sha256||null,source_json_sha256:reportBytes?digest(reportBytes):null,
 manual_certified:0,production_operations:0,passed:failures.length===0,failures,
 observed:{number:576,official_url:rec.official_url||null,final_url:rec.final_url||null,
 selected_h1:rec.selected_h1||[],scoped_headings:headings,html_bytes:htmlBytes?.length||null,
 html_sha256:htmlBytes?digest(htmlBytes):null,direct_current_selected:direct,actual_fields:f,
 conflicts:rec.conflicts||[],add_coffee:rec.add_coffee_ui_rendered===true,source_review:rec.source_review_rendered===true}};
writeFileSync(join(root,'r71-576-selected-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[ISSUE33 R71 SELECTED FACTORY VS GROWER] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
