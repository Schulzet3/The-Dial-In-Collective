// Conservative analysis of SQL migration changes between the last published
// Git tree and the proposed source tree. Unknown or in-place edits are risky.
// This is a recoverability classifier, not proof SQL is semantically safe.
export const MIGRATION_RISKS=['none','non_destructive','potentially_destructive'];
// Preserve quoted SQL while stripping real comments. Literal '--' and '/*'
// must never hide later write/DDL statements from this safety classifier.
function stripSqlComments(sql){
 let out='',i=0;
 while(i<sql.length){
  const c=sql[i],next=sql[i+1];
  if(c==="'"||c==='"'){
   const quote=c;let closed=false;
   out+=c;i++;
   while(i<sql.length){
    const x=sql[i++];out+=x;
    if(x==='\\'&&i<sql.length){out+=sql[i++];continue;}
    if(x===quote){if(sql[i]===quote){out+=sql[i++];continue;}closed=true;break;}
   }
   if(!closed)return null;
   continue;
  }
  if(c==='$'){
   const tag=sql.slice(i).match(/^\$(?:[a-zA-Z_][a-zA-Z0-9_]*)?\$/)?.[0];
   if(tag){
    const end=sql.indexOf(tag,i+tag.length);
    if(end<0)return null;
    out+=sql.slice(i,end+tag.length);i=end+tag.length;continue;
   }
  }
  if(c==='-'&&next==='-'){
   const end=sql.indexOf('\n',i+2),stop=end<0?sql.length:end;
   out+=' '.repeat(stop-i);i=stop;continue;
  }
  if(c==='/'&&next==='*'){
   let depth=1,j=i+2;
   while(j<sql.length&&depth>0){
    if(sql[j]==='/'&&sql[j+1]==='*'){depth++;j+=2;}
    else if(sql[j]==='*'&&sql[j+1]==='/'){depth--;j+=2;}
    else j++;
   }
   if(depth>0)return null;
   out+=sql.slice(i,j).replace(/[^\n]/g,' ');i=j;continue;
  }
  out+=c;i++;
 }
 return out;
}
export function classifyMigrationDiff(text,readSql){
 if(typeof text!=='string')return {risk:'potentially_destructive',files:[],reason:'UNREADABLE_DIFF'};
 const rows=text.trim().split(/\r?\n/).filter(Boolean);
 if(rows.length===0)return {risk:'none',files:[],reason:'NO_MIGRATION_CHANGES'};
 const files=[];
 for(const row of rows){
  const [status,path]=row.split('\t');
  files.push(path||'UNKNOWN');
  if(status!=='A'||!/^supabase\/migrations\/[0-9]{14}_[a-z0-9_]+\.sql$/.test(path||''))
   return {risk:'potentially_destructive',files,reason:'MODIFIED_DELETED_OR_UNKNOWN_MIGRATION'};
  let sql;
  try{sql=readSql(path)}catch{return {risk:'potentially_destructive',files,reason:'MIGRATION_UNREADABLE'};}
  if(typeof sql!=='string'||!sql.trim())return {risk:'potentially_destructive',files,reason:'MIGRATION_EMPTY'};
  // Remove comments only. False positives from SQL string bodies are safe
  // conservatism; do not ignore opaque dynamic SQL or write procedures.
  sql=stripSqlComments(sql);
  if(sql===null)return {risk:'potentially_destructive',files,reason:'MALFORMED_SQL_COMMENT_OR_QUOTE'};
  if(/\b(?:TRUNCATE|DELETE\s+FROM|UPDATE\s+[A-Za-z_"']|DROP\s+(?:TABLE|SCHEMA|DATABASE|INDEX|FUNCTION|COLUMN)|ALTER\s+TABLE[\s\S]{0,160}(?:DROP\s+COLUMN|ALTER\s+COLUMN[\s\S]{0,80}\bTYPE\b|RENAME\s+TO)|DO\s+\$|EXECUTE\s+)/i.test(sql))
   return {risk:'potentially_destructive',files,reason:'SQL_CAN_MODIFY_OR_REMOVE_EXISTING_DATA'};
 }
 return {risk:'non_destructive',files,reason:'ONLY_ADDITIVE_MIGRATION_FILES_WITHOUT_WRITE_OR_DROP_MARKERS'};
}
export function releaseReadinessMarkdown({id,sha,releaseHead,ci,migrationRisk,request}){
 const checks=['approval','validate','cloud-tests','mobile-browser-qa','sql'];
 const lines=['## Dial In Collective — automatic release readiness preflight',
  '- **Owner approval:** '+id+' (single-use, source-bound grant checked)',
  '- **Tested source:** `'+sha+'`',
  '- **Current release ref before claim:** `'+releaseHead+'`',
  '- **Database change risk:** '+migrationRisk.risk+' ('+migrationRisk.reason+')',
  '- **Extra encrypted backup required:** '+(migrationRisk.risk==='potentially_destructive'?'YES':'NO — scheduled archive sufficient'),
  '- **Recovery artifact ID:** '+request.backup_evidence.artifact_id,
  '- **Snapshot began (UTC):** '+request.backup_evidence.snapshot_started_at_utc,
  '- **Archive last verified (UTC):** '+request.backup_evidence.verified_at_utc,
  '- **Netlify credit monitoring:** Owner-managed; no balance check or credit receipt required',
  '- **GitHub CI:** '+checks.map(k=>k+'='+ci[k]).join(', '),
  '- **Netlify state:** NOT YET VERIFIED AS PUBLISHED; requires independent READY/current deploy SHA readback',
  '- **Owner-device signoff:** NOT REQUIRED by 2026-10-22 owner policy (not a claim it occurred)',
  '- **Residual risks:** GitHub Free/private status checks advisory, Netlify may independently refuse builds for quota reasons; database-backup offsite receipt must be independently real.',
  ''];
 return lines.join('\n');
}
