#!/usr/bin/env node
// #33 R325: source-bound original #114 Elixr Wush Wush, washing-station owner != proven grower.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const url='https://elixrcoffee.com/products/wush-wush-ethiopia',name='Wush Wush, Ethiopia';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r325';
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
const sha=b=>createHash('sha256').update(b).digest('hex');
export function selected114(html){
 const scoped=productMarkup(String(html||''));
 const heads=selectedProductHeadings(scoped);
 const own=norm(scoped.replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' '));
 return {heads,exact:heads.some(s=>norm(s)===norm(name)),
  station:own.includes('ana sora washing station'),owner:own.includes('israel degefa'),
  region:own.includes('guji'),natural:own.includes('natural process'),
  notes:['cherry cola','white grape','lime zest'].every(s=>own.includes(s)),own};
}
if(process.env.DIC_R325_VERIFY==='1'){
 const errors=[],must=(value,label)=>{if(!value)errors.push(label)};
 let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch{errors.push('missing_report')}
 must(JSON.stringify(report?.case_numbers)==='[114]'&&report?.records?.length===1,'single_original114');
 must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original_frozen_register_checksum');
 must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'preserve_frozen_and_production');
 must(report?.source_sha===process.env.DIC_R325_EVENT_SHA,'actual_event_sha');
 must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R325_CHECKOUT_SHA,'actual_checkout_sha');
 must(requiredFocusedSourceFailures([114],report?.records||[]).length===0,'required_official_current_source_and_ui');
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 let bytes;try{bytes=readFileSync(join(dir,'case-114.html'))}catch{errors.push('missing_raw_html')}
 const html=bytes?.toString('utf8')||'',source=selected114(html);
 must(r.official_url===url&&!r.alternate_url_attempted,'exact_original_official_url');
 must(r.status==='FETCHED'&&r.parser_ok===true,'source_fetched_and_parsed');
 must(bytes?.length>0&&r.html_bytes===bytes.length&&r.html_sha256===sha(bytes),'raw_html_sha256');
 must(source.exact&&r.archived_coffee===name&&f.name===name,'current_H1_selected_identity');
 must(r.selected_heading_identity_verified&&r.add_coffee_ui_rendered&&r.source_review_rendered,'render_actual_add_coffee_source_review');
 for(const key of ['station','owner','region','natural','notes'])must(source[key],'current_own_literal_'+key);
 must(f.process==='Natural','selected_green_process_is_natural_not_station_washed');
 must(['cherry cola','white grape','lime zest'].every(s=>norm(f.tasting_notes).includes(s)),'own_three_tasting_notes');
 must(!f.producer,'washing_station_owner_not_certified_coffee_grower');
 must(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_seo_flavor_borrow');
 const replay=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
 must(replay?.ok===true&&replay.fields?.name===f.name,'exact_current_parser_raw_replay');
 must(!replay?.fields?.producer,'no_station_owner_producer_on_replay');
 const result={passed:errors.length===0,errors,event_sha:process.env.DIC_R325_EVENT_SHA,
  checkout_sha:process.env.DIC_R325_CHECKOUT_SHA,manual_certified:0,production_operations:0,
  station_owner_is_not_proven_farm_producer:true,source:{number:114,official_url:url,final_url:r.final_url,
  html_bytes:r.html_bytes,html_sha256:r.html_sha256,selected_h1:source.heads,
  current_fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]}};
 writeFileSync(join(dir,'r325-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R325 CURRENT SELECTED SOURCE] '+JSON.stringify(result));
 if(errors.length)process.exitCode=1;
}
