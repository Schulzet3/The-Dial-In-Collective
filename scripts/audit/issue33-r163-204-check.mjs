#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen204=Object.freeze({number:204,name:'YABITU KOBA NATURAL, Ethiopia',url:'https://lostsockroasters.com/products/yabitu-koba-ethiopia-copy'});
export function source204(html){
 const markup=productMarkup(String(html||'')),h1=selectedProductHeadings(markup);
 const visible=norm(removeElements(markup,['script','style','noscript','template','nav','aside','footer','header','select']).replace(/<[^>]{0,3000}>/gu,' '));
 const has=x=>visible.includes(norm(x));
 return {h1,identity:h1.length===1&&norm(h1[0])===norm(chosen204.name),
  direct:{region:has('Region: Koba, Uraga, Guji'),producer:has('Producer: Small producers from Uraga'),
  elevation:has('Altitude: 2300 meters'),variety:has('Varietal: Heirloom'),
  natural:has('This lot is processed as a natural'),
  historical_washed:has('Last year, we released Yabitu Koba as a washed coffee'),
  fruit_punch:has('fruit punch'),lime:has('lime'),kiwi:has('kiwi')}};
}
if(process.env.DIC_ISSUE33_R163_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes,html,e;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString());}catch{}
 try{html=readFileSync(join(dir,'case-204.html'));}catch{}
 const r=e?.records?.find(x=>x.number===204)||{},f=r.current_fields||{},current=source204(html?.toString()||'');
 const failures=[],assert=(v,id)=>{if(!v)failures.push(id);};
 assert(JSON.stringify(e?.case_numbers)==='[204]'&&e?.records?.length===1,'one_exact_original_204');
 assert(e?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 assert(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original_register');
 assert(e?.original_corpus_modified===false&&e?.manual_certified===0&&e?.production_operations===0,'no_data_operations');
 assert(r.official_url===chosen204.url,'exact_original_official_url');
 assert(r.status==='FETCHED'&&r.parser_ok===true,'guarded_source_and_actual_parser');
 assert(!!html&&sha(html)===r.html_sha256&&html.length===r.html_bytes,'html_hash');
 assert(current.identity&&r.selected_heading_identity_verified===true,'exact_current_selected_h1');
 for(const [k,v] of Object.entries(current.direct))assert(v,'direct_'+k);
 assert(norm(f.name)===norm(chosen204.name),'parser_identity');
 assert(norm(f.roaster).includes('lost sock'),'roaster');
 assert(norm(f.origin).includes('guji')&&norm(f.origin).includes('ethiopia'),'origin');
 assert(norm(f.producer).includes('small producers'),'producer');
 assert(norm(f.variety).includes('heirloom'),'variety');
 assert(norm(f.process)==='natural','this_natural_not_prior_year_washed');
 assert(['fruit punch','lime','kiwi'].every(x=>norm(f.tasting_notes).includes(x)),'own_notes');
 assert(!f.roast_level&&!f.decaffeination_method&&!f.espresso_recipe,'unpublished_stays_blank');
 assert(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'selected_add_and_review');
 assert(!(r.seo_fallback_fields||[]).some(x=>['origin','producer','process','tasting_notes'].includes(x)),'no_seo_borrow');
 const out={number:204,source_sha:e?.source_sha,passed:!failures.length,failures,current,parser:f,html_sha256:html?sha(html):null,evidence_sha256:bytes?sha(bytes):null,bytes:html?.length||0,
 historical_washed_is_not_current_natural:true,all_603_manual_certified:false,production_operations:0};
 writeFileSync(join(dir,'r163-204-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R163 STRICT AFTERPROOF] '+JSON.stringify(out));
 if(failures.length)process.exitCode=1;
}
