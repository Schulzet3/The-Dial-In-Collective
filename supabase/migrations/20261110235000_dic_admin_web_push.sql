-- Issue #1938: admin-only, opt-in web push. Source-only pending an owner Publish.
-- No message content, member email, shot data, note, or APNs private key is stored.
create table if not exists public.dic_admin_push_subscriptions (
 endpoint_hash text primary key check (endpoint_hash ~ '^[0-9a-f]{64}$'),
 owner_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null check (octet_length(endpoint) between 20 and 2048),
 seen_tokens jsonb not null default '[]'::jsonb check (jsonb_typeof(seen_tokens)='array'),
 expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 last_sent_at timestamptz
);
create index if not exists dic_admin_push_owner_idx on public.dic_admin_push_subscriptions(owner_id);
alter table public.dic_admin_push_subscriptions enable row level security;
revoke all on public.dic_admin_push_subscriptions from public,anon,authenticated;
grant select,insert,update,delete on public.dic_admin_push_subscriptions to service_role;

-- Dedicated read-only aggregate for the scheduled push sender. Never expose this
-- SECURITY DEFINER to public/anon/authenticated. Tokens are random record IDs only.
create or replace function public.dic_admin_push_snapshot()
returns jsonb language sql stable security definer set search_path='' as $fn$
 select jsonb_build_object(
  'admin_ids',coalesce((
   select jsonb_agg(a.owner_id order by a.owner_id)
   from private.app_admins a join private.beta_members m on m.owner_id=a.owner_id
   where m.admitted_at is not null and m.enabled
  ),'[]'::jsonb),
  'tokens',coalesce((
   select jsonb_agg(t.token order by t.token)
   from (
    select 'signup:'||m.owner_id::text as token
    from private.beta_members m
    join auth.users u on u.id=m.owner_id
    where m.admitted_at is null and m.signup_review_state='pending'
      and u.email_confirmed_at is not null
    union
    select 'coffee:'||s.id::text from public.coffee_submissions s
      where s.status in ('pending','conflict')
    union
    select 'delete:'||op.id::text from private.dic_admin_account_delete_operations op
      where op.phase<>'completed'
   ) t
  ),'[]'::jsonb)
 );
$fn$;
revoke all on function public.dic_admin_push_snapshot() from public,anon,authenticated;
grant execute on function public.dic_admin_push_snapshot() to service_role;
comment on function public.dic_admin_push_snapshot() is
 'Service-role-only redacted actionable IDs for consent-based admin push; not a public user/member endpoint.';
