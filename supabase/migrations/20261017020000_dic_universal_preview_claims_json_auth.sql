-- Production bugfix after real admitted-member Wuri preview returned 503:
-- PostgREST may expose JWT role through request.jwt.claims JSON without
-- populating the legacy request.jwt.claim.role setting individually.
-- auth.role() reads either format; auth.uid() reads the JWT subject.
-- Preserve real, email-confirmed, admitted-member-only access and a shared
-- 30-second cooldown. No coffee, Auth user or preview quota data is changed.
create or replace function public.dic_claim_universal_preview()
returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();
begin
 if me is null
  or auth.role() is distinct from 'authenticated'
  or not private.is_member() then
  return jsonb_build_object('allowed',false,'reason','admitted_member_required');
 end if;
 if not exists(select 1 from auth.users u where u.id=me
  and u.email_confirmed_at is not null) then
  return jsonb_build_object('allowed',false,'reason','verify_email');
 end if;
 return private.dic_shared_preview_claim(me);
end $$;
revoke all on function public.dic_claim_universal_preview() from public,anon,authenticated;
grant execute on function public.dic_claim_universal_preview() to authenticated;
comment on function public.dic_claim_universal_preview() is
 'JWT-compatible admitted member URL preview via auth.role(), email verified, 30-second shared cooldown and 60 per rolling day. No public coffee writes.';
