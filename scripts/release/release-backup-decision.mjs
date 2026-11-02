// Read-only release backup evidence decision. Never infer ciphertext integrity from ZIP metadata.
export const APPROVED_OFFSITE_FOLDER_ID='1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf';
// PostgreSQL can report writes at microsecond precision. Date.parse truncates to
// milliseconds and would approve a snapshot taken just BEFORE the last write.
// Compare strict, calendar-valid UTC instants at nanosecond precision instead.
function utcNanoseconds(value){
 if(typeof value!=='string')return null;
 const m=/^(20\d{2})-(0[1-9]|1[0-2])-([0-2]\d|3[01])T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.(\d{1,9}))?Z$/.exec(value);
 if(!m)return null;
 const [,year,month,day,hour,minute,second,fraction='']=m;
 const ms=Date.UTC(+year,+month-1,+day,+hour,+minute,+second);
 const dt=new Date(ms);
 if(dt.getUTCFullYear()!==+year||dt.getUTCMonth()!==+month-1||
  dt.getUTCDate()!==+day||dt.getUTCHours()!==+hour||
  dt.getUTCMinutes()!==+minute||dt.getUTCSeconds()!==+second)return null;
 return BigInt(ms)*1000000n+BigInt(fraction.padEnd(9,'0')||'0');
}

export function decideReleaseBackup({githubArtifact,driveFile,expectedArtifactId,expectedDriveId,
 approvedFolderId,verifiedCiphertextSha256,expectedCiphertextSha256,latestDataWriteUtc,
 snapshotStartUtc,verificationUtc}={}){
 const problems=[];
 if(approvedFolderId!==APPROVED_OFFSITE_FOLDER_ID)
  problems.push('Release backup folder configuration differs from owner-locked direct Drive folder');
 if(!Number.isSafeInteger(expectedArtifactId)||expectedArtifactId<=0||
  !githubArtifact||githubArtifact.id!==expectedArtifactId||
  githubArtifact.expired!==false||!Number.isSafeInteger(githubArtifact.size_in_bytes)||
  githubArtifact.size_in_bytes<=0)
  problems.push('GitHub ciphertext artifact missing, expired or empty');
 if(typeof expectedDriveId!=='string'||!expectedDriveId.trim()||
  !driveFile||driveFile.id!==expectedDriveId||
  !Array.isArray(driveFile.parent_ids)||driveFile.parent_ids.length!==1||
  driveFile.parent_ids[0]!==APPROVED_OFFSITE_FOLDER_ID||
  !Number.isSafeInteger(Number(driveFile.size))||Number(driveFile.size)<=0)
  problems.push('Offsite backup absent, empty or not a direct child of approved private folder');
 if(githubArtifact&&driveFile&&Number.isSafeInteger(githubArtifact.size_in_bytes)&&
  Number.isSafeInteger(Number(driveFile.size))&&
  githubArtifact.size_in_bytes!==Number(driveFile.size))
  problems.push('GitHub and offsite archive byte lengths differ');
 if(!/^[a-f0-9]{64}$/.test(verifiedCiphertextSha256||'')||
  verifiedCiphertextSha256!==expectedCiphertextSha256)
  problems.push('Ciphertext SHA-256 not independently verified against the backup');
 const start=utcNanoseconds(snapshotStartUtc),write=utcNanoseconds(latestDataWriteUtc),
  verified=utcNanoseconds(verificationUtc);
 if(start===null||write===null||verified===null||write>start||verified<start)
  problems.push('Snapshot does not provably cover latest observed database write');
 return {reusable:problems.length===0,
  action:problems.length?'REQUEST_FRESH_ENCRYPTED_BACKUP_AND_VERIFY':'REUSE_VERIFIED_BACKUP',
  reasons:problems};
}
