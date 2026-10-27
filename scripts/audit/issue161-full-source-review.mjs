// Issue #161: read every tracked byte and screen every UTF-8 source line.
// No credentials or source text are placed in the audit report. This is an
// exhaustive automated inventory, not a human semantic audit or pen test.
import {execFileSync} from 'node:child_process';
import {readFileSync,lstatSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const patterns=[
 {id:'private_key',risk:'critical',re:/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/},
 {id:'github_token',risk:'critical',re:/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,255}\b/},
 {id:'supabase_secret',risk:'critical',re:/\bsb_secret_[A-Za-z0-9_-]{20,}\b/},
 {id:'aws_access_key',risk:'critical',re:/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/},
 {id:'private_env_assignment',risk:'review',re:/^\s*(?:SUPABASE_SERVICE_ROLE_KEY|SUPABASE_DB_URL|POSTGRES_PASSWORD|BACKUP_AGE_IDENTITY|NETLIFY_AUTH_TOKEN)\s*=\s*[^\s#]{8,}/},
 {id:'dynamic_execution',risk:'review',re:/\b(?:eval\s*\(|new\s+Function\s*\()/},
 {id:'raw_html_sink',risk:'review',re:/\.innerHTML\s*=|insertAdjacentHTML\s*\(/},
 {id:'destructive_sql',risk:'review',re:/\b(?:DROP\s+(?:TABLE|SCHEMA|FUNCTION|POLICY)|TRUNCATE\s+TABLE|DELETE\s+FROM)\b/i},
 {id:'security_definer',risk:'review',re:/\bSECURITY\s+DEFINER\b/i},
 {id:'unsafe_auth_pattern',risk:'review',re:/\b(?:auth\.role\s*\(|raw_user_meta_data|user_metadata\s*\.)/},
 {id:'incomplete_work',risk:'review',re:/\bTODO\b|\bFIXME\b|\bHACK\b/}
];
export function scanLine(line){
 return patterns.filter(rule=>rule.re.test(line)).map(rule=>({rule:rule.id,risk:rule.risk}));
}
export function classify(path,bytes){
 if(bytes.includes(0))return {text:false,encoding:'nul_binary'};
 try{return {text:true,encoding:'utf8',value:new TextDecoder('utf-8',{fatal:true}).decode(bytes)};}
 catch{return {text:false,encoding:'non_utf8_binary'};}
}
const sha=x=>sha256(Buffer.from(x,'utf8'));
export function runAudit({paths,read=(path)=>readFileSync(path),stat=(path)=>lstatSync(path),sourceSha,treeSha}){
 const files=[],findings=[],counts={};
 let textLines=0,textFiles=0,binaryFiles=0,totalBytes=0,invalidJSON=0;
 for(const path of paths){
  const fileStat=stat(path);
  if(!fileStat.isFile())throw Error('Nonregular tracked file requires separate handling: '+path);
  const bytes=read(path),kind=classify(path,bytes);totalBytes+=bytes.length;
  const entry={path,sha256:sha256(bytes),bytes:bytes.length,kind:kind.encoding,lines:0,findings:0};
  if(kind.text){
   textFiles++;
   const lines=kind.value.split(/\r\n|\n|\r/);
   if(lines.at(-1)==='')lines.pop();
   entry.lines=lines.length;textLines+=lines.length;
   for(let i=0;i<lines.length;i++){
    const found=scanLine(lines[i]);
    for(const hit of found){findings.push({path,line:i+1,...hit});entry.findings++;counts[hit.rule]=(counts[hit.rule]||0)+1;}
   }
   if(path.endsWith('.json')){
    try{JSON.parse(kind.value);}
    catch{findings.push({path,line:0,rule:'invalid_json',risk:'review'});entry.findings++;invalidJSON++;counts.invalid_json=(counts.invalid_json||0)+1;}
   }
  }else{
   binaryFiles++;
   if(/\.(?:js|mjs|cjs|ts|tsx|jsx|json|sql|md|yml|yaml|sh|py|css|html)$/.test(path)){
    findings.push({path,line:0,rule:'unexpected_binary_source',risk:'critical'});
    entry.findings++;counts.unexpected_binary_source=(counts.unexpected_binary_source||0)+1;
   }
  }
  files.push(entry);
 }
 return {schema_version:1,source_sha:sourceSha,tree_sha:treeSha,method:'Every tracked byte read. Every valid UTF-8 source line pattern screened. No source text or matched secret values in report. Findings need source-aware human review; not manual line-by-line certification.',
 totals:{tracked_files:files.length,total_bytes:totalBytes,text_files:textFiles,text_lines:textLines,binary_files:binaryFiles,invalid_json_files:invalidJSON,critical_candidates:findings.filter(x=>x.risk==='critical').length,review_candidates:findings.filter(x=>x.risk==='review').length},patterns:counts,files,findings};
}
function main(){
 const paths=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
 const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const treeSha=execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim();
 const report=runAudit({paths,sourceSha,treeSha});
 mkdirSync('qa_artifacts/issue161',{recursive:true});
 writeFileSync('qa_artifacts/issue161/full-tracked-source-line-audit.json',JSON.stringify(report,null,2)+'\n');
 console.log('[Issue161 all tracked source] '+JSON.stringify({sourceSha,treeSha,...report.totals,patternCounts:report.patterns}));
 if(report.totals.critical_candidates)process.exitCode=2;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
