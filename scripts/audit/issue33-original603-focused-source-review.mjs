#!/usr/bin/env node
// Issue33: selected original603 public URLs; captures are NOT automatic certification.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {fetchPublicCoffeeHtml,safeCoffeeUrl,MAX_PRODUCT_RETRY_BYTES} from '../../src/server/coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {selectedCurrentCoffeeReleaseBadge} from '../../src/server/coffee-selected-source-evidence.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {productCoffeeProse} from '../../src/server/coffee-product-prose.mjs';
import {extractCoffeeBlendEvidence} from '../../src/server/coffee-blend-evidence.mjs';
import {sameHandleCollectionAlternate,identicalCurrentSelectedTitle} from './issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from './issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
const sha=value=>createHash('sha256').update(value).digest('hex');
const clip=(v,n=350)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n);
// Current bounded live-review default rotates to #19 only; historical named token cohorts remain pinned in workflow.
const defaultTargetNumbers=[19];
// The default workflow passes empty string; only nonempty overrides must validate.
const explicitTargetNumbers=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_NUMBERS || null;
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
const auditAlternateUrl=process.env.DIC_ISSUE33_FOCUSED_CURRENT_ALTERNATE_URL||'';
if(auditAlternateUrl&&targetNumbers.length!==1)throw Error('audit_alternate_requires_one_case');
const targets=targetNumbers.map(n=>{
 const x=all.filter(r=>Number(r.Number)===n);
 if(x.length!==1||!safeCoffeeUrl(x[0]['Exact Original Official URL']))throw Error('invalid_original603_case_'+n);
 return x[0];
});
const dest=process.env.DIC_ISSUE33_FOCUSED_PUBLIC_DIR;
if(!dest)throw Error('private_artifact_directory_required');
mkdirSync(dest,{recursive:true});
const verifiedAlternate=auditAlternateUrl?sameHandleCollectionAlternate(targets[0]['Exact Original Official URL'],auditAlternateUrl):null;
if(auditAlternateUrl&&!verifiedAlternate)throw Error('invalid_same_handle_official_alternate');
const records=[];
for(const target of targets){
 const r={number:Number(target.Number),case_id:target['Case ID'],archived_coffee:target.Coffee,
  official_url:target['Exact Original Official URL'],prior_review_decision:target.Decision,
  archived_current_extraction:JSON.parse(target['Current extraction']||'{}'),
  immutable_expected:JSON.parse(target['Original expected by field']||'{}'),
  status:'NOT_FETCHED',manual_certification:false};
 try{
  const original=await fetchPublicCoffeeHtml(r.official_url,{maxBytes:MAX_PRODUCT_RETRY_BYTES});
  if(!original?.ok)r.original_url_unavailable_reason=clip(original?.reason,160);
  const res=!original?.ok&&verifiedAlternate
   ?await fetchPublicCoffeeHtml(verifiedAlternate,{maxBytes:MAX_PRODUCT_RETRY_BYTES}):original;
  if(!original?.ok&&verifiedAlternate)r.alternate_url_attempted=verifiedAlternate;
  if(!res?.ok){r.status='UNAVAILABLE';r.reason=clip(res?.reason,160);}
  else{
   r.status='FETCHED';r.final_url=res.source_url||r.official_url;
   r.html_sha256=sha(res.html);r.html_bytes=Buffer.byteLength(res.html,'utf8');
   const selected=productMarkup(res.html);
   r.selected_h1=[...selected.matchAll(/<h1\b[^>]{0,500}>([\s\S]{0,1800}?)<\/h1>/gi)]
     .slice(0,4).map(m=>clip(m[1].replace(/<[^>]+>/g,' '),200));
   // Diagnostic provenance only: an old SEO page title may name a DIFFERENT
   // coffee even while the current selected product H1 and body are correct.
   // Never use this as a canonical identity or field assertion.
   r.html_title=clip((res.html.match(/<title\b[^<>]{0,500}>([\s\S]{0,1000}?)<\/title>/i)||[])[1]
     ?.replace(/<[^<>]{0,300}>/g,' ')||'',220);
   r.html_artifact='case-'+r.number+'.html';
   writeFileSync(join(dest,r.html_artifact),res.html,'utf8');
   const p=extractPublicCoffeeFacts(res.html,{source_url:r.final_url});
   r.parser_ok=p?.ok===true;r.parser_reason=clip(p?.reason,140);
   if(r.alternate_url_attempted){
    r.alternate_identity_match=r.parser_ok&&r.selected_h1.some(h=>identicalCurrentSelectedTitle(target.Coffee,h,p.fields?.name));
    if(!r.alternate_identity_match){r.status='IDENTITY_MISMATCH';r.parser_ok=false;r.reason='alternate_selected_identity_unconfirmed';}
   }
   if(p?.ok){
    r.current_fields=Object.fromEntries(Object.entries(p.fields||{})
      .filter(([,v])=>v!=null&&typeof v!=='object').map(([k,v])=>[k,clip(v,400)]));
    r.conflicts=p.conflicts||[];
    r.source_facts=(p.source_facts||[]).slice(0,45).map(f=>({
      label:clip(f.label,120),field:clip(f.field,80),value:clip(f.value,360),source_url:clip(f.source_url,320),section:clip(f.section,110),
      source_type:clip(f.source_type,55),conflicting:f.conflicting===true}));
    r.add_coffee_ui_rendered=coffeeUrlPreviewMarkup(p).includes('coffee-url-preview');
    r.source_review_rendered=!!coffeeSourceReviewSnapshot({...p,source_url:r.final_url});
    // #154/#196 real selected-product AFTER-test. This is a bounded current
    // official-source contract, not a universal 603-coffee certification.
    // A changed/unavailable identity must FAIL and return for human review;
    // never substitute a prior lot, SEO/menu copy or another farm.
    const selectedRoleContract={
      154:{h1:'Colombia José Giraldo Entre Montañas',producer:'José Giraldo',farm:'Las Marias',process:'Washed'},
      196:{h1:'El Silencio — Chiroso Washed',producer:'El Silencio (Alex Metrio)',process:'Anaerobic'}
    }[r.number];
    if(selectedRoleContract){
      r.selected_role_contract={
        source_h1: r.selected_h1,
        observed_producer:r.current_fields?.producer||null,
        observed_farm:p.roaster_details?.farm||null,
        observed_process:r.current_fields?.process||null,
        expected:selectedRoleContract
      };
      r.selected_role_contract_passed=
        r.selected_h1.length===1 && r.selected_h1[0]===selectedRoleContract.h1 &&
        r.current_fields?.producer===selectedRoleContract.producer &&
        r.current_fields?.process===selectedRoleContract.process &&
        (!selectedRoleContract.farm||p.roaster_details?.farm===selectedRoleContract.farm) &&
        r.add_coffee_ui_rendered && r.source_review_rendered;
      console.log('[DIC33 CURRENT SELECTED GROWER ESTATE ROLE ACCEPTANCE] '+JSON.stringify({
        number:r.number,source_sha256:r.html_sha256,
        ...r.selected_role_contract,passed:r.selected_role_contract_passed
      }));
    }

    // Original603 #25 exact current selected Coffee profile MUST preserve
    // both its published aromas and flavors, not only the latter clause.
    // This is an exact-source live contract, never an automatic 603 sign-off.
    if(r.number===25){
      const notes=r.current_fields?.tasting_notes||'';
      const ownText=selected.replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ');
      r.selected_25_contract={
        exact_selected_h1:r.selected_h1,parsed_name:r.current_fields?.name||null,
        source_sha256:r.html_sha256,parsed_notes:notes,
        selected_profile_printed:/Coffee profile:\s*Coffee features floral, fruity, and sweet aromas of vanilla and pipe tobacco, with rich, lush, and smooth flavors of black cherry, tobacco, and cocoa/i.test(ownText),
        current_conflicts:r.conflicts||[]
      };
      r.selected_25_contract_passed=r.selected_h1.length===1&&
        r.selected_h1[0]==='Sumatra Mandheling| Fair Trade Organic'&&
        r.current_fields?.name===r.selected_h1[0]&&
        r.selected_25_contract.selected_profile_printed&&
        ['floral','fruity','vanilla','pipe tobacco','black cherry','tobacco','cocoa'].every(word=>notes.toLowerCase().includes(word))&&
        r.current_fields?.origin==='Sumatra'&&
        !r.current_fields?.process&&!r.current_fields?.roast_level&&
        !(r.conflicts||[]).includes('tasting_notes')&&
        r.add_coffee_ui_rendered&&r.source_review_rendered;
      console.log('[DIC33 #25 COMPLETE SELECTED COFFEE PROFILE CONTRACT] '+JSON.stringify({
        number:r.number,...r.selected_25_contract,passed:r.selected_25_contract_passed
      }));
    }

    // Original603 #527 strict post-fix current official selected product.
    // Do not use menu, related-coffee or historic SEO to create a false pear.
    if(r.number===527){
      const exactSource=selected;
      const notes=r.current_fields?.tasting_notes||'';
      r.selected_527_contract={
        current_h1:r.selected_h1,source_sha256:r.html_sha256,
        parsed_name:r.current_fields?.name||null,parsed_notes:notes,
        same_product_named_story:/The Kenya Peaberry offers notes of honeydew melon and pear, with a hint of jasmine/i.test(
          exactSource.replace(/<[^>]{0,2000}>/g,' ').replace(/\s+/g,' ')),
        conflicts:r.conflicts||[]
      };
      r.selected_527_contract_passed=r.selected_h1.length===1&&
        r.selected_h1[0]==='Kenya Peaberry'&&r.current_fields?.name==='Kenya Peaberry'&&
        r.selected_527_contract.same_product_named_story&&
        ['Honeydew Melon','pear','Jasmine','Red Wine'].every(note=>notes.toLowerCase().includes(note.toLowerCase()))&&
        !(r.conflicts||[]).includes('tasting_notes')&&
        r.add_coffee_ui_rendered&&r.source_review_rendered;
      console.log('[DIC33 #527 EXACT SELECTED NAMED NOTE AFTER CONTRACT] '+JSON.stringify({
        number:r.number,...r.selected_527_contract,passed:r.selected_527_contract_passed
      }));
    }

    // Original603 #97: a selected product can declare decaf even when the
    // exact H1 lacks the word Decaf. The selected same-product accordion,
    // not DEKAF brand/navigation or decaffeination education, proves METHOD.
    // A changed lot/identity, missing method, spurious green process or
    // failure to render explicit Add Coffee/Source Review fails closed.
    if(r.number===97){
      r.selected_97_contract={
        exact_selected_h1:r.selected_h1,
        source_sha256:r.html_sha256,
        parsed_name:r.current_fields?.name||null,
        water_decaffeination_method:r.current_fields?.decaffeination_method||null,
        green_processing:r.current_fields?.process||null,
        method_source_fact:(p.source_facts||[]).filter(x=>
          x.field==='decaffeination_method'&&/swiss[\s-]*water/i.test(x.value||'')).slice(0,4)
          .map(x=>clip(x.value,240)),
        conflicts:r.conflicts||[]
      };
      r.selected_97_contract_passed=r.selected_h1.length===1&&
        r.selected_h1[0]==='Brazil Arabela'&&r.current_fields?.name==='Brazil Arabela'&&
        r.current_fields?.decaffeination_method==='Water Process'&&
        !r.current_fields?.process&&r.selected_97_contract.method_source_fact.length>0&&
        !(r.conflicts||[]).includes('decaffeination_method')&&
        r.add_coffee_ui_rendered&&r.source_review_rendered;
      console.log('[DIC33 #97 EXACT SELECTED DECAF AFTER CONTRACT] '+JSON.stringify({
        number:r.number,...r.selected_97_contract,passed:r.selected_97_contract_passed
      }));
    }

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


    // Original603 #475 post-merge mismatch: synthetic labeled blend now
    // refines Santa Ana but actual selected official parser still omits it.
    // Bounded public-only evidence to isolate whether current source has a
    // complete labeled component group and an intact direct-prose clause.
    if(r.number===475){
      const decode=value=>String(value||'').replace(/<[^<>]{0,2000}>/g,' ')
        .replace(/&(?:amp|nbsp);/gi,' ').replace(/\s+/g,' ').trim().slice(0,6001);
      const blend=extractCoffeeBlendEvidence(selected,{name:p.fields?.name||'',scoped:true});
      const clauses=productCoffeeProse(selected,decode)
        .filter(block=>/\b(?:Pacas Family|Santa Ana|several farms|we paired)\b/i.test(block.text))
        .slice(0,10).map(block=>({tag:block.tag,section:clip(block.section,90),
          educational:block.educational,text:clip(block.text,650)}));
      console.log('[DIC33 SELECTED #475 COMPONENT TRACE] '+JSON.stringify({
        number:r.number,html_sha256:r.html_sha256,selected_h1:r.selected_h1,
        blend_component_format:blend?.component_format||null,
        blend_component_count:blend?.components||null,
        blend_region_claim:blend?.origin||null,
        current_parser_origin:r.current_fields?.origin||null,
        selected_clause_blocks:clauses
      }));
    }

    // Diagnostic: the selected Breakfast Blend details itself prints two
    // incompatible direct flavor sets; neither is another coffee's proof.
    // Keep their selected HTML placement and source-review provenance visible.
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
        selected_flavor_caption_conflicts:r.source_facts?.some(f=>f.field==='tasting_notes'&&f.conflicting&&/Nutmeg.*Vanilla/i.test(f.value)),
        contexts
      }));
    }

   }
  }
 }catch(e){r.status='ERROR';r.error=clip(e?.name||'Error',100);}
 records.push(r);
 console.log('[DIC33 FOCUSED SOURCE] '+JSON.stringify({number:r.number,status:r.status,h1:r.selected_h1||[],
  name:r.current_fields?.name||null,parser_ok:r.parser_ok===true,sha256:r.html_sha256||null,
  original_unavailable_reason:r.original_url_unavailable_reason||null,alternate:r.alternate_url_attempted||null,identity_match:r.alternate_identity_match??null}));

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
const requiredSourceFailures=requiredFocusedSourceFailures(targetNumbers,records);
if(requiredSourceFailures.length){
 console.error('[DIC33 FOCUSED REQUIRED CURRENT SOURCE UNVERIFIED] '+JSON.stringify({
  source_sha:summary.source_sha,required_cases:targetNumbers,failures:requiredSourceFailures
 }));
 process.exitCode=1;
}
// Issue #33 exact selected-station post-merge official fifth20 source recheck; no parser change.
// Issue #33 second exact current selected Chelchele post-PR341 public fifth20 source readback.

