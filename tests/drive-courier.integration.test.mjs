import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {main,REPO,FOLDER_ID,SCOPE} from '../scripts/backups/drive-courier.mjs';
const exec=promisify(execFile);
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json',...headers}});

test('end-to-end synthetic 5 MiB encrypted-ZIP transfer: GitHub SHA, resumable chunks, Drive MD5 and parent',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'dic-oauth-local-test-'));
  const orig=globalThis.fetch;
  try{
    await writeFile(join(dir,'backup.age'),randomBytes(5*1024*1024));
    await exec('zip',['-q','-0','-j',join(dir,'archive.zip'),join(dir,'backup.age')]);
    const bytes=await readFile(join(dir,'archive.zip'));
    const sha='sha256:'+createHash('sha256').update(bytes).digest('hex');
    const md5=createHash('md5').update(bytes).digest('hex');
    const run={id:123,status:'completed',conclusion:'success',head_branch:'main',
      event:'schedule',repository:{full_name:REPO},path:'.github/workflows/nightly-backup.yml',
      created_at:'2026-12-01T11:00:00Z'};
    const artifact={id:456,name:'dic-encrypted-nightly-123',workflow_run:{id:123},expired:false,
      size_in_bytes:bytes.length,digest:sha};
    const appProperties={dicArtifactId:'456',dicSource:'github-actions-age',dicSha256:sha};
    const stored={id:'synthetic-id',name:'dic-nightly-456.zip',size:String(bytes.length),
      md5Checksum:md5,parents:[FOLDER_ID],appProperties,shared:false,trashed:false};
    const requests=[];let sessionPut=0;let totalSent=0;
    globalThis.fetch=async(input,options={})=>{
      const url=String(input);requests.push(url);
      if(url.endsWith('/actions/runs/123'))return json(run);
      if(url.includes('/actions/runs/123/artifacts?'))return json({total_count:1,artifacts:[artifact]});
      if(url==='https://oauth2.googleapis.com/token')return json({access_token:'synthetic',scope:SCOPE});
      if(url.startsWith('https://www.googleapis.com/drive/v3/files/'+FOLDER_ID))return json({id:FOLDER_ID,name:'DIC Automated Encrypted Backups',mimeType:'application/vnd.google-apps.folder',capabilities:{canAddChildren:true}});
      if(url.startsWith('https://www.googleapis.com/drive/v3/files?'))return json({files:[]});
      if(url.includes('/actions/artifacts/456/zip'))return new Response(null,{status:302,headers:{location:'https://synthetic.invalid/archive'}});
      if(url==='https://synthetic.invalid/archive')return new Response(bytes,{status:200});
      if(url.startsWith('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=')) {
        assert.equal(options.method,'POST');
        const meta=JSON.parse(options.body);
        assert.deepEqual(meta.parents,[FOLDER_ID]);
        assert.equal(meta.appProperties.dicSha256,sha);
        return new Response(null,{status:200,headers:{location:'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=synthetic'}});
      }
      if(url.endsWith('&upload_id=synthetic')){
        assert.equal(options.method,'PUT');
        const range=options.headers['Content-Range'];
        const b=Buffer.from(options.body);
        const match=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(range);
        assert.ok(match,'upload must include byte range');
        assert.equal(Number(match[1]),totalSent);
        assert.equal(Number(match[2]),totalSent+b.length-1);
        assert.equal(Number(match[3]),bytes.length);
        assert.deepEqual(b,bytes.subarray(totalSent,totalSent+b.length));
        totalSent+=b.length;sessionPut++;
        if(totalSent<bytes.length)return new Response(null,{status:308,headers:{range:`bytes=0-${totalSent-1}`}});
        return json({id:stored.id},201);
      }
      if(url.startsWith('https://www.googleapis.com/drive/v3/files/synthetic-id?'))return json(stored);
      throw new Error('Unexpected external call in test: '+url.split('?')[0]);
    };
    await main({GH_TOKEN:'synthetic',DIC_SOURCE_RUN_ID:'123',GITHUB_REPOSITORY:REPO,
      DIC_DRIVE_CLIENT_ID:'synthetic',DIC_DRIVE_CLIENT_SECRET:'synthetic',
      DIC_DRIVE_REFRESH_TOKEN:'synthetic',DIC_DRIVE_CUTOVER_UTC:'2026-11-30T00:00:00Z'});
    assert.ok(sessionPut>=2,'5 MiB archive requires two chunked requests');
    assert.equal(totalSent,bytes.length);
    assert.ok(requests.some(u=>u.includes('/actions/runs/123/artifacts')));
  }finally{globalThis.fetch=orig;await rm(dir,{recursive:true,force:true});}
});
