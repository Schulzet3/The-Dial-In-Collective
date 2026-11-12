#!/usr/bin/env node
// Issue #33 R148: ORIGINAL #164, exact selected official product, development only.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/&(?:nbsp|#160);/giu,' ').replace(/&amp;/giu,' and ')
 .replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen164=Object.freeze({
 number:164, name:'Ethiopia Worka Sakaro Anaerobic Natural',
 url:'https://ironcladcoffee.com/products/ethiopia-worka-sakaro-anaerobic-natural',
 flavors:['Strawberry','Jasmine','Exquisite']
});
export function selected164Source(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const visible=norm(removeElements(selected,
  ['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' '));
 const has=x=>visible.includes(norm(x));
 return {headings,exactH1:headings.length>0&&norm(headings[0])===norm(chosen164.name),
  direct:{
   geography:has('Worka Sakaro is a small area in the Gedeb district close to Yirgacheffe'),
   altitude:has('Elevation: 2,000 - 2,200 Meters Above Sea Level'),
   variety:has('Arabica Varieties: Heirloom'),
   processing:has('Milling Process: Anaerobic "Wine Process" Natural'),
   flavors:has('Flavor Notes: Strawberry, Jasmine, Exquisite'),
   collective:has('Approximately 300 small farm holders deliver cherry yearly to the local mill')
  },
  raw_selected_length:selected.length,html_sha256:sha(Buffer.from(html||''))};
}
if(process.env.DIC_ISSUE33_R148_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes,raw,e;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'));}catch{}
 try{raw=readFileSync(join(dir,'case-164.html'));}catch{}
 const failures=[],check=(ok,id)=>{if(!ok)failures.push(id);};
 const rec=e?.records?.find(x=>x.number===164)||{},f=rec.current_fields||{};
 const direct=selected164Source(raw?.toString('utf8')||'');
 check(JSON.stringify(e?.case_numbers)==='[164]'&&e?.records?.length===1,'single_original164');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603');
 check(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'bounded_review_not_global_pass');
 check(rec.official_url===chosen164.url&&rec.final_url===chosen164.url,'unchanged_original_selected_url');
 check(rec.status==='FETCHED'&&rec.parser_ok===true,'guarded_live_https_actual_parser');
 check(!!raw&&sha(raw)===rec.html_sha256&&raw.length===rec.html_bytes,'raw_html_sha_and_bytes');
 check(direct.exactH1&&rec.selected_heading_identity_verified===true,'exact_selected_current_h1');
 check(Object.values(direct.direct).every(Boolean),'direct_selected_current_facts');
 check(norm(f.name)===norm(chosen164.name),'parsed_chosen_identity');
 check(norm(f.roaster).includes('ironclad'),'actual_roaster');
 check(norm(f.origin).includes('ethiopia'),'actual_origin_country');
 check(/\b2[,\s]?000\b/.test(String(f.elevation_m||''))&&/\b2[,\s]?200\b/.test(String(f.elevation_m||'')),'actual_selected_elevation_range');
 check(norm(f.variety).includes('heirloom'),'actual_variety');
 check(norm(f.process)==='anaerobic','selected_anaerobic_takes_precedence_over_natural');
 check(chosen164.flavors.every(x=>norm(f.tasting_notes).includes(norm(x))),'actual_three_selected_flavors');
 check(!f.roast_level&&!f.decaffeination_method,'no_invented_roast_or_decaf');
 check(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'add_coffee_and_source_review');
 check(Array.isArray(rec.conflicts)&&rec.conflicts.length===0,'no_conflicts');
 check(Array.isArray(rec.seo_fallback_fields)&&rec.seo_fallback_fields.length===0,'no_seo_fallback');
 const proof={case_number:164,source_sha:e?.source_sha||null,passed:failures.length===0,failures,
  direct:direct.direct,headings:direct.headings,html_sha256:rec.html_sha256||null,
  html_bytes:rec.html_bytes||null,evidence_sha256:bytes?sha(bytes):null,actual_parser_fields:f,
  selected_origin_qualification:'Gedeb district printed in selected prose; parser country-only origin is not a claim of full subregion',
  full603_certified:false,production_operations:0};
 writeFileSync(join(dir,'r148-164-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R148 #164] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}
