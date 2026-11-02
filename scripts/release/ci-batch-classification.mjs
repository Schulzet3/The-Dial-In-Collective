// Pure source-isolation certificate classification; never equate green CI with READY.
export function classifyBatch(assessment){
 if(assessment.ready)return 'CERTIFIED_READY_SOURCE';
 if(assessment.ready_items.length===0&&assessment.deployable_paths.length===0&&assessment.errors.every(e=>e==='No new deployable application changes since published source'))return 'NO_BATCH';
 return 'BLOCKED_NOT_RELEASABLE';
}
