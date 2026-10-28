-- Issue #180 STAGED ONLY: release approval is separately required.
-- Only new, approved source-bound coffee information is enriched.
alter table public.coffees add column if not exists is_decaf boolean not null default false;
alter table public.coffees add column if not exists decaffeination_method text;
alter table public.coffees add constraint coffee_decaffeination_method_values_check
 check (decaffeination_method is null or decaffeination_method in
 ('Water Process','Sugar Process','Carbon Dioxide (CO2)'));
alter table public.coffees add constraint coffee_decaffeination_only_when_decaf_check
 check (is_decaf or decaffeination_method is null);
-- The original, first approved submission for a newly minted canonical
-- coffee can carry this field. Never use a member's duplicate match, a
-- later correction or a different member's pending record to overwrite
-- someone else's approved catalog data.
create or replace function private.dic_capture_first_decaf_method()
returns trigger language plpgsql security definer set search_path='' as $dic$
declare decaf boolean; method text; title text;
begin
 if new.status<>'approved' or new.canonical_coffee_id is null
  or old.status='approved' then return new; end if;
 if not exists (select 1 from private.dic_coffee_first_entry first
  where first.coffee_id=new.canonical_coffee_id and first.first_submission_id=new.id)
 then return new; end if;
 select c.name into title from public.coffees c where c.id=new.canonical_coffee_id;
 decaf := (coalesce(new.proposed_data->>'is_decaf','false')='true'
   or title ~* '(^|[^[:alnum:]])decaf(feinated)?([^[:alnum:]]|$)')
   and title !~* '(^|[^[:alnum:]])(half[ -]?caf|semi[ -]?decaf|partially[ -]?decaf)';
 method := nullif(btrim(coalesce(new.proposed_data->>'decaffeination_method','')),'');
 if method not in ('Water Process','Sugar Process','Carbon Dioxide (CO2)') then method:=null; end if;
 update public.coffees c set is_decaf=decaf,
  decaffeination_method=case when decaf then method else null end
 where c.id=new.canonical_coffee_id and c.decaffeination_method is null;
 return new;
end;
$dic$;
drop trigger if exists dic_capture_first_decaf_method on public.coffee_submissions;
create trigger dic_capture_first_decaf_method
after update of status,canonical_coffee_id on public.coffee_submissions
for each row when (new.status='approved' and new.canonical_coffee_id is not null)
execute function private.dic_capture_first_decaf_method();
revoke all on function private.dic_capture_first_decaf_method() from public,anon,authenticated;
