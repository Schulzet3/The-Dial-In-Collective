#!/usr/bin/env node
// #33 R332: ONLY original603 row 157; guarded current source, no corpus certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const url='https://idyllcoffeeroasters.com/products/colombia-narino-buesaco-copy';
const name='Colombia Buesaco, Nariño';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r332';
const sha=b=>createHash('sha256').update(b).digest('hex');
const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function selected157(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const own=scoped.replace(/<(script|style|noscript|template|nav|aside|footer|header|select)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' ')
  .replace(/&(?:nbsp|amp);/gi,' ').replace(/\s+/g,' ');
 const n=norm(own);
 return {headings,exact:headings.some(h=>norm(h)===norm(name)),
  ownElevation:/\belevation 2000 2100 meters above sea level\b/.test(n),
  ownVarieties:/\bvarietals caturra castillo and colombia\b/.test(n),
  ownCountry:/\borigin colombia\b/.test(n),
  ownRegion:/\bregion buesaco narino\b/.test(n),
  ownWashed:/\bprocess washed\b/.test(n),
  ownFlavor:/\bflavor notes juicy tropical fruit amaretto syrupy body and vibrant acidity\b/.test(n)};
}
if(process.env.DIC_R332_VERIFY==='1'){
 const errors=[],need=(condition,why)=>{if(!condition)errors.push(why)};
 let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch{errors.push('missing_case_report')}
 need(JSON.stringify(report?.case_numbers)==='[157]'&&report?.records?.length===1,'only_original157');
 need(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_original603_register_identity');
 need(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'original_untouched_no_false_certification');
 need(report?.source_sha===process.env.DIC_R332_EVENT_SHA,'event_SHA');
 need(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R332_HEAD_SHA,'checkout_SHA');
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 need(requiredFocusedSourceFailures([157],report?.records||[]).length===0,'official_fetched_selected_H1_current_parser_Add_Coffee_Source_Review');
 let bytes;try{bytes=readFileSync(join(dir,'case-157.html'))}catch{errors.push('missing_real_HTML')}
 const html=bytes?.toString('utf8')||'',d=selected157(html);
 need(r.official_url===url&&!r.alternate_url_attempted,'exact_original_official_URL_not_alternate');
 need(r.status==='FETCHED'&&r.parser_ok===true&&!!bytes?.length&&r.html_bytes===bytes?.length&&r.html_sha256===sha(bytes||''),'raw_HTML_size_and_SHA256');
 need(d.exact&&r.archived_coffee===name&&norm(f.name)===norm(name),'exact_current_selected_H1_and_name');
 for(const k of ['ownElevation','ownVarieties','ownCountry','ownRegion','ownWashed','ownFlavor'])need(d[k],'direct_selected_'+k);
 need(f.process==='Washed','current_washed_not_unrelated_natural');
 need(['juicy','tropical','fruit','amaretto','syrupy','vibrant','acidity'].every(x=>norm(f.tasting_notes).includes(x)),'full_selected_labeled_flavor_notes');
 need(['buesaco','narino','colombia'].every(x=>norm(f.origin).includes(x)),'specific_growing_region_country');
 need(['caturra','castillo','colombia'].every(x=>norm(f.variety).includes(x)),'complete_own_varietals');
 need(['2000','2100'].every(x=>norm(f.elevation_m).includes(x)),'own_elevation_range');
 need(!f.producer&&!f.roast_level&&!f.decaffeination_method&&!f.release_label,'no_invented_producer_roast_decaf_release');
 need(!(r.conflicts||[]).length,'no_false_current_conflicts');
 need(!(r.seo_fallback_fields||[]).some(x=>['origin','process','variety','tasting_notes','elevation_m'].includes(x)),'no_SEO_borrow_for_owned_fields');
 const p=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
 need(p?.ok===true&&norm(p?.fields?.name)===norm(name)&&p?.fields?.process==='Washed','actual_current_parser_replay');
 const out={passed:errors.length===0,errors,manual_certified:0,production_operations:0,
  event_sha:process.env.DIC_R332_EVENT_SHA,checkout_sha:process.env.DIC_R332_HEAD_SHA,
  case:157,source:{url,headings:d.headings,html_sha256:r.html_sha256,html_bytes:r.html_bytes,direct:d,
   parsed:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]}};
 writeFileSync(join(dir,'r332-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R332 ORIGINAL157] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
