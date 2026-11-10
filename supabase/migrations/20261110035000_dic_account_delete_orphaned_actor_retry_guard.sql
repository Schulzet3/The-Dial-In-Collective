-- Issue #509: do not treat an orphaned/deleted administrator's NULL actor_id
-- as an authorized retry by a different administrator. Preserve fail-closed
-- pending-operation conflict policy; no operation takeover or deletion.
-- Source-only migration; NEVER run against hosted Supabase without separate Publish.
create or replace function private.dic_admin_account_delete_request(
 p_member_id uuid,p_community_mode text,p_expected_impact jsonb
) returns jsonb language plpgsql volatile security definer set search_path='' as $fn$
declare actor uuid:=auth.uid(); actual jsonb; prior private.dic_admin_account_delete_operations; opid uuid;
begin
 perform private.require_member();
 if actor is null or not private.is_admin() then
  raise exception using errcode='42501',message='Administrator required.';
 end if;
 if p_community_mode not in ('keep','remove') or p_community_mode is null
    or p_expected_impact is null or p_member_id is null then
  raise exception using errcode='22023',message='Invalid account deletion confirmation.';
 end if;
 if p_member_id=actor or exists(select 1 from private.app_admins where owner_id=p_member_id) then
  raise exception using errcode='42501',message='Administrator accounts are protected.';
 end if;
 select * into prior from private.dic_admin_account_delete_operations
 where target_id=p_member_id and phase<>'completed' for update;
 if found then
  if prior.actor_id is distinct from actor or prior.community_mode<>p_community_mode then
   raise exception using errcode='23514',message='Another deletion is already in progress.';
  end if;
  return jsonb_build_object('ok',true,'operation_id',prior.id,'phase',prior.phase,'retry',true);
 end if;
 perform 1 from auth.users where id=p_member_id for update;
 actual:=private.dic_admin_account_delete_preview(p_member_id);
 if actual is distinct from p_expected_impact then
  raise exception using errcode='PT409',message='Account records changed. Review deletion impact again.';
 end if;
 insert into private.dic_admin_account_delete_operations(actor_id,target_id,community_mode,expected_impact)
 values(actor,p_member_id,p_community_mode,actual) returning id into opid;
 return jsonb_build_object('ok',true,'operation_id',opid,'phase','requested');
end $fn$;
