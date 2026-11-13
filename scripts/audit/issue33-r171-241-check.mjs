#!/usr/bin/env node
// Issue33 R171: distinguish two contradictory current Buesaco sensory descriptions.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {removeElements} from '../../supabase/functions/_shared/html-scan.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/gu,' ').trim().replace(/\s+/gu,' ');
const flat=x=>norm(x).replace(/\s+/gu,'');
export const chosen241=Object.freeze({number:241,name:'Buesaco',url:'https://novocoffee.com/product/buesaco'});
export function source241(html){
 const chosen=productMarkup(String(html||'')),headings=selectedProductHeadings(chosen);
 const visible=removeElements(chosen,['script','style','noscript','template','nav','aside','footer','header','select']).replace(/<[^>]{0,3000}>/gu,' ');
 const text=flat(visible),has=x=>text.includes(flat(x));
 return {headings,identity:headings.length===1&&norm(headings[0])===norm(chosen241.name),
  direct:{hero_notes:has('tangerine maple hazelnut'),harvest_notes:has('tasting notes cherry tangerine nougat'),
   process:has('process washed'),producer:has('producer smallholder farms'),
   variety:has('variety castillo caturra colombia'),elevation:has('elevation 2100m'),
   region:has('buesaco sits in the narino department')||has('buesaco narino in southern colombia')},
  distinct_selected_lists:has('tangerine maple hazelnut')&&has('tasting notes cherry tangerine nougat'),
  filter_recipe_not_espresso:has('kalita wave 155')&&has('ratio 1 18')};
}
if(process.env.DIC_ISSUE33_R171_VERIFY==='1'){
 const dir=resolve(process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'.');mkdirSync(dir,{recursive:true});
 let raw,e,html;try{raw=readFileSync(join(dir,'focused-current-evidence.json'));e=JSON.parse(raw.toString())}catch{}
 try{html=readFileSync(join(dir,'case-241.html'))}catch{}
 const r=e?.records?.find(x=>x.number===241)||{},f=r.current_fields||{},current=source241(html?.toString()||'');
 const failures=[],check=(v,k)=>{if(!v)failures.push(k)};
 check(JSON.stringify(e?.case_numbers)==='[241]'&&e?.records?.length===1,'one_original_241');
 check(e?.source_sha===process.env.GITHUB_SHA,'exact_tested_source_sha');
 check(e?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','immutable_original_register');
 check(e?.original_corpus_modified===false&&e?.manual_certified===0&&e?.production_operations===0,'no_corpus_or_production_mutation');
 check(r.official_url===chosen241.url,'exact_original_url');
 check(r.status==='FETCHED'&&r.parser_ok===true,'guarded_current_source_and_real_parser');
 check(!!html&&sha(html)===r.html_sha256&&html.length===r.html_bytes,'raw_html_integrity');
 check(current.identity&&r.selected_heading_identity_verified===true,'current_selected_identity');
 for(const [k,v] of Object.entries(current.direct))check(v,'direct_'+k);
 check(current.distinct_selected_lists,'two_distinct_current_selected_sensory_descriptions');
 check(norm(f.name)==='buesaco','chosen_product_name');
 check(norm(f.roaster).includes('novo'),'current_selected_roaster');
 check(norm(f.process)==='washed','selected_washed');
 check(norm(f.origin).includes('colombia'),'selected_origin_country');
 check(!f.espresso_recipe,'kalita_filter_recipe_not_espresso');
 check(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,'add_coffee_and_source_review');
 const conflicting=(r.conflicts||[]).some(x=>String(x.field||x.key||'').toLowerCase()==='tasting_notes');
 // Different directly published lists must be reviewable rather than silently
 // resolving an unproven sensory winner. This is an acceptance diagnostic,
 // not an instruction to manufacture a canonical combination.
 check(conflicting||(!f.tasting_notes&&r.source_review_rendered===true),'same_selected_sensory_disagreement_not_silently_autofilled');
 const out={case:241,source_sha:e?.source_sha,passed:failures.length===0,failures,current,fields:f,conflicts:r.conflicts||[],html_sha256:html?sha(html):null,evidence_sha256:raw?sha(raw):null,html_bytes:html?.length||0,all_603_manually_certified:false,production_operations:0};
 writeFileSync(join(dir,'r171-241-afterproof.json'),JSON.stringify(out,null,2)+'\n');
 console.log('[DIC33 R171 selected Buesaco acceptance] '+JSON.stringify(out));
 if(failures.length)process.exitCode=1;
}