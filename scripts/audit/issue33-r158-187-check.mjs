#!/usr/bin/env node
// #33 R158: exact original603 #187 Bolivia selected coffee (not whole603 certification).
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'')
 .toLowerCase().replace(/&amp;|&/giu,' and ').replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen187=Object.freeze({number:187,name:'Bolivia',
 url:'https://larryscoffee.com/products/bolivia-single-origin-light-roast-organic-coffee',
 flavors:['Nougat','Milk Chocolate','Golden Raisin']});
export function selected187Source(html){
 const own=productMarkup(String(html||''));
 const headings=selectedProductHeadings(own);
 const visible=norm(removeElements(own,['script','style','noscript','template','nav','aside','footer','header','select'])
  .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,3000}>/gu,' '));
 const has=x=>visible.includes(norm(x));
 return {headings,exactSelectedTitle:headings.length===1&&norm(headings[0])===norm(chosen187.name),
  direct:{label_roast:has('Roast Light Roast'),hero_roast:has('Single Origin Light Roast'),
   labeled_tastes:has('Tasting Notes: Nougat | Milk Chocolate | Golden Raisin'),
   washed_green:has('Bolivia (washed)'),country:has('Bolivia'),
   region:has('Yungas Mountains, Caranavi Province, Pumiri'),
   producer:has('AIPEP'),elevation_feet:has('3,600–4,900 ft')},
  note:'Selected explicit Roast: Light Roast is independent of non-tier narrative light-to-medium and FAQ/related coffee; unconfirmed conflict remains reviewable.',
  html_sha256:hash(Buffer.from(html||''))};
}
if(process.env.DIC_ISSUE33_R158_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');
 mkdirSync(dir,{recursive:true});let raw,bytes,e;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'))}catch{}
 try{raw=readFileSync(join(dir,'case-187.html'))}catch{}
 const record=e?.records?.find(x=>x.number===187)||{},f=record.current_fields||{};
 const source=selected187Source(raw?.toString('utf8')||'');
 const failures=[],check=(b,k)=>{if(!b)failures.push(k)};
 check(JSON.stringify(e?.case_numbers)==='[187]'&&e?.records?.length===1,'single_exact_original187');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_603_register');
 check(e?.original_corpus_modified===false&&e?.manual_certified===0&&e?.production_operations===0,'no_frozen_or_production_mutation');
 check(record.official_url===chosen187.url&&record.final_url===chosen187.url,'no_recycled_or_other_url');
 check(record.status==='FETCHED'&&record.parser_ok===true,'guarded_https_and_actual_parser');
 check(!!raw&&hash(raw)===record.html_sha256&&raw.length===record.html_bytes,'actual_html_hash');
 check(source.exactSelectedTitle&&record.selected_heading_identity_verified===true,'exact_current_selected_h1');
 for(const [key,ok] of Object.entries(source.direct))check(ok,'direct_selected_'+key);
 check(norm(f.name)===norm(chosen187.name),'parser_selected_identity');
 check(norm(f.roaster).includes('larry'),'parsed_roaster');
 check(norm(f.roast_level)===norm('Light'),'direct_labeled_light_roast_over_narrative_range');
 check(chosen187.flavors.every(n=>norm(f.tasting_notes).includes(norm(n))),'current_selected_labeled_tastes');
 check(norm(f.process)===norm('Washed'),'current_green_washed');
 check(norm(f.origin).includes('bolivia'),'origin_at_least_country');
 check(!f.decaffeination_method&&!f.espresso_recipe,'no_unpublished_decaf_or_recipe');
 check(record.add_coffee_ui_rendered===true&&record.source_review_rendered===true,'add_coffee_and_review_render');
 check(!(record.seo_fallback_fields||[]).some(x=>['roast_level','process','tasting_notes'].includes(x)),'not_seo_roast_or_flavor');
 const result={case_number:187,source_sha:e?.source_sha||null,passed:failures.length===0,failures,
  source,parser_fields:f,current_conflicts:record.conflicts||[],seo_fallback_fields:record.seo_fallback_fields||[],
  actual_html_sha256:raw?hash(raw):null,evidence_sha256:bytes?hash(bytes):null,
  original603_all_semantically_certified:false,production_writes:0};
 writeFileSync(join(dir,'r158-187-afterproof.json'),JSON.stringify(result,null,2)+'\n');
 console.log('[DIC33 #187 STRICT SELECTED LIVE AFTERPROOF] '+JSON.stringify(result));
 if(failures.length)process.exitCode=1;
}
