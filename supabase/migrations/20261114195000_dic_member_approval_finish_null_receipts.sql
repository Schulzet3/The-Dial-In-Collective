-- #509: development-only service receipt NULL guard, preserve delivery semantics and grants.
create or replace function public.dic_member_approval_finish(
 p_event_id bigint,p_channel text,p_claim_token uuid,p_outcome text)
returns boolean language plpgsql volatile security definer set search_path='' as $function$
begin
 if p_channel is null or p_outcome is null or
    p_channel not in ('email','push') or p_outcome not in ('sent','skipped','retry')
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
