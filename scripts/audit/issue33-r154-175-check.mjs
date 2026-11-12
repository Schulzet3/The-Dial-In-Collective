#!/usr/bin/env node
// Issue #33 R154: chosen Kings Peak Sircof direct source; no automated global certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/&(?:nbsp|#160);/giu,' ').replace(/&amp;|&/giu,' and ').replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen175=Object.freeze({number:175,name:'Costa Rica Cafe Sircof',
 url:'https://kingspeakcoffee.com/products/costa-rica-cafe-sircof',
 notes:['Cherries','Raspberries','Chocolate Brownies']});
export function selected175Source(html){
 const own=productMarkup(String(html||''));
 const h=selectedProductHeadings(own);
 const stripped=removeElements(own,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,3000}>/gu,' ');
 const visible=norm(stripped),has=x=>visible.includes(norm(x));
 return {headings:h,exactSelectedTitle:h.length===1&&norm(h[0])===norm(chosen175.name),
  direct:{labeled_notes:has('Notes: Cherries, Raspberries & Chocolate Brownies'),
   red_honey:has('red honey process coffee'),oviedo_family:has('Oviedo family'),
   sircof_farm:has('Sircof farm'),three_literal_notes:chosen175.notes.map(has)},
  html_sha256:sha(Buffer.from(html||''))};
}
if(process.env.DIC_ISSUE33_R154_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,bytes,e;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'))}catch{}
 try{raw=readFileSync(join(dir,'case-175.html'))}catch{}
 const rec=e?.records?.find(x=>x.number===175)||{},f=rec.current_fields||{};
 const source=selected175Source(raw?.toString('utf8')||'');
 const failures=[],check=(a,b)=>{if(!a)failures.push(b)};
 check(JSON.stringify(e?.case_numbers)==='[175]'&&e?.records?.length===1,'single_original175');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_ci_source');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603');
 check(e?.original_corpus_modified===false&&e?.manual_certified===0&&e?.production_operations===0,'bounded_no_production');
 check(rec.official_url===chosen175.url&&String(rec.final_url||'').replace(/\/+$/u,'')===chosen175.url,'exact_selected_official_url');
 check(rec.status==='FETCHED'&&rec.parser_ok===true,'real_bounded_https_and_current_parser');
 check(!!raw&&sha(raw)===rec.html_sha256&&raw.length===rec.html_bytes,'current_raw_official_html_hash');
 check(source.exactSelectedTitle&&rec.selected_heading_identity_verified===true,'chosen_h1_exact_match');
 check(Object.values(source.direct).every(x=>Array.isArray(x)?x.every(Boolean):x),'source_direct_selected_claims');
 check(norm(f.name)===norm(chosen175.name),'parser_chosen_name');
 check(norm(f.roaster).includes('kings peak'),'parser_exact_roaster');
 check(chosen175.notes.every(x=>norm(f.tasting_notes).includes(norm(x))),'parser_full_current_labeled_tasting_notes');
 check(norm(f.origin).includes('costa rica'),'parser_selected_origin');
 check(norm(f.process)==='honey','parser_own_honey_process');
 check(!f.roast_level&&!f.variety&&!f.decaffeination_method&&!f.elevation_m&&!f.release_label,
  'leave_unpublished_fields_blank');
 check(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'add_coffee_and_source_review');
 check((rec.seo_fallback_fields||[]).length===0,'no_untrusted_seo_fallback');
 const output={case_number:175,source_sha:e?.source_sha||null,passed:failures.length===0,failures,
  direct_current:source,parser_fields:f,raw_html_sha256:raw?sha(raw):null,
  focused_evidence_sha256:bytes?sha(bytes):null,html_bytes:raw?.length||0,
  limitation:'Farm/family are named but a particular individual grower is not; do not fill absent roast, variety, altitude, decaf or lot.',
  full603_certified:false,production_operations:0};
 writeFileSync(join(dir,'r154-175-afterproof.json'),JSON.stringify(output,null,2)+'\n');
 console.log('[DIC33 R154 #175 SOURCE-BOUND AFTERPROOF] '+JSON.stringify(output));
 if(failures.length)process.exitCode=1;
}
