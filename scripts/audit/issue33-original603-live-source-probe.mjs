// Owner-authorized 603 independent official-source capture on exact merged source; source-only, no certification from parse.
#!/usr/bin/env node
// Read-only live HTTPS source evidence for each immutable original603 URL.
// This does not authorize an outdated oracle to override a current product.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {fetchPublicCoffeeHtml,safeCoffeeUrl,MAX_PRODUCT_RETRY_BYTES} from '../../src/server/coffee-url-guard.mjs';
import {extractPublicCoffeeFacts} from '../../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../../site/cloud/coffee-url-autofill.js';

const sources=[
 ['extractor-600-oracle-a.json','2cc77e02828d640f342ef73597b550e8892cfa354882977254d2b9697b960c64'],
 ['extractor-600-oracle-b.json','cd2ce6b8ff09bdaf4fedbeaad3b7556efe0c42607cc04229563a90a32ecef72b'],
 ['extractor-600-oracle-c.json','60c00a8f61f06af1858ebdae7ace408987cb79d80014552f03cb724afc71cbee'],
 ['extractor-600-oracle-root.json','088034be3484a543b3b36d76420b3567f8b3cd708ee266e2c45da9996c6f2e0e'],
 ['extractor-600-oracle-root-extra-c.json','7b9cb91e7e6f6426162af761557c8ebde9c91726509ed919939351c2014215b8']
];
const hash=value=>createHash('sha256').update(value).digest('hex');
const original=[];
for(const [file,expectedSha] of sources){
 const bytes=readFileSync(new URL('../../docs/audits/'+file,import.meta.url));
 if(hash(bytes)!==expectedSha)throw Error('Immutable source oracle altered: '+file);
 original.push(...JSON.parse(bytes));
}
const groups=new Map(),urls=new Set();
for(const row of original){
 if(!row?.roaster_id||!row?.case_id||!safeCoffeeUrl(row.source_url)||urls.has(row.source_url))
  throw Error('Invalid original frozen identity');
 urls.add(row.source_url);
 const a=groups.get(row.roaster_id)||[];a.push(row);groups.set(row.roaster_id,a);
}
if(original.length!==603||groups.size!==201||
 [...groups.values()].some(a=>a.length!==3))throw Error('Frozen 603/201/3 corpus changed');
