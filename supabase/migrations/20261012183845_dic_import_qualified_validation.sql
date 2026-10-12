-- Qualify the recursive credential-scan columns to avoid collision with the field-loop variable.
do $$
declare definition text; old_text text := 'select 1 from nodes where lower(replace(k,''_'',''''))';
begin
 select pg_get_functiondef('private.apply_prototype_import(uuid,jsonb)'::regprocedure) into definition;
 if position(old_text in definition)=0 then raise exception 'Expected import validator not found'; end if;
 definition:=replace(definition,old_text,'select 1 from nodes where lower(replace(nodes.k,''_'',''''))');
 definition:=replace(definition,'and val not in (','and nodes.val not in (');
 execute definition;
end $$;