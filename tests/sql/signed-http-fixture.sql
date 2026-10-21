-- DISPOSABLE dic_ci PostgreSQL ONLY. Never execute against hosted Supabase.
-- Six consent-free synthetic contributor identities create a genuine held outlier.
do $$ begin
 if current_database()<>'dic_ci' then raise exception 'Not disposable dic_ci'; end if;
end $$;
create role authenticator login noinherit;
grant anon,authenticated to authenticator;

do $fixture$
declare
 i integer; user_id uuid; shot_id uuid;
 setup_id uuid; version_id uuid; basket_id uuid; basket_version_id uuid;
 calib_id uuid; library_id uuid; community_id uuid; state text;
 coffee_id uuid:='30000000-0000-4000-8000-000000000001';
begin
 insert into public.coffees(id,name,roaster,release_label,origin,process,producer,verification_state)
 values(coffee_id,'CI Explicit Signed HTTP Lot','CI Fixture Roaster','2026 Disposable',
  'Ethiopia','Washed','CI Producer','verified');
 for i in 1..6 loop
  user_id:=('40000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
  shot_id:=('50000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
  setup_id:=gen_random_uuid(); version_id:=gen_random_uuid();
  basket_id:=gen_random_uuid();basket_version_id:=gen_random_uuid();
  calib_id:=gen_random_uuid();library_id:=gen_random_uuid();
  insert into auth.users(id,aud,role,email,email_confirmed_at)
  values(user_id,'authenticated','authenticated',
   'only-isolated-fixture-'||i||'@ci.example.invalid',now());
  update private.beta_members set enabled=true,admitted_at=now() where owner_id=user_id;
  insert into public.setups(id,owner_id,name) values(setup_id,user_id,'Ephemeral CI Setup');
  insert into public.setup_versions(id,owner_id,setup_id,machine_model,grinder_model,burr_set)
  values(version_id,user_id,setup_id,'CI Machine','CI Grinder','CI Burr');
  insert into public.grinder_calibrations(
   id,owner_id,setup_id,grinder_model,burr_set,finest_setting,coarsest_setting)
  values(calib_id,user_id,setup_id,'CI Grinder','CI Burr',0,5);
  insert into public.baskets(id,owner_id,setup_id,name)
  values(basket_id,user_id,setup_id,'CI 18 g');
  insert into public.basket_versions(
   id,owner_id,setup_id,basket_id,basket_dose_g,model)
  values(basket_version_id,user_id,setup_id,basket_id,18,'CI Basket');
  insert into public.library_entries(id,owner_id,coffee_id)
  values(library_id,user_id,coffee_id);
  insert into public.shots(id,owner_id,library_entry_id,setup_id,
   setup_version_id,basket_version_id,calibration_id,style,pulled_at,
   dose_g,yield_g,time_s,grind_setting,extraction,body,clarity,
   sweetness,astringency,equipment_snapshot)
  values(shot_id,user_id,library_id,setup_id,version_id,basket_version_id,
   calib_id,'Turbo',now(),18,42,case when i=6 then 145 else 25 end,
   1.1,3,3,5,5,1,'{}');
  insert into public.shot_notes(owner_id,shot_id,notes)
  values(user_id,shot_id,'PRIVATE_CI_NOTE_MUST_NOT_LEAK');
  select community_shot_id into strict community_id from private.contribution_links
   where private.contribution_links.shot_id=shot_id;
  select quality_state into strict state from public.community_shots
   where id=community_id;
  if (i<6 and state<>'eligible') or (i=6 and state<>'held') then
   raise exception 'Unexpected isolated quality state, sample % state %',i,state;
  end if;
 end loop;
 insert into auth.users(id,aud,role,email,email_confirmed_at)
 values
 ('20000000-0000-4000-8000-000000000016','authenticated','authenticated',
  'not-admitted@ci.example.invalid',now()),
 ('20000000-0000-4000-8000-000000000017','authenticated','authenticated',
  'disabled@ci.example.invalid',now());
 update private.beta_members set enabled=false,admitted_at=now()
 where owner_id='20000000-0000-4000-8000-000000000017';
 if exists(select 1 from private.beta_members
  where owner_id='20000000-0000-4000-8000-000000000016'
   and admitted_at is not null)
  then raise exception 'Unadmitted CI identity was admitted';end if;
 if (select count(*) from public.community_shots where quality_state='held')<>1
 then raise exception 'Required isolated held sample absent';end if;
end $fixture$;