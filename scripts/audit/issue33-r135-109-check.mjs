#!/usr/bin/env node
// Issue #33 R135: original603 #109 exact selected Anasora Natural.
// Direct selected evidence only. "Anasora Farm Site" is a source label for a site, NOT a named individual.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const norm=s=>String(s??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
  .replace(/[^a-z0-9]+/gu,' ').trim();
export const chosen109=Object.freeze({
 number:109,name:'Anasora Natural',url:'https://eastpole.coffee/products/anasoranatural',
 notes:['strawberry syrup','blueberry','blackberry juice']
});
export function selected109Source(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const visible=norm(removeElements(selected,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' '));
 const has=v=>visible.includes(norm(v));
 return {headings,exactH1:headings.length===1&&norm(headings[0])===norm(chosen109.name),
  direct:{farmSite:has('Anasora Farm Site'),producerAmountLabel:has('PRODUCER AMOUNT'),
   gujiEthiopia:has('Guji, Ethiopia'),altitude2300:has('2300 masl'),
   heirloom:has('Heirloom'),natural:has('Natural'),
   notes:chosen109.notes.every(has)},
  selected_visible_length:visible.length,source_sha256:sha(Buffer.from(html||''))};
}
if(process.env.DIC_ISSUE33_R135_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes,e,html;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'));}catch{}
 try{html=readFileSync(join(dir,'case-109.html'));}catch{}
 const failures=[],ck=(v,k)=>{if(!v)failures.push(k);};
 const rec=e?.records?.find(x=>x.number===109)||{},f=rec.current_fields||{};
 const direct=selected109Source(html?.toString('utf8')||'');
 ck(JSON.stringify(e?.case_numbers)==='[109]'&&e?.records?.length===1,'original109_only');
 ck(e?.source_sha===process.env.GITHUB_SHA,'exact_checkout_source_sha');
 ck(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original603_digest');
 ck(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'no_global_certification_or_production');
 ck(rec.status==='FETCHED'&&rec.parser_ok===true,'guarded_official_https_real_parser');
 ck(rec.official_url===chosen109.url&&rec.final_url===chosen109.url&&rec.archived_coffee===chosen109.name,'exact_original_selected_url_name');
 ck(!!html&&sha(html)===rec.html_sha256&&html.length===rec.html_bytes,'raw_official_html_integrity');
 ck(direct.exactH1&&rec.selected_heading_identity_verified===true,'selected_h1_identity');
 ck(Object.values(direct.direct).every(Boolean),'selected_direct_specifications_and_notes');
 ck(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'real_add_coffee_source_review');
 ck(norm(f.name)===norm(chosen109.name),'selected_parser_name');
 ck(norm(f.origin).includes('guji')&&norm(f.origin).includes('ethiopia'),'selected_parser_guji_ethiopia');
 ck(norm(f.elevation_m).includes('2300'),'selected_parser_elevation');
 ck(norm(f.variety).includes('heirloom'),'selected_parser_heirloom');
 ck(norm(f.process)==='natural','selected_parser_natural');
 ck(chosen109.notes.every(v=>norm(f.tasting_notes).includes(norm(v))),'selected_parser_three_notes');
 ck(norm(f.producer)==='anasora farm site','preserve_labeled_site_not_invent_farmer');
 ck(!f.roast_level&&!f.decaffeination_method,'do_not_invent_unpublished_roast_decaf');
 ck(Array.isArray(rec.conflicts)&&rec.conflicts.length===0&&Array.isArray(rec.seo_fallback_fields)&&rec.seo_fallback_fields.length===0,'no_conflicts_or_seo');
 const proof={case_number:109,source_sha:e?.source_sha||null,passed:failures.length===0,failures,
  official_html_sha256:rec.html_sha256||null,official_html_bytes:rec.html_bytes||null,
  evidence_sha256:bytes?sha(bytes):null,direct,actual_parser_fields:f,
  producer_role:'SOURCE_LABEL_ANASORA_FARM_SITE_NOT_NAMED_INDIVIDUAL',
  parser_conflicts:rec.conflicts||[],seo_fallback_fields:rec.seo_fallback_fields||[],
  original603_individually_certified:false,production_operations:0};
 writeFileSync(join(dir,'r135-109-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R135] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}
