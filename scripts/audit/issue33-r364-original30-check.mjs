#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
export const selectedUrl='https://bonjocoffee.com/products/guatemala-finca-el-rincon-copy';
export const selectedName='Costa Rica, El Poeta';
export const norm=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const digest=x=>createHash('sha256').update(x).digest('hex');
export function selected30(html){
 const own=productMarkup(String(html||'')),h1=selectedProductHeadings(own);
 const body=norm(own.replace(/<(script|style|noscript|nav|aside|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<[^>]{0,2000}>/g,' '));
 return {h1,identity:h1.length===1&&norm(h1[0])===norm(selectedName),
   notes:['brown sugar','hibiscus','raspberry','honey'].every(s=>body.includes(s)),
   origin:body.includes('san rafael de san ramon')&&body.includes('costa rica'),
   process:body.includes('fully washed')&&body.includes('sun dried'),
   variety:body.includes('catuai')&&body.includes('caturra'),
   growers:['julia vega rodriguez','olman cruz vega','ricardo chavez garita','juan bautista mejia rojas'].every(s=>body.includes(s)),
   grade:body.includes('quality grade gold collection'),
   tier:body.includes('our gold collection is reserved')&&body.includes('we selected el poeta for this tier'),
   elevationInconsistent:/5 200 feet.*1 100 masl/.test(body)};
}
export function unsafeUnsupportedValues(fields={},conflicts=[]){
 return Boolean(fields.roast_level||fields.elevation_m)||fields.release_label!=='Gold Collection'||
  !Array.isArray(conflicts)||!conflicts.includes('elevation_m');
}
if(process.env.DIC_R364_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r364',errors=[];
 const check=(condition,id)=>{if(!condition)errors.push(id);};
 let e={},buf;try{e=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch{errors.push('missing_collector');}
 try{buf=readFileSync(join(dir,'case-30.html'));}catch{errors.push('no_raw_html');}
 const r=e.records?.[0]||{},f=r.current_fields||{},html=buf?.toString('utf8')||'',source=selected30(html);
 check(JSON.stringify(e.case_numbers)==='[30]'&&e.records?.length===1,'only_original30');
 check(requiredFocusedSourceFailures([30],e.records||[]).length===0,'selected_official_source_parser_UI');
 check(r.official_url===selectedUrl&&r.status==='FETCHED'&&!r.alternate_url_attempted,'original_official_url');
 check(buf?.length>1000&&r.html_bytes===buf?.length&&r.html_sha256===digest(buf||''),'raw_source_sha256');
 check(source.identity&&r.selected_heading_identity_verified&&norm(f.name)===norm(selectedName),'current_selected_H1_not_recycled_Guatemala');
 check(source.notes&&source.origin&&source.process&&source.variety&&source.growers,'current_direct_selected_fields');
 check(source.grade&&source.tier&&source.elevationInconsistent,'direct_selected_corroborated_named_tier_and_ambiguous_altitude');
 check(norm(f.process)==='washed'&&norm(f.origin).includes('costa rica'),'current_origin_process');
 check(['brown sugar','hibiscus','raspberry','honey'].every(v=>norm(f.tasting_notes).includes(v)),'four_direct_selected_flavors');
 check(!unsafeUnsupportedValues(f,r.conflicts),'own_Gold_Collection_tier_kept_no_related_roast_no_arbitrary_altitude');
 check(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_unrelated_SEO_flavors');
 check(e.manual_certified===0&&!e.original_corpus_modified&&e.production_operations===0,'original603_not_certified_or_mutated');
 check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R364_HEAD_SHA &&
  e.source_sha===process.env.DIC_R364_EVENT_SHA&&process.env.GITHUB_SHA===process.env.DIC_R364_EVENT_SHA,'head_event_source');
 check(execFileSync('git',['rev-parse','HEAD:docs/audits/issue33-original603-source-level-adjudication-20261029.csv'],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6','immutable_original_CSV');
 const p=extractPublicCoffeeFacts(html,{source_url:r.final_url||selectedUrl});
 check(p?.ok&&norm(p.fields?.name)===norm(selectedName)&&
  coffeeUrlPreviewMarkup(p).includes('coffee-url-preview')&&
  coffeeSourceReviewSnapshot({...p,source_url:r.final_url||selectedUrl})?.type==='coffee_source_review',
  'actual_current_parser_Add_Coffee_Source_Review_no_save');
 check(!unsafeUnsupportedValues(p.fields,p.conflicts),'current_parser_keeps_own_tier_and_withholds_unsupported_roast_and_altitude');
 const output={passed:!errors.length,errors,source_sha:process.env.DIC_R364_HEAD_SHA,event_sha:process.env.DIC_R364_EVENT_SHA,
  current_selected:source,raw_html_bytes:buf?.length||0,raw_html_sha256:buf?digest(buf):null,
  fields:f,conflicts:r.conflicts||[],parser_fields:p?.fields||{},parser_conflicts:p?.conflicts||[],
  member_save:false,full603_manual_certification:false};
 writeFileSync(join(dir,'r364-afterproof.json'),JSON.stringify(output,null,2)+'\n');
 console.log('[DIC33 R364] '+JSON.stringify(output));
 if(errors.length)process.exitCode=1;
}