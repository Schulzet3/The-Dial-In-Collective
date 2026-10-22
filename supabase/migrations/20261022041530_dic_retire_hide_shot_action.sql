-- Owner-Locked UX-REMOVE-HIDE-SHOT-CONTROL-20261021: retire the legacy
-- externally reachable hide_shot request without changing stored records,
-- receipt history, member access, or the existing mutation API.
-- IMPORTANT: This guard must execute BEFORE the existing mutation_receipts
-- replay path to reject old, previously accepted IDs as well as new requests.
create or replace function public.dic_apply_client_change(
 expected_owner uuid, mutation_id uuid, action text, payload jsonb)
returns jsonb
language plpgsql
set search_path=''
as $body$
begin
 if action='hide_shot' then
  raise exception using errcode='22023',
   message='This action is no longer available. Your existing shot and offline record are unchanged.';
 end if;
 if expected_owner is null or expected_owner is distinct from auth.uid() then
  raise exception using errcode='42501',message='Account changed before this mutation was submitted. Original pending data was retained.';
 end if;
 if action='rename_setup' then
  return private.rename_setup(mutation_id,payload);
 end if;
 if action='submit_coffee' then
  return private.dic_submit_coffee_auto(mutation_id,payload);
 end if;
 if action='confirm_coffee_existing' then
  return private.dic_confirm_coffee_existing(mutation_id,payload);
 end if;
 return private.mutate_workspace(mutation_id,action,payload);
end
$body$;

-- Never rewrite historical action strings, hidden_at snapshots, or audit
-- receipts here: they are evidence, not future accepted mutations.
