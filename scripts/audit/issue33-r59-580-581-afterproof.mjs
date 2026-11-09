#!/usr/bin/env node
// #33 R59: identify real parser gaps from exact current selected primary
// sources. A current source probe is NOT original603 individual certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedTandemHeroLocation} from './issue33-r59-selected-tandem-contract.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const locationSpecs=[
 {number:580,name:'Faver Ninco - Colombia',hero:'Santa Maria, Huila Colombia',
  host:'www.tandemcoffee.com',path:'/products/faver-ninco-santa-maria-huila-colombia',
  expectedOrigin:'Santa Maria, Huila, Colombia'},
 {number:581,name:'Heri Agena - Ethiopia',hero:'Bensa, Sidama Ethiopia',
  host:'www.tandemcoffee.com',path:'/products/heri-agena-ethiopia',
  expectedOrigin:'Bensa, Sidama, Ethiopia'}
];
const folder=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!folder)throw Error('explicit_private_artifact_directory_required');
const dir=resolve(folder),failures=[],observations=[];
const check=(ok,label)=>{if(!ok)failures.push(label);};
const file=readFileSync(join(dir,'focused-current-evidence.json'));
const report=JSON.parse(file.toString('utf8'));
check(JSON.stringify(report.case_numbers)==='[580,581]','unexpected_original603_subset');
check(report.source_sha===process.env.GITHUB_SHA,'exact_source_sha_mismatch');
check(report.manual_certified===0&&report.original_corpus_modified===false&&
 report.production_operations===0&&report.real_auth===false,'false_certification_or_data_writes');
check(report.records?.length===2,'missing_or_extra_selected_records');
for(const s of locationSpecs){
 const r=report.records?.find(x=>x.number===s.number)||{};
 const prefix=String(s.number);
 check(r.official_url==='https://'+s.host+s.path,'wrong_official_url_'+prefix);
 const u=(()=>{try{return new URL(r.final_url)}catch{return null}})();
 check(u?.protocol==='https:'&&u?.hostname===s.host&&u?.pathname===s.path&&
 !u.search&&!u.hash,'unexpected_redirect_or_query_'+prefix);
 check(r.status==='FETCHED'&&r.parser_ok===true,'selected_fetch_or_parser_failed_'+prefix);
 check(r.selected_heading_identity_verified===true&&
 r.selected_h1?.length===1&&r.selected_h1[0]===s.name&&
 r.current_fields?.name===s.name,'selected_identity_unverified_or_changed_'+prefix);
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,
  'actual_add_coffee_or_review_missing_'+prefix);
 let html=null,verified=false;
 try{const b=readFileSync(join(dir,'case-'+prefix+'.html'));html=b.toString('utf8');
  verified=b.length===r.html_bytes&&sha(b)===r.html_sha256;}catch{}
 check(verified,'raw_selected_html_hash_or_bytes_mismatch_'+prefix);
 const directHero=selectedTandemHeroLocation(productMarkup(html||''),s.name,s.hero);
 check(directHero,'current_selected_direct_hero_location_missing_'+prefix);
 const origin=String(r.current_fields?.origin||'');
 const originGap=directHero&&origin!==s.expectedOrigin;
 observations.push({number:s.number,official_url:r.official_url,selected_h1:r.selected_h1||[],
  direct_selected_hero:s.hero,source_supports_region:directHero,
  actual_origin:origin||null,expected_source_bound_origin:s.expectedOrigin,
  parser_origin_gap_requires_adjudication:originGap,
  current_fields:r.current_fields||{},conflicts:r.conflicts||[],
  seo_fallback_fields:r.seo_fallback_fields||[],html_bytes:r.html_bytes||null,
  html_sha256:r.html_sha256||null,raw_html_verified:verified,
  add_coffee:r.add_coffee_ui_rendered===true,
  source_review:r.source_review_rendered===true});
}
const verdict={kind:'ISSUE33_R59_TWO_SELECTED_TANDEM_SOURCES_NOT_603_CERTIFICATION',
 source_sha:report.source_sha,original603_csv_sha256:report.original603_register_sha256,
 evidence_sha256:sha(file),manual_certified:0,production_operations:0,
 passed:failures.length===0,failures,
 source_bound_origin_gaps:observations.filter(x=>x.parser_origin_gap_requires_adjudication).map(x=>x.number),
 observations};
writeFileSync(join(dir,'r59-580-581-selected-source-verdict.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[ISSUE33 R59 CURRENT SELECTED FIELD DIAGNOSTIC] '+JSON.stringify(verdict));
if(failures.length)process.exitCode=1;
