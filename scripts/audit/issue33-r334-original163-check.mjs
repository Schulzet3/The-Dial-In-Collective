#!/usr/bin/env node
// #33 R334: only original 603 row #163; selected public source, no universal/manual certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const url='https://ironcladcoffee.com/products/decaf-colombia-las-montanas';
const name='Decaf Colombia Las Montanas';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r334';
const sha=b=>createHash('sha256').update(b).digest('hex');
const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function selected163(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const own=selected.replace(/<(script|style|noscript|template|nav|aside|footer|header|select)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
   .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' ')
   .replace(/&(?:nbsp|amp|#160|#xA0);/gi,' ').replace(/\s+/g,' ');
 const t=norm(own);
 return {headings,exact:headings.some(h=>norm(h)===norm(name)),
  selectedEA:/\bcolombia las montanas ea natural decaf is decaffeinated using ethyl acetate ea\b/.test(t)
   &&/\bsugarcane process decaf\b/.test(t),
  ownCaldas:/\bdepartment caldas\b/.test(t),ownColombia:/\bcountry colombia\b/.test(t),
  ownElevation:/\baltitude 1 600 meters above sea level\b/.test(t),
  ownVariety:/\bvariety typica castillo\b/.test(t),
  ownWashed:/\bprocess washed\b/.test(t),
  ownMedium:/\broast profile medium\b/.test(t),
  ownFlavor:/\bflavor notes lemon cherry balanced\b/.test(t)};
}
if(process.env.DIC_R334_VERIFY==='1'){
 const errors=[],need=(condition,reason)=>{if(!condition)errors.push(reason)};
 let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch{errors.push('missing_case_report')}
 need(JSON.stringify(report?.case_numbers)==='[163]'&&report?.records?.length===1,'only_original163');
 need(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fbca2f469fb23c18ee353','frozen_register_sha');
 need(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_frozen_changes_false_manual_or_production');
 need(report?.source_sha===process.env.DIC_R334_EVENT_SHA,'event_commit_identity');
 need(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R334_HEAD_SHA,'exact_checkout_head');
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 need(requiredFocusedSourceFailures([163],report?.records||[]).length===0,'required_selected_H1_parser_Add_Coffee_Source_Review');
 let bytes;try{bytes=readFileSync(join(dir,'case-163.html'))}catch{errors.push('missing_real_HTML')}
 const html=bytes?.toString('utf8')||'',d=selected163(html);
 need(r.official_url===url&&!r.alternate_url_attempted,'exact_registered_official_not_alternate');
 need(r.status==='FETCHED'&&r.parser_ok===true&&!!bytes?.length&&r.html_bytes===bytes?.length&&r.html_sha256===sha(bytes||''),'actual_raw_HTML_bytes_SHA');
 need(r.archived_coffee===name&&d.exact&&norm(f.name)===norm(name),'selected_current_identity_H1_name');
 for(const k of ['selectedEA','ownCaldas','ownColombia','ownElevation','ownVariety','ownWashed','ownMedium','ownFlavor'])need(d[k],'direct_selected_'+k);
 need(f.decaffeination_method==='Sugar Process','real_selected_sugarcane_EA_decaf');
 need(f.process==='Washed','green_washed_separate_from_EA');
 need(f.roast_level==='Medium','selected_roast_not_educational');
 need(['caldas','colombia'].every(x=>norm(f.origin).includes(x)),'direct_selected_origin');
 need(['1600'].every(x=>norm(f.elevation_m).includes(x)),'direct_selected_elevation');
 need(['typica','castillo'].every(x=>norm(f.variety).includes(x)),'direct_selected_variety');
 need(['lemon','cherry','balanced'].every(x=>norm(f.tasting_notes).includes(x)),'selected_flavor_notes');
 need(!f.producer&&!f.release_label,'no_unpublished_farmer_or_release');
 need(!(r.seo_fallback_fields||[]).some(x=>['decaffeination_method','process','origin','tasting_notes'].includes(x)),'no_SEO_fallback_for_direct_selected');
 need(!(r.conflicts||[]).length,'no_false_conflicts');
 const p=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
 need(p?.ok===true&&norm(p?.fields?.name)===norm(name)&&p?.fields?.decaffeination_method==='Sugar Process'&&p?.fields?.process==='Washed','actual_same_html_parser_replay');
 const out={passed:errors.length===0,errors,manual_certified:0,production_operations:0,
  event_sha:process.env.DIC_R334_EVENT_SHA,checkout_sha:process.env.DIC_R334_HEAD_SHA,case:163,
  source:{url,headings:d.headings,html_sha256:r.html_sha256,html_bytes:r.html_bytes,direct:d,
    parsed:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]}};
 writeFileSync(join(dir,'r334-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R334 ORIGINAL163] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
