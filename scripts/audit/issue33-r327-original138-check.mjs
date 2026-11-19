#!/usr/bin/env node
// #33 R327: one chosen original603 product's five direct flavor words, never SEO.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const url='https://gnosiscoffee.com/products/red-bourbon-decaf',name='Red Bourbon DECAF';
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const sha=b=>createHash('sha256').update(b).digest('hex');
export function own138(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const own=norm(scoped.replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/gi,' ').replace(/<[^>]{0,2500}>/g,' '));
 return {headings,exact:headings.some(x=>norm(x)===norm(name)),
  notes:['bergamot','red fruit','cola','peach','caramel'].every(x=>own.includes(x)),
  method:own.includes('sugarcane decaffeination'),producer:own.includes('wilton benitez'),
  roast:own.includes('roast level light'),origin:own.includes('colombia')&&own.includes('cauca')};
}
if(process.env.DIC_R327_VERIFY==='1'){
 const errors=[],need=(v,s)=>{if(!v)errors.push(s)};
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r327';
 let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch{errors.push('no_evidence_report')}
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 need(JSON.stringify(report?.case_numbers)==='[138]'&&report?.records?.length===1,'only_original138');
 need(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_register_sha');
 need(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_frozen_or_production_mutation');
 need(report?.source_sha===process.env.DIC_R327_EVENT,'exact_event_sha');
 need(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R327_HEAD,'exact_checkout_sha');
 need(requiredFocusedSourceFailures([138],report?.records||[]).length===0,'strict_selected_fetch_parse_and_ui');
 let bytes;try{bytes=readFileSync(join(dir,'case-138.html'))}catch{errors.push('no_raw_selected_html')}
 const html=bytes?.toString('utf8')||'',direct=own138(html);
 need(r.official_url===url&&!r.alternate_url_attempted,'only_exact_official_url');
 need(r.status==='FETCHED'&&r.parser_ok===true&&r.html_bytes===bytes?.length&&r.html_sha256===sha(bytes||''),'fetched_parsed_html_sha256');
 need(direct.exact&&r.archived_coffee===name&&norm(f.name)===norm(name),'exact_selected_product_identity');
 for(const k of ['notes','method','producer','roast','origin'])need(direct[k],'selected_own_'+k);
 need(['bergamot','red fruit','cola','peach','caramel'].every(x=>norm(f.tasting_notes).includes(x)),'all_five_direct_selected_notes');
 need(f.decaffeination_method==='Sugar Process','exact_selected_sugarcane_EA');
 need(f.roast_level==='Light','selected_roast_light');
 need(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_SEO_flavors');
 const replay=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
 need(replay?.ok&&norm(replay.fields?.name)===norm(name),'raw_parser_replay_identity');
 const out={passed:errors.length===0,errors,manual_certified:0,production_operations:0,
  event_sha:process.env.DIC_R327_EVENT,checkout_sha:process.env.DIC_R327_HEAD,
  source:{number:138,official_url:url,selected_h1:direct.headings,html_sha256:r.html_sha256,
    html_bytes:r.html_bytes,current_fields:f,own_source:direct,conflicts:r.conflicts||[],seo_fallback:r.seo_fallback_fields||[]}};
 writeFileSync(join(dir,'r327-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R327 ORIGINAL138 SELECTED SOURCE] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
