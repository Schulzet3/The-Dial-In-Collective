-- #2258: one immutable approved signup event, two independently retried notice channels.
-- SOURCE ONLY until a fresh owner Publish + verified recovery. No historical backfill.
create table if not exists public.dic_member_approval_push_subscriptions (
 endpoint_hash text primary key check (endpoint_hash ~ '^[0-9a-f]{64}$'),
 owner_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null check (length(endpoint) between 20 and 2048),
 expires_at timestamptz not null,
 last_sent_event_id bigint not null default 0 check (last_sent_event_id >= 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists dic_member_approval_push_owner_idx
 on public.dic_member_approval_push_subscriptions(owner_id,expires_at);
alter table public.dic_member_approval_push_subscriptions enable row level security;
revoke all on public.dic_member_approval_push_subscriptions from public, anon, authenticated;
grant select,insert,update,delete on public.dic_member_approval_push_subscriptions to service_role;

create table if not exists private.dic_member_approval_deliveries (
 event_id bigint not null references private.dic_signup_review_events(id) on delete cascade,
 member_id uuid not null references auth.users(id) on delete cascade,
 channel text not null check (channel in ('email','push')),
 state text not null default 'pending' check (state in ('pending','sending','sent','skipped')),
 attempt_count integer not null default 0 check (attempt_count between 0 and 100000),
 claim_token uuid,
 lease_until timestamptz,
 next_attempt_at timestamptz not null default now(),
 completed_at timestamptz,
 created_at timestamptz not null default now(),
 primary key (event_id,channel)
);
create index if not exists dic_member_approval_claim_idx
 on private.dic_member_approval_deliveries(channel,state,next_attempt_at,event_id);
alter table private.dic_member_approval_deliveries enable row level security;
revoke all on private.dic_member_approval_deliveries from public, anon, authenticated;
grant select,insert,update,delete on private.dic_member_approval_deliveries to service_role;

-- The existing verified Admin approval transaction is the only producer.
create or replace function private.dic_enqueue_member_approval_notices()
returns trigger language plpgsql security definer set search_path='' as $function$
begin
 if new.action='approve' and new.member_id is not null then
  insert into private.dic_member_approval_deliveries(event_id,member_id,channel)
  values(new.id,new.member_id,'email'),(new.id,new.member_id,'push')
  on conflict(event_id,channel) do nothing;
 end if;
 return new;
end $function$;
revoke all on function private.dic_enqueue_member_approval_notices() from public,anon,authenticated;
drop trigger if exists dic_enqueue_member_approval_notices_on_review on private.dic_signup_review_events;
create trigger dic_enqueue_member_approval_notices_on_review
 after insert on private.dic_signup_review_events
 for each row execute function private.dic_enqueue_member_approval_notices();

create table if not exists private.dic_member_approval_poll_gate (
 singleton boolean primary key default true check(singleton=true),
 last_polled_at timestamptz not null default '-infinity'::timestamptz
);
insert into private.dic_member_approval_poll_gate(singleton) values(true)
 on conflict(singleton) do nothing;
alter table private.dic_member_approval_poll_gate enable row level security;
revoke all on private.dic_member_approval_poll_gate from public,anon,authenticated;
grant select,update on private.dic_member_approval_poll_gate to service_role;

-- Service key only. Public RPC schema is necessary for Edge PostgREST routing;
-- no anon/authenticated execution or private-row grants are created.
create or replace function public.dic_member_approval_claim_poll()
returns boolean language plpgsql volatile security definer set search_path='' as $function$
begin
 update private.dic_member_approval_poll_gate set last_polled_at=now()
 where singleton=true and last_polled_at < now()-interval '4 minutes';
 return found;
end $function$;
revoke all on function public.dic_member_approval_claim_poll() from public,anon,authenticated;
grant execute on function public.dic_member_approval_claim_poll() to service_role;

create or replace function public.dic_member_approval_claim(p_channel text,p_limit integer default 20)
returns jsonb language plpgsql volatile security definer set search_path='' as $function$
declare batches jsonb;
begin
 if p_channel not in ('email','push') or p_channel is null or
    p_limit is null or p_limit not between 1 and 20 then
  raise exception using errcode='22023',message='Invalid delivery channel/limit';
 end if;
 with chosen as (
  select d.event_id,d.channel
  from private.dic_member_approval_deliveries d
  join private.beta_members m on m.owner_id=d.member_id
  join auth.users u on u.id=d.member_id
  where d.channel=p_channel and m.signup_review_state='approved'
   and m.enabled and m.admitted_at is not null
   and u.email_confirmed_at is not null
   and ((d.state='pending' and d.next_attempt_at<=now())
    or (d.state='sending' and d.lease_until < now()))
  order by d.event_id limit p_limit for update of d skip locked
 ), claimed as (
  update private.dic_member_approval_deliveries d
  set state='sending',attempt_count=d.attempt_count+1,
      claim_token=gen_random_uuid(),lease_until=now()+interval '2 minutes'
  from chosen c where d.event_id=c.event_id and d.channel=c.channel
  returning d.event_id,d.member_id,d.claim_token
 )
 select coalesce(jsonb_agg(jsonb_build_object(
   'eventId',c.event_id,'claimToken',c.claim_token,
   'email',case when p_channel='email' then left(u.email,254) else null end,
   'endpoints',case when p_channel='push' then (
    select coalesce(jsonb_agg(jsonb_build_object('hash',s.endpoint_hash,'endpoint',s.endpoint)),'[]'::jsonb)
    from public.dic_member_approval_push_subscriptions s
    where s.owner_id=c.member_id and s.expires_at>now()
      and s.last_sent_event_id<c.event_id
   ) else '[]'::jsonb end
  ) order by c.event_id),'[]'::jsonb) into batches
 from claimed c join auth.users u on u.id=c.member_id;
 return batches;
end $function$;
revoke all on function public.dic_member_approval_claim(text,integer) from public,anon,authenticated;
grant execute on function public.dic_member_approval_claim(text,integer) to service_role;

create or replace function public.dic_member_approval_finish(
 p_event_id bigint,p_channel text,p_claim_token uuid,p_outcome text)
returns boolean language plpgsql volatile security definer set search_path='' as $function$
begin
 if p_channel not in ('email','push') or p_outcome not in ('sent','skipped','retry')
   or p_claim_token is null or p_event_id is null then
  raise exception using errcode='22023',message='Invalid delivery receipt';
 end if;
 update private.dic_member_approval_deliveries d
 set state=case when p_outcome='retry' then 'pending' else p_outcome end,
     claim_token=null,lease_until=null,
     completed_at=case when p_outcome='retry' then null else now() end,
     next_attempt_at=case when p_outcome='retry' then
       now()+least(60,power(2,least(d.attempt_count,5))::integer)*interval '1 minute'
       else d.next_attempt_at end
 where d.event_id=p_event_id and d.channel=p_channel and
   d.state='sending' and d.claim_token=p_claim_token;
 return found;
end $function$;
revoke all on function public.dic_member_approval_finish(bigint,text,uuid,text) from public,anon,authenticated;
grant execute on function public.dic_member_approval_finish(bigint,text,uuid,text) to service_role;
