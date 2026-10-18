-- Owner-approved setup renaming and safe per-setup Slow Feed memory.
-- Preserve all real shot data and historical legacy imports unchanged.
alter table public.setup_preferences add column if not exists last_feed_shot_at timestamptz;

-- Amend the existing trigger rather than add a second competing listener.
-- Imported historical values must not silently become a NEW shot default.
-- Out-of-order offline inserts must not overwrite newer explicitly logged modes.
create or replace function private.remember_feed_condition() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.legacy_import or new.feed_mode not in ('standard','slow') then return new; end if;
 update public.setup_preferences as sp
 set slow_feed=(new.feed_mode='slow'),last_feed_shot_at=new.pulled_at
 where sp.owner_id=new.owner_id and sp.setup_id=new.setup_id
   and sp.setup_version_id=new.setup_version_id and sp.track_slow_feed
   and (sp.last_feed_shot_at is null or new.pulled_at>=sp.last_feed_shot_at)
   and (sp.last_feed_shot_at is distinct from new.pulled_at or
        sp.slow_feed is distinct from (new.feed_mode='slow'));
 return new;
end $$;
revoke all on function private.remember_feed_condition() from public,anon,authenticated;

-- A separately receipt-backed mutation avoids rewriting the already verified
-- shot/workspace mutation paths. Account identity is checked by the existing API.
create function private.rename_setup(mid uuid,p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid:=private.require_member(); h text; prior private.mutation_receipts;
 s public.setups; sid uuid; expected bigint; result jsonb;
begin
 if mid is null or jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>32000 then
  raise exception using errcode='22023',message='Invalid mutation payload.';
 end if;
 if coalesce(length(btrim(p->>'name')),0) not between 1 and 100 then
  raise exception using errcode='22023',message='A setup name must be 1 to 100 characters.';
 end if;
 sid:=(p->>'setup_id')::uuid;expected:=private.required_revision(p);
 perform pg_advisory_xact_lock(hashtextextended(u::text,9311));
 h:=encode(sha256(convert_to(jsonb_build_object('action','rename_setup','payload',p)::text,'UTF8')),'hex');
 select * into prior from private.mutation_receipts where owner_id=u and mutation_id=mid;
 if found then
  if prior.request_hash<>h then
   raise exception using errcode='22023',message='Mutation ID reused for different changes.';
  end if;
  return prior.response;
 end if;
 select * into s from public.setups where owner_id=u and id=sid and archived_at is null for update;
 if not found then raise exception using errcode='42501',message='Setup is not accessible.'; end if;
 if s.revision<>expected then
  return jsonb_build_object('ok',false,'code','conflict','revision',s.revision);
 end if;
 update public.setups set name=btrim(p->>'name') where owner_id=u and id=sid returning * into s;
 result:=jsonb_build_object('ok',true,'record',to_jsonb(s));
 insert into private.mutation_receipts(owner_id,mutation_id,request_hash,response)
 values(u,mid,h,result);
 return result;
end $$;
revoke all on function private.rename_setup(uuid,jsonb) from public,anon,authenticated;
grant execute on function private.rename_setup(uuid,jsonb) to authenticated;

-- Keep the originally authenticated owner bound throughout the mutation call.
create or replace function public.dic_apply_client_change(expected_owner uuid,mutation_id uuid,action text,payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if expected_owner is null or expected_owner is distinct from auth.uid() then
  raise exception using errcode='42501',message='Account changed before this mutation was submitted. Original pending data was retained.';
 end if;
 if action='rename_setup' then return private.rename_setup(mutation_id,payload); end if;
 return private.mutate_workspace(mutation_id,action,payload);
end $$;
revoke all on function public.dic_apply_client_change(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.dic_apply_client_change(uuid,uuid,text,jsonb) to authenticated;
