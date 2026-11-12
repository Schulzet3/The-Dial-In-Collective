#!/usr/bin/env node
// Issue #33 R153: reusable selected-product evidence check, original #169 / #171.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/&(?:nbsp|#160);/giu,' ').replace(/&amp;/giu,' and ').replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const juneTargets=Object.freeze({
 169:{name:'Burundi Busambo',url:'https://junecoffee.co/products/guatemala-las-moritas',
   notes:['grape','black tea','blackberry'],region:'kayanza',variety:'red bourbon',altitude:'1850-2100',
   mill:'busambo',process:'washed',roast:'medium'},
 171:{name:'Peru Cajamarca',url:'https://junecoffee.co/products/peru-cajamarca',
   notes:['apple','caramel','stone fruit'],region:'jaen, cajamarca',variety:'caturra, catimor, bourbon, pache, typica',
   altitude:'1600-1900',mill:'regional community lot',process:'washed',roast:'medium'}
});
function liveText(html){
 const own=productMarkup(String(html||''));
 const pruned=removeElements(own,['script','style','noscript','template','nav','aside','footer','header','select']);
 // Image alt is a legitimate selected-product flavor descriptor only INSIDE this scope.
 const alt=[...pruned.matchAll(/<img\b[^>]*\balt\s*=\s*(?:"([^"]{1,180})"|'([^']{1,180})')/gi)]
  .map(m=>m[1]||m[2]||'').join(' ');
 return {own,visible:norm(pruned.replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,3000}>/gu,' ')),
  alt:norm(alt)};
}
export function selectedJuneSource(html,number){
 const t=juneTargets[number];if(!t)throw Error('invalid_june_original_case');
 const s=liveText(html),h=selectedProductHeadings(s.own);
 const direct=x=>s.visible.includes(norm(x));
 const sensory=x=>direct(x)||s.alt.includes(norm(x));
 return {headings:h,exactSelectedTitle:h.length===1&&norm(h[0])===norm(t.name),
  direct:{region:direct(t.region),variety:direct(t.variety),altitude:direct(t.altitude),
   mill:direct(t.mill),process:direct(t.process),roast:direct(t.roast),
   notes:t.notes.map(sensory)},source_sha256:sha(Buffer.from(html||''))};
}
if(process.env.DIC_ISSUE33_R153_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let e,sourceBytes;try{sourceBytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(sourceBytes.toString('utf8'))}catch{}
 const failures=[];const check=(ok,id)=>{if(!ok)failures.push(id)};
 check(JSON.stringify(e?.case_numbers)==='[169,171]'&&e?.records?.length===2,'exact_two_original_cases');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_immutable_csv');
 check(e?.original_corpus_modified===false&&e?.manual_certified===0&&e?.production_operations===0,'limited_audit_no_production');
 const assessments=[];
 for(const number of [169,171]){
  const t=juneTargets[number],rec=e?.records?.find(x=>x.number===number)||{},f=rec.current_fields||{};
  let b;try{b=readFileSync(join(dir,'case-'+number+'.html'))}catch{}
  const proof=selectedJuneSource(b?.toString('utf8')||'',number);
  check(rec.official_url===t.url&&String(rec.final_url||'').replace(/\/+$/u,'')===t.url,'exact_official_selected_url_'+number);
  check(rec.status==='FETCHED'&&rec.parser_ok===true,'guarded_https_and_actual_parser_'+number);
  check(!!b&&b.length===rec.html_bytes&&sha(b)===rec.html_sha256,'raw_html_sha256_'+number);
  check(proof.exactSelectedTitle&&rec.selected_heading_identity_verified===true,'exact_selected_visible_h1_'+number);
  check(Object.entries(proof.direct).every(([k,v])=>Array.isArray(v)?v.every(Boolean):v),'visible_direct_spec_and_selected_flavors_'+number);
  check(norm(f.name)===norm(t.name)&&norm(f.roaster).includes('june'),'parser_selected_identity_'+number);
  check(norm(f.process)==='washed'&&norm(f.roast_level)==='medium','parser_direct_process_roast_'+number);
  check(t.notes.every(x=>norm(f.tasting_notes).includes(norm(x))),'parser_selected_exact_sensory_'+number);
  check(norm(f.variety).includes(norm(t.variety).split(' ')[0]),'parser_selected_variety_'+number);
  check(norm(f.origin).includes(number===169?'burundi':'peru'),'parser_selected_country_'+number);
  check(!f.decaffeination_method&&!f.release_label,'no_unpublished_decaf_or_release_'+number);
  check(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'existing_add_coffee_source_review_'+number);
  check((rec.seo_fallback_fields||[]).length===0,'no_seo_fallback_'+number);
  assessments.push({number,official_url:t.url,source:proof,fields:f,html_sha256:b?sha(b):null,
   source_provenance:'selected official product H1 and scoped direct labeled facts; URL slug not identity',
   limit:number===169?'Reused Guatemala slug cannot supply identity or location.':'No original live capture; current selected lot only.'});
 }
 const output={source_sha:e?.source_sha||null,case_numbers:[169,171],passed:failures.length===0,failures,
  assessments,focused_evidence_sha256:sourceBytes?sha(sourceBytes):null,full603_certified:false,
  original_corpus_modified:false,production_operations:0};
 writeFileSync(join(dir,'r153-june-afterproof.json'),JSON.stringify(output,null,2)+'\n');
 console.log('[DIC33 R153 JUNE SELECTED AFTERPROOF] '+JSON.stringify(output));
 if(failures.length)process.exitCode=1;
}
