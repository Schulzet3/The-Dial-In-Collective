#!/usr/bin/env node
// Issue #33 R149, original frozen case 165: exact current chosen product.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const norm=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/&(?:nbsp|#160);/giu,' ').replace(/&amp;/giu,' and ')
 .replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen165=Object.freeze({
 number:165,name:'Honduras San Lazaro',
 url:'https://ironcladcoffee.com/products/honduras-san-lazaro',
 flavors:['Caramel','Toasted Almond','Easy-Drinking']
});
export function selected165Source(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const visible=norm(removeElements(selected,
  ['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' '));
 const has=value=>visible.includes(norm(value));
 return {
  headings,exactH1:headings.length>0&&norm(headings[0])===norm(chosen165.name),
  direct:{
   geography:has('Finca San Lazaro sits high above the town of San Marcos de Colon'),
   reserve:has('within La Botija Biological Reserve'),
   altitude:has('approximately 1,600 meters above sea level'),
   farm:has('San Lazaro farm serves others'),
   ministry:has('Mission Lazarus'),
   temporal:has('Here\'s what you can expect from this coffee in 2023/24'),
   flavors:has('Flavor Notes: Caramel, Toasted Almond, Easy-Drinking')
  },raw_selected_length:selected.length,html_sha256:sha(Buffer.from(html||''))
 };
}
if(process.env.DIC_ISSUE33_R149_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
 mkdirSync(dir,{recursive:true});
 let bytes,raw,e;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'));}catch{}
 try{raw=readFileSync(join(dir,'case-165.html'));}catch{}
 const failures=[],check=(ok,id)=>{if(!ok)failures.push(id);};
 const rec=e?.records?.find(x=>x.number===165)||{},f=rec.current_fields||{};
 const direct=selected165Source(raw?.toString('utf8')||'');
 check(JSON.stringify(e?.case_numbers)==='[165]'&&e?.records?.length===1,'single_original165');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603');
 check(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'bounded_not_global');
 check(rec.official_url===chosen165.url&&rec.final_url===chosen165.url,'same_exact_selected_url');
 check(rec.status==='FETCHED'&&rec.parser_ok===true,'guarded_public_https_current_parser');
 check(!!raw&&sha(raw)===rec.html_sha256&&raw.length===rec.html_bytes,'raw_html_sha_bytes');
 check(direct.exactH1&&rec.selected_heading_identity_verified===true,'selected_h1_identity');
 check(Object.values(direct.direct).every(Boolean),'current_chosen_product_direct_facts');
 check(norm(f.name)===norm(chosen165.name),'parsed_chosen_name');
 check(norm(f.roaster).includes('ironclad'),'parsed_roaster');
 check(norm(f.origin).includes('honduras'),'parsed_selected_country');
 check(norm(f.producer).includes('san lazaro'),'parsed_farm_producer_not_person');
 check(/1[, ]?600/.test(String(f.elevation_m||'')),'parsed_altitude_1600');
 check(chosen165.flavors.every(x=>norm(f.tasting_notes).includes(norm(x))),'selected_labeled_flavor_notes');
 check(!f.roast_level&&!f.decaffeination_method&&!f.process,'no_unsupported_roast_decaf_process');
 check(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'add_coffee_and_review_ui');
 check(Array.isArray(rec.conflicts)&&rec.conflicts.length===0,'no_current_conflict');
 check(Array.isArray(rec.seo_fallback_fields)&&rec.seo_fallback_fields.length===0,'no_seo_fallback');
 const proof={case_number:165,source_sha:e?.source_sha||null,
  passed:failures.length===0,failures,
  direct:direct.direct,headings:direct.headings,html_sha256:rec.html_sha256||null,
  html_bytes:rec.html_bytes||null,evidence_sha256:bytes?sha(bytes):null,
  actual_parser_fields:f,
  limited_temporal_evidence:'Own selected page references 2023/24. This is NOT independently certified 2026 harvest/lot or roast/process.',
  full603_certified:false,production_operations:0};
 writeFileSync(join(dir,'r149-165-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R149 #165] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}