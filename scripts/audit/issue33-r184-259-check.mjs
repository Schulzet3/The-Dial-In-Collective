#!/usr/bin/env node
// Original603 case 259: selected public source and real parser diagnostic, not corpus certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const fold=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').replace(/\s+/gu,' ').trim();
export const original259=Object.freeze({number:259,name:'Brasil Carmo de Minas',url:'https://preludecoffeeroasters.com/products/brasil'});
export function selected259(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 // The merchant uses additional H1 section headings, not additional coffee identities.
 const productHeadings=headings.filter(x=>!/^(?:about the producer|what you(?:'|’)?ll find in the cup):?$/iu.test(String(x).trim()));
 const body=fold(removeElements(scoped,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<[^>]{0,3000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' '));
 return {headings,identity:productHeadings.length===1&&fold(productHeadings[0])===fold(original259.name),
   coop:body.includes('produced by the cocarive cooperative'),
   region:body.includes('mantiqueira de minas'),
   notes:['cinnamon bread','milk chocolate','macadamia nuts'].every(x=>body.includes(x)),
   medium_body:body.includes('medium body'),regional_award:body.includes('cup of excellence')};
}
if(process.env.DIC_ISSUE33_R184_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 const errors=[],check=(yes,name)=>{if(!yes)errors.push(name)};
 let bytes,record={},summary={};
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));summary=JSON.parse(bytes.toString('utf8'));record=(summary.records||[]).find(x=>x.number===259)||{}}catch(e){errors.push('missing_current_evidence:'+e.message)}
 let html;
 try{html=readFileSync(join(dir,'case-259.html'))}catch(e){errors.push('missing_raw_official_html:'+e.message)}
 const source=selected259(html?.toString('utf8')||''),f=record.current_fields||{};
 const parsed=html?extractPublicCoffeeFacts(html.toString('utf8'),{source_url:original259.url}):{};
 check(JSON.stringify(summary.case_numbers)==='[259]'&&summary.records?.length===1,'exact_single_original259');
 check(summary.source_sha===process.env.GITHUB_SHA,'checked_out_exact_git_sha');
 check(summary.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_immutable_source_register');
 check(summary.original_corpus_modified===false&&summary.manual_certified===0&&summary.production_operations===0,'no_frozen_or_provider_changes');
 check(record.official_url===original259.url&&record.status==='FETCHED'&&record.parser_ok===true,'actual_guarded_selected_official_parser');
 check(!!html&&record.html_sha256===sha(html)&&record.html_bytes===html.length,'raw_html_exact_sha256_and_bytes');
 check(source.identity&&record.selected_heading_identity_verified===true,'current_selected_h1_identity');
 check(source.coop&&source.region&&source.notes&&source.medium_body,'direct_current_product_evidence');
 check(fold(f.name)===fold(original259.name)&&fold(f.roaster).includes('prelude'),'selected_identity_and_roaster');
 check(source.notes&&['cinnamon bread','milk chocolate','macadamia'].every(x=>fold(f.tasting_notes).includes(x)),'source_published_flavors_parsed');
 check(!f.roast_level,'medium_body_must_not_be_medium_roast');
 check(!f.process,'regional_drying_weather_not_selected_processing');
 check(!f.decaffeination_method&&!f.espresso_recipe,'no_invented_decaf_or_recipe');
 check(!record.seo_fallback_fields?.some(x=>['name','tasting_notes','roast_level','process'].includes(x)),'no_seo_for_selected_evidence');
 check(record.add_coffee_ui_rendered===true&&record.source_review_rendered===true,'manual_add_coffee_and_source_review');
 const report={case:259,source_sha:summary.source_sha||null,passed:errors.length===0,errors,selected:source,
  fields:f,source_facts:(parsed.source_facts||[]).filter(x=>['producer','origin','tasting_notes','roast_level','process'].includes(x.field)).slice(0,35),
  conflicts:record.conflicts||[],seo_fallback_fields:record.seo_fallback_fields||[],
  raw_sha256:html?sha(html):null,raw_bytes:html?.length||0,evidence_sha256:bytes?sha(bytes):null,
  individual_certification:errors.length===0,whole603_certified:false,production_operations:0};
 writeFileSync(join(dir,'r184-259-afterproof.json'),JSON.stringify(report,null,2)+'\n');
 console.log('[DIC33 R184 #259] '+JSON.stringify(report).slice(0,18000));
 if(errors.length)throw Error('R184 current selected parser/source failures: '+errors.join(', '));
}
