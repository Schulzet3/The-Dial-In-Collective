begin;
do $test$
declare definition text;
begin
 if current_database()<>'dic_ci' then raise exception 'Disposable database only';end if;
 definition:=pg_get_functiondef('private.dic_admin_records(text,integer,integer)'::regprocedure);
 if position('library_entry_id' in definition)=0 or position('coffee_roaster' in definition)=0
 then raise exception 'Missing stable admin coffee relation';end if;
 if position('private.is_admin()' in definition)=0 or position('private.require_member()' in definition)=0
 then raise exception 'Admin privilege check absent';end if;
end $test$;
rollback;
