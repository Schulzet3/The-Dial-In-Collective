#!/usr/bin/env node
// #33 R327 original603 #126: separate selected green Washed from Mountain Water decaf; exclude education/related items.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const url='https://fostercoffee.co/products/yes-its-decaf-decaf',name="Yes It's Decaf (Decaf)";
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r327';
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
const sha=b=>createHash('sha256').update(b).digest('hex');
export function selected126(html){
 const scoped=productMarkup(String(html||''));
 const heads=selectedProductHeadings(scoped);
 const own=norm(scoped.replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' '));
 return {heads,exact:heads.some(h=>norm(h)===norm(name)),own,
  mexico:own.includes('country mexico'),region:own.includes('amatenago'),
  farmer:own.includes('producer smallholder farms'),
  elevation:own.includes('1200')&&own.includes('2000')&&own.includes('masl'),
  dualMethod:own.includes('processing washed mountain water decaf'),
  notes:['sweet','smooth','bright','floral'].every(word=>own.includes(word))};
}
if(process.env.DIC_R327_VERIFY==='1'){
 const errors=[],must=(v,k)=>{if(!v)errors.push(k)};
 let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch{errors.push('missing_report')}
 must(JSON.stringify(report?.case_numbers)==='[126]'&&report?.records?.length===1,'single_original126');
 must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_csv_unchanged');
 must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'unchanged_original_production');
 must(report?.source_sha===process.env.DIC_R327_EVENT_SHA,'event_sha');
 must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R327_CHECKOUT_SHA,'checkout_sha');
 must(requiredFocusedSourceFailures([126],report?.records||[]).length===0,'required_exact_official_ui');
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 let bytes;try{bytes=readFileSync(join(dir,'case-126.html'))}catch{errors.push('missing_raw_html')}
 const html=bytes?.toString('utf8')||'',selected=selected126(html);
 must(r.official_url===url&&!r.alternate_url_attempted,'only_frozen_official_url');
 must(r.status==='FETCHED'&&r.parser_ok===true,'selected_current_fetched_parsed');
 must(bytes?.length>0&&bytes.length===r.html_bytes&&r.html_sha256===sha(bytes),'exact_raw_sha256');
 must(selected.exact&&r.archived_coffee===name&&f.name===name,'exact_selected_H1_identity');
 for(const k of ['mexico','region','farmer','elevation','dualMethod','notes'])must(selected[k],'own_selected_'+k);
 must(r.selected_heading_identity_verified&&r.add_coffee_ui_rendered&&r.source_review_rendered,'add_coffee_and_source_review');
 must(f.process==='Washed','green_process_washed_not_water_decaf');
 must(f.decaffeination_method==='Water Process','mountain_water_decaf_only');
 must(f.producer==='Smallholder Farms','selected_producer');
 must(norm(f.origin).includes('mexico')&&norm(f.origin).includes('amatenago'),'own_region_country');
 must(['sweet','smooth','bright','floral'].every(s=>norm(f.tasting_notes).includes(s)),'own_four_notes');
 must(!f.roast_level&&!f.variety,'no_unpublished_roast_or_variety');
 must(!(r.conflicts||[]).includes('decaffeination_method'),'no_method_conflict');
 must(!(r.seo_fallback_fields||[]).includes('decaffeination_method'),'not_seo_method');
 const p=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
 must(p?.ok===true&&p.fields?.name===name,'reparsed_current_identity');
 must(p?.fields?.process==='Washed'&&p.fields?.decaffeination_method==='Water Process','reparsed_separate_methods');
 const result={passed:errors.length===0,errors,event_sha:process.env.DIC_R327_EVENT_SHA,
  checkout_sha:process.env.DIC_R327_CHECKOUT_SHA,manual_certified:0,production_operations:0,
  source:{number:126,official_url:url,final_url:r.final_url||url,html_bytes:r.html_bytes,
  html_sha256:r.html_sha256,selected_h1:selected.heads,current_fields:f,
  conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]}};
 writeFileSync(join(dir,'r327-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R327 SELECTED DECAF AFTERPROOF] '+JSON.stringify(result));
 if(errors.length)process.exitCode=1;
}