const selectedRole154Control196=targetNumbers.length===2 && targetNumbers.includes(154) && targetNumbers.includes(196);
if(selectedRole154Control196 &&
 (summary.fetched!==2 || summary.parsed!==2 || records.some(r=>r.selected_role_contract_passed!==true))){
 console.error('[DIC33 SELECTED ROLE REAL OFFICIAL INCOMPLETE] '+JSON.stringify({
  source_sha:summary.source_sha,attempted:records.length,
  fetched:summary.fetched,parsed:summary.parsed,
  cases:records.map(r=>({number:r.number,status:r.status,h1:r.selected_h1,
   producer:r.current_fields?.producer||null,farm:r.selected_role_contract?.observed_farm||null,
   selected_role_contract_passed:r.selected_role_contract_passed===true}))
 }));
 process.exitCode=1;
}


// Original603 #25: strictly prove current exact selected-source aroma+flavor
// completeness, chosen H1 and actual Add Coffee and source-review outputs.
if(targetNumbers.includes(25)){
 const r=records.find(r=>r.number===25);
 if(!r||r.status!=='FETCHED'||!r.parser_ok||r.selected_25_contract_passed!==true){
  console.error('[DIC33 #25 OFFICIAL CURRENT COMPLETE PROFILE UNVERIFIED] '+
   JSON.stringify({source_sha:summary.source_sha,status:r?.status,h1:r?.selected_h1,
    fields:r?.current_fields,proof:r?.selected_25_contract}));
  process.exitCode=1;
 }
}