const shard=Number(process.env.DIC_ORIGINAL603_SHARD);
if(!Number.isInteger(shard)||shard<0||shard>2)throw Error('Explicit isolated shard 0/1/2 required');
const rows=[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([,a])=>a.sort((x,y)=>x.case_id.localeCompare(y.case_id))[shard]);
if(rows.length!==201)throw Error('Missing original cohort member');
const dest=process.env.DIC_ORIGINAL603_PUBLIC_CAPTURE_DIR;
if(!dest)throw Error('Explicit private artifact directory required');
mkdirSync(dest,{recursive:true});
const clamp=(value,len=500)=>String(value??'').replace(/\s+/g,' ').trim().slice(0,len);
const folded=value=>clamp(value,280).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const outcomes=[];
async function capture(row){
 const o={case_id:row.case_id,roaster_id:row.roaster_id,
  original_coffee:clamp(row.canonical?.name?.value,230),
  original_official_url:row.source_url,
  http_source_status:'NOT_FETCHED',current_identity_status:'UNVERIFIED',
  current_fields:{},current_conflicts:[],current_context:[],
  preview:{rendered:false,conflict_review:false,source_review:false}};
 try{
  const response=await fetchPublicCoffeeHtml(row.source_url,{maxBytes:MAX_PRODUCT_RETRY_BYTES});
  if(!response?.ok){o.http_source_status='UNAVAILABLE';o.reason=clamp(response?.reason,120);return o;}
  o.http_source_status='RETRIEVED';
  o.current_source_sha256=hash(response.html);o.current_final_url=response.source_url||row.source_url;
  const filename='coffee-'+shard+'-'+row.case_id.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,165)+'.html';
  writeFileSync(join(dest,filename),response.html,'utf8');o.html_artifact_file=filename;
  const parsed=extractPublicCoffeeFacts(response.html,{source_url:o.current_final_url});
  if(!parsed?.ok){o.parser_status='REJECTED';o.reason=clamp(parsed?.reason,150);return o;}
  o.parser_status='PARSED';
  const originalName=folded(o.original_coffee),actualName=folded(parsed.fields?.name);
  o.current_identity_status=originalName===actualName?'NAME_MATCH':
   (originalName&&actualName&&(originalName.includes(actualName)||actualName.includes(originalName)))?'NAME_PARTIAL':'SELECTED_PRODUCT_NAME_CHANGED_OR_UNVERIFIED';
  for(const [field,value] of Object.entries(parsed.fields||{}))
   if(typeof value==='string')o.current_fields[field]=clamp(value,360);
  o.current_conflicts=parsed.conflicts||[];
  o.current_review_notes={process:clamp(parsed.process_review_note,350),
   producer:clamp(parsed.producer_review_note,350),roast:clamp(parsed.roast_hint,350)};
  const kept=new Set();
  for(const fact of parsed.source_facts||[]){
   if(o.current_context.length>=36)break;
   const key=String(fact.field)+'|'+String(fact.value).toLowerCase();
   if(kept.has(key))continue;kept.add(key);
   o.current_context.push({field:clamp(fact.field,80),label:clamp(fact.label,110),
    value:clamp(fact.value,390),section:clamp(fact.section,120),
    source_type:clamp(fact.source_type,50),conflicting:fact.conflicting===true});
  }
  const markup=coffeeUrlPreviewMarkup(parsed);
  const review=coffeeSourceReviewSnapshot({...parsed,source_url:o.current_final_url});
  o.preview={rendered:markup.includes('coffee-url-preview'),
   conflict_review:!o.current_conflicts.length||markup.includes('Review conflicting details'),
   source_review:!!review};
 }catch(e){o.http_source_status='ERROR';o.error=clamp(e?.name||'Error',90);}
 return o;
}
for(let i=0;i<rows.length;i+=5){
 outcomes.push(...await Promise.all(rows.slice(i,i+5).map(capture)));
 if(outcomes.length%25<5)console.log('[DIC33 ORIGINAL603 LIVE SHARD] '+JSON.stringify({shard,completed:outcomes.length,total:201}));
}
const summary={shard,attempted:outcomes.length,original_oracle_changed:false,
 fetch_success:outcomes.filter(r=>r.http_source_status==='RETRIEVED').length,
 parsed:outcomes.filter(r=>r.parser_status==='PARSED').length,
 previews_pass:outcomes.filter(r=>r.parser_status==='PARSED'&&Object.values(r.preview).every(Boolean)).length,
 current_identity_changed_or_unverified:outcomes.filter(r=>r.parser_status==='PARSED'&&r.current_identity_status==='SELECTED_PRODUCT_NAME_CHANGED_OR_UNVERIFIED').length,
 inaccessible:outcomes.filter(r=>r.http_source_status!=='RETRIEVED').length,
 certified_603:false,database_writes:0,auth_requests:0,original_corpus_modified:false,production_published:false};
const output={schema_version:1,kind:'603_INDIRECT_SOURCE_REVIEW_EVIDENCE_NOT_AUTOMATIC_CERTIFICATION',
 tested_source_sha:process.env.GITHUB_SHA||'',frozen_expected_sha256:Object.fromEntries(sources),
 observation_utc:new Date().toISOString(),summary,records:outcomes};
writeFileSync(join(dest,'shard-'+shard+'-public-evidence.json'),JSON.stringify(output,null,2)+'\n');
console.log('[DIC33 ORIGINAL603 LIVE SUMMARY] '+JSON.stringify(summary));
if(outcomes.length!==201||outcomes.some(x=>x.parser_status==='PARSED'&&!Object.values(x.preview).every(Boolean)))process.exitCode=1;
