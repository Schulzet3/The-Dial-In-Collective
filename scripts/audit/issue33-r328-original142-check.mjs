#!/usr/bin/env node
// DIC #33 R328: exact chosen original #142, medium body != medium roast.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const url='https://heinebroscoffee.com/products/guatemala-san-marcos',name='Guatemala San Marcos';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r328';
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
const sha=b=>createHash('sha256').update(b).digest('hex');
export function selected142(html){
 const scoped=productMarkup(String(html||''));
 const heads=selectedProductHeadings(scoped);
 const own=norm(scoped.replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' '));
 return {heads,exact:heads.some(x=>norm(x)===norm(name)),
  lightRoast:own.includes('light roast'),mediumBody:own.includes('medium body'),
  notes:['milk chocolate','cherry','hazelnut'].every(x=>own.includes(x)),
  cooperative:own.includes('apecaform cooperative'),
  origin:own.includes('san marcos')&&own.includes('guatemala')};
}
if(process.env.DIC_R328_VERIFY==='1'){
 const errors=[],need=(v,k)=>{if(!v)errors.push(k)};
 let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch{errors.push('no_focused_report')}
 need(JSON.stringify(report?.case_numbers)==='[142]'&&report?.records?.length===1,'one_original142_only');
 need(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original_register_hash');
 need(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'frozen_and_production_unchanged');
 need(report?.source_sha===process.env.DIC_R328_EVENT_SHA,'event_commit_sha');
 need(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R328_HEAD_SHA,'checkout_commit_sha');
 need(requiredFocusedSourceFailures([142],report?.records||[]).length===0,'exact_selected_source_parser_and_ui');
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 let bytes;try{bytes=readFileSync(join(dir,'case-142.html'))}catch{errors.push('raw_selected_html_missing')}
 const html=bytes?.toString('utf8')||'',direct=selected142(html);
 need(r.official_url===url&&!r.alternate_url_attempted,'original_official_url_only');
 need(r.status==='FETCHED'&&r.parser_ok===true&&bytes?.length>0&&r.html_bytes===bytes?.length&&r.html_sha256===sha(bytes||''),'real_official_html_sha256');
 need(direct.exact&&r.archived_coffee===name&&norm(f.name)===norm(name),'current_selected_h1_identity');
 for(const key of ['lightRoast','mediumBody','notes','cooperative','origin'])need(direct[key],'same_selected_'+key);
 need(f.roast_level==='Light','light_roast_not_medium_body');
 need(['milk chocolate','cherry','hazelnut'].every(x=>norm(f.tasting_notes).includes(x)),'three_direct_notes');
 need(norm(f.origin).includes('guatemala'),'direct_guatemala_origin');
 need(norm(f.producer).includes('apecaform'),'same_coffee_cooperative');
 need(!f.process&&!f.decaffeination_method&&!f.variety&&!f.elevation_m,'no_unpublished_green_or_decaf_facts');
 need(!(r.seo_fallback_fields||[]).some(x=>['producer','tasting_notes','roast_level','origin'].includes(x)),'no_seo_fallback');
 const replay=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
 need(replay?.ok===true&&norm(replay?.fields?.name)===norm(name),'real_parser_replay_identity');
 need(replay?.fields?.roast_level==='Light','real_parser_replay_roast');
 const out={passed:errors.length===0,errors,manual_certified:0,production_operations:0,
  event_sha:process.env.DIC_R328_EVENT_SHA,checkout_sha:process.env.DIC_R328_HEAD_SHA,
  source:{number:142,official_url:url,selected_h1:direct.heads,html_sha256:r.html_sha256,
   html_bytes:r.html_bytes,direct,current_fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]}};
 writeFileSync(join(dir,'r328-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R328 SELECTED ORIGINAL142] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
