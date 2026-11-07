// Read tracked bytes and record a redacted, reproducible security inventory.
// Signatures are deliberately high-confidence; this is not a history or artifact audit.
import {readFileSync,lstatSync,readlinkSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const rules=[
 ['private_key',/-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/],
 ['pgp_private_key',new RegExp('-----BEGIN PGP '+'PRIVATE KEY BLOCK-----')],
 ['age_private_identity',/\bAGE-SECRET-KEY-1[A-Z0-9]{35,}\b/],
 ['github_token',/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,255}\b/],
 ['github_fine_grained_token',/\bgithub_pat_[A-Za-z0-9_]{60,}\b/],
 ['supabase_secret',/\bsb_secret_[A-Za-z0-9_-]{20,}\b/],
 ['aws_access_key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
 ['resend_api_key',/\bre_[A-Za-z0-9]{30,}\b/]
];

// Block accidentally tracked local credentials, not public .env.example templates.
export function sensitiveTrackedPath(path){
 if(typeof path!=='string'||!path||path.includes('\\'))return false;
 if(/(?:^|\/)\.env\.example$/i.test(path))return false;
 return /(?:^|\/)(?:\.env(?:\.[^/]+)?|\.npmrc|\.pypirc|\.netrc|id_(?:rsa|ecdsa|ed25519)|credentials\.json|token\.json|service-account[^/]*\.json)$/i.test(path)||
  /\.(?:p8|p12|pfx|jks|keystore|kdbx|age|dump|backup|sql\.gz)$/i.test(path);
}
export function secretRulesOnLine(line){
 if(typeof line!=='string')return [];
 return rules.filter(([,pattern])=>pattern.test(line)).map(([name])=>name);
}
export function inspectTrackedSource({paths,read=readFileSync,stat=lstatSync,readLink=readlinkSync,git=execFileSync}={}){
 const names=paths||String(git('git',['ls-files','-z'],{encoding:'utf8'})).split('\0').filter(Boolean);
 const files=[],candidates=[];
 for(const path of names){
  // Git stores a symbolic link's target path bytes, not the target file's bytes.
  // Do not follow tracked links into untracked, private, or unavailable files.
  const symlink=stat(path).isSymbolicLink();
  const bytes=symlink?readLink(path,{encoding:'buffer'}):read(path);
  const text=bytes.toString('utf8'),binary=bytes.includes(0);
  const lines=binary?[]:text.split(/\r?\n/);
  if(lines.at(-1)==='')lines.pop();
  const category=symlink?'tracked_symlink_target':
   path.startsWith('docs/')?'documentation_or_historical_evidence':
   path.startsWith('tests/')||path.startsWith('supabase/tests/')?'test_fixture_or_assertion':
   binary?'binary_asset':'source_or_configuration';
  files.push({path,sha256:sha256(bytes),bytes:bytes.length,lines:lines.length,binary,symlink,category,
   coverage:symlink?'tracked_link_target_bytes_only_not_dereferenced':binary?'byte_inventory_only':'every_text_line_pattern_screened_not_manual_certification'});
  if(sensitiveTrackedPath(path))candidates.push({path,line:0,rule:'sensitive_tracked_filename'});
  for(let i=0;i<lines.length;i++)for(const rule of secretRulesOnLine(lines[i]))
   candidates.push({path,line:i+1,rule});
 }
 return {files,candidates,totals:{files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),
  text_lines:files.reduce((n,f)=>n+f.lines,0),binary_files:files.filter(f=>f.binary).length}};
}
export function runTrackedInventory(){
 const report=inspectTrackedSource();
 const output={version:1,source_sha:String(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'})).trim(),
  method:'All currently tracked files read. No secret values recorded. Signature matches need triage; absence does not clear Git history, PRs, issues, Actions artifacts, or unrecognized formats.',...report};
 mkdirSync('qa_artifacts/security',{recursive:true});
 writeFileSync('qa_artifacts/security/repository-inventory.json',JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify({source_sha:output.source_sha,...report.totals,redacted_candidates:report.candidates}));
 if(report.candidates.length)process.exitCode=1;
 return output;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))runTrackedInventory();
