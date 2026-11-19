#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const url='https://eastpole.coffee/products/granosacielo',name='Granos A Cielo';
const sha=b=>createHash('sha256').update(b).digest('hex');
const norm=s=>String(s??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export function selected111(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const own=norm(scoped.replace(/<(?:script|style|noscript|template|nav|aside|footer|header)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header)>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]{0,2500}>/g,' '));
 return {headings,exact:headings.some(h=>norm(h)===norm(name)),
  directProducer:own.includes(norm('Hazel Arias and Nelsyn Yoseles')),
  narrativeProducer:own.includes(norm('Nelsyn Hernández'))&&own.includes(norm('Hazel Arias')),own};
}
if(process.env.DIC_R324_VERIFY==='1'){
 const errors=[],must=(v,code)=>{if(!v)errors.push(code)},dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r324';
 let report;try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch{errors.push('missing_source_evidence')}
 must(JSON.stringify(report?.case_numbers)==='[111]'&&report?.records?.length===1,'only_original111');
 must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_source_register');
 must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_original_or_production_modification');
 must(report?.source_sha===process.env.DIC_R324_EVENT_SHA,'event_sha');
 must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R324_CHECKOUT_SHA,'checkout_sha');
 must(requiredFocusedSourceFailures([111],report?.records||[]).length===0,'required_official_source_and_UI');
 const r=report?.records?.[0]||{},f=r.current_fields||{};
 let bytes;try{bytes=readFileSync(join(dir,'case-111.html'))}catch{errors.push('missing_raw_html')}
 const html=bytes?.toString('utf8')||'',own=selected111(html);
 must(r.official_url===url&&!r.alternate_url_attempted,'exact_original_official_url');
 must(r.status==='FETCHED'&&r.parser_ok===true,'real_source_fetched_parsed');
 must(bytes?.length>0&&r.html_bytes===bytes?.length&&r.html_sha256===sha(bytes),'raw_official_sha');
 must(own.exact&&r.archived_coffee===name&&f.name===name,'current_selected_h1_and_parser_identity');
 must(r.selected_heading_identity_verified&&r.add_coffee_ui_rendered&&r.source_review_rendered,'Add_Coffee_and_Source_Review');
 must(own.directProducer&&own.narrativeProducer,'two_first_party_name_forms');
 must(/Costa Rica/i.test(String(f.origin||''))&&f.process==='Washed','source_own_origin_process');
 must(['Mandarin Orange','Chocolate','Brown sugar'].every(s=>norm(f.tasting_notes).includes(norm(s))),'selected_own_notes');
 must(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_SEO_sensory_borrowing');
 const replay=extractPublicCoffeeFacts(html,{source_url:r.final_url||url});
 must(replay?.ok===true&&replay.fields?.name===f.name,'current_parser_raw_replay');
 const contradiction=own.directProducer&&own.narrativeProducer;
 const reviewable=!f.producer&&(r.conflicts||[]).includes('producer');
 const result={passed:errors.length===0,errors,event_sha:process.env.DIC_R324_EVENT_SHA,
  checkout_sha:process.env.DIC_R324_CHECKOUT_SHA,producer_conflict_review_required:contradiction,
  producer_field_reviewable:reviewable,producer_certified:false,observed_producer:f.producer||null,
  observed_conflicts:r.conflicts||[],manual_certified:0,production_operations:0,
  source:{number:111,official_url:url,final_url:r.final_url,html_bytes:r.html_bytes,html_sha256:r.html_sha256,selected_h1:own.headings,current_fields:f}};
 writeFileSync(join(dir,'r324-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R324 CURRENT SOURCE PRODUCER DIAGNOSTIC] '+JSON.stringify(result));
 if(errors.length)process.exitCode=1;
}
