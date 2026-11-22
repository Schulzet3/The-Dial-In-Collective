#!/usr/bin/env node
// Issue33 original603 #37: strict current chosen first-party semantic review.
// Never substitute mill location for farm, navigation for notes or 2009 for release.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';

export const selectedUrl='https://brewtusroasting.com/products/costa-rica-black-honey-direct-trade';
export const selectedName='Costa Rica Black Honey';
export const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=x=>createHash('sha256').update(x).digest('hex');
export function selected37(html){
 const own=productMarkup(String(html||'')),h1=selectedProductHeadings(own);
 const ownProse=norm(own.replace(/<(script|style|noscript|nav|aside|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]{0,2000}>/g,' '));
 return {h1,identity:h1.length===1&&norm(h1[0])===norm(selectedName),
  chosenBlackHoney:ownProse.includes('this black honey processed coffee series'),
  directSensory:['chocolate','black cherry','strawberry'].every(s=>ownProse.includes(s)),
  directLight:ownProse.includes('this coffee is lightly roasted'),
  directPeople:ownProse.includes('dona francisca')&&ownProse.includes('oscar chacon'),
  millIsLocation:ownProse.includes('cumbres del poas micro mill is located in sabanilla alajuela in the central valley region of costa rica'),
  harvestDoesNotNameRelease:ownProse.includes('in 2009 they became pioneers')};
}
export function unsafe37Fields(fields={}){
 const notes=norm(fields.tasting_notes),origin=norm(fields.origin),producer=norm(fields.producer);
 return norm(fields.name)!==norm(selectedName)||
  !origin.includes('costa rica')||!origin.includes('central valley')||
  norm(fields.process)!=='honey'||norm(fields.roast_level)!=='light'||
  !['chocolate','black cherry','strawberry'].every(x=>notes.includes(x))||
  !producer.includes('francisca')||!producer.includes('oscar chacon')||
  Boolean(fields.decaffeination_method||fields.release_label||fields.espresso_recipe)||
  /(?:\b2009\b|(?:^| )sabanilla(?: |$)|(?:^| )alajuela(?: |$))/.test(
    norm(String(fields.release_label||'')+' '+String(fields.origin||'')));
}
if(process.env.DIC_R365_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r365',errors=[];
 const ck=(v,k)=>{if(!v)errors.push(k)};
 let e={};let buf;try{e=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}catch{errors.push('collector_missing')}
 try{buf=readFileSync(join(dir,'case-37.html'))}catch{errors.push('official_html_missing')}
 const rec=e.records?.[0]||{},html=buf?.toString('utf8')||'',src=selected37(html),fields=rec.current_fields||{};
 ck(JSON.stringify(e.case_numbers)==='[37]'&&e.records?.length===1,'one_selected_37');
 ck(requiredFocusedSourceFailures([37],e.records||[]).length===0,'identity_official_parser_ui');
 ck(rec.official_url===selectedUrl&&rec.status==='FETCHED'&&!rec.alternate_url_attempted,'exact_original_selected_url');
 ck(buf?.length>1000&&rec.html_bytes===buf?.length&&rec.html_sha256===hash(buf||''),'raw_official_sha');
 ck(src.identity&&rec.selected_heading_identity_verified&&norm(fields.name)===norm(selectedName),'exact_selected_H1');
 ck(src.chosenBlackHoney&&src.directSensory&&src.directLight&&src.directPeople&&src.millIsLocation&&src.harvestDoesNotNameRelease,'own_chosen_source_literally_supports_fields');
 ck(!unsafe37Fields(fields),'selected_facts_not_mill_farm_or_2009_release');
 ck(!Array.isArray(rec.conflicts)||rec.conflicts.length===0,'no_unreviewed_conflict');
 ck(e.manual_certified===0&&!e.original_corpus_modified&&e.production_operations===0,'immutable_corpus_no_production');
 ck(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R365_HEAD_SHA &&
    process.env.GITHUB_SHA===process.env.DIC_R365_EVENT_SHA&&e.source_sha===process.env.DIC_R365_EVENT_SHA,'event_checkout_sha');
 ck(execFileSync('git',['rev-parse','HEAD:docs/audits/issue33-original603-source-level-adjudication-20261029.csv'],{encoding:'utf8'}).trim()==='3e0d3036ea727de091f304f538c6de2dfcaa10d6','original_603_CSV_unchanged');
 const p=extractPublicCoffeeFacts(html,{source_url:rec.final_url||selectedUrl});
 ck(p?.ok&&norm(p.fields?.name)===norm(selectedName)&&
    coffeeUrlPreviewMarkup(p).includes('coffee-url-preview')&&
    coffeeSourceReviewSnapshot({...p,source_url:rec.final_url||selectedUrl})?.type==='coffee_source_review',
    'real_current_parser_Add_Coffee_Source_Review_no_save');
 ck(!unsafe37Fields(p?.fields||{}),'current_parser_selected_fields_not_unsupported');
 const output={passed:!errors.length,errors,source_sha:process.env.DIC_R365_HEAD_SHA,
  event_sha:process.env.DIC_R365_EVENT_SHA,source:src,
  raw_html_bytes:buf?.length||0,raw_html_sha256:buf?hash(buf):null,
  fields,parser_fields:p?.fields||{},conflicts:rec.conflicts||[],member_save:false,full603_manual_certification:false};
 writeFileSync(join(dir,'r365-afterproof.json'),JSON.stringify(output,null,2)+'\n');
 console.log('[DIC33 R365 original37] '+JSON.stringify(output));
 if(errors.length)process.exitCode=1;
}
