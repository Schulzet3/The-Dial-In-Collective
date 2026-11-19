#!/usr/bin/env node
// #33 R326 original603 #117: explicit Washed process wins over anaerobic-light fermentation stage.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const url='https://enjoycoffeeroasters.com/products/stanislas-kayitera',name='Stanislas Kayitera';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r326';
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
const sha=b=>createHash('sha256').update(b).digest('hex');
export function selected117(html){
 const scoped=productMarkup(String(html||''));
 const heads=selectedProductHeadings(scoped);
 const own=norm(scoped.replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' '));
 return {heads,exact:heads.some(s=>norm(s)===norm(name)),own,
   producer:own.includes('producer stanislas kayitera'),
   washed:own.includes('process washed'),
   rwanda:own.includes('bushekeri sector')&&own.includes('rwanda'),
   variety:own.includes('red bourbon'),
   notes:['lemon','caramel','honey','floral'].every(s=>own.includes(s)),
   fermentation:own.includes('anaerobic light')&&own.includes('fermentation')};
}
if(process.env.DIC_R326_VERIFY==='1'){
 const errors=[],must=(v,k)=>{if(!v)errors.push(k)};
 let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch{errors.push('missing_report')}
 must(JSON.stringify(report?.case_numbers)==='[117]'&&report?.records?.length===1,'single_original117');
 must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original_register_sha');
 must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'unchanged_original_and_production');
 must(report?.source_sha===process.env.DIC_R326_EVENT_SHA,'original_event_sha');
 must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R326_CHECKOUT_SHA,'actual_checkout_sha');
 must(requiredFocusedSourceFailures([117],report?.records||[]).length===0,'exact_selected_official_and_ui');
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 let bytes;try{bytes=readFileSync(join(dir,'case-117.html'))}catch{errors.push('missing_raw_html')}
 const html=bytes?.toString('utf8')||'',source=selected117(html);
 must(r.official_url===url&&!r.alternate_url_attempted,'only_original_official_url');
 must(r.status==='FETCHED'&&r.parser_ok===true,'real_official_fetched_parsed');
 must(bytes?.length>0&&bytes.length===r.html_bytes&&r.html_sha256===sha(bytes),'exact_raw_sha256');
 must(source.exact&&r.archived_coffee===name&&f.name===name,'exact_current_selected_H1');
 must(r.selected_heading_identity_verified&&r.add_coffee_ui_rendered&&r.source_review_rendered,'current_add_coffee_and_review');
 for(const k of ['producer','washed','rwanda','variety','notes','fermentation'])must(source[k],'own_current_'+k);
 must(f.process==='Washed','washed_green_method_not_anaerobic_fermentation');
 must(f.producer==='Stanislas Kayitera','own_named_producer_not_importer_or_station');
 must(f.roast_level==='Light','own_light_roast');
 must(String(f.variety||'').includes('Red Bourbon'),'own_red_bourbon');
 must(['lemon','caramel','honey','floral'].every(s=>norm(f.tasting_notes).includes(s)),'own_four_tasting_notes');
 must(!f.decaffeination_method,'no_invented_decaf_method');
 must(!(r.seo_fallback_fields||[]).includes('producer')&&!(r.seo_fallback_fields||[]).includes('process'),'no_seo_producer_process');
 const replay=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
 must(replay?.ok===true&&replay.fields?.name===f.name,'real_parser_replay_identity');
 must(replay?.fields?.process==='Washed'&&replay.fields?.producer==='Stanislas Kayitera','real_parser_replay_roles');
 const result={passed:errors.length===0,errors,event_sha:process.env.DIC_R326_EVENT_SHA,
 checkout_sha:process.env.DIC_R326_CHECKOUT_SHA,manual_certified:0,production_operations:0,
 fermentation_not_green_processing:true,source:{number:117,official_url:url,final_url:r.final_url,
 html_bytes:r.html_bytes,html_sha256:r.html_sha256,selected_h1:source.heads,current_fields:f,
 conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]}};
 writeFileSync(join(dir,'r326-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R326 CURRENT SELECTED SOURCE] '+JSON.stringify(result));
 if(errors.length)process.exitCode=1;
}
