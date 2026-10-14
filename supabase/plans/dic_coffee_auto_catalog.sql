-- Owner-approved coffee identity rules, 2026-10-14.
-- All new catalogue writes are transactional, owner-bound, and audit logged.
-- An admin's own coffee is immediately approved; other coffees require
-- source-confirmed evidence before verification. No existing shots are edited.
insert into private.dic_roaster_directory(canonical_name,canonical_key,official_domain,evidence_url)
values
 ('Queen City Collective Coffee','queencitycollective','queencitycollectivecoffee.com','https://queencitycollectivecoffee.com/'),
 ('Orinoco Coffee & Tea','orinococoffeetea','orinococoffeeandtea.com','https://www.orinococoffeeandtea.com/'),
 ('Proud Mary','proudmary','proudmarycoffee.com','https://proudmarycoffee.com/')
on conflict(canonical_key) do nothing;
insert into private.dic_roaster_aliases(alias_key,roaster_id,evidence_url)
select x.alias_key,d.id,d.evidence_url from
 (values ('orinoco','orinococoffeetea'),('orinococoffee','orinococoffeetea'),
         ('queencitycoffee','queencitycollective'),('proudmarycoffee','proudmary')) x(alias_key,canonical_key)
join private.dic_roaster_directory d on d.canonical_key=x.canonical_key
on conflict(alias_key) do nothing;

create table private.dic_coffee_aliases(
 coffee_id uuid not null references public.coffees(id),
 alias_key text not null check(alias_key ~ '^[a-z0-9]+$'),
 original_name text not null check(length(original_name) between 1 and 200),
 origin_kind text not null check(origin_kind in ('user_confirmed','source_confirmed','admin_entry')),
 created_at timestamptz not null default now(),
 primary key(coffee_id,alias_key)
);
create table private.dic_coffee_first_entry(
 coffee_id uuid primary key references public.coffees(id),
 first_seen_at timestamptz not null,
 first_submission_id uuid not null references public.coffee_submissions(id),
 primary_name text not null check(length(primary_name) between 1 and 200)
);
create table private.dic_coffee_audit(
 id bigint generated always as identity primary key,
 coffee_id uuid references public.coffees(id),
 submission_id uuid references public.coffee_submissions(id),
 actor_id uuid,
 event_kind text not null check(event_kind in ('admin_approved','official_verified','user_confirmed','canonical_reused','needs_review')),
 evidence jsonb not null default '{}'::jsonb check(jsonb_typeof(evidence)='object' and octet_length(evidence::text)<=12000),
 created_at timestamptz not null default now()
);
alter table private.dic_coffee_aliases enable row level security;
alter table private.dic_coffee_first_entry enable row level security;
alter table private.dic_coffee_audit enable row level security;
revoke all on private.dic_coffee_aliases,private.dic_coffee_first_entry,private.dic_coffee_audit from public,anon,authenticated;
grant all on private.dic_coffee_aliases,private.dic_coffee_first_entry,private.dic_coffee_audit to service_role;

-- Untrusted input never overwrites canonical names. The first actual entry
-- is the authority for the displayed name; later spellings are aliases.
create function private.dic_link_pending_coffee(sid uuid,canonical uuid,event_name text,evidence jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
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
    'library_entry_id',l.id,'canonical_name',target.name,'reused',true);
end $$;

