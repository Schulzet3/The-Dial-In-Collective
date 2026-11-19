-- Issue #509 R367: a completed account deletion's idempotent retry must
-- report its recorded Community removal count, not the Edge 0 fallback.
-- Future-Publish source only; preserve immutable applied migrations and all rows.
-- CREATE OR REPLACE preserves current function grants, ownership and security.
CREATE OR REPLACE FUNCTION private.dic_admin_account_delete_prepare(p_operation_id uuid, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare op private.dic_admin_account_delete_operations; ids uuid[]; actual jsonb; storage_blocked boolean:=false;
begin
 select * into op from private.dic_admin_account_delete_operations
 where id=p_operation_id for update;
 if not found or op.actor_id is distinct from p_actor_id then
  raise exception using errcode='42501',message='Deletion operation unavailable.';
 end if;
 if op.phase='completed' then return jsonb_build_object('ok',true,'completed',true,'community_removed',op.community_removed); end if;
 if not exists(select 1 from private.app_admins where owner_id=p_actor_id)
    or not exists(select 1 from private.beta_members
       where owner_id=p_actor_id and enabled and admitted_at is not null) then
  raise exception using errcode='42501',message='Administrator no longer admitted.';
 end if;
 if exists(select 1 from private.app_admins where owner_id=op.target_id)
    or op.target_id=p_actor_id then
  raise exception using errcode='42501',message='Administrator accounts are protected.';
 end if;
 if op.phase='requested' then
  if not exists(select 1 from auth.users where id=op.target_id) then
   raise exception using errcode='23514',message='Target account is missing before preparation.';
  end if;
  -- Recheck the same preview under the service-side record lock.
  -- No JWT actor impersonation or unsafe service-role bypass of an admin check.
  actual:=private.dic_admin_account_delete_impact(op.target_id);
  if actual is distinct from op.expected_impact then
   raise exception using errcode='PT409',message='Account changed after confirmation.';
  end if;
  select coalesce(array_agg(c.id order by c.id),'{}'::uuid[]) into ids
  from private.contributors c where c.owner_id=op.target_id;
  -- Supabase Auth deletion refuses users who own Storage objects. Fail before
  -- changing admission when the live provider exposes that table.
  if to_regclass('storage.objects') is not null then
   execute 'select exists(select 1 from storage.objects where owner=$1 or owner_id=$1::text)'
     into storage_blocked using op.target_id;
   if storage_blocked then
    raise exception using errcode='23514',message='Member has Storage-owned objects; review before deletion.';
   end if;
  end if;
  -- Prevent deletion of prior actor audit evidence if a formerly privileged user
  -- was subsequently demoted. Do not silently erase immutable admin audits.
  if exists(select 1 from private.admin_content_edits where actor_id=op.target_id) then
   raise exception using errcode='23514',message='Historical administrative actor audit requires separate review.';
  end if;
  update private.beta_members set enabled=false where owner_id=op.target_id;
  -- Eliminate restrictive user references; retain minimum action/timestamp audit.
  update private.admin_content_edits
     set subject_owner_id=null,before_values='{}'::jsonb,after_values='{}'::jsonb
     where subject_owner_id=op.target_id;
  delete from private.dic_source_attempts where owner_id=op.target_id;
  update private.import_control
     set owner_only_exception_owner_id=null,owner_only_exception_approved_at=null,
         owner_only_exception_expires_at=null
     where owner_only_exception_owner_id=op.target_id;
  update private.dic_admin_account_delete_operations
     set phase='prepared',contributor_ids=ids,prepared_at=now()
     where id=op.id;
  op.phase:='prepared';op.contributor_ids:=ids;
 end if;
 if op.phase='prepared' and exists(
  select 1 from private.beta_members where owner_id=op.target_id and enabled
 ) then
  raise exception using errcode='23514',message='Admission unexpectedly restored while deleting.';
 end if;
 return jsonb_build_object('ok',true,'target_id',op.target_id,'mode',op.community_mode,'phase',op.phase);
end $function$;
