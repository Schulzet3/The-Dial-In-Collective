#!/usr/bin/env node
// Issue #33 R78: exactly one original603 #26 current official selected product; no corpus certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const clean=x=>String(x||'').replace(/<!--[\s\S]*?-->/gu,' ')
 .replace(/<(script|style|template|noscript|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
 .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|#160);/giu,' ')
 .replace(/&amp;/giu,'&').replace(/\s+/gu,' ').trim();
const norm=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export function selectedBleu26Facts(markup,headings){
 const t=clean(markup);
 return {
  exactIdentity:Array.isArray(headings)&&headings.length===1&&norm(headings[0])===norm('Ethiopia Yirgacheffe'),
  selectedWashed:/\bProcessed by the washed method\b/iu.test(t)&&/\bA washed Ethiopia cup\b/iu.test(t),
  directFruitClause:/\btones? of tangerine and citrus along with wine and berry tones\b/iu.test(t),
  directDetailedFlavor:/\bEthiopia Flavor:\s*Richly sweet, roast-rounded\.\s*Dark chocolate, gardenia, gently scorched cedar, red plum, hazelnut\b/iu.test(t),
  roastConditionalOnly:/\bwhen given a a Dark Roast\b/iu.test(t)&&/\bwhen given a Medium Roast\b/iu.test(t),
  selectedCoffeeContext:/\bSingle Origin\b/iu.test(t)&&/\bYirgacheffe\b/iu.test(headings?.join(' ')||'')
 };
}
if(process.env.DIC_ISSUE33_R78_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'');
 mkdirSync(dir,{recursive:true});
 const failures=[],test=(v,key)=>{if(!v)failures.push(key)};
 let raw=null,report=null,reportBytes=null;
 try{reportBytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(reportBytes.toString('utf8'));}catch{}
 try{raw=readFileSync(join(dir,'case-26.html'));}catch{}
 const rec=report?.records?.[0]||{}, f=rec.current_fields||{};
 test(JSON.stringify(report?.case_numbers)==='[26]'&&report?.records?.length===1,'case26_scope');
 test(report?.source_sha===process.env.GITHUB_SHA,'exact_ci_source_sha');
 test(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_603_csv_source_sha');
 test(report?.manual_certified===0&&report?.production_operations===0&&report?.real_auth===false&&report?.original_corpus_modified===false,'no_unearned_certification');
 test(rec.number===26&&rec.archived_coffee==='Ethiopia Yirgacheffe'&&rec.official_url==='https://bleucoffee.com/products/ethiopia','frozen_original_case');
 const url=(()=>{try{return new URL(rec.final_url)}catch{return null}})();
 test(url?.protocol==='https:'&&url?.hostname==='bleucoffee.com'&&
  /^\/(?:collections\/[^/]+\/)?products\/ethiopia\/?$/u.test(url?.pathname||'')&&!url?.search&&!url?.hash,'selected_exact_product_redirect');
 test(rec.status==='FETCHED'&&rec.parser_ok===true&&rec.selected_heading_identity_verified===true,'real_parser_and_selected_identity');
 test(!!raw&&raw.length===rec.html_bytes&&sha(raw)===rec.html_sha256,'raw_html_source_sha256');
 const selected=productMarkup(raw?.toString('utf8')||''),headings=selectedProductHeadings(selected);
 const facts=selectedBleu26Facts(selected,headings);
 for(const [key,val] of Object.entries(facts))test(val,'current_direct_'+key);
 const notes=String(f.tasting_notes||'').toLowerCase();
 for(const token of ['dark chocolate','gardenia','scorched cedar','red plum','hazelnut','tangerine','citrus','wine','berry'])
  test(notes.includes(token),'source_backed_tasting_'+token.replace(/\s+/gu,'_'));
 test(f.name==='Ethiopia Yirgacheffe','current_parser_name');
 test(/\bwashed\b/iu.test(String(f.process||'')),'current_selected_washed');
 test(!f.roast_level,'conditional_roast_not_canonical');
 test(!f.producer,'no_unsupported_producer');
 test(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'add_coffee_and_source_review');
 test(!(rec.conflicts||[]).some(x=>/tasting|process|roast|name/iu.test(JSON.stringify(x))),'no_selected_field_conflict');
 const verdict={source_sha:report?.source_sha,case:26,source_json_sha256:reportBytes?sha(reportBytes):null,
  html_sha256:raw?sha(raw):null,headings,direct_facts:facts,parser_fields:f,
  conflicts:rec.conflicts||[],manual_certified:0,production_operations:0,
  passed:failures.length===0,failures};
 writeFileSync(join(dir,'r78-26-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
 console.log('[DIC33 R78 #26] '+JSON.stringify(verdict));
 if(failures.length)process.exitCode=1;
}
