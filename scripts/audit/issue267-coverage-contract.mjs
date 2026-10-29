// Issue #267: audit arithmetic only. Never certify semantic review through this script.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const SOURCE='abc4d3aa7225f0f2f2b75e0ed2108725b02e40a9';
const TREE='c54ade64eca30946df8858297578a172f5cf6fa8';
const TOTALS={files:757,text:754,binary:3,lines:579961,bytes:32436318};
const key=r=>r.path+':'+r.first_line+'-'+r.last_line;
const positive=n=>Number.isSafeInteger(n)&&n>=1;
const count=r=>r.last_line-r.first_line+1;

export function validateIssue267Coverage({inventory,ledger,batches}){
 const errors=[],add=message=>errors.push(message);
 if(inventory?.source_commit!==SOURCE||inventory?.source_tree!==TREE||
    ledger?.frozen_source_commit!==SOURCE||ledger?.frozen_tree_sha!==TREE||
    batches?.source_tree!==TREE)add('Original frozen source commit/tree changed');
 if(!Array.isArray(inventory?.files)||!Array.isArray(ledger?.files)||
    !Array.isArray(batches?.batches))return [...errors,'Missing original inventory, ledger or batches'];
 if(inventory.files.length!==TOTALS.files||ledger.files.length!==TOTALS.files)add('757 path count mismatch');
 const it=inventory.totals||{};
 if(it.tracked_files!==TOTALS.files||it.text_files!==TOTALS.text||
    it.binary_files!==TOTALS.binary||it.text_lines!==TOTALS.lines||
    it.total_bytes!==TOTALS.bytes)add('Original measured totals changed');
 const inventoryByPath=new Map(),ledgerByPath=new Map();
 for(const entry of inventory.files){
  if(inventoryByPath.has(entry.path))add('Duplicate inventory path '+entry.path);
  inventoryByPath.set(entry.path,entry);
 }
 let textFiles=0,binaryFiles=0,sourceLines=0,reviewed=0,remaining=0,fully=0,partial=0;
 const ledgerReview=new Map();
 for(const file of ledger.files){
  if(ledgerByPath.has(file.path))add('Duplicate ledger path '+file.path);
  ledgerByPath.set(file.path,file);
  const src=inventoryByPath.get(file.path);
  if(!src){add('Unrecognized path '+file.path);continue;}
  if(file.source_blob_sha!==src.source_blob_sha||file.sha256!==src.sha256||
     file.source_bytes!==src.bytes||file.original_line_count!==src.line_count)
   add('Original source/hash/count mismatch '+file.path);
  const binary=file.source_kind==='binary';
  if(binary){binaryFiles++;if(src.kind==='utf8'||src.line_count!==0)add('Bad binary classification '+file.path);}
  else{textFiles++;sourceLines+=src.line_count;if(src.kind!=='utf8')add('Bad UTF8 classification '+file.path);}
  const audit=file.reviewed_ranges||[],pending=file.remaining_ranges||[];
  if(!Array.isArray(audit)||!Array.isArray(pending)){add('Missing interval arrays '+file.path);continue;}
  if(binary&&(audit.length||pending.length)){add('Binary has text ranges '+file.path);continue;}
  const intervals=[
   ...audit.map(r=>({...r,reviewed:true})),
   ...pending.map(r=>({...r,reviewed:false}))
  ].sort((a,b)=>a.first_line-b.first_line);
  let cursor=1,localReview=0,localRemaining=0;
  for(const part of intervals){
   if(!positive(part.first_line)||!positive(part.last_line)||
      part.last_line<part.first_line||part.first_line!==cursor||
      part.last_line>src.line_count){add('Gap or overlap '+file.path+' at '+cursor);break;}
   if(part.reviewed){
    if(part.line_count!==count(part)||part.method!=='ai_assisted_direct_line_by_line_semantic_read'||
       !/^B\d{3}$/.test(part.batch_id||''))add('Unqualified semantic interval '+file.path);
    const k=key({...part,path:file.path});
    if(ledgerReview.has(k))add('Duplicate reviewed interval '+k);
    ledgerReview.set(k,part.batch_id);
    localReview+=count(part);
   }else{
    if(part.status!=='UNREVIEWED')add('Misclassified remaining range '+file.path);
    localRemaining+=count(part);
   }
   cursor=part.last_line+1;
  }
  if(cursor!==src.line_count+1)add('Incomplete original line coverage '+file.path);
  if(audit.length&&pending.length){partial++;if(file.coverage!=='PARTIAL_AI_ASSISTED_DIRECT_SEMANTIC_REVIEW')add('Wrong partial status '+file.path);}
  else if(audit.length){fully++;if(file.coverage!=='AI_ASSISTED_DIRECT_SEMANTIC_REVIEW')add('Wrong full status '+file.path);}
  else if(!binary&&file.coverage!=='UNREVIEWED')add('Wrong unreviewed status '+file.path);
  reviewed+=localReview;remaining+=localRemaining;
 }
 if(inventoryByPath.size!==TOTALS.files||ledgerByPath.size!==TOTALS.files)add('Missing or duplicate path');
 if(textFiles!==TOTALS.text||binaryFiles!==TOTALS.binary||
    sourceLines!==TOTALS.lines||reviewed+remaining!==TOTALS.lines)
  add('Historical denominator mismatch');
 const batchReview=new Map(),seenBatches=new Set();let batchLines=0;
 for(const batch of batches.batches){
  if(seenBatches.has(batch.id))add('Duplicate batch '+batch.id);
  seenBatches.add(batch.id);
  if(batch.source_commit!==SOURCE||batch.source_tree!==TREE||
     batch.method!=='direct_numbered_original_blob_line_by_line_semantic_read'||
     !Array.isArray(batch.files))add('Batch provenance invalid '+batch.id);
  let sum=0;
  for(const item of batch.files||[]){
   const src=inventoryByPath.get(item.path);
   if(!src||item.source_blob_sha!==src.source_blob_sha||
      !positive(item.first_line)||!positive(item.last_line)||
      item.last_line>src.line_count||item.line_count!==count(item))
    add('Unverified batch file interval '+batch.id+' '+item.path);
   const k=key(item);
   if(batchReview.has(k))add('Duplicate batch range '+k);
   batchReview.set(k,batch.id);
   if(ledgerReview.get(k)!==batch.id)add('Batch range not in semantic ledger '+k);
   sum+=item.line_count;
  }
  if(sum!==batch.total_lines)add('Batch count mismatch '+batch.id);
  batchLines+=sum;
 }
 for(const [k,id] of ledgerReview)if(batchReview.get(k)!==id)add('Semantic range without exact batch '+k);
 if(batchLines!==reviewed)add('Ledger/batch semantic line count differs');
 const summary=ledger.coverage_summary||{};
 if(summary.direct_assistant_semantic_lines!==reviewed||
    summary.still_not_documented_as_semantically_reviewed_lines!==remaining||
    summary.remaining_line_count_checked!==remaining||
    summary.fully_reviewed_text_files!==fully||
    summary.partially_reviewed_text_files!==partial)
  add('Coverage summary arithmetic mismatch');
 return errors;
}
export function readIssue267Coverage(){
 const read=path=>JSON.parse(readFileSync(new URL('../../docs/audits/'+path,import.meta.url),'utf8'));
 return {inventory:read('issue267-frozen-source-inventory.json'),
  ledger:read('issue267-semantic-coverage-ledger.json'),
  batches:read('issue267-semantic-batches.json')};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const errors=validateIssue267Coverage(readIssue267Coverage());
 if(errors.length){console.error('[Issue267 historical coverage] FAIL: '+errors.join('; '));process.exitCode=1;}
 else console.log('[Issue267 historical coverage] PASS: frozen source, all paths, line intervals and review batches reconciled (NOT a semantic certification)');
}
