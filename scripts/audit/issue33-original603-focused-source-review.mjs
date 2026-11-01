#!/usr/bin/env node
// Issue33: selected original603 public URLs; captures are NOT automatic certification.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {fetchPublicCoffeeHtml,safeCoffeeUrl,MAX_PRODUCT_RETRY_BYTES} from '../../src/server/coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedCurrentCoffeeReleaseBadge} from '../../src/server/coffee-selected-source-evidence.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
const sha=value=>createHash('sha256').update(value).digest('hex');
const clip=(v,n=350)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n);
const defaultTargetNumbers=[1,13,22,28,37,91,205];
const explicitTargetNumbers=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_NUMBERS;
if(explicitTargetNumbers!=null &&
 !/^[1-9][0-9]{0,2}(?:,[1-9][0-9]{0,2}){0,19}$/.test(explicitTargetNumbers))
 throw Error('invalid_bounded_original603_case_subset');
const targetNumbers=explicitTargetNumbers?explicitTargetNumbers.split(',').map(Number):defaultTargetNumbers;
if(targetNumbers.some(n=>n>603)||new Set(targetNumbers).size!==targetNumbers.length)
 throw Error('invalid_duplicate_or_out_of_range_original603_cases');
function csv(text){
 const rows=[];let arr=[],s='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(quoted){if(c==='"'&&text[i+1]==='"'){s+='"';i++;}else if(c==='"')quoted=false;else s+=c;}
  else if(c==='"')quoted=true;
  else if(c===','){arr.push(s);s='';}
  else if(c==='\n'){arr.push(s);rows.push(arr);arr=[];s='';}
  else if(c!=='\r')s+=c;
 }
 if(quoted)throw Error('unterminated_csv');
 if(s||arr.length){arr.push(s);rows.push(arr);}
 const header=rows.shift();
 return rows.filter(r=>r.length===header.length).map(r=>Object.fromEntries(header.map((k,i)=>[k,r[i]])));
}
const bytes=readFileSync(new URL('../../docs/audits/issue33-original603-source-level-adjudication-20261029.csv',import.meta.url));
const all=csv(bytes.toString('utf8'));
if(all.length!==603||new Set(all.map(r=>r['Case ID'])).size!==603)throw Error('original603_identity_invariant');
const targets=targetNumbers.map(n=>{
 const x=all.filter(r=>Number(r.Number)===n);
 if(x.length!==1||!safeCoffeeUrl(x[0]['Exact Original Official URL']))throw Error('invalid_original603_case_'+n);
 return x[0];
});
const dest=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dest)throw Error('private_artifact_directory_required');
mkdirSync(dest,{recursive:true});
const records=[];
for(const target of targets){
 const r={number:Number(target.Number),case_id:target['Case ID'],archived_coffee:target.Coffee,
  official_url:target['Exact Original Official URL'],prior_review_decision:target.Decision,
  archived_current_extraction:JSON.parse(target['Current extraction']||'{}'),
  immutable_expected:JSON.parse(target['Original expected by field']||'{}'),
  status:'NOT_FETCHED',manual_certification:false};
 try{
  const res=await fetchPublicCoffeeHtml(r.official_url,{maxBytes:MAX_PRODUCT_RETRY_BYTES});
  if(!res?.ok){r.status='UNAVAILABLE';r.reason=clip(res?.reason,160);}
  else{
   r.status='FETCHED';r.final_url=res.source_url||r.official_url;
   r.html_sha256=sha(res.html);r.html_bytes=Buffer.byteLength(res.html,'utf8');
   const selected=productMarkup(res.html);
   r.selected_h1=[...selected.matchAll(/<h1\b[^>]{0,500}>([\s\S]{0,1800}?)<\/h1>/gi)]
     .slice(0,4).map(m=>clip(m[1].replace(/<[^>]+>/g,' '),200));
   r.html_artifact='case-'+r.number+'.html';
   writeFileSync(join(dest,r.html_artifact),res.html,'utf8');
   const p=extractPublicCoffeeFacts(res.html,{source_url:r.final_url});
   r.parser_ok=p?.ok===true;r.parser_reason=clip(p?.reason,140);
   if(p?.ok){
    r.current_fields=Object.fromEntries(Object.entries(p.fields||{})
      .filter(([,v])=>v!=null&&typeof v!=='object').map(([k,v])=>[k,clip(v,400)]));
    r.conflicts=p.conflicts||[];
    r.source_facts=(p.source_facts||[]).slice(0,45).map(f=>({
      field:clip(f.field,80),value:clip(f.value,360),section:clip(f.section,110),
      source_type:clip(f.source_type,55),conflicting:f.conflicting===true}));
    r.add_coffee_ui_rendered=coffeeUrlPreviewMarkup(p).includes('coffee-url-preview');
    r.source_review_rendered=!!coffeeSourceReviewSnapshot({...p,source_url:r.final_url});
    // Independent exact selected current #490 H1/price badge acceptance:
    // never treat general navigation or customer-review prose as a release.
    if(r.number===490){
     r.selected_price_badge=selectedCurrentCoffeeReleaseBadge(selected,{name:r.current_fields?.name||''});
     r.selected_price_badge_accepted=r.selected_price_badge?
      r.current_fields?.release_label===r.selected_price_badge:null;
     console.log('[DIC33 SELECTED PRICE BADGE] '+JSON.stringify({
      number:r.number,selected_h1:r.selected_h1,source_sha256:r.html_sha256,
      literal_selected_price_badge:r.selected_price_badge||null,
      parsed_release_label:r.current_fields?.release_label||null,
      acceptance:r.selected_price_badge_accepted
     }));
    }


    // Diagnostic only: a DIFFERENT Lowcountry coffee's flavor appears in
    // review-only source_facts for Breakfast Blend. Find the precise public
    // HTML product scope/ancestor rather than silently filtering genuine
    // selected-product conflicting labels. No page content is changed.
    if(r.number===205){
      const selectedHtml=productMarkup(res.html);
      const pattern=/Nutmeg[\s\S]{0,160}(?:Whole Bean )?Vanilla[\s\S]{0,160}(?:Creamy )?Butter/gi;
      const contexts={};
      for(const [kind,html] of [['raw',res.html],['selected_markup',selectedHtml]]){
        const matches=[...html.matchAll(pattern)].slice(0,3);
        contexts[kind]={matches:matches.length,fragments:matches.map(match=>{
          const at=match.index;
          return clip(html.slice(Math.max(0,at-1100),Math.min(html.length,at+650)),1750);
        })};
      }
      console.log('[DIC33 LOWCOUNTRY PUBLIC RELATED-SCOPE DIAG] '+JSON.stringify({
        case:205,correct_selected_tasting_notes:r.current_fields?.tasting_notes,
        unrelated_fact_retained:r.source_facts?.some(f=>f.field==='tasting_notes'&&/Nutmeg.*Vanilla/i.test(f.value)),
        contexts
      }));
    }

   }
  }
 }catch(e){r.status='ERROR';r.error=clip(e?.name||'Error',100);}
 records.push(r);
 console.log('[DIC33 FOCUSED SOURCE] '+JSON.stringify({number:r.number,status:r.status,h1:r.selected_h1||[],
  name:r.current_fields?.name||null,parser_ok:r.parser_ok===true,sha256:r.html_sha256||null}));

 // Manual semantic review needs the actual publicly published field claims,
 // not just seven green parse outcomes. These are bounded *public* product
 // facts already in the private one-day artifact, never member credentials.
 console.log('[DIC33 FOCUSED PUBLIC FIELD EVIDENCE] '+JSON.stringify({
  number:r.number,official_url:r.official_url,current_h1:r.selected_h1||[],
  archived_expected:r.immutable_expected,current_fields:r.current_fields||{},
  conflicts:r.conflicts||[],evidence:(r.source_facts||[]).slice(0,25).map(f=>({
   field:f.field,value:clip(f.value,240),section:f.section,
   source_type:f.source_type,conflicting:f.conflicting
  }))
 }));

}
const summary={schema_version:1,kind:'ORIGINAL603_FOCUSED_CURRENT_SOURCE_NOT_AUTOMATIC_CERTIFICATION',
 source_sha:process.env.GITHUB_SHA||null,utc:new Date().toISOString(),
 original603_register_sha256:sha(bytes),case_numbers:targetNumbers,
 fetched:records.filter(x=>x.status==='FETCHED').length,
 parsed:records.filter(x=>x.parser_ok===true).length,manual_certified:0,
 public_only:true,original_corpus_modified:false,production_operations:0,real_auth:false,
 records};
writeFileSync(join(dest,'focused-current-evidence.json'),JSON.stringify(summary,null,2)+'\n');
console.log('[DIC33 FOCUSED SUMMARY] '+JSON.stringify({attempted:records.length,fetched:summary.fetched,
 parsed:summary.parsed,manual_certified:0}));
if(records.length!==targetNumbers.length||records.some(x=>x.status==='FETCHED'&&(!x.parser_ok||!x.add_coffee_ui_rendered||x.selected_price_badge_accepted===false)))process.exitCode=1;
