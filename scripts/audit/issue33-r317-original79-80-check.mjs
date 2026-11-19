#!/usr/bin/env node
// R317: two exact current selected originals, no frozen/oracle rewrite or blanket 603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r317',errors=[];
const targets=[{n:79,name:'Burundi',url:'https://csrcoffee.com/products/burundi'},
 {n:80,name:'Costa Rica',url:'https://csrcoffee.com/products/costa-rica'}];
const must=(value,id)=>{if(!value)errors.push(id)};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){errors.push('report_missing_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[79,80]'&&report?.records?.length===2,'only_two_original_selected');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_csv');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_original_or_production_edits');
must(report?.source_sha===process.env.DIC_R317_EVENT_SHA,'event_sha_attestation');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R317_CHECKOUT_SHA,'checkout_sha_attestation');
must(requiredFocusedSourceFailures([79,80],report?.records||[]).length===0,'current_original_https_parser_ui_identity');
const results=[];
for(const {n,name,url} of targets){
 const r=report?.records?.find(x=>x.number===n)||{}, f=r.current_fields||{};
 must(r.official_url===url&&!r.alternate_url_attempted,'exact_original_url_only_'+n);
 let raw;try{raw=readFileSync(join(dir,'case-'+n+'.html'))}catch(e){errors.push('raw_missing_'+n+'_'+(e.code||e.message))}
 const html=raw?.toString('utf8')||'',scoped=productMarkup(html),headings=selectedProductHeadings(scoped);
 const direct=scoped.replace(/<(?:script|style|nav|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|footer)>/gi,' ')
  .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp|#39);/gi,' ').replace(/\s+/g,' ').toLowerCase();
 must(r.status==='FETCHED'&&r.parser_ok===true,'guarded_fetch_and_parse_'+n);
 must(raw?.length>0&&r.html_bytes===raw.length&&r.html_sha256===hash(raw),'selected_raw_bytes_sha256_'+n);
 must(r.archived_coffee===name&&f.name===name&&headings.length>0&&
  headings.every(h=>identicalCurrentSelectedTitle(name,h,f.name)),'selected_H1_identity_'+n);
 must(r.selected_heading_identity_verified===true&&r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'real_preview_and_review_'+n);
 must(new RegExp(name,'i').test(direct),'selected_body_origin_'+n);
 must(!f.roast_level,'body_and_acidity_not_explicit_roast_'+n);
 must(!f.decaffeination_method&&!f.release_label&&!f.producer&&!f.variety&&!f.elevation_m,'unpublished_not_filled_'+n);
 must(!/illinois|champaign|kenya/i.test(String(f.origin||'')),'no_merchant_or_sibling_origin_'+n);
 must(!/blueberry|cranberry|peach/i.test(String(f.tasting_notes||'')),'no_unrelated_notes_'+n);
 must(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_seo_tasting_'+n);
 if(n===80){
  must(/washed processed coffee/i.test(direct)&&/sweet, chocolaty flavor/i.test(direct)&&/medium to heavy body/i.test(direct),'direct_costa_rica_selected_literal');
  must(f.process==='Washed','selected_washed_green_process');
  must(/costa rica/i.test(String(f.origin||'')),'selected_costa_rica_origin');
  must(/chocolat/i.test(String(f.tasting_notes||'')),'selected_chocolate_literal');
 }else{
  must(/bright acidity/i.test(direct)&&/creamy body/i.test(direct),'direct_burundi_acidity_and_body');
  must(/burundi/i.test(String(f.origin||'')),'selected_burundi_origin');
  must(!f.process||f.process==='Other/Unknown','unpublished_burundi_green_process');
 }
 const replay=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
 must(replay?.ok===true&&replay?.fields?.name===f.name,'raw_replay_'+n);
 results.push({number:n,url,final_url:r.final_url,html_sha256:r.html_sha256,html_bytes:r.html_bytes,
  headings,fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]});
}
const verdict={passed:errors.length===0,errors,checkout_sha:process.env.DIC_R317_CHECKOUT_SHA,event_sha:process.env.DIC_R317_EVENT_SHA,
 manual_certified:0,production_operations:0,records:results};
writeFileSync(join(dir,'r317-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R317 AFTERPROOF] '+JSON.stringify(verdict));
if(errors.length)process.exitCode=1;
