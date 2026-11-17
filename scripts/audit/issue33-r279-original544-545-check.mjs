#!/usr/bin/env node
// Strict R279 selected current source NEGATIVE identity receipt, never manual 603 certification.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from './issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {selectedFlavoredProductLiteralNotes,isCoarseFlavoredProductTaxonomy} from '../../src/server/coffee-selected-flavored-taxonomy.mjs';
import {productCoffeeProse} from '../../src/server/coffee-product-prose.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const dir=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR||'/tmp/dic33-r279',errors=[];
const must=(x,why)=>{if(!x)errors.push(why)};
let report;
try{report=JSON.parse(readFileSync(join(dir,'focused-current-evidence.json'),'utf8'))}
catch(e){errors.push('source_report_missing_'+(e.code||e.message))}
must(JSON.stringify(report?.case_numbers)==='[544,545]'&&report?.records?.length===2,'exact_case_subset');
must(report?.original603_register_sha256==='2b086a56b2ba0b837fe6d6ab0fb3a34dab1605835adfbca2f469fb23c18ee353','unchanged_original603_source_csv');
must(report?.original_corpus_modified===false&&report?.manual_certified===0&&report?.production_operations===0,'original_not_rewritten_or_certified');
must(report?.source_sha===process.env.DIC_R279_EVENT_SHA,'event_sha');
must(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===process.env.DIC_R279_CHECKOUT_SHA,'checkout_sha');
const targets={
 544:{url:'https://www.readingcoffee.com/products/chai-cheesecake-fall-season-premium-flavored-coffee',prefix:'chai cheesecake',tokens:['chai','cheesecake','cardamom','ginger','cloves']},
 545:{url:'https://www.readingcoffee.com/products/its-bourbon-bacon-hon-fall-season-premium-flavored-coffee',prefix:"it's bourbon",tokens:['bourbon','bacon']}
};
must(requiredFocusedSourceFailures([544,545],report?.records||[],{negativeIdentityNumbers:[544,545]}).length===0,'required_negative_identity_and_review_surfaces');
const evidence=[];
for(const n of [544,545]){
 const t=targets[n],r=report?.records?.find(x=>x.number===n)||{},f=r.current_fields||{};
 let raw;try{raw=readFileSync(join(dir,'case-'+n+'.html'))}catch(e){errors.push(n+'_missing_html_'+(e.code||e.message))}
 const scoped=productMarkup(raw?.toString('utf8')||''),heads=selectedProductHeadings(scoped);
 if(n===545){
  const clean=(value,max=250)=>String(value||'').replace(/&amp;/giu,'&').replace(/&#39;/giu,"'")
    .replace(/<[^<>]{0,2000}>/gu,' ').replace(/\\s+/gu,' ').trim().slice(0,max);
  const blocks=productCoffeeProse(scoped,clean);
  const diag=selectedFlavoredProductLiteralNotes(scoped,{clean,existing:f.tasting_notes,sourceFacts:r.source_facts||[]});
  console.log('[DIC33 R279 DIRECT FLAVOR DIAG] '+JSON.stringify({
    parsed:f.tasting_notes,raw_h1:heads,category:isCoarseFlavoredProductTaxonomy(f.tasting_notes),
    sourceFacts:(r.source_facts||[]).filter(x=>x.field==='tasting_notes').slice(0,10),
    prose:blocks.filter(x=>x.tag==='h1'||x.tag==='h3'||x.tag==='p'&&/bourbon|bacon/i.test(x.text))
      .slice(0,12).map(x=>({tag:x.tag,section:x.section,educational:x.educational,text:x.text.slice(0,500)})),
    direct:diag,
    flags:(()=>{
      const fold=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
      const titleWords=fold(blocks.find(x=>x.tag==='h1')?.text).split(/\s+/u);
      const core=titleWords.slice(0,titleWords.slice(0,2).join(' ').length<6?4:2).join(' ');
      const noncurrent=/\b(?:not|never|without|neither|no|isn['’]t|wasn['’]t|doesn['’]t|rather than|unlike|generally|typically|usually|for example|for instance|such as|other coffees?|another (?:coffee|lot|farm)|different (?:coffee|lot)|previous (?:harvest|lot|crop|year)|last year|our coffees (?:are|tend)|most (?:of )?our coffees)\b/iu;
      const forbidden=/\b(?:with milk|in milk|when served|only when|if served|prepared with|syrup added|another coffee|other coffees|previous season|previous lot|formerly|historically|for example|typically)\b/iu;
      const eligible=blocks.filter(x=>x.tag==='p'&&x.text.length>=40&&x.text.length<=900&&
        !noncurrent.test(x.text)&&!forbidden.test(x.text)&&
        (fold(x.section).startsWith(core)||/^(?:description|product description|coffee description|about this coffee|about the coffee|coffee details|details|product information)$/u.test(fold(x.section))));
      return {
        core,eligible:eligible.map(x=>({length:x.text.length,section:x.section,
          infusion:/\bflavou?red coffee\b|\binfused(?:\s+[a-z-]+){0,4}\s+(?:roast\s+)?coffee\b/iu.test(x.text),
          one:x.text.match(/\b(?:notes?|hints?)\s+of\s+(?:(?:rich|velvety|smooth|creamy|oaky)\s+){0,3}([a-z]{3,24})(?=\s+(?:blend(?:s|ed)?|with|that|followed|balanced)\b|[,.;!?]|$)/iu)?.[1],
          smoky:x.text.match(/\bsmoky richness of\s+(?:crispy\s+)?([a-z]{3,24})(?=\s*[,.;!?]|\s|$)/iu)?.[1]
        }))
      };
    })()
  }));
 }
 const text=scoped.replace(/<(?:script|style|nav|aside|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|aside|footer)>/gi,' ').replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ').toLowerCase();
 let final;try{final=new URL(r.final_url)}catch{}
 must(r.status==='FETCHED'&&r.parser_ok===true&&r.official_url===t.url,n+'_current_exact_fetched_parser');
 must(final?.protocol==='https:'&&final.hostname==='www.readingcoffee.com'&&final.pathname===new URL(t.url).pathname,n+'_no_product_redirect');
 must(raw?.length>0&&raw.length===r.html_bytes&&hash(raw)===r.html_sha256,n+'_actual_raw_sha256');
 must(heads.length===1&&heads[0]===f.name&&heads[0].toLowerCase().startsWith(t.prefix)&&/fall coffee/i.test(heads[0]),n+'_one_current_selected_title');
 must(f.name!==r.archived_coffee&&!identicalCurrentSelectedTitle(r.archived_coffee,heads[0],f.name)&&r.selected_heading_identity_verified===false,n+'_preserve_historical_mismatch');
 must(r.original_product_not_certified===true&&r.current_identity_exception==='CHANGED_SELECTED_PRODUCT_EXPLICIT_NEGATIVE_DO_NOT_TRANSFER_ARCHIVED_FIELDS',n+'_negative_certification_receipt');
 must(t.tokens.every(w=>text.includes(w)),n+'_own_current_description_tokens');
 // The real selected-page regression must NEVER certify broad category chips
 // as direct selected tasting when own explicit infused flavor descriptions exist.
 if(n===544){
  for(const word of ['cinnamon','cardamom','ginger','cloves','cheesecake'])
   must(String(f.tasting_notes||'').toLowerCase().includes(word),n+'_direct_'+word);
 }else{
  for(const word of ['bourbon','bacon'])
   must(String(f.tasting_notes||'').toLowerCase().includes(word),n+'_direct_'+word);
 }
 must(!/sweet\s*&\s*sugary|grain\s*&\s*cereal/i.test(String(f.tasting_notes||'')),n+'_coarse_flavor_tags_not_direct_notes');
 must(!f.decaffeination_method,n+'_optional_decaf_not_selected_method');
 must(!/mango|raspberry/i.test(String(f.tasting_notes||'')),n+'_no_unrelated_sibling_notes');
 must(r.add_coffee_ui_rendered===true&&r.source_review_rendered===true,n+'_preview_review');
 evidence.push({number:n,status:r.status,raw_bytes:r.html_bytes,raw_sha256:r.html_sha256,selected_h1:heads,archived_name:r.archived_coffee,selected_fields:f,conflicts:r.conflicts||[],original_product_not_certified:true});
}
const out={passed:errors.length===0,errors,source_sha:process.env.DIC_R279_EVENT_SHA,checkout_sha:process.env.DIC_R279_CHECKOUT_SHA,manual_certified:0,production_operations:0,records:evidence};
writeFileSync(join(dir,'r279-afterproof.json'),JSON.stringify(out,null,2)+'\n');
console.log('[DIC33 R279 AFTERPROOF] '+JSON.stringify(out));
if(errors.length)process.exitCode=1;
