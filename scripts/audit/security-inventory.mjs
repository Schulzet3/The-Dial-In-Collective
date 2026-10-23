// Read every tracked byte and record redacted, reproducible inspection coverage.
// Automated screening is NOT a manual semantic review or a penetration certificate.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const paths=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const rules=[
 ['private_key',/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
 ['github_token',/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,255}\b/],
 ['supabase_secret',/\bsb_secret_[A-Za-z0-9_-]{20,}\b/],
 ['aws_access_key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/]
];
const files=[],candidates=[];
for(const path of paths){
 const bytes=readFileSync(path),text=bytes.toString('utf8'),binary=bytes.includes(0);
 const lines=binary?[]:text.split(/\r?\n/);
 if(lines.at(-1)==='')lines.pop();
 const category=path.startsWith('docs/')?'documentation_or_historical_evidence':path.startsWith('tests/')||path.startsWith('supabase/tests/')?'test_fixture_or_assertion':binary?'binary_asset':'source_or_configuration';
 files.push({path,sha256:sha256(bytes),bytes:bytes.length,lines:lines.length,binary,category,coverage:binary?'byte_inventory_only':'every_text_line_pattern_screened_not_manual_certification'});
 for(let i=0;i<lines.length;i++)for(const [rule,pattern] of rules)if(pattern.test(lines[i]))candidates.push({path,line:i+1,rule});
}
const report={version:1,source_sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),method:'All tracked files read. No secret values or environment variables recorded. Pattern matches require human triage; absence is not complete secret clearance.',files,candidates,
 totals:{files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),text_lines:files.reduce((n,f)=>n+f.lines,0),binary_files:files.filter(f=>f.binary).length}};
mkdirSync('qa_artifacts/security',{recursive:true});writeFileSync('qa_artifacts/security/repository-inventory.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({source_sha:report.source_sha,...report.totals,redacted_candidates:candidates}));
if(candidates.length)process.exitCode=1;
