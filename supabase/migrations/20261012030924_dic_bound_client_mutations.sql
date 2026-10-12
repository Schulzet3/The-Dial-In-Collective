-- Bind queued browser mutations to the account that originally created them.
-- This prevents an auth switch during a request from sending A's queued data as B.
create function public.dic_apply_client_change(expected_owner uuid,mutation_id uuid,action text,payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if expected_owner is null or expected_owner is distinct from auth.uid() then
  raise exception using errcode='42501',message='Account changed before this mutation was submitted. Original pending data was retained.';
 end if;
 return private.mutate_workspace(mutation_id,action,payload);
end $$;
revoke all on function public.dic_apply_client_change(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.dic_apply_client_change(uuid,uuid,text,jsonb) to authenticated;
