-- Disposable-only fixture for Issues #5 and #10 signed HTTP acceptance.
-- Executed by the CI acceptance runner, never against a hosted database.
do $guard$ begin
 if current_database() <> 'dic_ci' then raise exception 'CI database required'; end if;
end $guard$;
grant service_role to authenticator;
do $fixture$
declare
 u uuid:='70000000-0000-4000-8000-000000000007';
 sid uuid:='71000000-0000-4000-8000-000000000007';
 vid uuid:='72000000-0000-4000-8000-000000000007';
 bid uuid:='73000000-0000-4000-8000-000000000007';
 bvid uuid:='74000000-0000-4000-8000-000000000007';
 gid uuid:='75000000-0000-4000-8000-000000000007';
 cid uuid:='76000000-0000-4000-8000-000000000007';
 lid uuid:='77000000-0000-4000-8000-000000000007';
 a uuid:='78000000-0000-4000-8000-000000000001';
 b uuid:='78000000-0000-4000-8000-000000000002';
 c uuid:='78000000-0000-4000-8000-000000000003';
 d uuid:='78000000-0000-4000-8000-000000000004';
 source_id uuid:='79000000-0000-4000-8000-000000000001';
 retry_id uuid:='79000000-0000-4000-8000-000000000002';
begin
 insert into auth.users(id,aud,role,email,email_confirmed_at)
 values(u,'authenticated','authenticated','signed-http-isolated@ci.example.invalid',now());
 insert into private.beta_members(owner_id,enabled,admitted_at) values(u,true,now())
 on conflict(owner_id) do update set enabled=true,admitted_at=now();
 insert into public.setups(id,owner_id,name) values(sid,u,'Isolated multi-family setup');
 insert into public.setup_versions(id,owner_id,setup_id,machine_model,grinder_model)
 values(vid,u,sid,'Synthetic machine','Synthetic grinder');
 update public.setups set active_version_id=vid where id=sid;
 insert into public.grinder_calibrations(id,owner_id,setup_id,grinder_model,finest_setting,coarsest_setting)
 values(gid,u,sid,'Synthetic grinder',0,10);
 insert into public.baskets(id,owner_id,setup_id,name) values(bid,u,sid,'Synthetic basket');
 insert into public.basket_versions(id,owner_id,setup_id,basket_id,basket_dose_g)
 values(bvid,u,sid,bid,18);
 insert into public.setup_preferences(owner_id,setup_id,setup_version_id,calibration_id,default_basket_version_id)
 values(u,sid,vid,gid,bvid);
 insert into public.coffees(id,name,roaster,verification_state)
 values(cid,'Isolated family evidence','CI roaster','verified');
 insert into public.library_entries(id,owner_id,coffee_id) values(lid,u,cid);
 insert into public.shots(id,owner_id,library_entry_id,setup_id,setup_version_id,basket_version_id,
 calibration_id,style,pulled_at,dose_g,yield_g,time_s,grind_setting,temperature_c,
 extraction,body,clarity,sweetness,astringency,equipment_snapshot) values
 (a,u,lid,sid,vid,bvid,gid,'Turbo',now()-interval '4 hours',18,36,24,2,92,3,3,5,5,1,'{}'),
 (b,u,lid,sid,vid,bvid,gid,'Turbo',now()-interval '3 hours',18,36,44,2.5,95,3,3,5,5,1,'{}'),
 (c,u,lid,sid,vid,bvid,gid,'Turbo',now()-interval '2 hours',18,54,20,3,92,3,3,5,5,1,'{}'),
 (d,u,lid,sid,vid,bvid,gid,'Turbo',now()-interval '1 hour',18,54,22,3.1,92,3,3,5,5,1,'{}');
 perform private.classify_personal_shot(a);
 perform private.classify_personal_shot(b);
 perform private.classify_personal_shot(c);
 perform private.classify_personal_shot(d);
 if (select count(*) from public.personal_recipe_families where owner_id=u
  and library_entry_id=lid and evidence_state='personally_confirmed')<>2 then
  raise exception 'Two confirmed families required for signed HTTP test';
 end if;
 insert into public.coffee_submissions(id,owner_id,source_url,proposed_data)
 values(source_id,u,'https://sweetbloomcoffee.com/products/ci-official',
  '{"name":"CI Official Product","roaster":"Sweet Bloom","release_label":"2026","origin":"Gedeb, Ethiopia","producer":"CI Washing Station","process":"Washed"}'::jsonb),
 (retry_id,u,'https://sweetbloomcoffee.com/products/ci-member-retry',
  '{"name":"CI Legacy Retry Product","roaster":"Sweet Bloom","release_label":"2027","origin":"Ethiopia"}'::jsonb);
 insert into public.library_entries(id,owner_id,submission_id) values
 ('7a000000-0000-4000-8000-000000000001',u,source_id),
 ('7a000000-0000-4000-8000-000000000002',u,retry_id);
end $fixture$;
select 'PASS: synthetic signed HTTP source and two-family fixtures are isolated' as result;
