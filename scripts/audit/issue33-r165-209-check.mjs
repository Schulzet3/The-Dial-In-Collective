#!/usr/bin/env node
// Issue #33 R165, immutable original603 #209; strict current selected official source afterproof.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const norm=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen209=Object.freeze({number:209,name:'Lazy Day Decaf',url:'https://manuscriptcoffee.com/products/lazy-day-decaf'});
export function source209(html){
 const selected=productMarkup(String(html||'')),h1=selectedProductHeadings(selected);
 const visible=norm(removeElements(selected,['script','style','noscript','template','nav','aside','footer','header','select']).replace(/<[^>]{0,3000}>/gu,' '));
 const has=value=>visible.includes(norm(value));
 return {h1,identity:h1.length===1&&norm(h1[0])===norm(chosen209.name),direct:{
  notes:has('Cinnamon, Raisin, Cherry'),
  ea:has('decaffeinated using the Ethyl Acetate process'),
  region:has('Region Huila'),
  country:has('Origin Colombia'),
  method_caption:has('Process EA Decaf')
 }};
}
if(process.env.DIC_ISSUE33_R165_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,e,html;try{raw=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(raw.toString());}catch{}
 try{html=readFileSync(join(dir,'case-209.html'));}catch{}
 const r=e?.records?.find(x=>x.number===209)||{},f=r.current_fields||{},current=source209(html?.toString()||'');
 const failures=[],assert=(ok,id)=>{if(!ok)failures.push(id);};
 assert(JSON.stringify(e?.case_numbers)==='[209]'&&e?.records?.length===1,'one_exact_original209');
 assert(e?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 assert(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original_register');
 assert(e?.original_corpus_modified===false&&e?.manual_certified===0&&e?.production_operations===0,'no_data_operations');
 assert(r.official_url===chosen209.url,'exact_original_official_url');
 assert(r.status==='FETCHED'&&r.parser_ok===true,'guarded_source_actual_parser');
 assert(!!html&&sha(html)===r.html_sha256&&html.length===r.html_bytes,'raw_html_source_hash');
 assert(current.identity&&r.selected_heading_identity_verified===true,'selected_H1_not_SEO_related');
 for(const [name,ok] of Object.entries(current.direct))assert(ok,'direct_'+name);
 assert(norm(f.name)===norm(chosen209.name),'chosen_coffee_identity');
 assert(norm(f.roaster).includes('manuscript'),'chosen_roaster');
 assert(norm(f.origin).includes('huila')&&norm(f.origin).includes('colombia'),'chosen_Huila_origin');
 assert(norm(f.roast_level)==='medium','chosen_medium_roast');
 assert(['cinnamon','raisin','cherry'].every(x=>norm(f.tasting_notes).includes(x)),'own_selected_notes');
 // Owner-locked three-method taxonomy intentionally maps EA to Sugar Process;
 // it is DECAFFEINATION only, never proof of green-bean washed/natural/honey processing.
 assert(f.decaffeination_method==='Sugar Process','selected_EA_deaf_method');
 assert(!f.process,'unpublished_green_process_stays_blank');
 assert(!f.producer&&!f.variety&&!f.elevation_m&&!f.espresso_recipe,'unpublished_fields_blank');
 assert(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'add_coffee_and_review');
 assert(!(r.seo_fallback_fields||[]).some(x=>['origin','process','tasting_notes','roast_level','decaffeination_method'].includes(x)),'no_SEO_field_borrow');
 const out={number:209,source_sha:e?.source_sha,passed:!failures.length,failures,current,parser:f,
  html_sha256:html?sha(html):null,evidence_sha256:raw?sha(raw):null,bytes:html?.length||0,
  all_603_manually_certified:false,production_operations:0};
 writeFileSync(join(dir,'r165-209-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R165 STRICT AFTERPROOF] '+JSON.stringify(out));
 if(failures.length)process.exitCode=1;
}
