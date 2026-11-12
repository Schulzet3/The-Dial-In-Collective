#!/usr/bin/env node
// #33 original603 #123: source-only certificate; Dark is a product title,
// while the explicitly labeled current roast in chosen prose is Medium-Dark.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
  .replace(/&(?:nbsp|#160);/giu,' ').replace(/&amp;/giu,' and ')
  .replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
export const chosen123=Object.freeze({
 number:123,name:'The Token Dark Blend',
 url:'https://favor.coffee/products/the-token-dark-blend',
 producer:'Miriam Monteiro de Aguiar',
 origin:'Santo Antônio do Amparo, Minas Gerais, Brazil',
 tastes:['Hazelnut','Toffee','Milk Chocolate','Praline','Golden Raisin'],
 varieties:['Yellow Catucaí','Catiguá MG2','Paraíso','Yellow Catuaí Arara','Pacamara Topazio']
});
export function selected123Source(html) {
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const visible=norm(removeElements(selected,['script','style','noscript','template','nav','aside','footer','header','select'])
   .replace(/<!--[\s\S]*?-->/gu,' ').replace(/<[^>]{0,2500}>/gu,' '));
 const has=x=>visible.includes(norm(x));
 return {headings,exactH1:headings.length===1&&norm(headings[0])===norm(chosen123.name),
  direct:{
    producer:has('Producer: Miriam Monteiro de Aguiar: Fazenda Cachoeira'),
    origin:has('Origin: Santo Antônio do Amparo, Minas Gerais, Brazil'),
    tastes:has('We Taste: Hazelnut, Toffee, Milk Chocolate, Praline, Golden Raisin'),
    varieties:has('Varietals: Yellow Catucaí, Catiguá MG2, Paraíso, Yellow Catuaí Arara, Pacamara Topazio'),
    altitude:has('Altitude: 1000 masl'),process:has('Process: Natural'),
    mediumDark:has('medium-dark roast')
  },visibleLength:visible.length,html_sha256:hash(Buffer.from(html||''))};
}
if(process.env.DIC_ISSUE33_R144_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let bytes,raw,e;
 try{bytes=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(bytes.toString('utf8'));}catch{}
 try{raw=readFileSync(join(dir,'case-123.html'));}catch{}
 const failures=[];const assert=(ok,id)=>{if(!ok)failures.push(id)};
 const rec=e?.records?.find(x=>x.number===123)||{},f=rec.current_fields||{};
 const source=selected123Source(raw?.toString('utf8')||'');
 assert(JSON.stringify(e?.case_numbers)==='[123]'&&e?.records?.length===1,'exact_original123_only');
 assert(e?.source_sha===process.env.GITHUB_SHA,'exact_source_checkout');
 assert(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','frozen603_sha');
 assert(e?.original_corpus_modified===false&&e?.production_operations===0&&e?.manual_certified===0,'no_global_603_certification');
 assert(rec.official_url===chosen123.url&&rec.final_url===chosen123.url,'exact_original_selected_url');
 assert(rec.status==='FETCHED'&&rec.parser_ok===true,'guarded_https_actual_parser');
 assert(!!raw&&hash(raw)===rec.html_sha256&&raw.length===rec.html_bytes,'raw_html_byte_and_hash');
 assert(source.exactH1&&rec.selected_heading_identity_verified===true,'current_product_heading');
 assert(Object.values(source.direct).every(Boolean),'all_direct_chosen_facts_in_selected_visible_html');
 assert(norm(f.name)===norm(chosen123.name),'actual_parser_chosen_name');
 assert(norm(f.producer).includes(norm(chosen123.producer)),'actual_parser_miriam_current_producer');
 assert(norm(f.origin).includes(norm(chosen123.origin)),'actual_parser_current_origin');
 assert(chosen123.tastes.every(x=>norm(f.tasting_notes).includes(norm(x))),'actual_parser_all_five_notes');
 assert(chosen123.varieties.every(x=>norm(f.variety).includes(norm(x))),'actual_parser_chosen_varieties');
 assert(norm(f.elevation_m).includes('1000'),'actual_parser_1000_masl');
 assert(norm(f.process)==='natural','actual_parser_natural');
 assert(norm(f.roast_level)==='medium dark','explicit_medium_dark_over_product_title_dark');
 assert(!f.decaffeination_method,'no_unpublished_decaf_method');
 assert(rec.add_coffee_ui_rendered===true&&rec.source_review_rendered===true,'add_coffee_source_review');
 assert(Array.isArray(rec.conflicts)&&rec.conflicts.length===0,'no_conflicts');
 assert(Array.isArray(rec.seo_fallback_fields)&&rec.seo_fallback_fields.length===0,'no_seo_fallback');
 const proof={case_number:123,source_sha:e?.source_sha||null,passed:failures.length===0,
  failures,selected_heading:source.headings,direct:source.direct,
  raw_html_sha256:rec.html_sha256||null,html_bytes:rec.html_bytes||null,
  evidence_sha256:bytes?hash(bytes):null,actual_parser_fields:f,
  full_603_certified:false,production_operations:0};
 writeFileSync(join(dir,'r144-123-afterproof.json'),JSON.stringify(proof,null,2)+'\n');
 console.log('[DIC33 R144 #123] '+JSON.stringify(proof));
 if(failures.length)process.exitCode=1;
}