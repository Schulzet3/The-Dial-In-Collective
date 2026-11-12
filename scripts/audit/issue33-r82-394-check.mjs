#!/usr/bin/env node
// Original603 #394 exact current official product and real extractor, fail closed.
// This is a bounded source/behavior acceptance, NOT universal corpus certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha = data => createHash('sha256').update(data).digest('hex');
const fold = value => String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
const sourceText=html=>String(html||'')
 .replace(/<!--[\s\S]*?-->/gu,' ')
 .replace(/<(script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
 .replace(/<[^>]{0,2000}>/gu,' ').replace(/&(?:nbsp|#160);/giu,' ')
 .replace(/&amp;/giu,'&').replace(/\u00a0/gu,' ').replace(/\s+/gu,' ').trim();
export function selected394(markup,headings){
 const txt=sourceText(markup);
 return {
  selectedIdentity:Array.isArray(headings)&&headings.length===1&&fold(headings[0])==='kamwangi kenya',
  ownNotes:/Tasting Notes:\s*Apricot,\s*Blackberry,\s*Toffee\b/iu.test(txt),
  ownCountry:/\bOrigin:\s*Kenya\b/iu.test(txt),
  ownRegion:/\bRegion:\s*Kirinyaga\b/iu.test(txt),
  ownVarieties:/\bVariety:\s*SL28,\s*SL34,\s*Ruiru 11\b/iu.test(txt),
  ownElevation:/\bAltitude:\s*1600-1800\s*MASL\b/iu.test(txt),
  ownProcessing:/\bProcessing:\s*Washed\b/iu.test(txt),
  selectedStation:/Kamwangi is one of three washing stations managed by the New Ngariama Farmers['’]?\s*Cooperative Society/iu.test(txt),
  namedMinorCultivar:/minor inputs from Batian and Ruiru 11\b/iu.test(txt)
 };
}
if(process.env.DIC_ISSUE33_R82_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
 mkdirSync(dir,{recursive:true});
 const failures=[],check=(v,s)=>{if(!v)failures.push(s)};
 let report=null,rawReport=null,raw=null;
 try{rawReport=readFileSync(join(dir,'focused-current-evidence.json'));report=JSON.parse(rawReport.toString('utf8'))}catch{}
 try{raw=readFileSync(join(dir,'case-394.html'))}catch{}
 const record=report?.records?.find(r=>r.number===394)||{};
 const fields=record.current_fields||{};
 const selected=productMarkup(raw?.toString('utf8')||'');
 const headings=selectedProductHeadings(selected);
 const sourceFacts=selected394(selected,headings);
 let finalUrl;try{finalUrl=new URL(record.final_url)}catch{}
 check(JSON.stringify(report?.case_numbers)==='[394]'&&report?.records?.length===1,'original_subset_394');
 check(report?.source_sha===process.env.GITHUB_SHA,'exact_workflow_sha');
 check(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603');
 check(report?.manual_certified===0&&report?.production_operations===0&&report?.original_corpus_modified===false,'scope_preservation');
 check(record.archived_coffee==='Kamwangi - Kenya'&&record.official_url==='https://vestacoffee.com/products/kamwangi-kenya','original_selected_binding');
 check(finalUrl?.protocol==='https:'&&['vestacoffee.com','www.vestacoffee.com'].includes(finalUrl.hostname)&&
 finalUrl.pathname.replace(/\/$/,'')==='/products/kamwangi-kenya'&&!finalUrl.search&&!finalUrl.hash,'same_selected_product_path');
 check(record.status==='FETCHED'&&record.parser_ok===true&&record.selected_heading_identity_verified===true,'current_selected_parser');
 check(!!raw&&record.html_bytes===raw.length&&record.html_sha256===sha(raw),'raw_official_html_sha256');
 for(const [name,value]of Object.entries(sourceFacts))check(value,'literal_selected_394_'+name);
 check(fold(fields.name)==='kamwangi kenya','parser_selected_name');
 check(/vesta/i.test(fields.roaster||''),'own_roaster');
 check(['apricot','blackberry','toffee'].every(x=>(fields.tasting_notes||'').toLowerCase().includes(x)),'selected_taste_all_three');
 check(/kirinyaga/i.test(fields.origin||'')&&/kenya/i.test(fields.origin||''),'selected_region_country');
 check(/washed/i.test(fields.process||''),'selected_washed_processing');
 check(/1600\s*[-–]\s*1800/i.test(fields.elevation_m||''),'selected_elevation_interval');
 check(['SL28','SL34','Ruiru 11'].every(x=>(fields.variety||'').toLowerCase().includes(x.toLowerCase())),'selected_core_cultivars');
 check(/Kamwangi/i.test(fields.producer||'')&&/Ngariama/i.test(fields.producer||''),'correct_cooperative_station_attribution');
 check(!fields.roast_level,'no_inferred_roast');
 check(!/Mamush Kabtimer|Elías.*Bayter|Gaturiri/i.test(JSON.stringify(fields)),'exclude_other_coffee_identity');
 check(record.add_coffee_ui_rendered===true&&record.source_review_rendered===true,'add_coffee_source_review');
 check(!(record.conflicts||[]).some(x=>/name|origin|process|roast|tasting|producer|variety/i.test(String(x))),'no_selected_field_conflicts');
 const verdict={source_sha:report?.source_sha,report_sha256:rawReport?sha(rawReport):null,
  raw_html_sha256:raw?sha(raw):null,original603_number:394,sourceFacts,headings,
  fields,conflicts:record.conflicts||[],manual_certified:0,production_operations:0,
  passed:failures.length===0,failures};
 writeFileSync(join(dir,'r82-394-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
 console.log('[ISSUE33 R82 VERIFIED ONLY IF TRUE] '+JSON.stringify(verdict));
 if(failures.length)process.exitCode=1;
}
