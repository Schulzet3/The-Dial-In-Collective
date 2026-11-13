#!/usr/bin/env node
// Issue #33 R171: exact original603 #235 current selected Kona Espresso.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen235=Object.freeze({number:235,name:'100% Kona Espresso Roast Coffee 16oz',url:'https://mountainthunder.com/products/espresso16'});
export function selected235(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const cleaned=removeElements(scoped,['script','style','noscript','template','nav','aside','footer','header','select']);
 const paragraphs=[...cleaned.matchAll(/<p\b[^>]{0,400}>([\s\S]{0,2500}?)<\/p>/gi)].map(m=>norm(m[1].replace(/<[^>]{0,1000}>/g,' ')));
 const direct=paragraphs.filter(p=>p.includes('our espresso roast kona coffee is a dark roast')&&p.includes('noticeable chocolate overtones'));
 const belt=paragraphs.filter(p=>p.includes('our kona espresso roast coffee starts its journey')&&p.includes('kona coffee belt'));
 return {headings,identity:headings.length===1&&norm(headings[0])===norm(chosen235.name),direct_chocolate_dark:direct.length===1,direct_kona_belt:belt.length===1};
}
if(process.env.DIC_ISSUE33_R171_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,e,html;try{raw=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(raw.toString('utf8'))}catch{}
 try{html=readFileSync(join(dir,'case-235.html'))}catch{}
 const r=e?.records?.find(x=>x.number===235)||{},f=r.current_fields||{},current=selected235(html?.toString('utf8')||'');
 const failures=[],check=(v,k)=>{if(!v)failures.push(k)};
 check(JSON.stringify(e?.case_numbers)==='[235]'&&e?.records?.length===1,'one_exact_235');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_source_SHA');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_register');
 check(e?.original_corpus_modified===false&&e?.manual_certified===0&&e?.production_operations===0,'frozen_untouched');
 check(r.official_url===chosen235.url,'exact_original_URL');
 check(r.status==='FETCHED'&&r.parser_ok===true,'actual_guarded_source_parser');
 check(!!html&&sha(html)===r.html_sha256&&html.length===r.html_bytes,'raw_HTML_integrity');
 check(current.identity&&r.selected_heading_identity_verified===true,'selected_current_H1');
 check(current.direct_chocolate_dark&&current.direct_kona_belt,'own_selected_product_literal');
 check(norm(f.name)===norm(chosen235.name),'parser_selected_name');
 check(norm(f.roaster).includes('mountain thunder'),'parser_roaster');
 check(norm(f.roast_level)==='dark','selected_dark');
 check(norm(f.origin).includes('kona'),'selected_Kona');
 check(norm(f.tasting_notes).includes('chocolate'),'selected_own_chocolate_not_only_general_guide');
 check(!f.process&&!f.variety&&!f.elevation_m&&!f.producer&&!f.decaffeination_method&&!f.espresso_recipe,'unknowns_blank');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'Add_Coffee_and_review');
 check(!(r.seo_fallback_fields||[]).some(k=>['name','roast_level','origin','tasting_notes'].includes(k)),'no_old_SEO_fields');
 const out={case:235,source_sha:e?.source_sha,passed:failures.length===0,failures,source:current,fields:f,status:r.status||'NOT_FETCHED',
 html_sha256:html?sha(html):null,evidence_sha256:raw?sha(raw):null,html_bytes:html?.length||0,
 general_roast_guide_not_exact_selected_lot_proof:true,all603_manually_certified:false,production_operations:0};
 writeFileSync(join(dir,'r171-235-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R171 STRICT AFTERPROOF] '+JSON.stringify(out));
 if(failures.length)process.exitCode=1;
}
