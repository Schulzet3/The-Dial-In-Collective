#!/usr/bin/env node
// #33 R330: only original603 #153, no global or manual certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const url='https://hilltreeroastery.com/products/mexico-nayarit-natural-anaerobic-dragon';
const name='MEXICO NAYARIT NATURAL ANAEROBIC DRAGON';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r330';
const sha=v=>createHash('sha256').update(v).digest('hex');
const norm=v=>String(v||'').normalize('NFKD').replace(/\\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export function selected153(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 // Preserve product forms, but remove menus, generic sidebars, SEO and other products.
 const own=scoped.replace(/<(script|style|noscript|template|nav|aside|footer|header|select)\\b[^>]*>[\\s\\S]*?<\\/\\1>/gi,' ')
  .replace(/<!--[\\s\\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' ')
  .replace(/&(?:nbsp|amp);/gi,' ').replace(/\\s+/g,' ');
 const n=norm(own);
 return {headings,exact:headings.some(h=>norm(h)===norm(name)),
  labeledFlavor:/\\bflavor raspberry winey cinnamon orange\\b/.test(n),
  bodyMedium:/\\bbody medium\\b/.test(n),
  ownAnaerobic:/\\bprocess natural anaerobic dragon\\b/.test(n),
  ownLightRoast:/\\broast light\\b/.test(n),
  ownOrigin:/\\borigin tepic nayarit mexico\\b/.test(n),
  ownElevation:/\\belevation 1 400 meters\\b/.test(n),
  genericSmallholders:/\\bproducers various smallholders\\b/.test(n),
  ownVarieties:/\\bvarieties caturra bourbon\\b/.test(n)};
}
if(process.env.DIC_R330_VERIFY==='1'){
 const errors=[],need=(v,k)=>{if(!v)errors.push(k)};
 let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch{errors.push('missing_case_report')}
 need(JSON.stringify(report?.case_numbers)==='[153]'&&report?.records?.length===1,'only_original153');
 need(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_register_identity');
 need(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'frozen_unmodified_no_manual_or_production');
 need(report?.source_sha===process.env.DIC_R330_EVENT_SHA,'event_commit_source_identity');
 need(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R330_HEAD_SHA,'checked_out_commit_identity');
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 need(requiredFocusedSourceFailures([153],report?.records||[]).length===0,'required_fetched_selected_H1_parser_and_both_UI');
 let bytes;try{bytes=readFileSync(join(dir,'case-153.html'))}catch{errors.push('missing_real_HTML')}
 const html=bytes?.toString('utf8')||'',d=selected153(html);
 need(r.official_url===url&&!r.alternate_url_attempted,'exact_official_not_alternate');
 need(r.status==='FETCHED'&&r.parser_ok===true&&!!bytes?.length&&r.html_bytes===bytes?.length&&r.html_sha256===sha(bytes||''),'real_HTML_SHA_and_bytes');
 need(r.archived_coffee===name&&d.exact&&norm(f.name)===norm(name),'current_selected_H1_and_parser_name');
 for(const k of ['labeledFlavor','bodyMedium','ownAnaerobic','ownLightRoast','ownOrigin','ownElevation','genericSmallholders','ownVarieties'])need(d[k],'direct_selected_'+k);
 need(f.process==='Anaerobic','labeled_natural_anaerobic_not_F_A_Q_washed');
 need(f.roast_level==='Light','labeled_light_roast_not_medium_body');
 need(['raspberry','winey','cinnamon','orange'].every(s=>norm(f.tasting_notes).includes(s)),'complete_direct_selected_tasting_notes');
 need(norm(f.origin).includes('nayarit mexico'),'own_selected_origin');
 need(['caturra','bourbon'].every(s=>norm(f.variety).includes(s)),'own_selected_varieties');
 need(!f.producer||norm(f.producer).includes('various smallholders'),'no_invented_named_farmer');
 need(!f.decaffeination_method&&!f.release_label,'no_unpublished_decaf_or_release');
 need(!(r.seo_fallback_fields||[]).some(s=>['origin','producer','process','roast_level','tasting_notes','variety'].includes(s)),'no_SEO_field_borrow');
 const p=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
 need(p?.ok===true&&norm(p?.fields?.name)===norm(name)&&p?.fields?.process==='Anaerobic'&&p?.fields?.roast_level==='Light','actual_parser_replay');
 const out={passed:errors.length===0,errors,manual_certified:0,production_operations:0,
  event_sha:process.env.DIC_R330_EVENT_SHA,checkout_sha:process.env.DIC_R330_HEAD_SHA,
  case:153,source:{url,headings:d.headings,html_sha256:r.html_sha256,html_bytes:r.html_bytes,direct:d,
  parsed:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]}};
 writeFileSync(join(dir,'r330-afterproof.json'),JSON.stringify(out,null,2)+'\\n');
 console.log('[DIC33 R330 ORIGINAL153] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
