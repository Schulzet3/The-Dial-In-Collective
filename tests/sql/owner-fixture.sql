-- This fixture exists only in the disconnected, throwaway PostgreSQL container.
do $$ begin
 if current_database()<>'dic_ci' then raise exception 'Disposable dic_ci database required'; end if;
end $$;
insert into auth.users(id,aud,role,email,email_confirmed_at)
values('10000000-0000-4000-8000-000000000001','authenticated','authenticated','owner@ci.example.invalid',now());
update private.beta_members set enabled=true,admitted_at=now()
where owner_id='10000000-0000-4000-8000-000000000001';
insert into private.app_admins(owner_id) values('10000000-0000-4000-8000-000000000001');