-- Shared by owner approval and trusted server-side official URL verification.
-- Never trust unverified product metadata supplied by a browser user.
create function private.dic_promote_pending_coffee(sid uuid,method text,evidence jsonb default '{}'::jsonb,distinct_confirmed boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 s public.coffee_submissions; c public.coffees; cid uuid; locked_key text;
 raw jsonb; roaster_text text; known_name text; brandkey text; official_host text; host text;
 product_name text; source_title text; namekey text; existed uuid; same_url uuid;
 existing_count integer; declared_release text; official_release text; conflicting boolean;
 info jsonb; source_kind text;
begin
 if method not in ('admin_approved','official_verified') then
  raise exception using errcode='22023',message='Unsupported verification method.';
 end if;
 if method='official_verified'
   and current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then
  raise exception using errcode='42501',message='Only the trusted source verifier may approve external evidence.';
 end if;
 if jsonb_typeof(evidence) is distinct from 'object' or octet_length(evidence::text)>10000 then
  raise exception using errcode='22023',message='Invalid evidence payload.';
 end if;
 select * into s from public.coffee_submissions where id=sid for update;
 if not found then raise exception using errcode='22023',message='Coffee submission unavailable.';end if;
 if method='admin_approved' and
    (not private.is_admin() or auth.uid() is distinct from s.owner_id) then
  raise exception using errcode='42501',message='Only the owning administrator can automatically approve their submissions.';
 end if;
 if s.status in ('approved','merged') and s.canonical_coffee_id is not null then
  return jsonb_build_object('ok',true,'coffee_id',s.canonical_coffee_id,'status','verified','already_verified',true);
 end if;
 if s.status not in ('pending','conflict') then
  raise exception using errcode='23514',message='Submission cannot be verified from this state.';
 end if;
 raw:=s.proposed_data;
 brandkey:=private.dic_canonical_roaster_key(raw->>'roaster');
 namekey:=private.dic_coffee_key(raw->>'name');
 if namekey is null or brandkey is null then
  raise exception using errcode='22023',message='Coffee and roaster names must be provided.';
 end if;
 select canonical_name,official_domain into known_name,official_host from private.dic_roaster_directory where canonical_key=brandkey;
 roaster_text:=coalesce(known_name,btrim(raw->>'roaster'));
 declared_release:=nullif(btrim(raw->>'release_label'),'');
 if method='official_verified' then
  if official_host is null or nullif(s.source_url,'') is null or
    evidence->>'evidence_kind' not in ('jsonld_product','official_product_page') then
   raise exception using errcode='23514',message='Verified roaster product evidence is required.';
  end if;
  if s.source_url !~ '^https://' then
   raise exception using errcode='23514',message='The official product URL must use HTTPS.';
  end if;
  host:=lower(split_part(split_part(regexp_replace(s.source_url,'^https://',''),'/',1),'?',1));
  if host not in (official_host,'www.'||official_host) then
   raise exception using errcode='23514',message='Source URL does not belong to the verified roaster.';
  end if;
  if private.dic_source_key(s.source_url) is distinct from private.dic_source_key(evidence->>'checked_url') then
   raise exception using errcode='23514',message='Source evidence does not match the submitted product URL.';
  end if;
  product_name:=nullif(btrim(evidence->>'product_name'),'');
  if product_name is null or coalesce(length(product_name),0)>250 then
   raise exception using errcode='23514',message='No trustworthy product title was extracted.';
  end if;
  -- Worker must prove recognizable whole-name identity, not substring Wuri/Wurist.
  if coalesce((evidence->>'title_matches')::boolean,false) is not true then
   raise exception using errcode='23514',message='Product title did not independently match the entered coffee name.';
  end if;
  official_release:=nullif(btrim(evidence->>'release_label'),'');
  if declared_release is not null and official_release is not null
     and private.dic_coffee_key(declared_release) is distinct from private.dic_coffee_key(official_release) then
   raise exception using errcode='23514',message='Release labels conflict.';
  end if;
  if coalesce((evidence->>'contradictory_facts')::boolean,false) then
   raise exception using errcode='23514',message='Source fact conflict requires human review.';
  end if;
 end if;
 -- Protect against two users simultaneously submitting the same product.
 locked_key:=brandkey||':'||namekey;
 perform pg_advisory_xact_lock(hashtextextended(locked_key,9460));
 select id into same_url from public.coffees c
 where c.verification_state='verified' and c.merged_into_id is null
  and private.dic_canonical_roaster_key(c.roaster)=brandkey
  and private.dic_coffee_key(c.name)=namekey
  and private.dic_coffee_key(c.release_label) is not distinct from private.dic_coffee_key(declared_release)
  and s.source_url is not null
  and exists(select 1 from public.coffee_sources src where src.coffee_id=c.id
    and src.source_kind='roaster_page'
    and private.dic_source_key(src.source_url)=private.dic_source_key(s.source_url))
 order by c.created_at,c.id limit 1;
 if same_url is not null then
  return private.dic_link_pending_coffee(sid,same_url,'canonical_reused',
   jsonb_build_object('method',method,'source',coalesce(evidence->>'checked_url',s.source_url)));
 end if;
 select count(*) into existing_count from public.coffees c
 where c.verification_state='verified' and c.merged_into_id is null
   and private.dic_canonical_roaster_key(c.roaster)=brandkey
   and (
     private.dic_coffee_key(c.name)=namekey
     or extensions.similarity(private.dic_coffee_key(c.name),namekey)>=0.63
   )
   and (private.dic_coffee_key(c.release_label) is null
     or private.dic_coffee_key(declared_release) is null
     or private.dic_coffee_key(c.release_label)=private.dic_coffee_key(declared_release));
 if existing_count>0 and (method='official_verified' or not distinct_confirmed) then
  insert into private.dic_coffee_audit(submission_id,actor_id,event_kind,evidence)
    values(sid,auth.uid(),'needs_review',
      jsonb_build_object('reason','potential_existing_release','method',method));
  return jsonb_build_object('ok',false,'code','needs_confirmation','status','pending');
 end if;
 insert into public.coffees(name,roaster,release_label,origin,elevation_m,roast_level,process,variety,
                            producer,tasting_notes,summary,espresso_notes,roaster_recipe,
                            verification_state,created_at)
 values(btrim(raw->>'name'),roaster_text,declared_release,nullif(btrim(raw->>'origin'),''),
   nullif(btrim(raw->>'elevation_m'),''),
   case when raw->>'roast_level' in ('Light','Light-Medium','Medium','Medium-Dark','Dark') then raw->>'roast_level' else null end,
   nullif(btrim(raw->>'process'),''),nullif(btrim(raw->>'variety'),''),nullif(btrim(raw->>'producer'),''),
   nullif(btrim(raw->>'tasting_notes'),''),nullif(btrim(raw->>'summary'),''),nullif(btrim(raw->>'espressoNotes'),''),
   case when jsonb_typeof(raw->'roaster_recipe')='object' then raw->'roaster_recipe' else null end,
   'verified',s.created_at)
 returning * into c;
 cid:=c.id;
 insert into private.dic_coffee_first_entry(coffee_id,first_seen_at,first_submission_id,primary_name)
 values(cid,s.created_at,s.id,c.name);
 -- No source-kind claim is made from the user's URL alone.
 source_kind:=case when method='official_verified' then 'roaster_page'
                   when evidence->>'official_page_confirmed'='true' then 'roaster_page'
                   else 'label' end;
 if nullif(s.source_url,'') is not null then
  insert into public.coffee_sources(coffee_id,source_url,source_kind,field_values,evidence_excerpt,checked_at)
   values(cid,s.source_url,source_kind,
     case when jsonb_typeof(evidence->'verified_fields')='object' then evidence->'verified_fields'
          else '{}'::jsonb end,
     left(coalesce(evidence->>'evidence_excerpt',
       case when source_kind='label' then 'Source URL supplied by administrator; product page not independently verified.' else 'Official roaster product evidence checked.' end),12000),
     now());
 end if;
 update public.coffee_submissions set status='approved',canonical_coffee_id=cid where id=sid;
 update public.library_entries set coffee_id=cid,submission_id=null
 where owner_id=s.owner_id and submission_id=sid;
 if not found then raise exception using errcode='23514',message='Original personal library entry was not preserved.';end if;
 insert into private.dic_coffee_audit(coffee_id,submission_id,actor_id,event_kind,evidence)
 values(cid,sid,auth.uid(),method,coalesce(evidence,'{}'::jsonb));
 return jsonb_build_object('ok',true,'status','verified','coffee_id',cid,'canonical_name',c.name,
    'reused',false);
end $$;
revoke all on function private.dic_link_pending_coffee(uuid,uuid,text,jsonb),
 private.dic_promote_pending_coffee(uuid,text,jsonb,boolean) from public,anon,authenticated;

create function private.dic_submit_coffee_auto(mid uuid,p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_member(); prior private.mutation_receipts;
 req_hash text; proposal jsonb; source text; lid uuid; sid uuid; match_result jsonb;
 exact uuid; existing uuid; response jsonb; managed_name text;
begin
 if mid is null or jsonb_typeof(p) is distinct from 'object'
 or octet_length(p::text)>32000 or jsonb_typeof(p->'proposed_data') is distinct from 'object'
 or coalesce(length(btrim(p->'proposed_data'->>'name')),0) not between 1 and 200
 or coalesce(length(btrim(p->'proposed_data'->>'roaster')),0) not between 2 and 200 then
  raise exception using errcode='22023',message='Coffee name and roaster are required.';
 end if;
 source:=nullif(btrim(p->>'source_url'),'');
 if source is not null and (length(source)>4000 or source !~ '^https?://') then
  raise exception using errcode='22023',message='Provide a valid product URL.';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,9311));
 req_hash:=encode(sha256(convert_to(jsonb_build_object('action','submit_coffee','payload',p)::text,'UTF8')),'hex');
 select * into prior from private.mutation_receipts where owner_id=u and mutation_id=mid;
 if found then
  if prior.request_hash<>req_hash then raise exception using errcode='22023',message='Mutation ID reused for different changes.';end if;
  return prior.response;
 end if;
 proposal:=p->'proposed_data';
 match_result:=private.dic_find_coffee_matches(proposal||jsonb_build_object('source_url',source));
 if match_result->>'classification'='exact_verified' then
  exact:=(match_result->>'exact_id')::uuid;
  select id into existing from public.library_entries where owner_id=u and coffee_id=exact and hidden_at is null order by created_at limit 1;
  if existing is null then
   lid:=coalesce((p->>'library_entry_id')::uuid,gen_random_uuid());
   insert into public.library_entries(id,owner_id,coffee_id) values(lid,u,exact);
  else lid:=existing; end if;
  response:=jsonb_build_object('ok',true,'status','verified','coffee_id',exact,'library_entry_id',lid,'reused',true);
 elsif match_result->>'classification'='needs_confirmation' and coalesce((p->>'confirmed_distinct')::boolean,false)=false then
  return jsonb_build_object('ok',false,'code','needs_confirmation',
    'candidates',match_result->'candidates');
 else
  lid:=coalesce((p->>'library_entry_id')::uuid,gen_random_uuid());
  managed_name:=nullif(match_result->'roaster'->>'canonical_name','');
  if coalesce((match_result->'roaster'->>'recognized')::boolean,false) and managed_name is not null
      and managed_name<>proposal->>'roaster' then
   proposal:=jsonb_set(proposal,'{roaster_as_entered}',to_jsonb(proposal->>'roaster'),true);
   proposal:=jsonb_set(proposal,'{roaster}',to_jsonb(managed_name),true);
  end if;
  insert into public.coffee_submissions(owner_id,proposed_data,source_url) values(u,proposal,source)
   returning id into sid;
  insert into public.library_entries(id,owner_id,submission_id) values(lid,u,sid);
  response:=jsonb_build_object('ok',true,'status','pending','library_entry_id',lid,
    'submission_id',sid,'source_check_recommended',
      (source is not null and coalesce((match_result->'roaster'->>'recognized')::boolean,false)));
  if private.is_admin() then
   response:=response||private.dic_promote_pending_coffee(sid,'admin_approved',
     '{}'::jsonb,coalesce((p->>'confirmed_distinct')::boolean,false));
  end if;
 end if;
 insert into private.mutation_receipts(owner_id,mutation_id,request_hash,response)
 values(u,mid,req_hash,response);
 return response;
