#!/usr/bin/env node
// Issue #33 R169: exact original603 #233 current chosen product, no identity fallback.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=s=>String(s??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen233=Object.freeze({number:233,name:'Ethiopia Yirgacheffe',url:'https://motivecoffeecompany.com/products/ethiopia-yirgacheffe-copy'});
export function selected233(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const safe=removeElements(selected,['script','style','noscript','template','nav','aside','footer','header','select']);
 const paragraphs=[...safe.matchAll(/<p\b[^>]{0,400}>([\s\S]{0,2500}?)<\/p>/gi)]
  .map(m=>norm(m[1].replace(/<[^>]{0,500}>/g,' ')));
 const matched=paragraphs.filter(p=>p.includes('apricot')&&p.includes('dark honey'));
 return {headings,identity:headings.length===1&&norm(headings[0])===norm(chosen233.name),
  paragraph_count:matched.length,description:matched.length===1?matched[0].slice(0,600):'',
  direct:{apricot_dark_honey:matched.length===1&&/notes? of apricot and dark honey/.test(matched[0]),
   floral:matched.length===1&&/delicate floral aroma/.test(matched[0]),
   vanilla:matched.length===1&&/soft hint of vanilla/.test(matched[0]),
   medium_body_not_roast:matched.length===1&&/medium bodied/.test(matched[0])}};
}
if(process.env.DIC_ISSUE33_R169_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes,htmlBytes,e;try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString())}catch{}
 try{htmlBytes=readFileSync(join(dir,'case-233.html'))}catch{}
 const r=e?.records?.find(x=>x.number===233)||{},f=r.current_fields||{},own=selected233(htmlBytes?.toString()||'');
 const failures=[],check=(v,k)=>{if(!v)failures.push(k)};
 check(JSON.stringify(e?.case_numbers)==='[233]'&&e?.records?.length===1,'one_exact_original_233');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original_register');
 check(e?.original_corpus_modified===false&&e?.manual_certified===0&&e?.production_operations===0,'corpus_and_production_untouched');
 check(r.official_url===chosen233.url,'exact_original_official_url');
 check(r.status==='FETCHED'&&r.parser_ok===true,'guarded_public_html_and_actual_parser');
 check(!!htmlBytes&&sha(htmlBytes)===r.html_sha256&&htmlBytes.length===r.html_bytes,'raw_html_sha256');
 check(own.identity&&r.selected_heading_identity_verified===true,'current_selected_product_identity');
 for(const [k,v] of Object.entries(own.direct))check(v,'source_current_selected_'+k);
 check(norm(f.name)===norm(chosen233.name),'parser_current_selected_name');
 check(norm(f.roaster).includes('motive'),'parser_roaster_source');
 check(['apricot','dark honey','floral','vanilla'].every(x=>norm(f.tasting_notes).includes(x)),'all_four_current_literal_sensory');
 check(!f.roast_level,'medium_body_not_roast_level');
 check(!f.process&&!f.variety&&!f.elevation_m&&!f.producer&&!f.decaffeination_method&&!f.espresso_recipe,'unpublished_facts_remain_blank');
 check((r.conflicts||[]).length===0,'no_chosen_source_conflict');
 check(!(r.seo_fallback_fields||[]).includes('tasting_notes'),'no_seo_tasting_note_borrow');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'add_coffee_and_source_review');
 const out={case:233,source_sha:e?.source_sha,passed:!failures.length,failures,
  exact_official_url:chosen233.url,source:own,fields:f,html_sha256:htmlBytes?sha(htmlBytes):null,
  evidence_sha256:bytes?sha(bytes):null,html_bytes:htmlBytes?.length||0,
  product_purchasability_not_certified:true,original603_manual_certification_not_claimed:true,production_operations:0};
 writeFileSync(join(dir,'r169-233-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R169 STRICT AFTERPROOF] '+JSON.stringify(out));
 if(failures.length)process.exitCode=1;
}
