#!/usr/bin/env node
// #33 R162: source-bound original603 #207, current selected product ONLY.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/&amp;|&/giu,' and ').replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen207=Object.freeze({number:207,name:'Special House Blend',
 url:'https://lowcountrycoffeeroasters.com/products/special-house-blend'});
export function selected207Source(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const visible=removeElements(scoped,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,3000}>/gu,' ')
  .replace(/&(?:nbsp|#160);/giu,' ').replace(/&amp;/giu,'&').replace(/\s+/gu,' ').trim();
 const ownH1=headings.length===1&&norm(headings[0])===norm(chosen207.name);
 return {headings,exactSelectedTitle:ownH1,html_sha256:sha(Buffer.from(html||'')),
  direct:{
   medium_roast:/\broast\s*:\s*medium\b/iu.test(visible),
   printed_nutmeg_flavor:/\bflavou?r\s*:\s*nutmeg\s*,\s*whole bean vanilla\s*,\s*creamy butter\b/iu.test(visible),
   mocha_narrative:/\brich mocha notes\b/iu.test(visible),
   roaster_location_not_bean_origin:/\blowcountry of south carolina\b/iu.test(visible)
  }};
}
if(process.env.DIC_ISSUE33_R162_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
 mkdirSync(dir,{recursive:true});let evidence,raw,eb;
 try{eb=readFileSync(join(dir,'focused-current-evidence.json'));evidence=JSON.parse(eb.toString('utf8'));}catch{}
 try{raw=readFileSync(join(dir,'case-207.html'));}catch{}
 const r=evidence?.records?.find(x=>x.number===207)||{},f=r.current_fields||{};
 const now=selected207Source(raw?.toString('utf8')||'');
 const failures=[],check=(ok,id)=>{if(!ok)failures.push(id);};
 check(JSON.stringify(evidence?.case_numbers)==='[207]'&&evidence?.records?.length===1,'one_original_selected_207');
 check(evidence?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(evidence?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_603_register');
 check(evidence?.original_corpus_modified===false&&evidence?.manual_certified===0&&evidence?.production_operations===0,'untouched_corpus_and_production');
 check(r.official_url===chosen207.url&&r.final_url===chosen207.url,'exact_original_official_url');
 check(r.status==='FETCHED'&&r.parser_ok===true,'guarded_official_html_and_parser');
 check(!!raw&&sha(raw)===r.html_sha256&&raw.length===r.html_bytes,'bound_html_sha256_and_bytes');
 check(now.exactSelectedTitle&&r.selected_heading_identity_verified===true,'current_purchasable_selected_h1');
 for(const [key,v] of Object.entries(now.direct))check(v,'direct_selected_'+key);
 check(norm(f.name)===norm(chosen207.name),'correct_selected_name');
 check(norm(f.roaster).includes('lowcountry'),'selected_roaster');
 check(norm(f.roast_level)==='medium','direct_medium_roast');
 check(!f.origin,'do_not_infer_bean_origin_from_local_roaster_business');
 check(!f.process&&!f.variety&&!f.decaffeination_method&&!f.producer,'no_unpublished_production_fields');
 check(norm(f.tasting_notes)!==norm('Almond, Chocolate'),'do_not_copy_archived_other_flavor_list');
 check(!(r.seo_fallback_fields||[]).some(x=>['origin','process','tasting_notes','roast_level'].includes(x)),'no_unqualified_seo_fallback');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'add_coffee_source_review');
 const printed=(r.source_facts||[]).filter(x=>/^(?:flavou?r|tasting notes?)$/iu.test(String(x.label||'').replace(/:$/u,'').trim()));
 const literal=printed.some(x=>norm(x.value).includes(norm('Nutmeg, Whole Bean Vanilla, Creamy Butter')));
 check(literal||!f.tasting_notes,'retain_literal_flavor_in_review_or_conservatively_blank');
 const out={case_number:207,source_sha:evidence?.source_sha||null,passed:failures.length===0,failures,
  selected_current:now,current_fields:f,conflicts:r.conflicts||[],printed_selected_flavor_facts:printed,
  source_html_bytes:raw?.length||0,source_html_sha256:raw?sha(raw):null,
  evidence_sha256:eb?sha(eb):null,all603_certified:false,production_operations:0,
  boundary:'The selected literal Flavor list and its separate rich-mocha narrative must not borrow archived Almond/Chocolate or the South Carolina roasting location as a green coffee origin; conflicting source claims remain reviewable.'};
 writeFileSync(join(dir,'r162-207-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R162 #207 STRICT AFTERPROOF] '+JSON.stringify(out));
 if(failures.length)process.exitCode=1;
}
