#!/usr/bin/env node
// Issue #33 R137: original603 #112 current Elixr Finca Santa Monica, Colombia.
// Direct same-selected product specs; historic other farms/varieties are not this lot.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const norm=v=>String(v??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const chosen112=Object.freeze({
 number:112,name:'Finca Santa Monica, Colombia',
 url:'https://elixrcoffee.com/products/finca-santa-monica-colombia',
 notes:['passion fruit','pineapple gummy bears','rose']
});
export function selected112Source(html){
 const scoped=productMarkup(String(html||''));
 const headings=selectedProductHeadings(scoped);
 const visible=norm(removeElements(scoped,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' '));
 const has=s=>visible.includes(norm(s));
 return {
  headings,exactH1:headings.length===1&&norm(headings[0])===norm(chosen112.name),
  direct:{
   currentGrower:has('Jairo Arcila is a third-generation coffee grower'),
   fincaSantaMonica:has('Santa Monica'),
   regionQuindio:has('Region: Quindio'),
   altitude2100:has('Altitude: 2100 MASL'),
   castillo:has('Variety: Castillo'),
   honeyWithWineYeast:has('Process: Honey + Wine Yeast Fermentation'),
   directTaste:has('We Taste: Passion Fruit / Pineapple Gummy Bears / Rose'),
   currentLot72Hours:has('This coffee has undergone a 72 hour fermentation with added wine yeast')
  },selected_visible_length:visible.length,source_sha256:sha(Buffer.from(html||''))};
}
if(process.env.DIC_ISSUE33_R137_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes,e,raw;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'));}catch{}
 try{raw=readFileSync(join(dir,'case-112.html'));}catch{}
 const failures=[],ck=(value,key)=>{if(!value)failures.push(key);};
 const rec=e?.records?.find(row=>row.number===112)||{},f=rec.current_fields||{};
 const direct=selected112Source(raw?.toString('utf8')||'');
 ck(JSON.stringify(e?.case_numbers)==='[112]'&&e?.records?.length===1,'original112_only');
 ck(e?.source_sha===process.env.GITHUB_SHA,'exact_checkout_sha');
 ck(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_digest');
 ck(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'no_global_certification_or_production');
 ck(rec.status==='FETCHED'&&rec.parser_ok===true,'guarded_official_html_actual_parser');
 ck(rec.official_url===chosen112.url&&rec.final_url===chosen112.url&&rec.archived_coffee===chosen112.name,'exact_selected_official_url_coffee');
 ck(!!raw&&sha(raw)===rec.html_sha256&&raw.length===rec.html_bytes,'raw_official_html_digest');
 ck(direct.exactH1&&rec.selected_heading_identity_verified===true,'same_selected_coffee_h1');
 ck(Object.values(direct.direct).every(Boolean),'direct_current_selected_source_evidence');
 ck(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'add_coffee_and_source_review_real');
 ck(norm(f.name)===norm(chosen112.name),'parser_current_selected_name');
 ck(norm(f.origin).includes('quindio')&&norm(f.origin).includes('colombia'),'parser_current_selected_region');
 ck(norm(f.producer).includes('jairo arcila'),'parser_grower_not_cofinet_children');
 ck(norm(f.elevation_m).includes('2100'),'parser_current_altitude');
 ck(norm(f.variety)==='castillo','parser_selected_castillo_not_historic_other_varieties');
 ck(norm(f.process)==='honey','parser_current_honey_green_fermentation');
 ck(chosen112.notes.every(note=>norm(f.tasting_notes).includes(norm(note))),'parser_three_selected_notes');
 ck(!f.roast_level&&!f.decaffeination_method,'no_unpublished_roast_decaf');
 ck(Array.isArray(rec.conflicts)&&rec.conflicts.length===0,'no_unadjudicated_conflicts');
 ck(Array.isArray(rec.seo_fallback_fields)&&rec.seo_fallback_fields.length===0,'no_seo');
 const proof={case_number:112,source_sha:e?.source_sha||null,passed:!failures.length,failures,
  official_html_sha256:rec.html_sha256||null,official_html_bytes:rec.html_bytes||null,
  evidence_sha256:bytes?sha(bytes):null,direct,actual_parser_fields:f,
  exact_selected_green_process:'HONEY_PLUS_WINE_YEAST_FERMENTATION',
  unrelated_historic_varieties_excluded:['Gesha','Pink Bourbon','Tabi','Java'],
  conflicts:rec.conflicts||[],seo_fallback_fields:rec.seo_fallback_fields||[],
  global603_certified:false,production_operations:0};
 writeFileSync(join(dir,'r137-112-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R137] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}
