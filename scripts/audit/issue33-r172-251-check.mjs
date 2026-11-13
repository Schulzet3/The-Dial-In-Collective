#!/usr/bin/env node
// Exact original603 #251: conditional dark-roast preference is NOT a selected roast specification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim().replace(/\\s+/gu,' ');
export const chosen251=Object.freeze({number:251,name:'Decaf Espresso Blend',url:'https://orleanscoffee.com/product/espresso-decaf-blend'});
export function source251(html){
 const chosen=productMarkup(String(html||''));
 const headings=selectedProductHeadings(chosen);
 const visible=removeElements(chosen,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<[^>]{0,3000}>/gu,' ').replace(/&(?:nbsp|amp);/giu,' ');
 const body=norm(visible);
 return {headings,identity:headings.length===1&&norm(headings[0])===norm(chosen251.name),
  direct_notes:body.includes('cocoa toasted nuts and a touch of earthiness'),
  blend_origins:body.includes('central america south america and indonesia'),
  conditional_dark_context:body.includes('if you like a dark roasted coffee'),
  espresso_description:body.includes('this is the decaffeinated version of our best selling espresso')};
}
if(process.env.DIC_ISSUE33_R172_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,e,html;try{raw=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(raw.toString())}catch{}
 try{html=readFileSync(join(dir,'case-251.html'))}catch{}
 const r=e?.records?.find(x=>x.number===251)||{},f=r.current_fields||{},sel=source251(html?.toString('utf8')||'');
 const failures=[],check=(ok,why)=>{if(!ok)failures.push(why)};
 check(JSON.stringify(e?.case_numbers)==='[251]'&&e?.records?.length===1,'exact_one_original251');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_source_SHA');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_bytes');
 check(e?.original_corpus_modified===false&&e?.manual_certified===0&&e?.production_operations===0,'frozen_untouched');
 check(r.official_url===chosen251.url,'exact_original_url');
 check(r.status==='FETCHED'&&r.parser_ok===true,'guarded_official_parser');
 check(!!html&&sha(html)===r.html_sha256&&html.length===r.html_bytes,'official_raw_html_hash');
 check(sel.identity&&r.selected_heading_identity_verified===true,'current_selected_identity');
 check(sel.direct_notes&&sel.blend_origins&&sel.conditional_dark_context&&sel.espresso_description,'selected_direct_source');
 check(norm(f.name)===norm(chosen251.name),'parser_current_name');
 check(norm(f.roaster).includes('orleans'),'roaster');
 check(['cocoa','toasted nuts','earthiness'].every(v=>norm(f.tasting_notes).includes(v)),'own_sensory_notes');
 check(['central america','south america','indonesia'].every(v=>norm(f.origin).includes(v)),'selected_blend_origins');
 check(!f.roast_level,'conditional_dark_not_canonical_roast');
 check(!f.decaffeination_method&&!f.process&&!f.espresso_recipe,'unpublished_fields_blank');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'Add_Coffee_and_source_review');
 check(!(r.seo_fallback_fields||[]).some(x=>['name','origin','tasting_notes','roast_level'].includes(x)),'not_SEO_fallback');
 const out={case:251,source_sha:e?.source_sha||null,passed:failures.length===0,failures,selected:sel,
  fields:f,html_sha256:html?sha(html):null,html_bytes:html?.length||0,
  evidence_sha256:raw?sha(raw):null,old_oracle_dark_not_current_authority:true,
  full_original603_certification:false,production_operations:0};
 writeFileSync(join(dir,'r172-251-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R172 #251 STRICT AFTERPROOF] '+JSON.stringify(out));
 if(failures.length)process.exitCode=1;
}
