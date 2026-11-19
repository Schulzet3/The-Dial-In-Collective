#!/usr/bin/env node
// R323: original603 #99 selected current official identity and real parser/UI, not another coffee's decaf FAQ.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const url='https://dekaf.com/products/guatemala-finca-santa-isabel';
const name='Guatemala Finca Santa Isabel';
const sha=b=>createHash('sha256').update(b).digest('hex');
const norm=s=>String(s??'').replace(/&#(?:0*39|x0*27);|&apos;/giu,"'").normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r323';
export function selected99(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const own=norm(scoped.replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/gi,' ')
 .replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' ')
 .replace(/&(?:nbsp|amp|quot);/giu,' '));
 const has=s=>own.includes(norm(s));
 return {headings,exactSelectedHeading:headings.some(h=>norm(h)===norm(name)),
  direct:{decaf:has('decaf single origin'),medium:has('ROAST: Medium'),
   notes:['caramel','clementine','green apple'].every(has),water:has("Dekáf'd by way of Swiss Water")},
  own};
}
if(process.env.DIC_R323_VERIFY==='1'){
 const errors=[],must=(v,code)=>{if(!v)errors.push(code)};
 let report;
 try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
 catch{errors.push('missing_focused_evidence')}
 must(JSON.stringify(report?.case_numbers)==='[99]'&&report?.records?.length===1,'only_original99');
 must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_checksum');
 must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'immutable_original_and_no_production');
 must(report?.source_sha===process.env.DIC_R323_EVENT_SHA,'actual_event_sha');
 must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R323_CHECKOUT_SHA,'exact_checkout_sha');
 must(requiredFocusedSourceFailures([99],report?.records||[]).length===0,'required_current_official_source_gate');
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 let bytes;
 try{bytes=readFileSync(join(dir,'case-99.html'))}
 catch{errors.push('missing_raw_official_html')}
 const html=bytes?.toString('utf8')||'',d=selected99(html);
 must(r.official_url===url&&!r.alternate_url_attempted,'exact_original_url');
 must(r.status==='FETCHED'&&r.parser_ok===true,'selected_current_fetch_parse');
 must(bytes?.length>0&&r.html_bytes===bytes.length&&r.html_sha256===sha(bytes),'raw_selected_bytes_sha256');
 must(r.archived_coffee===name&&f.name===name&&d.exactSelectedHeading,'exact_selected_current_h1');
 must(r.selected_heading_identity_verified&&r.add_coffee_ui_rendered&&r.source_review_rendered,'actual_ui_source_review');
 for(const [key,value] of Object.entries(d.direct))must(value,'selected_own_literal_'+key);
 must(f.roast_level==='Medium','current_selected_medium_roast');
 must(/Guatemala/i.test(String(f.origin||'')),'selected_origin_guatemala');
 must(['caramel','clementine','green apple'].every(s=>norm(f.tasting_notes).includes(norm(s))),'current_selected_flavor_triple');
 must(f.decaffeination_method==='Water Process','selected_self_decaf_swiss_water');
 must(!f.process&&!f.variety&&!f.elevation_m&&!f.release_label,'no_unpublished_green_process_variety_elevation_lot');
 must(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_seo_flavor_fallback');
 const replay=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
 must(replay?.ok===true&&replay.fields?.name===f.name,'current_parser_raw_replay');
 const verdict={passed:errors.length===0,errors,event_sha:process.env.DIC_R323_EVENT_SHA,
  checkout_sha:process.env.DIC_R323_CHECKOUT_SHA,manual_certified:0,production_operations:0,
  source:{number:99,official_url:url,final_url:r.final_url,html_bytes:r.html_bytes,html_sha256:r.html_sha256,
  selected_h1:d.headings,current_fields:f,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[]}};
 writeFileSync(join(dir,'r323-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
 console.log('[DIC33 R323 SELECTED AFTERPROOF] '+JSON.stringify(verdict));
 if(errors.length)process.exitCode=1;
}
