#!/usr/bin/env node
// #33 R159, original frozen603 #188: exact selected Dehab's Diamond, never entire corpus certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'')
 .toLowerCase().replace(/&amp;|&/giu,' and ').replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen188=Object.freeze({number:188,name:'42 Series- Ethiopia Dehab’s Diamond',
 url:'https://larryscoffee.com/products/coffee-111',
 flavors:['peach','nougat','chocolate covered cherries','honeysuckle']});
export function selected188Source(html){
 const own=productMarkup(String(html||''));
 const headings=selectedProductHeadings(own);
 const visible=norm(removeElements(own,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,3000}>/gu,' '));
 const has=x=>visible.includes(norm(x));
 return {headings,exactSelectedTitle:headings.length===1&&norm(headings[0])===norm(chosen188.name),
  direct:{roast:has('Roast Light Roast'),producer:has('Dehab Bitewlign'),
   forest:has('Kaffa Forest'),peach:has('notes of peach'),nougat:has('nougat'),
   cherries:has('chocolate covered cherries'),honeysuckle:has('sweet honeysuckle')},
  html_sha256:hash(Buffer.from(html||''))};
}
if(process.env.DIC_ISSUE33_R159_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
 mkdirSync(dir,{recursive:true});let raw,bytes,e;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'))}catch{}
 try{raw=readFileSync(join(dir,'case-188.html'))}catch{}
 const record=e?.records?.find(x=>x.number===188)||{},f=record.current_fields||{};
 const source=selected188Source(raw?.toString('utf8')||'');
 const failures=[],check=(b,k)=>{if(!b)failures.push(k)};
 check(JSON.stringify(e?.case_numbers)==='[188]'&&e?.records?.length===1,'single_original188');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_603_register');
 check(e?.original_corpus_modified===false&&e?.manual_certified===0&&e?.production_operations===0,'no_frozen_or_production_mutation');
 check(record.official_url===chosen188.url&&record.final_url===chosen188.url,'unchanged_exact_selected_url');
 check(record.status==='FETCHED'&&record.parser_ok===true,'guarded_https_and_actual_parser');
 check(!!raw&&hash(raw)===record.html_sha256&&raw.length===record.html_bytes,'actual_html_hash');
 check(source.exactSelectedTitle&&record.selected_heading_identity_verified===true,'exact_current_selected_h1');
 for(const [key,ok] of Object.entries(source.direct))check(ok,'selected_direct_'+key);
 check(norm(f.name)===norm(chosen188.name),'parsed_selected_identity');
 check(norm(f.roaster).includes('larry'),'parsed_roaster');
 check(norm(f.roast_level)==='light','direct_selected_light_roast');
 check(chosen188.flavors.every(n=>norm(f.tasting_notes).includes(norm(n))),'own_full_tasting_story');
 check(norm(f.producer).includes('dehab'),'current_named_producer');
 check(norm(f.origin).includes('ethiopia'),'origin_at_least_country');
 check(norm(f.release_label).includes('42 series'),'own_release_series_not_2026_harvest');
 check(!f.decaffeination_method&&!f.espresso_recipe&&!f.elevation_m&&!f.variety,'no_invented_unpublished_fields');
 check(!f.process||f.process==='Other/Unknown','unpublished_green_processing_not_guessed');
 check(record.add_coffee_ui_rendered===true&&record.source_review_rendered===true,'add_coffee_and_source_review');
 check(!(record.seo_fallback_fields||[]).some(x=>['tasting_notes','roast_level','producer','process'].includes(x)),'no_seo_fields');
 const result={case_number:188,source_sha:e?.source_sha||null,passed:!failures.length,failures,
  current_selected_source:source,parser_fields:f,conflicts:record.conflicts||[],
  seo_fallback_fields:record.seo_fallback_fields||[],actual_html_sha256:raw?hash(raw):null,
  evidence_sha256:bytes?hash(bytes):null,whole603_individually_certified:false,production_writes:0};
 writeFileSync(join(dir,'r159-188-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 #188 STRICT CURRENT SOURCE AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
