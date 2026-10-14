-- Compatibility: route the legacy authenticated RPC through the same
-- owner-bound, idempotent coffee catalog gateway as new cloud clients.
-- Prevent older clients from silently creating Pending without verification.
create or replace function public.dic_mutate(mutation_id uuid,action text,payload jsonb)
returns jsonb language sql security invoker set search_path='' as $$
 select public.dic_apply_client_change((select auth.uid()),mutation_id,action,payload);
$$;
revoke all on function public.dic_mutate(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.dic_mutate(uuid,text,jsonb) to authenticated;
comment on function public.dic_mutate(uuid,text,jsonb) is 'Legacy beta RPC; intentionally delegated to the same authenticated owner-bound mutation gateway.';
