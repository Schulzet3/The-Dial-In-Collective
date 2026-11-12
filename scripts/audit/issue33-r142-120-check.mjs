#!/usr/bin/env node
// Issue33 R142 original603 #120: independent exact selected current product evidence,
// NEVER transfer facts from artist biography, bundle, SEO or previous product/lot.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const norm=v=>String(v??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const chosen120=Object.freeze({
 number:120,name:'solar flare - claudia samboni | joelle ater',
 url:'https://epiphanycoffee.co/products/solar-flare',
 farmer:'Claudia Samboni',farm:'Finca Las Nubes',variety:'Pink Bourbon',
 notes:['Watermelon','Grapefruit Juice','Orange Zest','Rosewater']
});
export function selected120Source(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const visible=norm(removeElements(selected,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' '));
 const has=v=>visible.includes(norm(v));
 return {headings,exactH1:headings.length===1&&norm(headings[0])===norm(chosen120.name),
  direct:{
   countryAndRegion:has('Origin: Colombia')&&has('Huila'),
   farmer:has('Coffee Farmer: Claudia Samboni'),
   farm:has('Farm: Finca Las Nubes'),
   variety:has('Variety: Pink Bourbon'),
   process:has('Process: 200-hour anaerobic washed'),
   lightRoast:has('Roast: Light'),
   flavors:has('Flavor Notes: Watermelon, Grapefruit Juice, Orange Zest, and Rosewater'),
   limitedRelease:has('limited summer release')
  },
  html_sha256:hash(Buffer.from(html||'')),selected_visible_length:visible.length};
}
if(process.env.DIC_ISSUE33_R142_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes,e,raw;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'));}catch{}
 try{raw=readFileSync(join(dir,'case-120.html'));}catch{}
 const failures=[],ck=(yes,id)=>{if(!yes)failures.push(id);};
 const rec=e?.records?.find(r=>r.number===120)||{},f=rec.current_fields||{};
 const direct=selected120Source(raw?.toString('utf8')||'');
 ck(JSON.stringify(e?.case_numbers)==='[120]'&&e?.records?.length===1,'only_original120');
 ck(e?.source_sha===process.env.GITHUB_SHA,'exact_checkout_sha');
 ck(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen603_unchanged');
 ck(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'not_global_certification');
 ck(rec.status==='FETCHED'&&rec.parser_ok===true,'real_guarded_official_and_parser');
 ck(rec.official_url===chosen120.url&&rec.final_url===chosen120.url&&norm(rec.archived_coffee)===norm(chosen120.name),'original_exact_selected_identity');
 ck(!!raw&&hash(raw)===rec.html_sha256&&raw.length===rec.html_bytes,'official_raw_byte_sha');
 ck(direct.exactH1&&rec.selected_heading_identity_verified===true,'selected_visible_h1');
 ck(Object.values(direct.direct).every(Boolean),'current_selected_farmer_farm_process_roast_flavors');
 ck(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'add_coffee_source_review');
 ck(norm(f.name)===norm(chosen120.name),'actual_parser_selected_identity');
 ck(norm(f.origin).includes('colombia')&&norm(f.origin).includes('huila'),'actual_parser_current_origin');
 ck(norm(f.producer).includes('claudia samboni')&&!norm(f.producer).includes('joelle'),'farmer_not_artist');
 ck(norm(f.variety).includes('pink bourbon'),'actual_parser_selected_variety');
 ck(norm(f.process).includes('anaerobic'),'actual_parser_200hour_anaerobic_processing');
 ck(norm(f.roast_level)==='light','actual_parser_light');
 ck(chosen120.notes.every(n=>norm(f.tasting_notes).includes(norm(n))),'four_direct_current_notes');
 ck(!f.decaffeination_method,'no_unsupported_decaf');
 ck(Array.isArray(rec.conflicts)&&rec.conflicts.length===0,'no_unadjudicated_conflicts');
 ck(Array.isArray(rec.seo_fallback_fields)&&rec.seo_fallback_fields.length===0,'no_seo_transfer');
 const proof={case_number:120,source_sha:e?.source_sha||null,passed:!failures.length,failures,chosen:chosen120,
  html_sha256:rec.html_sha256||null,html_bytes:rec.html_bytes||null,evidence_sha256:bytes?hash(bytes):null,
  direct,actual_parser_fields:f,no_global603_certification:true,production_operations:0};
 writeFileSync(join(dir,'r142-120-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R142] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}
