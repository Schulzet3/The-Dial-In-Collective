-- Issue #5: the HTTP transport retries SQLSTATE 40001 indefinitely on
-- stale member Pending retry. Return a structured non-mutating conflict instead.
-- Additive function body replacement only. Do NOT deploy without separate release.
-- Preserve existing ownership, admission, identity, idempotence and permissions.
create or replace function private.dic_member_retry_pending_approval(
 p_submission_id uuid,p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $dic$
declare actor uuid; s public.coffee_submissions; candidates jsonb;
begin
 actor:=private.require_member();
 if actor is null or p_submission_id is null or p_expected_revision is null then
  raise exception using errcode='42501',message='Signed-in member and exact Pending record required.';
 end if;
 select * into s from public.coffee_submissions where id=p_submission_id for update;
 if not found or s.owner_id is distinct from actor then
  raise exception using errcode='42501',message='Only the submission owner may retry approval.';
 end if;
 if s.revision is distinct from p_expected_revision then
  return jsonb_build_object('ok',false,'code','conflict','status',s.status,
   'message','Submission changed; refresh before retry.');
 end if;
 if s.status in ('approved','merged') and s.canonical_coffee_id is not null then
  return jsonb_build_object('ok',true,'status','verified','coffee_id',s.canonical_coffee_id,'already_verified',true);
 end if;
 if s.status not in ('pending','conflict') or s.canonical_coffee_id is not null then
  raise exception using errcode='23514',message='Only an unresolved new coffee may be retried.';
 end if;
 candidates:=private.dic_find_coffee_matches(s.proposed_data||jsonb_build_object('source_url',s.source_url));
 if candidates->>'classification'='needs_confirmation' then
  return jsonb_build_object('ok',false,'code','needs_confirmation','status','pending',
    'candidates',coalesce(candidates->'candidates','[]'::jsonb));
 end if;
 if candidates->>'classification'='exact_verified' then
  return private.dic_link_pending_coffee(s.id,(candidates->>'exact_id')::uuid,'canonical_reused',
   jsonb_build_object('method','member_auto_approved','source_assurance','member_supplied_unverified'));
 end if;
 return private.dic_promote_pending_coffee(s.id,'member_auto_approved',
   jsonb_build_object('approval_basis','member_retry_distinct',
    'source_assurance','member_supplied_unverified'),false);
end $dic$;
