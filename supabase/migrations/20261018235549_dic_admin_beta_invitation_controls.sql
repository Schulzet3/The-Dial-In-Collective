-- Source-only development candidate. Official Supabase CLI generated this filename in
-- isolated run 39178514283; DO NOT apply to hosted DB until separately approved.
-- Existing admitted accounts/admin assignments, member data, user sessions,
-- current invitation rows, and previous migration content remain unchanged.
-- Beta accounts do NOT have expiration dates. Codes have no expiration by default,
-- but redemption limits and explicit revocation still apply.

alter table private.beta_invites
 add column label text not null default '' check(char_length(label)<=80),
 add column issued_by uuid references auth.users(id) on delete set null;

-- Immutable operational history only, no raw code, password, email or secret.
create table private.admin_access_events (
 id bigint generated always as identity primary key,
 actor_id uuid references auth.users(id) on delete set null,
 action text not null check (action in ('issue_invite','revoke_invite','remove_access','restore_access')),
 invite_id uuid references private.beta_invites(id) on delete set null,
 member_id uuid references auth.users(id) on delete set null,
 at timestamptz not null default now()
);
alter table private.admin_access_events enable row level security;
revoke all on private.admin_access_events from public,anon,authenticated;
grant all on private.admin_access_events to service_role;
create policy no_client_access on private.admin_access_events for all
 to anon,authenticated using(false) with check(false);

create function private.dic_admin_access_overview()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_admin() then
  raise exception using errcode='42501', message='Administrator access required.';
 end if;
 return jsonb_build_object(
  'invites_total',(select count(*) from private.beta_invites),
  'invites',coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',i.id,'label',i.label,'created_at',i.created_at,
      'expires_at',i.expires_at,'revoked_at',i.revoked_at,
      'uses',i.uses,'max_uses',i.max_uses,
      'status',case
       when i.revoked_at is not null then 'revoked'
       when i.expires_at is not null and i.expires_at<=now() then 'expired'
       when i.max_uses is not null and i.uses>=i.max_uses then 'used'
       else 'active' end
    ) order by i.created_at desc,i.id desc)
    from (select id,label,created_at,expires_at,revoked_at,uses,max_uses
     from private.beta_invites order by created_at desc,id desc limit 50) i
   ),'[]'::jsonb),
  'members_total',(select count(*) from private.beta_members where admitted_at is not null),
  'members',coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',m.owner_id,'email',u.email,'enabled',m.enabled,
      'admin',a.owner_id is not null,'admitted_at',m.admitted_at
    ) order by (a.owner_id is not null) desc,m.admitted_at desc,m.owner_id)
    from (
      select owner_id,enabled,admitted_at from private.beta_members
      where admitted_at is not null order by admitted_at desc,owner_id limit 50
    ) m
    join auth.users u on u.id=m.owner_id
    left join private.app_admins a on a.owner_id=m.owner_id
   ),'[]'::jsonb)
 );
end $$;

create function private.dic_admin_issue_invite(p_label text default '',p_max_uses integer default 1)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
 actor uuid:=auth.uid();
 clean_label text:=btrim(coalesce(p_label,''));
 plaintext text;
 new_id uuid;
begin
 if actor is null or not private.is_admin() then
  raise exception using errcode='42501',message='Administrator access required.';
 end if;
 if char_length(clean_label)>80 or
   (p_max_uses is not null and (p_max_uses<1 or p_max_uses>100)) then
  raise exception using errcode='22023',message='Invite settings are invalid.';
 end if;
 -- Serializes the bounded active-token issuance across concurrent admins.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('dic_admin_issue_invite',7244));
 if (select count(*) from private.beta_invites
   where revoked_at is null and (expires_at is null or expires_at>now())
    and (max_uses is null or uses<max_uses))>=50 then
  raise exception using errcode='22023',message='Revoke an unused invite before creating more.';
 end if;
 -- 192 bits of PostgreSQL CSPRNG entropy; never store or list plaintext.
 plaintext:='dic-'||pg_catalog.encode(extensions.gen_random_bytes(24),'hex');
 insert into private.beta_invites(token_hash,label,issued_by,expires_at,max_uses)
 values(pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(plaintext,'UTF8')),'hex'),
  clean_label,actor,null,p_max_uses)
 returning id into new_id;
 insert into private.admin_access_events(actor_id,action,invite_id)
 values(actor,'issue_invite',new_id);
 return jsonb_build_object('ok',true,'id',new_id,
  'invite_code',plaintext,'label',clean_label,'max_uses',p_max_uses,
  'expires_at',null);
end $$;

