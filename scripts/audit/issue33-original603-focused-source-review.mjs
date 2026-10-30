#!/usr/bin/env node
// Issue33: selected original603 public URLs; captures are NOT automatic certification.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {fetchPublicCoffeeHtml,safeCoffeeUrl,MAX_PRODUCT_RETRY_BYTES} from '../../src/server/coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {productMarkup} from '../../src/server/coffee-product-scope.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';
const sha=value=>createHash('sha256').update(value).digest('hex');
const clip=(v,n=350)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n);
const targetNumbers=[1,13,22,28,37,91,205];
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
   }
  }
 }catch(e){r.status='ERROR';r.error=clip(e?.name||'Error',100);}
 records.push(r);
 console.log('[DIC33 FOCUSED SOURCE] '+JSON.stringify({number:r.number,status:r.status,h1:r.selected_h1||[],
  name:r.current_fields?.name||null,parser_ok:r.parser_ok===true,sha256:r.html_sha256||null}));
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
if(records.length!==targetNumbers.length||records.some(x=>x.status==='FETCHED'&&(!x.parser_ok||!x.add_coffee_ui_rendered)))process.exitCode=1;
