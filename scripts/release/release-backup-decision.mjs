// Read-only release backup evidence decision. Never infer ciphertext integrity from ZIP metadata.
export function decideReleaseBackup({githubArtifact,driveFile,expectedArtifactId,expectedDriveId,
 approvedFolderId,verifiedCiphertextSha256,expectedCiphertextSha256,latestDataWriteUtc,
 snapshotStartUtc,verificationUtc}={}){
 const problems=[];
 if(!githubArtifact||githubArtifact.id!==expectedArtifactId||
  githubArtifact.expired!==false||!(githubArtifact.size_in_bytes>0))
  problems.push('GitHub ciphertext artifact missing, expired or empty');
 if(!driveFile||driveFile.id!==expectedDriveId||
  !Array.isArray(driveFile.parent_ids)||driveFile.parent_ids.length!==1||
  driveFile.parent_ids[0]!==approvedFolderId||
  !(Number(driveFile.size)>0))
  problems.push('Offsite backup absent, empty or not a direct child of approved private folder');
 if(!/^[a-f0-9]{64}$/.test(verifiedCiphertextSha256||'')||
  verifiedCiphertextSha256!==expectedCiphertextSha256)
  problems.push('Ciphertext SHA-256 not independently verified against the backup');
 const start=Date.parse(snapshotStartUtc||''),write=Date.parse(latestDataWriteUtc||''),
  verified=Date.parse(verificationUtc||'');
 if(!Number.isFinite(start)||!Number.isFinite(write)||!Number.isFinite(verified)||
  write>start||verified<start)
  problems.push('Snapshot does not provably cover latest observed database write');
 return {reusable:problems.length===0,
  action:problems.length?'REQUEST_FRESH_ENCRYPTED_BACKUP_AND_VERIFY':'REUSE_VERIFIED_BACKUP',
  reasons:problems};
}
