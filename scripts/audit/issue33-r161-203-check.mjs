#!/usr/bin/env node
// Issue #33 R161: original frozen603 #203, selected current product only.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/&amp;|&/giu,' and ').replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen203=Object.freeze({
 number:203,name:'DECAF, Colombia 10oz',
 url:'https://lostsockroasters.com/products/madre-laura-decaf-10oz'
});
export function selected203Source(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const visible=norm(removeElements(selected,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,3000}>/gu,' '));
 const has=s=>visible.includes(norm(s));
 return {headings,exactSelectedTitle:headings.length===1&&norm(headings[0])===norm(chosen203.name),
 direct:{
  region:has('Region: Huila, Colombia'),producer:has('Producer: Multi producer Lot'),
  varieties:has('Varietal: Caturra, Castillo, Colombia'),
  green_washed:has('Process: Washed'),sugarcane_decaf:has('Decaffeination: Sugarcane'),
  medium_roast:has('medium roast'),milk_chocolate:has('milk chocolate'),
  caramel:has('caramel sweetness')
 },html_sha256:sha(Buffer.from(html||''))};
}
if(process.env.DIC_ISSUE33_R161_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,bytes,e;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'));}catch{}
 try{raw=readFileSync(join(dir,'case-203.html'));}catch{}
 const r=e?.records?.find(x=>x.number===203)||{},f=r.current_fields||{};
 const current=selected203Source(raw?.toString('utf8')||'');
 const failures=[],check=(yes,id)=>{if(!yes)failures.push(id);};
 check(JSON.stringify(e?.case_numbers)==='[203]'&&e?.records?.length===1,'one_original_selected_203');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original_register');
 check(e?.original_corpus_modified===false&&e?.manual_certified===0&&e?.production_operations===0,'no_corpus_or_production_changes');
 check(r.official_url===chosen203.url&&r.final_url===chosen203.url,'original_official_url');
 check(r.status==='FETCHED'&&r.parser_ok===true,'guarded_current_html_and_parser');
 check(!!raw&&sha(raw)===r.html_sha256&&raw.length===r.html_bytes,'source_html_hash_and_bytes');
 check(current.exactSelectedTitle&&r.selected_heading_identity_verified===true,'current_selected_h1_identity');
 for(const [id,present] of Object.entries(current.direct))check(present,'source_direct_'+id);
 check(norm(f.name)===norm(chosen203.name),'parser_selected_name');
 check(norm(f.roaster).includes('lost sock'),'parser_selected_roaster');
 check(norm(f.origin).includes('huila')&&norm(f.origin).includes('colombia'),'selected_region');
 check(norm(f.producer).includes('multi producer'),'selected_producer');
 check(norm(f.variety).includes('caturra')&&norm(f.variety).includes('castillo'),'selected_varieties');
 check(norm(f.process)==='washed','green_washed_distinct_from_decaf');
 check(norm(f.decaffeination_method)===norm('Sugar Process'),'sugar_process_decaf');
 check(norm(f.roast_level)==='medium','selected_medium_roast');
 check(norm(f.tasting_notes).includes('milk chocolate')&&norm(f.tasting_notes).includes('caramel'),'selected_sensory_prose');
 check(!f.espresso_recipe,'do_not_invent_recipe');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'add_coffee_and_source_review');
 check(!(r.seo_fallback_fields||[]).some(x=>['origin','process','decaffeination_method','tasting_notes','roast_level'].includes(x)),'no_unrelated_seo_fallback');
 const out={case_number:203,source_sha:e?.source_sha||null,passed:failures.length===0,failures,
  direct_current:current,parser_fields:f,source_html_sha256:raw?sha(raw):null,
  current_evidence_sha256:bytes?sha(bytes):null,source_html_bytes:raw?.length||0,
  qualification:'Only direct selected-product H1/labels and selected current flavor description qualify; Washed coffee process is distinct from Sugar Process decaffeination. Orange/tangerine are described as acidity examples, not automatically the chosen tasting list.',
  manual_all603_certified:false,production_operations:0};
 writeFileSync(join(dir,'r161-203-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R161 #203 CURRENT STRICT AFTERPROOF] '+JSON.stringify(out));
 if(failures.length)process.exitCode=1;
}
