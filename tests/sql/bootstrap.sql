-- Release12 owner-approved READY source combined SQL/JWT acceptance for Issue47 grant and two Issue33 source corrections; no provider operations from CI.
-- Release11 runs the already-approved isolated SQL acceptance on the same combined READY source; no new schema.
-- Release09 revised ten-item batch: rerun existing disposable SQL/JWT regression on exact selected source; no production schema change.
-- Disposable PostgreSQL only: these are test doubles for Supabase's Auth schema.
-- They do not prove hosted Auth/JWT/email behavior and must NEVER run on Supabase.
do $$ begin
 if current_database()<>'dic_ci' then raise exception 'Disposable dic_ci database required'; end if;
end $$;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema extensions;
grant usage on schema public,auth,extensions to anon,authenticated,service_role;
create table auth.users(
 id uuid primary key, aud text, role text, email text,
 email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}',
 raw_app_meta_data jsonb default '{}', created_at timestamptz default now(),
 updated_at timestamptz default now()
);
create function auth.uid() returns uuid language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
  nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid;
$$;
grant execute on function auth.uid() to anon,authenticated,service_role;

-- Supabase's real auth.role() supports both legacy request.jwt.claim.role
-- and the modern PostgREST request.jwt.claims JSON. Required for a realistic
-- isolated-only member JWT regression; never apply bootstrap to production.
create function auth.role() returns text language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),
  nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role')::text;
$$;
grant execute on function auth.role() to anon,authenticated,service_role;