end $$;
revoke all on function private.dic_submit_coffee_auto(uuid,jsonb) from public,anon,authenticated;
grant execute on function private.dic_submit_coffee_auto(uuid,jsonb) to authenticated;

-- The owner controls which Pending entry to reconcile; no foreign account can
-- forge this confirmation. Preserve the library ID and associated shot history.
create function private.dic_confirm_coffee_existing(mid uuid,p jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid:=private.require_member(); prior private.mutation_receipts; s public.coffee_submissions;
 target public.coffees; sid uuid; cid uuid; match_result jsonb; accepted boolean;
 req_hash text; response jsonb; a_name text; b_name text;
begin
 if mid is null or jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>5000 then
  raise exception using errcode='22023',message='Invalid coffee confirmation.';
 end if;
 sid:=(p->>'submission_id')::uuid;cid:=(p->>'coffee_id')::uuid;
 perform pg_advisory_xact_lock(hashtextextended(u::text,9311));
 req_hash:=encode(sha256(convert_to(jsonb_build_object('action','confirm_coffee_existing','payload',p)::text,'UTF8')),'hex');
 select * into prior from private.mutation_receipts where owner_id=u and mutation_id=mid;
 if found then
  if prior.request_hash<>req_hash then raise exception using errcode='22023',message='Mutation ID reused for other confirmation.';end if;
  return prior.response;
 end if;
 select * into s from public.coffee_submissions where id=sid and owner_id=u for update;
 select * into target from public.coffees where id=cid and verification_state='verified' and merged_into_id is null;
 if s.id is null or target.id is null then raise exception using errcode='42501',message='Coffee is not accessible.';end if;
 if private.dic_canonical_roaster_key(s.proposed_data->>'roaster') is distinct from
   private.dic_canonical_roaster_key(target.roaster) then
   raise exception using errcode='23514',message='Different roasters cannot be merged based on a fuzzy name.';
 end if;
 a_name:=private.dic_coffee_key(s.proposed_data->>'name');
 b_name:=private.dic_coffee_key(target.name);
 if (a_name<>b_name and extensions.similarity(a_name,b_name)<0.60) then
  raise exception using errcode='23514',message='The names are too different for self-confirmed merging.';
 end if;
 if nullif(btrim(s.proposed_data->>'release_label'),'') is not null
    and nullif(btrim(target.release_label),'') is not null
    and private.dic_coffee_key(s.proposed_data->>'release_label')<>private.dic_coffee_key(target.release_label) then
  raise exception using errcode='23514',message='Different releases require administrator review.';
 end if;
 if nullif(btrim(s.proposed_data->>'origin'),'') is not null
    and nullif(btrim(target.origin),'') is not null
    and private.dic_coffee_key(s.proposed_data->>'origin')<>private.dic_coffee_key(target.origin)
    and position(private.dic_coffee_key(s.proposed_data->>'origin') in private.dic_coffee_key(target.origin))=0
    and position(private.dic_coffee_key(target.origin) in private.dic_coffee_key(s.proposed_data->>'origin'))=0 then
  raise exception using errcode='23514',message='Conflicting origins require administrator review.';
 end if;
 response:=private.dic_link_pending_coffee(sid,cid,'user_confirmed',
  jsonb_build_object('requested_name',s.proposed_data->>'name','canonical_name',target.name));
 insert into private.mutation_receipts(owner_id,mutation_id,request_hash,response)
 values(u,mid,req_hash,response);
 return response;
end $$;
revoke all on function private.dic_confirm_coffee_existing(uuid,jsonb) from public,anon,authenticated;
grant execute on function private.dic_confirm_coffee_existing(uuid,jsonb) to authenticated;
grant execute on function private.dic_promote_pending_coffee(uuid,text,jsonb,boolean) to authenticated;

-- Role-bounded APIs. Only the signed-in owner/admin may approve their own
-- coffee; external fetched evidence enters through a service-role-only RPC.
create function public.dic_admin_approve_own_coffee(submission_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if not private.is_admin() then raise exception using errcode='42501',message='Administrator required.';end if;
 return private.dic_promote_pending_coffee(submission_id,'admin_approved','{}'::jsonb,false);
end $$;
revoke all on function public.dic_admin_approve_own_coffee(uuid) from public,anon,authenticated;
grant execute on function public.dic_admin_approve_own_coffee(uuid) to authenticated;

create function public.dic_trusted_source_verify(submission_id uuid,evidence jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then
  raise exception using errcode='42501',message='Trusted verifier only.';
 end if;
 return private.dic_promote_pending_coffee(submission_id,'official_verified',evidence,false);
end $$;
revoke all on function public.dic_trusted_source_verify(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.dic_trusted_source_verify(uuid,jsonb) to service_role;

-- Bound mutation gateway, preserving all earlier supported actions.
create or replace function public.dic_apply_client_change(expected_owner uuid,mutation_id uuid,action text,payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if expected_owner is null or expected_owner is distinct from auth.uid() then
  raise exception using errcode='42501',message='Account changed before this mutation was submitted. Original pending data was retained.';
 end if;
 if action='rename_setup' then return private.rename_setup(mutation_id,payload); end if;
 if action='submit_coffee' then return private.dic_submit_coffee_auto(mutation_id,payload);end if;
 if action='confirm_coffee_existing' then return private.dic_confirm_coffee_existing(mutation_id,payload);end if;
 return private.mutate_workspace(mutation_id,action,payload);
end $$;
revoke all on function public.dic_apply_client_change(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.dic_apply_client_change(uuid,uuid,text,jsonb) to authenticated;
