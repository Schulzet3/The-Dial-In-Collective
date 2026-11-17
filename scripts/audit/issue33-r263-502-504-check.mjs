#!/usr/bin/env node
// R263: source-bound original603 #502/#504 current product, not frozen oracle certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const fold=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const selectedText=html=>fold(String(html||'').replace(/<!--[^]*?-->/g,' ')
  .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[^]*?<\/\1>/giu,' ')
  .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:nbsp|amp);/giu,' '));
export const entries=Object.freeze([
 {number:502,name:'Brazil - Fazenda Samambaia',url:'https://www.kamiakcoffeeco.com/products/brazil-single-estate',
  witness:['Fazenda Samambaia','Henrique Dias Cambraia','panela','Yellow Bourbon','Pulped Natural']},
 {number:504,name:'Tanzania AA - AMCOS',url:'https://www.kamiakcoffeeco.com/products/tanzania-aa-amcos',
  witness:['AMCOS','honeydew','agave','1870','Washed']}
]);
export function selectedEvidence(markup,heads,entry){
 const t=selectedText(markup);
 return {identity:Array.isArray(heads)&&heads.length===1&&fold(heads[0])===fold(entry.name),
  direct:entry.witness.every(x=>t.includes(fold(x)))};
}
export function selectedFieldChecks(entry,f){
 const notes=fold(f?.tasting_notes),origin=fold(f?.origin),roast=fold(f?.roast_level);
 const common={name:fold(f?.name)===fold(entry.name),roaster:/kamiak/i.test(f?.roaster||''),
  no_decaf:!f?.decaffeination_method,no_unpublished_lot:!f?.release_label};
 if(entry.number===502)return {...common,
  exact_origin:origin.includes('brazil')&&origin.includes('campos das vertentes'),
  medium_roast:roast==='medium',
  direct_labeled_cocoa_peanut_panela:['cocoa','roasted peanut','panela'].every(x=>notes.includes(x))};
 return {...common,exact_origin:origin.includes('tanzania')&&origin.includes('mbeya'),
  light_roast:roast==='light',washed:fold(f?.process)==='washed',
  direct_labeled_honeydew_agave_peat:['honeydew','agave','peat'].every(x=>notes.includes(x))};
}
if(process.env.DIC_R263_VERIFY==='1'){
 const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR,errors=[],check=(ok,code)=>{if(!ok)errors.push(code)};
 let report,reportBytes;try{reportBytes=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(reportBytes)}catch{}
 check(JSON.stringify(report?.case_numbers)==='[502,504]'&&report?.records?.length===2,'both_exact_original_cases');
 check(report?.source_sha===process.env.DIC_R263_EVENT_SHA,'event_sha');
 check(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R263_CHECKOUT_SHA,'checkout_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen_csv_intact');
 check(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'no_corpus_or_prod_change');
 const records=[];
 for(const entry of entries){
  const r=report?.records?.find(x=>x.number===entry.number)||{},f=r.current_fields||{};
  let raw;try{raw=readFileSync(join(dir,'case-'+entry.number+'.html'))}catch{}
  const markup=productMarkup(raw?.toString('utf8')||''),heads=selectedProductHeadings(markup);
  const selected=selectedEvidence(markup,heads,entry);
  let final;try{final=new URL(r.final_url)}catch{}
  const expected=new URL(entry.url);
  const fields=selectedFieldChecks(entry,f);
  check(r.archived_coffee===entry.name&&r.official_url===entry.url,entry.number+'_original_selected_url');
  check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,entry.number+'_actual_parser_and_identity');
  check(raw?.length>0&&r.html_bytes===raw.length&&r.html_sha256===hash(raw),entry.number+'_raw_html_hash');
  check(final?.protocol==='https:'&&final?.hostname===expected.hostname&&final?.pathname.replace(/\/$/,'')===expected.pathname&&!final.search&&!final.hash,entry.number+'_current_exact_handle');
  check(selected.identity&&selected.direct,entry.number+'_selected_h1_and_direct_content');
  check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,entry.number+'_add_coffee_and_review');
  for(const [key,value] of Object.entries(fields))check(value,entry.number+'_'+key);
  check((r.conflicts||[]).length===0,entry.number+'_actual_canonical_conflicts');
  // R263: exact #504 direct labeled narrative repeats the very same cup
  // notes; it must not claim a contradictory second tasting note in Review.
  if(entry.number===504){
    const reviews=(r.source_facts||[]).filter(f=>f.field==='tasting_notes'&&/^tasting notes$/iu.test(String(f.label||'')));
    check(reviews.length===1&&reviews.every(f=>f.conflicting!==true),entry.number+'_no_false_source_review_tasting_conflict');
  }
  records.push({number:entry.number,source_url:r.final_url,raw_sha256:raw?hash(raw):null,
    bytes:raw?.length||0,heads,selected,fields,canonical:f,conflicts:r.conflicts||[],
    process_literal_review:entry.number===502?'Direct seller labels Pulped Natural, not Honey':null,
    farm_role_review:entry.number===502?'Farm Fazenda Samambaia; owner/grower Henrique Dias Cambraia':entry.number===504?'AMCOS cooperative, not an individual named farmer':null});
 }
 const result={source_sha:report?.source_sha,checkout_sha:process.env.DIC_R263_CHECKOUT_SHA,
  source_report_sha256:reportBytes?hash(reportBytes):null,records,errors,passed:!errors.length,
  manual_certified:0,production_operations:0};
 writeFileSync(join(dir,'r263-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R263 #502/#504] '+JSON.stringify(result));
 if(errors.length)process.exitCode=1;
}
