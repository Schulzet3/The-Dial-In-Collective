#!/usr/bin/env node
// Original frozen603 #163: source-bound current selected Ironclad EA decaf only.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/&(?:nbsp|#160);/giu,' ').replace(/&amp;/giu,' and ')
 .replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen163=Object.freeze({
 number:163,name:'Decaf Colombia Las Montanas',
 url:'https://ironcladcoffee.com/products/decaf-colombia-las-montanas',
 flavors:['Lemon','Cherry','Balanced']
});
export function selected163Source(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const visible=norm(removeElements(selected,
  ['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' '));
 const has=x=>visible.includes(norm(x));
 return {headings,exactH1:headings.length>0&&norm(headings[0])===norm(chosen163.name),
  direct:{
   decafEA:has('decaffeinated using Ethyl Acetate (EA)')&&has('sugarcane process decaf'),
   region:has('Department: Caldas')&&has('Country: Colombia'),
   altitude:has('Altitude: 1,600 meters above sea level'),
   variety:has('Variety: Typica, Castillo'),
   processing:has('Process: Washed'),
   roast:has('Roast Profile: Medium'),
   flavors:has('Flavor Notes: Lemon, Cherry, Balanced')
  },html_sha256:sha(Buffer.from(html||'')),visible_length:visible.length};
}
if(process.env.DIC_ISSUE33_R146_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes,raw,e;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'));}catch{}
 try{raw=readFileSync(join(dir,'case-163.html'));}catch{}
 const failures=[],check=(ok,id)=>{if(!ok)failures.push(id);};
 const rec=e?.records?.find(x=>x.number===163)||{},f=rec.current_fields||{};
 const direct=selected163Source(raw?.toString('utf8')||'');
 check(JSON.stringify(e?.case_numbers)==='[163]'&&e?.records?.length===1,'only_original163');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_source_SHA');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen603_CSV_unchanged');
 check(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'no_global_certification');
 check(rec.official_url===chosen163.url&&rec.final_url===chosen163.url,'original_exact_url_no_fallback');
 check(rec.status==='FETCHED'&&rec.parser_ok===true,'guarded_current_https_real_parser');
 check(!!raw&&sha(raw)===rec.html_sha256&&raw.length===rec.html_bytes,'official_html_raw_digest');
 check(direct.exactH1&&rec.selected_heading_identity_verified===true,'current_exact_selected_H1');
 check(Object.values(direct.direct).every(Boolean),'direct_current_selected_facts');
 check(norm(f.name)===norm(chosen163.name),'actual_parser_selected_identity');
 check(norm(f.origin).includes('caldas')&&norm(f.origin).includes('colombia'),'actual_parser_region_country');
 check(/\b1[,\s]?600\b/.test(String(f.elevation_m||'')),'actual_parser_elevation');
 check(norm(f.variety).includes('typica')&&norm(f.variety).includes('castillo'),'actual_parser_cultivars');
 check(norm(f.process)==='washed','washed_green_processing_separate_from_EA_decaf');
 check(norm(f.roast_level)==='medium','actual_parser_medium_roast');
 check(chosen163.flavors.every(x=>norm(f.tasting_notes).includes(norm(x))),'actual_parser_3_flavors');
 check(norm(f.decaffeination_method)==='sugar process','actual_parser_ethyl_acetate_sugar_decaf');
 check(!f.producer,'no_unpublished_named_producer');
 check(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'add_coffee_and_source_review');
 check(Array.isArray(rec.conflicts)&&rec.conflicts.length===0,'no_conflicts');
 check(Array.isArray(rec.seo_fallback_fields)&&rec.seo_fallback_fields.length===0,'no_SEO_fallback');
 const proof={case_number:163,source_sha:e?.source_sha||null,passed:failures.length===0,failures,
  direct:direct.direct,selected_h1:direct.headings,html_sha256:rec.html_sha256||null,
  html_bytes:rec.html_bytes||null,evidence_sha256:bytes?sha(bytes):null,
  actual_parser_fields:f,full603_certified:false,production_operations:0};
 writeFileSync(join(dir,'r146-163-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[Issue33 R146 #163] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}
