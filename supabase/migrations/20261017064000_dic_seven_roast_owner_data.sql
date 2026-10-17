-- COFFEE-ROAST-20261016-02: production data step, MUST NOT be applied
-- until verified Netlify production serves the seven-tier-compatible frontend.
-- Phase one (dic_seven_roast_tier_compatibility) is deliberately nonbreaking.
-- This step enforces strictly seven labels and performs exactly the owner's
-- named coffee corrections, with private reversible before/after audit.
--
-- In a network-isolated, unseeded CI schema, no owner coffees are present:
-- the guarded DO block returns without synthetic owner modifications.
-- On production, every old label and all named identities must match exactly.
-- Never use the verified roaster source evidence to overwrite these OWNER
-- category preferences, and never promote private Pending Wuri.

alter table private.dic_coffee_audit
 drop constraint if exists dic_coffee_audit_event_kind_check;
alter table private.dic_coffee_audit
 add constraint dic_coffee_audit_event_kind_check
 check (event_kind in ('admin_approved','official_verified','user_confirmed',
                      'canonical_reused','needs_review','owner_roast_reclassified'));

do $owner_roast$
declare
 item record;
 c public.coffees;
 w public.coffee_submissions;
 changed integer;
 target record;
 old_value text;
 original_coffee_count bigint;
 original_shot_count bigint;
 original_community_count bigint;
 original_contribution_count bigint;
 original_library_count bigint;
 original_source_count bigint;
begin
 select count(*) into original_coffee_count from public.coffees;
 if original_coffee_count=0 then
  -- Schema-only isolated CI, before the synthetic owner fixture exists.
  return;
 end if;
 if original_coffee_count<>4
   or (select count(*) from public.coffees where verification_state='verified' and merged_into_id is null)<>4
   or (select count(*) from public.coffee_submissions where status='pending')<>1
 then raise exception 'Owner roast migration scope changed: review before applying';end if;
 select count(*) into original_shot_count from public.shots;
 select count(*) into original_community_count from public.community_shots;
 select count(*) into original_contribution_count from private.contribution_links;
 select count(*) into original_library_count from public.library_entries;
 select count(*) into original_source_count from public.coffee_sources;

 -- Exactly four existing Verified identities, including unchanged Hambela.
 for item in
   select * from (values
    ('Sweet Bloom','Hambela','Light','Light'),
    ('Orinoco Coffee & Tea','Yirgacheffe','Light-Medium','Medium-Light'),
    ('Proud Mary','Bavyeyi IV','Light','Very Light'),
    ('Queen City Collective Coffee','David Armijos','Light','Very Light')
   ) x(roaster_name,coffee_name,expected_roast,target_roast)
 loop
   if (select count(*) from public.coffees k where k.name=item.coffee_name
        and k.roaster=item.roaster_name and k.verification_state='verified'
        and k.merged_into_id is null)=1 then
     select k.* into strict c from public.coffees k
     where k.name=item.coffee_name and k.roaster=item.roaster_name
       and k.verification_state='verified' and k.merged_into_id is null
     for update;
   else
     raise exception 'Coffee identity unexpectedly absent or ambiguous: %',item.coffee_name;
   end if;
   if c.roast_level is distinct from item.expected_roast then
     raise exception 'Original roast no longer matches: %',item.coffee_name;
   end if;
   if item.expected_roast<>item.target_roast then
     update public.coffees set roast_level=item.target_roast
     where id=c.id and roast_level=item.expected_roast;
     get diagnostics changed=row_count;
     if changed<>1 then raise exception 'Coffee update count changed: %',item.coffee_name;end if;
     insert into private.dic_coffee_audit(coffee_id,submission_id,actor_id,event_kind,evidence)
     values(c.id,null,null,'owner_roast_reclassified',
       jsonb_build_object('decision','COFFEE-ROAST-20261016-02',
        'scope','owner-selected roast taxonomy (not official source fact)',
        'old_roast',item.expected_roast,'new_roast',item.target_roast,
        'original_revision',c.revision));
   end if;
 end loop;

 select s.* into strict w from public.coffee_submissions s
 where s.status='pending' and s.canonical_coffee_id is null
  and s.proposed_data->>'name'='Wuri'
  and s.proposed_data->>'roaster'='Sweet Bloom'
 for update;
 if w.proposed_data->>'roast_level' is distinct from 'Light' or
   (select count(*) from public.library_entries l where l.owner_id=w.owner_id
        and l.submission_id=w.id and l.coffee_id is null)<>1 then
   raise exception 'Pending Wuri or private library relationship changed';
 end if;
 update public.coffee_submissions s
 set proposed_data=jsonb_set(s.proposed_data,'{roast_level}',to_jsonb('Very Light'::text),true)
 where s.id=w.id and s.owner_id=w.owner_id and s.status='pending'
  and s.proposed_data->>'roast_level'='Light';
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Pending Wuri roast correction not unique';end if;
 insert into private.dic_coffee_audit(coffee_id,submission_id,actor_id,event_kind,evidence)
 values(null,w.id,null,'owner_roast_reclassified',
   jsonb_build_object('decision','COFFEE-ROAST-20261016-02',
    'scope','private owner-approved proposal correction; still Pending',
    'previous_manual_roast','Light','new_roast','Very Light',
    'original_revision',w.revision));

 if (select count(*) from public.coffees)<>original_coffee_count
  or (select count(*) from public.shots)<>original_shot_count
  or (select count(*) from public.community_shots)<>original_community_count
  or (select count(*) from private.contribution_links)<>original_contribution_count
  or (select count(*) from public.library_entries)<>original_library_count
  or (select count(*) from public.coffee_sources)<>original_source_count
  or (select count(*) from public.coffee_submissions where status='pending')<>1
  or (select count(*) from public.coffees where roast_level='Light-Medium')<>0
 then raise exception 'Related records or legacy roast state changed';end if;
end $owner_roast$;

-- After the named old-spelling coffee is relabeled, there is no need to admit
-- obsolete Light-Medium into new canonical coffee rows. Old proposal/source
-- JSON remains intact as provenance and app read-time aliases still work.
alter table public.coffees drop constraint coffees_roast_level_check;
alter table public.coffees add constraint coffees_roast_level_check
 check (roast_level in ('Ultra Light','Very Light','Light','Medium-Light',
                       'Medium','Medium-Dark','Dark'));
