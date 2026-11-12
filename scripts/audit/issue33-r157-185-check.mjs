#!/usr/bin/env node
// Issue #33: one original603 selected current official product, not 603 certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/&amp;|&/giu,' and ').replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen185=Object.freeze({number:185,name:'Humble Mule, Natural Decaf',
 url:'https://lamulitacoffee.com/products/humble-mule-decaf-coffee',
 notes:['Caramel','Chocolate','Vanilla']});
export function selected185Source(html){
 const own=productMarkup(String(html||''));
 const headings=selectedProductHeadings(own);
 const visible=norm(removeElements(own,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[^\0]*?-->/gu,' ').replace(/<[^>]{0,3000}>/gu,' '));
 const has=x=>visible.includes(norm(x));
 return {headings,exactSelectedTitle:headings.length>0&&headings.every(x=>norm(x)===norm(chosen185.name)),
  direct:{
   roast:has('Medium roast'),
   selected_tastes:has('Cupping Notes: Caramel, Chocolate, and Vanilla'),
   sugarcane_decaﬀ:has('decaffeination process utilizing sugar cane and water'),
   washed_green:has('Process: Washed'),
   origin:has('Origin: Popayan, Cauca'),
   variety:has('Varietal: Castillo, Catimor Typica, and Caturra'),
   elevation:has('Altitude: 1,500 - 2,070 MASL'),
   growers:has('Smallholders in rural areas of Popayan, Cauca'),
   flavors:chosen185.notes.map(has)
  },html_sha256:sha(Buffer.from(html||''))};
}
if(process.env.DIC_ISSUE33_R157_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,bytes,e;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'))}catch{}
 try{raw=readFileSync(join(dir,'case-185.html'))}catch{}
 const rec=e?.records?.find(x=>x.number===185)||{},f=rec.current_fields||{},source=selected185Source(raw?.toString('utf8')||'');
 const failures=[],check=(ok,id)=>{if(!ok)failures.push(id)};
 check(JSON.stringify(e?.case_numbers)==='[185]'&&e?.records?.length===1,'single_original185');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_ci_source');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603');
 check(e?.original_corpus_modified===false&&e?.manual_certified===0&&e?.production_operations===0,'no_corpus_or_production_mutation');
 check(rec.official_url===chosen185.url&&String(rec.final_url||'').replace(/\/+$/u,'')===chosen185.url,'exact_official_selected_url');
 check(rec.status==='FETCHED'&&rec.parser_ok===true,'guarded_https_actual_parser');
 check(!!raw&&sha(raw)===rec.html_sha256&&raw.length===rec.html_bytes,'current_raw_html_byte_integrity');
 check(source.exactSelectedTitle&&rec.selected_heading_identity_verified===true,'current_selected_h1');
 check(Object.values(source.direct).every(x=>Array.isArray(x)?x.every(Boolean):x),'selected_direct_labeled_facts');
 check(norm(f.name)===norm(chosen185.name),'parsed_selected_name');
 check(norm(f.roaster).includes('la mulita'),'parsed_selected_roaster');
 check(norm(f.roast_level)==='medium','selected_roast_level');
 check(norm(f.origin).includes('cauca')&&norm(f.origin).includes('popayan'),'selected_origin');
 check(norm(f.process)==='washed','washed_green_not_natural_decaﬀ');
 check(chosen185.notes.every(x=>norm(f.tasting_notes).includes(norm(x))),'labeled_selected_cupping_notes');
 check(norm(f.variety).includes('castillo')&&norm(f.variety).includes('caturra'),'direct_selected_varieties');
 check(norm(f.elevation_m).includes('1500')&&norm(f.elevation_m).includes('2070'),'direct_selected_elevation');
 check(!f.decaffeination_method||/sugar\s*cane|sugarcane|ethyl acetate/i.test(String(f.decaffeination_method)),'no_invented_decaﬀ_method');
 check(!f.release_label&&!f.espresso_recipe,'no_unpublished_release_or_recipe');
 check(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'add_coffee_source_review');
 const result={case_number:185,source_sha:e?.source_sha||null,passed:failures.length===0,failures,
  direct_current:source,parser_fields:f,raw_html_sha256:raw?sha(raw):null,
  focused_evidence_sha256:bytes?sha(bytes):null,html_bytes:raw?.length||0,
  caution:'Natural Decaf is a decaffeination claim, not proof of green coffee Natural process; the selected product explicitly states Washed. Sugar cane + water are separate decaffeination-method evidence. Footer suggestions are not product facts.',
  all603_certified:false,production_operations:0};
 writeFileSync(join(dir,'r157-185-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 R157 #185 STRICT OFFICIAL AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
