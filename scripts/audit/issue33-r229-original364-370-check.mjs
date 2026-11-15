#!/usr/bin/env node
// #33 R229 independent exact-source afterproof. No global 603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('missing_source_evidence_directory');
const summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const errs=[],out=[];
if(head!==process.env.DIC_R229_HEAD)errs.push('wrong_exact_source_head');
if(JSON.stringify(summary.case_numbers)!=='[364,370]'||
 JSON.stringify(summary.negative_identity_case_numbers||[])!=='[]'||summary.records?.length!==2||
 summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')
 errs.push('original603_source_register_or_case_subset_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||summary.production_operations!==0)
 errs.push('false_full_corpus_or_production_claim');
const expected=[
 [364,'https://sumatocoffee.com/products/per-my-last-email-decaf','Per My Last Email (Decaf)'],
 [370,'https://sweetbloomcoffee.com/products/arbey-cordoba-26','Arbey Cordoba']
];
const has=(v,s)=>String(v||'').toLowerCase().includes(s.toLowerCase());
for(const [n,url,name] of expected){
 const r=summary.records.find(x=>x.number===n)||{},bad=[];
 let bytes=Buffer.alloc(0);
 try{bytes=readFileSync(join(dir,'case-'+n+'.html'))}catch{bad.push('raw_source_absent')}
 const hash=createHash('sha256').update(bytes).digest('hex');
 const raw=bytes.toString('utf8'),selected=productMarkup(raw);
 const h1=selectedProductHeadings(selected);
 const text=selected.replace(/<[^<>]{0,2000}>/gu,' ').replace(/&(?:amp|nbsp);/giu,' ').replace(/\s+/gu,' ');
 const p=bytes.length?extractPublicCoffeeFacts(raw,{source_url:r.final_url||url}):{};
 const f=p.fields||{};
 if(r.status!=='FETCHED'||r.official_url!==url||!r.parser_ok)bad.push('current_exact_original_source_or_parser_not_fetched');
 if(bytes.length<1000||r.html_bytes!==bytes.length||r.html_sha256!==hash)bad.push('raw_byte_sha_binding_failed');
 if(!h1.some(s=>s.toLowerCase()===name.toLowerCase())||
   !has(f.name,name)||r.selected_heading_identity_verified!==true)
   bad.push('exact_current_selected_coffee_identity_unverified');
 if(!r.add_coffee_ui_rendered||!r.source_review_rendered)bad.push('Add_Coffee_or_Source_Review_missing');
 if(n===364){
   if(f.decaffeination_method!=='Sugar Process'||f.process!=='Washed'||f.roast_level!=='Medium')
    bad.push('EA_decaf_separate_Washed_green_or_Medium_missing');
   for(const s of ['hazelnut','subtle sweetness','balanced acidity'])
    if(!has(text,s)||!has(f.tasting_notes,s))bad.push('selected_364_flavor_missing_'+s);
   if(f.espresso_recipe)bad.push('filter_ratios_invented_as_espresso');
   if(/(?:Ethiopia|Costa Rica)/i.test(String(f.origin||'')))bad.push('unsupported_specific_origin');
 }else{
   if(f.process!=='Washed'||!has(f.producer,'Arbey Cordoba')||!has(f.origin,'Colombia'))
    bad.push('archived_370_Washed_producer_origin_missing');
   for(const s of ['mango','bing cherry','pineapple'])
    if(!has(text,s)||!has(f.tasting_notes,s))bad.push('selected_370_cup_note_missing_'+s);
   if(!has(text,'Archived')||!has(text,'07.02.26'))bad.push('archived_source_status_missing');
   if(!/espresso[\s\S]{0,900}coffee\s+in\s*18g[\s\S]{0,400}espresso\s+out\s*36g[\s\S]{0,300}22[-–]24s/iu.test(text))
    bad.push('own_explicit_espresso_brew_recipe_source_missing');
   if(f.decaffeination_method||has(f.tasting_notes,'chocolate truffle'))
    bad.push('neighboring_coffee_contamination');
 }
 errs.push(...bad.map(e=>n+':'+e));
 out.push({number:n,url,raw_bytes:bytes.length,raw_sha256:hash,selected_h1:h1,
   archived_name:r.archived_coffee,current_fields:f,conflicts:p.conflicts||[],errors:bad});
}
const report={exact_source_sha:head,passed:errs.length===0,positive_original_cases:errs.length?[]:[364,370],
 original367_status:'UNVERIFIED_EXACT_ORIGINAL_URL_404_NOT_INCLUDED_IN_POSITIVE_RUN',
 manual_semantic_603_certified:false,production_operations:0,cases:out,errors:errs};
writeFileSync(join(dir,'r229-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R229 DIRECT SOURCE/PARSER AFTERPROOF] '+JSON.stringify(report).slice(0,30000));
if(errs.length)throw Error(errs.join(','));
