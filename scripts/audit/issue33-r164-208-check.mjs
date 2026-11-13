#!/usr/bin/env node
// Issue #33 R164: independently selected current source, original603 #208.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen208=Object.freeze({number:208,name:'Costa Rica Guanacaste',url:'https://manuscriptcoffee.com/products/costa-rica-guanacaste'});
export function source208(html){
 const markup=productMarkup(String(html||'')),h1=selectedProductHeadings(markup);
 const visible=norm(removeElements(markup,['script','style','noscript','template','nav','aside','footer','header','select']).replace(/<[^>]{0,3000}>/gu,' '));
 const has=x=>visible.includes(norm(x));
 return {h1,identity:h1.length===1&&norm(h1[0])===norm(chosen208.name),
  direct:{notes:has('Almond, Orange, Toffee'),washed:has('washed coffee')||has('Process Washed'),
   tarrazu:has('Tarrazu valley')||has('Region Tarrazu'),elevation:has('1500 m')}};
}
if(process.env.DIC_ISSUE33_R164_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,e,html;try{raw=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(raw.toString());}catch{}
 try{html=readFileSync(join(dir,'case-208.html'));}catch{}
 const r=e?.records?.find(x=>x.number===208)||{},f=r.current_fields||{},current=source208(html?.toString()||'');
 const failures=[],assert=(v,id)=>{if(!v)failures.push(id);};
 assert(JSON.stringify(e?.case_numbers)==='[208]'&&e?.records?.length===1,'one_exact_original_208');
 assert(e?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 assert(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original_register');
 assert(e?.original_corpus_modified===false&&e?.manual_certified===0&&e?.production_operations===0,'no_data_operations');
 assert(r.official_url===chosen208.url,'exact_original_official_url');
 assert(r.status==='FETCHED'&&r.parser_ok===true,'guarded_current_source_and_actual_parser');
 assert(!!html&&sha(html)===r.html_sha256&&html.length===r.html_bytes,'html_source_hash');
 assert(current.identity&&r.selected_heading_identity_verified===true,'current_selected_heading_not_SEO_or_recommendation');
 for(const [k,v] of Object.entries(current.direct))assert(v,'direct_'+k);
 assert(norm(f.name)===norm(chosen208.name),'chosen_coffee_identity');
 assert(norm(f.roaster).includes('manuscript'),'official_roaster');
 assert(norm(f.origin).includes('tarrazu')&&norm(f.origin).includes('costa rica'),'current_selected_origin');
 assert(norm(f.process)==='washed','own_process');
 assert(norm(f.roast_level)==='medium','selected_roast');
 assert(norm(f.elevation_m).includes('1500'),'selected_elevation');
 assert(['almond','orange','toffee'].every(x=>norm(f.tasting_notes).includes(x)),'own_selected_notes');
 assert(!f.variety&&!f.producer&&!f.decaffeination_method&&!f.espresso_recipe,'unpublished_stays_blank');
 assert(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'add_coffee_and_review');
 assert(!(r.seo_fallback_fields||[]).some(x=>['origin','process','tasting_notes','roast_level'].includes(x)),'no_SEO_field_borrow');
 const out={number:208,source_sha:e?.source_sha,passed:!failures.length,failures,current,parser:f,
  html_sha256:html?sha(html):null,evidence_sha256:raw?sha(raw):null,bytes:html?.length||0,
  all_603_manually_certified:false,production_operations:0};
 writeFileSync(join(dir,'r164-208-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R164 STRICT AFTERPROOF] '+JSON.stringify(out));
 if(failures.length)process.exitCode=1;
}
