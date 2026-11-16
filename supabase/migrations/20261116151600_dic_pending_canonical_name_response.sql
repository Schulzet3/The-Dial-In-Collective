-- #509 development-only: return the current canonical name after older Pending precedence renames it.
-- Provider source MD5 140c211a4bfef175b041c037561a1e37; preserve all RLS, grants, IDs, aliases and original migration history.
-- The existing PL/pgSQL target record retains the pre-update name; only the JSON response is corrected.
CREATE OR REPLACE FUNCTION private.dic_link_pending_coffee(sid uuid, canonical uuid, event_name text, evidence jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.coffee_submissions; target public.coffees; l public.library_entries; existing uuid;
begin
 select * into s from public.coffee_submissions where id=sid for update;
 if not found then raise exception using errcode='22023',message='Submission unavailable.';end if;
 select * into target from public.coffees where id=canonical and verification_state='verified' and merged_into_id is null;
 if not found then raise exception using errcode='22023',message='Verified canonical coffee unavailable.';end if;
 if s.status in ('merged','approved') and s.canonical_coffee_id=canonical then
  return jsonb_build_object('ok',true,'coffee_id',canonical,'status','verified','already_linked',true);
 end if;
 if s.status not in ('pending','conflict') then
  raise exception using errcode='23514',message='Submission is already resolved.';
 end if;
 -- The global display name belongs to whichever *original submission* was first.
 -- An older Pending submission may have been verified later than this canonical.
 if s.created_at < coalesce((select first_seen_at from private.dic_coffee_first_entry
                            where coffee_id=canonical),target.created_at) then
  if private.dic_coffee_key(s.proposed_data->>'name') is distinct from private.dic_coffee_key(target.name) then
   insert into private.dic_coffee_aliases(coffee_id,alias_key,original_name,origin_kind)
    values(canonical,private.dic_coffee_key(target.name),target.name,'user_confirmed')
    on conflict(coffee_id,alias_key) do nothing;
  end if;
  update public.coffees set name=left(s.proposed_data->>'name',200) where id=canonical;
  insert into private.dic_coffee_first_entry(coffee_id,first_seen_at,first_submission_id,primary_name)
   values(canonical,s.created_at,s.id,left(s.proposed_data->>'name',200))
   on conflict(coffee_id) do update set first_seen_at=excluded.first_seen_at,
     first_submission_id=excluded.first_submission_id,primary_name=excluded.primary_name;
 end if;
 select * into l from public.library_entries where owner_id=s.owner_id and submission_id=s.id for update;
 if not found then raise exception using errcode='23514',message='Original library entry is missing.';end if;
 select id into existing from public.library_entries
  where owner_id=s.owner_id and coffee_id=canonical and id<>l.id and hidden_at is null limit 1;
 if existing is not null then
  -- Do NOT orphan existing shots, recipes or pinned workspaces.
  raise exception using errcode='23514',message='This account already has this coffee. Reconcile the two personal entries with their history before merging.';
 end if;
 update public.coffee_submissions set canonical_coffee_id=canonical,
   status=case when event_name='admin_approved' or event_name='official_verified' then 'approved' else 'merged' end
 where id=s.id;
 update public.library_entries set coffee_id=canonical,submission_id=null where id=l.id;
 if private.dic_coffee_key(s.proposed_data->>'name') is distinct from private.dic_coffee_key(target.name)
   and private.dic_coffee_key(s.proposed_data->>'name') is not null then
   insert into private.dic_coffee_aliases(coffee_id,alias_key,original_name,origin_kind)
   values(target.id,private.dic_coffee_key(s.proposed_data->>'name'),left(s.proposed_data->>'name',200),
    case when event_name='official_verified' then 'source_confirmed' else 'user_confirmed' end)
   on conflict(coffee_id,alias_key) do nothing;
 end if;
 insert into private.dic_coffee_audit(coffee_id,submission_id,actor_id,event_kind,evidence)
 values(target.id,s.id,auth.uid(),event_name,coalesce(evidence,'{}'::jsonb));
 return jsonb_build_object('ok',true,'coffee_id',target.id,'status','verified',
    'library_entry_id',l.id,'canonical_name',(select c.name from public.coffees c where c.id=target.id),'reused',true);
end $function$;