create function private.dic_admin_revoke_invite(p_invite_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();changed uuid;
begin
 if actor is null or not private.is_admin() then
  raise exception using errcode='42501',message='Administrator access required.';
 end if;
 if p_invite_id is null then
  raise exception using errcode='22023',message='Invite identifier required.';
 end if;
 update private.beta_invites set revoked_at=now()
 where id=p_invite_id and revoked_at is null returning id into changed;
 if changed is null then
  if not exists(select 1 from private.beta_invites where id=p_invite_id) then
   raise exception using errcode='22023',message='Invite not found.';
  end if;
  return jsonb_build_object('ok',true,'already_revoked',true);
 end if;
 insert into private.admin_access_events(actor_id,action,invite_id)
 values(actor,'revoke_invite',changed);
 return jsonb_build_object('ok',true,'revoked',true);
end $$;

create function private.dic_admin_set_member_access(p_member_id uuid,p_enabled boolean)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare actor uuid:=auth.uid();m private.beta_members;found_member uuid;
begin
 if actor is null or not private.is_admin() then
  raise exception using errcode='42501',message='Administrator access required.';
 end if;
 if p_member_id is null or p_enabled is null then
  raise exception using errcode='22023',message='Member and desired access are required.';
 end if;
 -- Never allow an administrator to revoke themself OR ANY administrator.
 -- The underlying permanent admin role has no expiration.
 if p_member_id=actor or exists(select 1 from private.app_admins where owner_id=p_member_id) then
  raise exception using errcode='42501',message='Administrator accounts cannot be removed here.';
 end if;
 select * into m from private.beta_members where owner_id=p_member_id for update;
 if not found or m.admitted_at is null then
  raise exception using errcode='22023',message='Only previously admitted members can be changed.';
 end if;
 if p_enabled and not exists(select 1 from auth.users where id=p_member_id and email_confirmed_at is not null) then
  raise exception using errcode='42501',message='Verified email required.';
 end if;
 if m.enabled=p_enabled then
  return jsonb_build_object('ok',true,'enabled',p_enabled,'unchanged',true);
 end if;
 update private.beta_members set enabled=p_enabled
 where owner_id=p_member_id returning owner_id into found_member;
 insert into private.admin_access_events(actor_id,action,member_id)
 values(actor,case when p_enabled then 'restore_access' else 'remove_access' end,found_member);
 -- No auth.users deletion, note deletion, contribution identity reidentification,
 -- historical mutation, or implicit sign-out of already issued Supabase tokens.
 -- All member RPCs and RLS must recheck private.is_member().
 return jsonb_build_object('ok',true,'enabled',p_enabled);
end $$;

revoke all on function
 private.dic_admin_access_overview(),
 private.dic_admin_issue_invite(text,integer),
 private.dic_admin_revoke_invite(uuid),
 private.dic_admin_set_member_access(uuid,boolean)
 from public,anon,authenticated;
grant execute on function
 private.dic_admin_access_overview(),
 private.dic_admin_issue_invite(text,integer),
 private.dic_admin_revoke_invite(uuid),
 private.dic_admin_set_member_access(uuid,boolean) to authenticated;

create function public.dic_admin_access_overview() returns jsonb
language sql stable security invoker set search_path='' as $$
 select private.dic_admin_access_overview();
$$;
create function public.dic_admin_issue_invite(p_label text default '',p_max_uses integer default 1)
returns jsonb language sql volatile security invoker set search_path='' as $$
 select private.dic_admin_issue_invite(p_label,p_max_uses);
$$;
create function public.dic_admin_revoke_invite(p_invite_id uuid) returns jsonb
language sql volatile security invoker set search_path='' as $$
 select private.dic_admin_revoke_invite(p_invite_id);
$$;
create function public.dic_admin_set_member_access(p_member_id uuid,p_enabled boolean)
returns jsonb language sql volatile security invoker set search_path='' as $$
 select private.dic_admin_set_member_access(p_member_id,p_enabled);
$$;
revoke all on function
 public.dic_admin_access_overview(),
 public.dic_admin_issue_invite(text,integer),
 public.dic_admin_revoke_invite(uuid),
 public.dic_admin_set_member_access(uuid,boolean)
 from public,anon,authenticated;
grant execute on function
 public.dic_admin_access_overview(),
 public.dic_admin_issue_invite(text,integer),
 public.dic_admin_revoke_invite(uuid),
 public.dic_admin_set_member_access(uuid,boolean) to authenticated;
comment on function public.dic_admin_issue_invite(text,integer) is
 'Admitted admin only: generate high-entropy invitation server-side, return plaintext once, store only SHA-256 and audit without secret.';
comment on function public.dic_admin_set_member_access(uuid,boolean) is
 'Admitted admin only: revoke/restore nonadmin member app admission without deleting personal history. All administrators protected.';
