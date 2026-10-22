-- Additive owner-scoped one-time guidance; no existing member rows modified.
create table private.dic_first_style_prompt_seen(
 owner_id uuid not null references auth.users(id) on delete cascade,
 library_entry_id uuid not null,
 seen_at timestamptz not null default now(),
 primary key(owner_id,library_entry_id),
 foreign key(owner_id,library_entry_id) references public.library_entries(owner_id,id) on delete cascade
);
alter table private.dic_first_style_prompt_seen enable row level security;
revoke all on table private.dic_first_style_prompt_seen from public,anon,authenticated;
grant all on table private.dic_first_style_prompt_seen to service_role;
create function private.dic_claim_first_style_prompt_impl(p_library_entry_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_member();claimed uuid;
begin
 if p_library_entry_id is null or not exists(
  select 1 from public.library_entries l where l.owner_id=u and l.id=p_library_entry_id and l.hidden_at is null
 ) then raise exception using errcode='42501',message='Coffee is not accessible.'; end if;
 if exists(select 1 from public.shots s where s.owner_id=u and s.library_entry_id=p_library_entry_id) then
  return jsonb_build_object('ok',true,'show',false);
 end if;
 insert into private.dic_first_style_prompt_seen(owner_id,library_entry_id)
 values(u,p_library_entry_id) on conflict(owner_id,library_entry_id) do nothing
 returning library_entry_id into claimed;
 return jsonb_build_object('ok',true,'show',claimed is not null);
end $$;
revoke all on function private.dic_claim_first_style_prompt_impl(uuid) from public,anon,authenticated;
grant execute on function private.dic_claim_first_style_prompt_impl(uuid) to authenticated;
-- The public RPC is INVOKER, avoiding a new exposed SECURITY DEFINER endpoint.
create function public.dic_claim_first_style_prompt(p_library_entry_id uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select private.dic_claim_first_style_prompt_impl(p_library_entry_id);
$$;
revoke all on function public.dic_claim_first_style_prompt(uuid) from public,anon,authenticated;
grant execute on function public.dic_claim_first_style_prompt(uuid) to authenticated;
