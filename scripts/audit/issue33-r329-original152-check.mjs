#!/usr/bin/env node
// #33 R329: source-specific original603 #152 selected product, NOT 603 manual certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const url='https://hilltreeroastery.com/products/ethiopia-yirgacheffe-banko-chelchele-supernatural-anaerobic-coffee';
const name='ETHIOPIA YIRGACHEFFE BANKO CHELCHELE SUPERNATURAL ANAEROBIC COFFEE';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r329';
const sha=b=>createHash('sha256').update(b).digest('hex');
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export function selected152(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const own=scoped.replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/gi,' ')
  .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' ').replace(/&(?:nbsp|amp);/gi,' ').replace(/\s+/g,' ');
 const n=norm(own);
 return {
  headings,exact:headings.some(h=>norm(h)===norm(name)),
  ownFlavor:['strawberry','blackberry','toffee','chocolate'].every(x=>n.includes(x)),
  labeledProcess:/\bprocess\s+anaerobic natural\b/i.test(n),
  labeledLightRoast:/\broast\s+light\b/i.test(n),
  lightToMediumBody:/\bbody\s+light to medium\b/i.test(n),
  sourceOrigin:n.includes('yirgacheffe')&&n.includes('ethiopia')&&n.includes('gedeb')&&n.includes('gedeo'),
  sourceSmallholders:n.includes('various smallholder farmers'),
  sourceHeirloom:n.includes('ethiopian heirloom varieties'),
  sourceElevation:n.includes('1 900')&&n.includes('2 200')
 };
}
if(process.env.DIC_R329_VERIFY==='1'){
 const errors=[],need=(ok,label)=>{if(!ok)errors.push(label)};
 let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch{errors.push('missing_original603_report')}
 need(JSON.stringify(report?.case_numbers)==='[152]'&&report?.records?.length===1,'only_exact_original152');
 need(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_corpus_sha256');
 need(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'unmodified_originals_zero_manual_or_production');
 need(report?.source_sha===process.env.DIC_R329_EVENT_SHA,'exact_event_sha');
 need(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R329_HEAD_SHA,'exact_checkout_sha');
 need(requiredFocusedSourceFailures([152],report?.records||[]).length===0,'required_fetched_parser_identity_and_ui');
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 let bytes;try{bytes=readFileSync(join(dir,'case-152.html'))}catch{errors.push('raw_selected_html_missing')}
 const html=bytes?.toString('utf8')||'',direct=selected152(html);
 need(r.official_url===url&&!r.alternate_url_attempted,'exact_original_official_url_no_alternate');
 need(r.status==='FETCHED'&&r.parser_ok===true&&!!bytes?.length&&r.html_bytes===bytes?.length&&r.html_sha256===sha(bytes||''),'real_runner_html_and_sha256');
 need(r.archived_coffee===name&&direct.exact&&norm(f.name)===norm(name),'current_selected_exact_h1_and_parsed_identity');
 for(const key of ['ownFlavor','labeledProcess','labeledLightRoast','lightToMediumBody','sourceOrigin','sourceSmallholders','sourceHeirloom','sourceElevation'])
  need(direct[key],'same_selected_'+key);
 need(f.process==='Anaerobic','own_anaerobic_natural_not_other_coffee');
 need(f.roast_level==='Light','labeled_light_roast_not_medium_body');
 need(['strawberry','blackberry','toffee','chocolate'].every(x=>norm(f.tasting_notes).includes(x)),'all_own_notes');
 need(norm(f.origin).includes('ethiopia'),'direct_origin_country');
 need(norm(f.producer).includes('smallholder'),'producer_organizational_role_not_invented_person');
 need(norm(f.variety).includes('heirloom'),'direct_variety');
 need(!f.decaffeination_method&&!f.release_label,'no_unpublished_decaf_or_release');
 need(!(r.seo_fallback_fields||[]).some(x=>['origin','producer','variety','process','roast_level','tasting_notes'].includes(x)),'no_seo_loan');
 const replay=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
 need(replay?.ok===true&&norm(replay?.fields?.name)===norm(name),'exact_current_parser_replay_name');
 need(replay?.fields?.process==='Anaerobic'&&replay?.fields?.roast_level==='Light','exact_current_parser_replay_process_roast');
 const out={passed:errors.length===0,errors,manual_certified:0,production_operations:0,
  event_sha:process.env.DIC_R329_EVENT_SHA,checkout_sha:process.env.DIC_R329_HEAD_SHA,
  source:{number:152,official_url:url,selected_headings:direct.headings,html_sha256:r.html_sha256,
   html_bytes:r.html_bytes,direct,current_fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]}};
 writeFileSync(join(dir,'r329-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R329 SELECTED ORIGINAL152] '+JSON.stringify(out));
 if(errors.length)process.exitCode=1;
}
