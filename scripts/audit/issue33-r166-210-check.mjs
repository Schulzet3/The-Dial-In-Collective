#!/usr/bin/env node
// Issue #33 R166: exact original603 #210 Brazil Paubrasil current selected page.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen210=Object.freeze({number:210,name:'Brazil Paubrasil',url:'https://manuscriptcoffee.com/products/paubrasil'});
export function source210(html){
 const selected=productMarkup(String(html||''));
 const h1=selectedProductHeadings(selected);
 const visible=norm(removeElements(selected,['script','style','noscript','template','nav','aside','footer','header','select']).replace(/<[^>]{0,3000}>/gu,' '));
 const has=x=>visible.includes(norm(x));
 return {h1,identity:h1.length===1&&norm(h1[0])===norm(chosen210.name),
  direct:{notes:has('Cocoa, Roasted Pecan, Peanut Butter'),
   country:has('Origin Brazil')||has('Cerrado region'),
   region:has('Cerrado Mineiro'),variety:has('Catuai'),
   process:has('Process Natural')||has('naturally processed'),
   elevation:has('1100 m'),medium:has('Medium'),
   association:has('nine cooperatives or six associations affiliated with the Cerrado Coffee Growers Federation')}};
}
if(process.env.DIC_ISSUE33_R166_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,e,html;try{raw=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(raw.toString());}catch{}
 try{html=readFileSync(join(dir,'case-210.html'));}catch{}
 const r=e?.records?.find(x=>x.number===210)||{},f=r.current_fields||{},current=source210(html?.toString()||'');
 const failures=[],check=(v,id)=>{if(!v)failures.push(id);};
 check(JSON.stringify(e?.case_numbers)==='[210]'&&e?.records?.length===1,'one_exact_original_210');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original_register');
 check(e?.original_corpus_modified===false&&e?.manual_certified===0&&e?.production_operations===0,'no_data_operations');
 check(r.official_url===chosen210.url,'exact_original_official_url');
 check(r.status==='FETCHED'&&r.parser_ok===true,'guarded_current_source_and_actual_parser');
 check(!!html&&sha(html)===r.html_sha256&&html.length===r.html_bytes,'html_source_hash');
 check(current.identity&&r.selected_heading_identity_verified===true,'current_selected_heading_not_SEO');
 for(const [k,v] of Object.entries(current.direct))check(v,'direct_'+k);
 check(norm(f.name)===norm(chosen210.name),'chosen_coffee_identity');
 check(norm(f.roaster).includes('manuscript'),'official_roaster');
 check(norm(f.origin).includes('brazil')&&norm(f.origin).includes('cerrado'),'own_origin_cerrado_brazil');
 check(norm(f.roast_level)==='medium','own_medium_roast');
 check(norm(f.process)==='natural','own_natural_processing');
 check(norm(f.variety).includes('catuai'),'own_catuai_variety');
 check(norm(f.elevation_m).includes('1100'),'own_elevation_1100m');
 check(['cocoa','roasted pecan','peanut butter'].every(x=>norm(f.tasting_notes).includes(x)),'own_selected_notes');
 check(!f.producer||/cooperativ|association|growers federation/i.test(String(f.producer)),'not_a_fabricated_named_producer');
 check(!f.decaffeination_method&&!f.espresso_recipe,'unpublished_stays_blank');
 check((r.conflicts||[]).length===0,'no_selected_conflict');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'add_coffee_and_review');
 check(!(r.seo_fallback_fields||[]).some(x=>['origin','process','tasting_notes','roast_level','variety','elevation_m'].includes(x)),'no_SEO_field_borrow');
 const out={number:210,source_sha:e?.source_sha,passed:!failures.length,failures,current,parser:f,
  html_sha256:html?sha(html):null,evidence_sha256:raw?sha(raw):null,bytes:html?.length||0,
  all_603_manually_certified:false,production_operations:0};
 writeFileSync(join(dir,'r166-210-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R166 STRICT AFTERPROOF] '+JSON.stringify(out));
 if(failures.length)process.exitCode=1;
}
