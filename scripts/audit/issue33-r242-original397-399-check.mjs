#!/usr/bin/env node
// Issue #33 R242 independent raw-source current Victus selected-product afterproof.
// Live seller/source disagreements are reviewable, never guessed into canonical data.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dir)throw Error('missing_selected_source_dir');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const summary=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'));
const cases=[
 {n:397,name:'Nero - Dark Roast Blend',url:'https://victuscoffee.com/products/nero-blend',
  roast:'Dark',notes:['chocolate'],no:['raspberry','marshmallow']},
 {n:398,name:'Veloce - Light Roast Blend',url:'https://victuscoffee.com/products/veloce-blend',
  roast:'Light',notes:['chocolate','fruit'],no:['raspberry','marshmallow']},
 {n:399,name:'Victoria - Medium Roast Blend',url:'https://victuscoffee.com/products/victoria-blend',
  roast:'Medium',notes:['milk chocolate','fruit'],no:['raspberry','marshmallow']}
];
const has=(v,s)=>String(v||'').toLocaleLowerCase().includes(s.toLocaleLowerCase());
const failures=[],records=[];
if(head!==process.env.DIC_R242_HEAD)failures.push('wrong_exact_source_git_head');
if(JSON.stringify(summary.case_numbers)!=='[397,398,399]'||
 JSON.stringify(summary.negative_identity_case_numbers||[])!=='[]'||
 summary.records?.length!==3||
 summary.original603_register_sha256!=='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353')
 failures.push('immutable_original603_or_target_mismatch');
if(summary.manual_certified!==0||summary.original_corpus_modified!==false||
 summary.production_operations!==0)failures.push('unsupported_corpus_or_provider_claim');
for(const c of cases){
 const row=summary.records.find(x=>x.number===c.n)||{},errors=[];
 let raw=Buffer.alloc(0);
 try{raw=readFileSync(join(dir,'case-'+c.n+'.html'));}catch{errors.push('selected_raw_html_missing');}
 const digest=createHash('sha256').update(raw).digest('hex');
 const parsed=raw.length?extractPublicCoffeeFacts(raw.toString('utf8'),{source_url:row.final_url||c.url}):{};
 const f=parsed.fields||{},conflicts=parsed.conflicts||[];
 if(row.status!=='FETCHED'||row.official_url!==c.url||row.parser_ok!==true)
  errors.push('exact_selected_original_official_url_unfetched_or_unparsed');
 if(raw.length<1000||raw.length!==row.html_bytes||digest!==row.html_sha256)
  errors.push('raw_bytes_or_sha256_mismatch');
 if(row.selected_heading_identity_verified!==true||
    String(f.name||'').toLocaleLowerCase()!==c.name.toLocaleLowerCase())
  errors.push('current_selected_product_heading_or_name_unqualified');
 if(row.add_coffee_ui_rendered!==true||row.source_review_rendered!==true)
  errors.push('actual_add_coffee_or_source_review_missing');
 if(f.roast_level!==c.roast&&!conflicts.includes('roast_level'))
  errors.push('direct_selected_roast_missing_without_review:'+c.roast);
 for(const note of c.notes)if(!has(f.tasting_notes,note)&&!conflicts.includes('tasting_notes'))
  errors.push('direct_selected_tasting_notes_missing_without_review:'+note);
 for(const note of c.no)if(has(f.tasting_notes,note))
  errors.push('customer_review_or_sibling_notes_contamination:'+note);
 for(const field of ['origin','process','producer','variety','release_label'])
  if(f[field])errors.push('unpublished_selected_'+field+'_invented');
 if(parsed.roaster_recipe?.dose_g||parsed.roaster_recipe?.yield_g||parsed.roaster_recipe?.time_s)
  errors.push('grind_option_or_espresso_suitability_misread_as_numeric_recipe');
 records.push({number:c.n,url:c.url,bytes:raw.length,sha256:digest,
  fields:f,identity_verified:row.selected_heading_identity_verified===true,
  conflicts,errors});
 failures.push(...errors.map(e=>c.n+':'+e));
}
const report={source_sha:head,passed:failures.length===0,
 verified_selected_cases:failures.length?[]:[397,398,399],
 original603_all_individually_certified:false,production_operations:0,records,failures};
writeFileSync(join(dir,'r242-afterproof.json'),JSON.stringify(report,null,2)+'\n');
console.log('[DIC33 R242 VICTUS SELECTED] '+JSON.stringify(report).slice(0,30000));
if(failures.length)throw Error(failures.join(','));
