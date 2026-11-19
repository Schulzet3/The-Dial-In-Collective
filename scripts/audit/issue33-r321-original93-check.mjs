#!/usr/bin/env node
// #33 R321 strict exact current official original603 #93 source/parser/Add Coffee afterproof.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';

const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r321';
const url='https://darkcanyon-coffee.com/collections/best-sellers/products/my-girlfriends-blend';
const name="My Girlfriend's Blend";
const errors=[];
const must=(yes,code)=>{if(!yes)errors.push(code)};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
let report;
try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch{errors.push('missing_current_evidence_report')}
must(JSON.stringify(report?.case_numbers)==='[93]'&&report?.records?.length===1,'only_original93');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_checksum');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'unchanged_original_and_production');
must(report?.source_sha===process.env.DIC_R321_EVENT_SHA,'actual_event_sha');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R321_CHECKOUT_SHA,'exact_checkout_sha');
must(requiredFocusedSourceFailures([93],report?.records||[]).length===0,'required_selected_source_gate');

const r=report?.records?.[0]||{},f=r.current_fields||{};
must(r.official_url===url&&!r.alternate_url_attempted,'exact_original_selected_url');
let bytes;
try{bytes=readFileSync(join(dir,'case-93.html'))}
catch{errors.push('missing_raw_selected_html')}
const html=bytes?.toString('utf8')||'',selected=productMarkup(html),heads=selectedProductHeadings(selected);
const own=selected.replace(/<(?:script|style|nav|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|footer)>/gi,' ')
 .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:amp|nbsp|#39);/gi,' ').replace(/\s+/g,' ').toLowerCase();
must(r.status==='FETCHED'&&r.parser_ok===true,'guarded_fetch_parse');
must(bytes?.length>0&&r.html_bytes===bytes.length&&r.html_sha256===sha(bytes),'raw_html_digest');
must(r.archived_coffee===name&&f.name===name&&heads.some(h=>identicalCurrentSelectedTitle(name,h,f.name)),'exact_selected_h1');
must(r.selected_heading_identity_verified&&r.add_coffee_ui_rendered&&r.source_review_rendered,'source_bound_add_coffee_review');
for(const token of ['medium roast','caramel','french vanilla'])
 must(own.includes(token),'selected_visible_literal_'+token.replace(/ /g,'_'));
must(f.roast_level==='Medium','actual_selected_roast_medium');
must(/caramel/i.test(String(f.tasting_notes||''))&&/french vanilla/i.test(String(f.tasting_notes||'')),'current_parser_own_flavors');
must(!/blueberry|peach|butterscotch|hazelnut|graham cracker/i.test(String(f.tasting_notes||'')),'other_dark_canyon_flavor_excluded');
must(!/South Dakota|Rapid City/i.test(String(f.origin||'')),'merchant_not_coffee_origin');
must(!f.producer&&!f.elevation_m&&!f.variety&&!f.release_label&&!f.decaffeination_method,'no_invented_provenance');
must(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_seo_tasting');
const replay=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
must(replay?.ok===true&&replay.fields?.name===f.name,'actual_present_parser_raw_replay');
const verdict={passed:errors.length===0,errors,event_sha:process.env.DIC_R321_EVENT_SHA,
 checkout_sha:process.env.DIC_R321_CHECKOUT_SHA,manual_certified:0,production_operations:0,
 source:{number:93,original_url:url,final_url:r.final_url,html_sha256:r.html_sha256,
  html_bytes:r.html_bytes,selected_h1:heads,parser_fields:f,
  conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]}};
writeFileSync(join(dir,'r321-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[DIC33 R321 SELECTED AFTERPROOF] '+JSON.stringify(verdict));
if(errors.length)process.exitCode=1;
