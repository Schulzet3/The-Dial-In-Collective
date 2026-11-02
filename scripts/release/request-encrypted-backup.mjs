// Manual encrypted-backup fallback dispatcher. Never claims the backup is verified.
// Requires a subsequent independent ciphertext/Drive-parent check before release.
const REPO='Schulzet3/The-Dial-In-Collective';
export async function requestEncryptedBackup({token,fetcher=fetch}={}){
 if(!token)throw Error('GitHub Actions token required for encrypted backup fallback');
 const url='https://api.github.com/repos/'+REPO+'/actions/workflows/nightly-backup.yml/dispatches';
 const response=await fetcher(url,{method:'POST',headers:{
  Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
  'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'
 },body:JSON.stringify({ref:'main'})});
 if(response.status!==204)throw Error('Backup workflow dispatch not confirmed: HTTP '+response.status);
 return {status:'BACKUP_REQUESTED_NOT_VERIFIED',workflow:'nightly-backup.yml',branch:'main'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 requestEncryptedBackup({token:process.env.GITHUB_TOKEN}).then(r=>console.log(JSON.stringify(r)))
 .catch(e=>{console.error(e.message);process.exitCode=1;});
}