// #527 literal pear current exact selected-source after contract (not 603).
if(targetNumbers.includes(527)){
 const r=records.find(r=>r.number===527);
 if(!r||r.status!=='FETCHED'||r.parser_ok!==true||r.selected_527_contract_passed!==true){
  console.error('[DIC33 #527 OFFICIAL CURRENT LITERAL COMPLETENESS UNVERIFIED] '+
   JSON.stringify({source_sha:summary.source_sha,status:r?.status,h1:r?.selected_h1,
    fields:r?.current_fields,proof:r?.selected_527_contract,passed:r?.selected_527_contract_passed}));
  process.exitCode=1;
 }
}

// Original603 #97 after-merge public-only source acceptance (not 603 certification).
if(targetNumbers.length===1 && targetNumbers[0]===97 &&
 (summary.fetched!==1 || summary.parsed!==1 || records[0].selected_97_contract_passed!==true)){
 console.error('[DIC33 #97 OFFICIAL AFTER CONTRACT UNVERIFIED] '+JSON.stringify({
  source_sha:summary.source_sha,fetched:summary.fetched,parsed:summary.parsed,
  status:records[0]?.status,h1:records[0]?.selected_h1,
  observed_method:records[0]?.current_fields?.decaffeination_method||null,
  contract_passed:records[0]?.selected_97_contract_passed===true
 }));
 process.exitCode=1;
}
