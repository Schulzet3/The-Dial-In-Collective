#!/usr/bin/env node
// #33 R167: original603 #226 Mighty Beast Brazil Natural, current chosen product.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
const flat=x=>norm(x).replace(/\s+/gu,'');
export const chosen226=Object.freeze({number:226,name:'Brazil Natural',url:'https://mightybeast.coffee/products/brazil-natural'});
export function source226(html){
 const selected=productMarkup(String(html||''));
 const headings=selectedProductHeadings(selected);
 const visible=removeElements(selected,['script','style','noscript','template','nav','aside','footer','header','select']).replace(/<[^>]{0,3000}>/gu,' ');
 const t=flat(visible),has=x=>t.includes(flat(x));
 return {headings,identity:headings.length===1&&norm(headings[0])===norm(chosen226.name),
  direct:{origin:has('origin mogiana brazil'),roast:has('roast level medium'),
   process:has('process natural'),notes:has('flavor notes citrus almond dark chocolate'),
   grower:has('grown and harvested by diogo'),contextual_yellow_bourbon:has('where yellow bourbon coffee is consistently considered brazil')}}
}
if(process.env.DIC_ISSUE33_R167_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,e,html;try{raw=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(raw.toString())}catch{}
 try{html=readFileSync(join(dir,'case-226.html'))}catch{}
 const r=e?.records?.find(x=>x.number===226)||{},f=r.current_fields||{},current=source226(html?.toString()||'');
 const failures=[],check=(v,k)=>{if(!v)failures.push(k)};
 check(JSON.stringify(e?.case_numbers)==='[226]'&&e?.records?.length===1,'one_exact_original_226');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_source_sha');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original_register');
 check(e?.original_corpus_modified===false&&e?.manual_certified===0&&e?.production_operations===0,'no_corpus_or_production_change');
 check(r.official_url===chosen226.url,'exact_original_official_url');
 check(r.status==='FETCHED'&&r.parser_ok===true,'guarded_current_official_html_actual_parser');
 check(!!html&&sha(html)===r.html_sha256&&html.length===r.html_bytes,'raw_html_sha256');
 check(current.identity&&r.selected_heading_identity_verified===true,'current_selected_identity');
 for(const [k,v] of Object.entries(current.direct))check(v,'direct_'+k);
 check(norm(f.name)===norm(chosen226.name),'parser_chosen_name');
 check(norm(f.roaster).includes('mighty beast'),'parser_roaster');
 check(flat(f.origin).includes('mogiana')&&flat(f.origin).includes('brazil'),'parser_specific_direct_origin');
 check(norm(f.roast_level)==='medium','parser_medium');
 check(norm(f.process)==='natural','parser_natural');
 check(['citrus','almond','dark chocolate'].every(x=>norm(f.tasting_notes).includes(x)),'parser_direct_flavor_notes');
 check(norm(f.producer).includes('diogo'),'parser_named_current_grower');
 check(!f.variety,'contextual_yellow_bourbon_not_chosen_cultivar');
 check(!f.decaffeination_method&&!f.elevation_m&&!f.espresso_recipe,'unpublished_facts_blank');
 check((r.conflicts||[]).length===0,'no_conflict');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'add_coffee_and_source_review');
 check(!(r.seo_fallback_fields||[]).some(k=>['origin','process','roast_level','tasting_notes','producer','variety'].includes(k)),'no_seo_borrowed_fields');
 const out={case:226,source_sha:e?.source_sha,passed:!failures.length,failures,current,parser:f,html_sha256:html?sha(html):null,evidence_sha256:raw?sha(raw):null,bytes:html?.length||0,all_603_manually_certified:false,production_operations:0};
 writeFileSync(join(dir,'r167-226-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R167 STRICT AFTERPROOF] '+JSON.stringify(out));
 if(failures.length)process.exitCode=1;
}
