// Preserve server acknowledgements durably even if the subsequent snapshot read fails.
// This is a cache patch only, not a replacement for server validation or a full refresh.
export function patchAcknowledgement(snapshot,event,result){
 if(!snapshot)return snapshot;const next=structuredClone(snapshot),r=result?.record;
 if(!r)return next;
 const upsert=(key,row,match=x=>x.id===row.id)=>{next[key] ||= [];const i=next[key].findIndex(match);if(i<0)next[key].push(structuredClone(row));else next[key][i]=structuredClone(row);};
 if(['save_shot','hide_shot'].includes(event.action)){
  upsert('shots',r);
  if(Object.hasOwn(event.payload,'notes'))upsert('notes',{owner_id:event.owner,shot_id:r.id,notes:event.payload.notes||''},x=>x.shot_id===r.id);
  if(event.action==='save_shot'&&!event.payload.expected_revision){
   const workspace=next.workspaces?.find(x=>x.setup_version_id===r.setup_version_id);
   if(workspace)workspace.current_library_entry_id=r.library_entry_id;
   const wc=next.workspaceCoffees?.find(x=>x.setup_version_id===r.setup_version_id&&x.library_entry_id===r.library_entry_id);
   upsert('workspaceCoffees',{...wc,owner_id:event.owner,setup_id:r.setup_id,setup_version_id:r.setup_version_id,library_entry_id:r.library_entry_id,selected_style:r.style,basket_version_id:r.basket_version_id,last_logged_at:event.createdAt},x=>x.setup_version_id===r.setup_version_id&&x.library_entry_id===r.library_entry_id);
  }
 }
 if(['save_preferences','select_setup'].includes(event.action))next.preferences=structuredClone(r);
 if(event.action==='save_setup_settings')upsert('setupPreferences',r,x=>x.setup_version_id===r.setup_version_id);
 if(event.action==='set_style')upsert('workspaceCoffees',r,x=>x.setup_version_id===r.setup_version_id&&x.library_entry_id===r.library_entry_id);
 if(event.action==='make_current')upsert('recipePreferences',r,x=>x.setup_version_id===r.setup_version_id&&x.library_entry_id===r.library_entry_id&&x.style===r.style);
 return next;
}
