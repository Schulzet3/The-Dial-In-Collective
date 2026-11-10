-- Run after the full migration chain. Every synthetic row is rolled back.
begin;
do $preview_tests$
declare
 actor uuid; second_user uuid:=gen_random_uuid(); candidate uuid:=gen_random_uuid();
 ambiguous uuid:=gen_random_uuid(); pending uuid; library_id uuid:=gen_random_uuid();
 got jsonb; denied boolean; url text:='https://sweetbloomcoffee.com/products/ci-release';
begin
 select owner_id into strict actor from private.app_admins;
 insert into auth.users(id,email) values(second_user,second_user::text||'@example.invalid');
 update private.beta_members set enabled=true,admitted_at=now() where owner_id=second_user;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 execute 'set local role authenticated';
 denied:=false;
 begin perform public.dic_roaster_preview_target('sweetbloomcoffee.com');
 exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Member can call service-only preview target'; end if;
 denied:=false;
 begin perform public.dic_url_preview_claim(actor);
 exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Member can bypass preview quota'; end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.role','service_role',true);
 execute 'set local role service_role';
 got:=public.dic_roaster_preview_target('sweetbloomcoffee.com');
 if got->>'canonical_name' is distinct from 'Sweet Bloom' then raise exception 'Known roaster target failed: %',got; end if;
 if public.dic_roaster_preview_target('attacker.example.invalid') is not null then raise exception 'Unknown host trusted'; end if;
 if public.dic_roaster_preview_target('127.0.0.1:8000') is not null then raise exception 'Invalid host trusted'; end if;
 got:=public.dic_url_preview_claim(gen_random_uuid());
 if got->>'allowed' is distinct from 'false' then raise exception 'Nonexistent account accepted'; end if;
 got:=public.dic_url_preview_claim(actor);
 if got->>'allowed' is distinct from 'true' then raise exception 'First preview quota claim failed: %',got; end if;
 got:=public.dic_url_preview_claim(actor);
 if got->>'reason' is distinct from 'preview_cooldown' then raise exception 'Preview cooldown failed: %',got; end if;
 got:=public.dic_url_preview_claim(second_user);
 if got->>'allowed' is distinct from 'true' then raise exception 'Quota leaked across accounts'; end if;
 execute 'reset role';
 update private.dic_url_preview_attempts set attempts=12,last_attempt_at=now()-interval '1 minute' where owner_id=actor;
 execute 'set local role service_role';
 got:=public.dic_url_preview_claim(actor);
 if got->>'reason' is distinct from 'daily_preview_limit' then raise exception 'Daily quota failed'; end if;
 execute 'reset role';
 update private.dic_url_preview_attempts set window_started_at=now()-interval '25 hours' where owner_id=actor;
 execute 'set local role service_role';
 got:=public.dic_url_preview_claim(actor);
 if got->>'allowed' is distinct from 'true' then raise exception 'Daily quota did not reset'; end if;
 execute 'reset role';

 insert into public.coffees(id,name,roaster,release_label,origin,process,verification_state)
 values(candidate,'CI Release','Sweet Bloom','2026','Ethiopia','Washed','verified');
 insert into public.coffee_sources(coffee_id,source_url,source_kind,checked_at)
 values(candidate,url,'roaster_page',now());
 perform set_config('request.jwt.claim.role','authenticated',true);
 execute 'set local role authenticated';
 got:=public.dic_find_coffee_matches(jsonb_build_object('roaster','Sweet Bloom','name','CI Release','release_label','2026','source_url',url));
 if got->>'exact_id' is distinct from candidate::text then raise exception 'Known URL+release did not match: %',got; end if;
 got:=public.dic_find_coffee_matches(jsonb_build_object('roaster','Sweet Bloom','name','CI Release','source_url',url));
 if got->>'classification' is distinct from 'needs_confirmation' or got->>'exact_id' is not null then raise exception 'Unknown release silently linked'; end if;
 got:=public.dic_find_coffee_matches(jsonb_build_object('roaster','Sweet Bloom','name','CI Release','release_label','2027','source_url',url));
 if got->>'exact_id' is not null then raise exception 'Reused URL collapsed a different release'; end if;
 got:=public.dic_find_coffee_matches(jsonb_build_object('roaster','Sweet Bloom','name','CI Release','release_label','2026','process','Natural','source_url',url));
 if got->>'exact_id' is not null then raise exception 'Conflicting process silently linked'; end if;
 execute 'reset role';

 -- Exercise the aggregate in the actual source-promotion path, including ID preservation.
 insert into public.coffee_submissions(owner_id,proposed_data,source_url)
 values(second_user,'{"name":"CI Release","roaster":"Sweet Bloom","release_label":"2026","origin":"Ethiopia","process":"Washed"}',url)
 returning id into pending;
 insert into public.library_entries(id,owner_id,submission_id) values(library_id,second_user,pending);
 perform set_config('request.jwt.claim.role','service_role',true);
 execute 'set local role service_role';
 got:=public.dic_trusted_source_verify(pending,jsonb_build_object('checked_url',url,'product_name','CI Release','title_matches',true,'evidence_kind','jsonld_product','release_label','2026','submission_revision',1));
 if got->>'coffee_id' is distinct from candidate::text then raise exception 'Exact release source reuse failed: %',got; end if;
 execute 'reset role';
 if not exists(select 1 from public.library_entries where id=library_id and owner_id=second_user and coffee_id=candidate and submission_id is null) then raise exception 'Original library identity lost'; end if;

 insert into public.coffees(id,name,roaster,release_label,verification_state)
 values(ambiguous,'CI Release','Sweet Bloom','2026','verified');
 insert into public.coffee_sources(coffee_id,source_url,source_kind,checked_at) values(ambiguous,url,'roaster_page',now());
 perform set_config('request.jwt.claim.role','authenticated',true);
 execute 'set local role authenticated';
 got:=public.dic_find_coffee_matches(jsonb_build_object('roaster','Sweet Bloom','name','CI Release','release_label','2026','source_url',url));
 if got->>'exact_id' is not null or got->>'classification' is distinct from 'needs_confirmation' then raise exception 'Ambiguous release silently linked'; end if;
 execute 'reset role';
end $preview_tests$;
select 'PASS: trusted preview target, client denial, per-account quotas, release conflicts, ambiguity and source reuse with stable library identity' as result;
rollback;
