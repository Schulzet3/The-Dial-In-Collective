#!/usr/bin/env node
// Issue #33 R143: Favor original603 #122; never transfer historical final-batch
// status, absent Light roast, founder biography or unrelated product/SEO.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim();
export const chosen122=Object.freeze({
 number:122,name:'Kenya - Kiambu: Malaki Estate AA *Final Batch*',
 archivedName:'Kenya - Kiambu: Malaki Estate AA',
 url:'https://favor.coffee/products/kenya-kiambu-malaki-estate',
 producerNames:['Jessica','Florence','Marigi'],
 notes:['Lemon Lime Soda','Ruby Grapefruit','Raspberry'],
 cultivars:['SL-28','SL-34']
});
export function selected122Source(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const visible=norm(removeElements(selected,['script','style','noscript','template','nav','aside','footer','header','select'])
   .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' '));
 const has=x=>visible.includes(norm(x));
 return {headings,exactH1:headings.length===1&&norm(headings[0])===norm(chosen122.name),
  direct:{
   producer:/producer\s+jessica(?:\s+amp)?\s+florence\s+marigi\s+of\s+malaki\s+estate/u.test(visible),
   origin:has('Origin: Kiambu, Kenya'),
   tastes:has('We Taste: Lemon Lime Soda, Ruby Grapefruit, Raspberry'),
   varieties:has('Varietals: SL-28, SL-34'),
   altitude:has('Altitude: 1900 masl'),
   process:has('Process: Washed'),
   managedByCurrent:has('managed by his wife, Florence, and his daughter, Jessica')
  },
  html_sha256:sha(Buffer.from(html||'')), selected_visible_length:visible.length};
}
if(process.env.DIC_ISSUE33_R143_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let b,e,raw;
 try{b=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(b.toString('utf8'));}catch{}
 try{raw=readFileSync(join(dir,'case-122.html'));}catch{}
 const failures=[];const check=(ok,id)=>{if(!ok)failures.push(id);};
 const rec=e?.records?.find(x=>x.number===122)||{},f=rec.current_fields||{};
 const direct=selected122Source(raw?.toString('utf8')||'');
 check(JSON.stringify(e?.case_numbers)==='[122]'&&e?.records?.length===1,'only_original122');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_checkout_sha');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen603_unchanged');
 check(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'no_global_certification');
 check(rec.status==='FETCHED'&&rec.parser_ok===true,'guarded_public_source_actual_parser');
 check(rec.official_url===chosen122.url&&rec.final_url===chosen122.url&&norm(rec.archived_coffee)===norm(chosen122.archivedName),'original_exact_selected_url');
 check(!!raw&&sha(raw)===rec.html_sha256&&raw.length===rec.html_bytes,'raw_html_sha_bytes');
 check(direct.exactH1&&rec.selected_heading_identity_verified===true,'current_selected_h1_exact_new_final_batch');
 check(Object.values(direct.direct).every(Boolean),'selected_visible_exact_labeled_facts');
 check(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'add_coffee_and_source_review');
 check(norm(f.name)===norm(chosen122.name),'parser_same_selected_name');
 check(norm(f.origin).includes('kiambu')&&norm(f.origin).includes('kenya'),'parser_kiambu_kenya');
 check(chosen122.producerNames.every(x=>norm(f.producer).includes(norm(x))),'parser_jessica_florence_not_founder');
 check(norm(f.producer).indexOf('edward')===-1,'no_founder_as_current_producer');
 check(chosen122.notes.every(x=>norm(f.tasting_notes).includes(norm(x))),'parser_all_three_selected_tastes');
 check(chosen122.cultivars.every(x=>norm(f.variety).includes(norm(x))),'parser_both_sl_varieties');
 check(norm(f.elevation_m).includes('1900'),'parser_1900_masl');
 check(norm(f.process)==='washed','parser_washed_not_fermentation_inference');
 check(!f.roast_level&&!f.decaffeination_method&&!f.release_label,'no_unpublished_roast_decaf_final_batch');
 check(Array.isArray(rec.conflicts)&&rec.conflicts.length===0,'no_conflicts');
 check(Array.isArray(rec.seo_fallback_fields)&&rec.seo_fallback_fields.length===0,'no_seo_fallback');
 const proof={case_number:122,source_sha:e?.source_sha||null,passed:failures.length===0,failures,
  chosen:chosen122,html_sha256:rec.html_sha256||null,html_bytes:rec.html_bytes||null,
  evidence_sha256:b?sha(b):null,direct,actual_parser_fields:f,
  global603_certified:false,production_operations:0};
 writeFileSync(join(dir,'r143-122-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R143 122] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}
