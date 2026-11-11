#!/usr/bin/env node
// Issue #33 R123, original603 #573: current Wate Gogogu at a recycled Worasa URL.
// Development-only selected-product contract. No all-603 semantic certification.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
const sha=v=>createHash('sha256').update(v).digest('hex');
const fold=s=>String(s??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const selected123=Object.freeze({
 number:573,name:'Ethiopia Wate Gogogu',
 url:'https://www.stageline.coffee/product-page/ethiopia-worasa-daniel-mijane',
 own:['another beautiful washed ethiopian coffee from negusse debla',
      'this time from the guji region',
      'in this coffee we are tasting fresh plum and florals with an orange bitters note',
      'variety dega kurume','process washed','altitude 2280 masl'],
 foreign:['daniel mijane','worasa','worka sakaro lot notes','capricornio','yellow catuai','mondo novo']
});
export function direct123(html){
 const product=productMarkup(String(html||''));
 const headings=selectedProductHeadings(product);
 const visible=fold(product.replace(/<!--[\s\S]*?-->/g,' ')
   .replace(/<(?:script|style|noscript|template|nav|aside|footer|header|form|select)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template|nav|aside|footer|header|form|select)>/gi,' ')
   .replace(/<[^>]{0,2000}>/g,' ').replace(/&(?:nbsp|amp);/gi,' ').replace(/\s+/g,' '));
 return {headings,uniqueH1:headings.length===1&&fold(headings[0])===fold(selected123.name),
  own:selected123.own.map(literal=>({literal,matched:visible.includes(fold(literal))}))};
}
export function fields123Ok(fields){
 if(!fields||typeof fields!=='object')return false;
 const f=k=>fold(fields[k]);
 return f('name')===fold(selected123.name)&&
  f('origin').includes('ethiopia')&&f('origin').includes('guji')&&
  f('process')===fold('Washed')&&f('variety').includes('dega')&&
  f('variety').includes('kurume')&&f('elevation_m').includes('2280')&&
  f('producer').includes('negusse debla')&&
  ['fresh plum','florals','orange bitters'].every(t=>f('tasting_notes').includes(fold(t)))&&
  !fields.roast_level&&!fields.decaffeination_method&&!fields.release_label&&
  selected123.foreign.every(term=>![f('name'),f('producer'),f('tasting_notes'),f('origin')].some(v=>v.includes(fold(term))));
}
if(process.env.DIC_ISSUE33_R123_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw=null,e=null,html=null;
 try{raw=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(raw.toString())}catch{}
 try{html=readFileSync(join(dir,'case-573.html'))}catch{}
 const failures=[],check=(ok,label)=>{if(!ok)failures.push(label)};
 const r=e?.records?.find(x=>x.number===573)||{},d=direct123(html?.toString()||'');
 check(JSON.stringify(e?.case_numbers)==='[573]'&&e?.records?.length===1,'one_original573_only');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_workflow_source_sha');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','original603_csv_immutable_sha');
 check(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'no_original_or_provider_or_global_certification_mutation');
 check(r.status==='FETCHED'&&r.parser_ok===true&&r.selected_heading_identity_verified===true,'actual_public_parser_selected_current_identity');
 check(r.official_url===selected123.url&&r.final_url===selected123.url&&r.archived_coffee===selected123.name,'recycled_slug_current_selected_coffee_not_old_identity');
 check(html&&sha(html)===r.html_sha256&&html.length===r.html_bytes,'raw_current_official_html_hash');
 check(d.uniqueH1&&d.own.every(x=>x.matched),'selected_product_direct_current_description_specs');
 check(fields123Ok(r.current_fields),'parser_selected_guji_washed_producer_all_three_tastes_no_inferred_fields');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'add_coffee_and_source_review_present');
 check(Array.isArray(r.conflicts)&&r.conflicts.length===0,'no_selected_source_conflicts');
 check(Array.isArray(r.seo_fallback_fields)&&r.seo_fallback_fields.length===0,'no_seo_only_selected_fallback');
 const verdict={source_sha:e?.source_sha,passed:failures.length===0,failures,
  html_sha256:r.html_sha256||null,html_bytes:r.html_bytes||null,evidence_sha256:raw?sha(raw):null,
  selected:d,fields:r.current_fields||null,conflicts:r.conflicts||[],seo_fallback_fields:r.seo_fallback_fields||[],
  manual_certified:0,boundary:'One current selected original603 case; exact Wate Gogogu despite Worasa URL slug, own direct source, no borrowed former-product/SEO facts. Not universal603 certification; no production writes.'};
 writeFileSync(join(dir,'r123-573-afterproof.json'),JSON.stringify(verdict,null,2)+'\n');
 console.log('[DIC33 R123 SELECTED AFTERPROOF] '+JSON.stringify(verdict));
 if(failures.length)process.exitCode=1;
}
