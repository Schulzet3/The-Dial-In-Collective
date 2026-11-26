-- Issue #509 R332: prevent SQL three-valued NULL from allowing unsafe self-confirmation.
-- Exact live source prior to this migration: private.dic_confirm_coffee_existing(uuid,jsonb)
-- Live pg_get_functiondef MD5 0fcc44bb8a05f46e87694d3474eb7c23 (R331 complete provider receipt).
-- Preserve same-roaster/release/origin checks, member ownership, mutation idempotency and grants.
-- Development only; do not apply to production without separate owner Publish authorization.
CREATE OR REPLACE FUNCTION private.dic_confirm_coffee_existing(mid uuid, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 if a_name is null or b_name is null
    or not coalesce(a_name=b_name or extensions.similarity(a_name,b_name)>=0.60,false) then
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
end $function$
