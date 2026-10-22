-- Owner-authorized Issue #20: remove only the obsolete private action.
-- Exact old-body guard; no row writes, grants, schema drops or receipt replay.
-- The already-applied 20261022041530 public guard is not repeated.
do $retirement$
declare
 target constant regprocedure := 'private.mutate(uuid,text,jsonb)'::regprocedure;
 before_body text; before_definition text; before_metadata jsonb;
 after_body text; after_metadata jsonb;
 obsolete constant text := $obsolete$ elsif action='hide_shot' then
  shotid:=(p->>'id')::uuid;expected:=private.required_revision(p);
  select * into rowshot from public.shots where owner_id=u and id=shotid for update;
  if not found then raise exception using errcode='42501',message='Shot not accessible.'; end if;
  if rowshot.revision<>expected then return jsonb_build_object('ok',false,'code','conflict','revision',rowshot.revision); end if;
  update public.shots set hidden_at=now() where owner_id=u and id=shotid returning * into rowshot;
  perform private.classify_personal_shot(shotid);
  response:=jsonb_build_object('ok',true,'record',to_jsonb(rowshot));$obsolete$;
begin
 select prosrc, pg_get_functiondef(oid), to_jsonb(p)-'prosrc'
 into strict before_body,before_definition,before_metadata from pg_proc p where oid=target;
 if md5(before_body)<>'b9e382b17117578cf7a8f5d44843fc2d' then
  raise exception 'Unexpected private.mutate source; stop and review';
 end if;
 after_body:=replace(replace(before_body,',''hide_shot''',''),obsolete,'');
 if md5(after_body)<>'beabe070244e74dfdcbef99ba0dab2af' or position('hide_shot' in after_body)>0 then
  raise exception 'Unexpected retirement diff';
 end if;
 execute replace(before_definition,before_body,after_body);
 select to_jsonb(p)-'prosrc' into strict after_metadata from pg_proc p where oid=target;
 if after_metadata is distinct from before_metadata or
    (select prosrc from pg_proc where oid=target) is distinct from after_body then
  raise exception 'Function metadata or body drift; rollback';
 end if;
end $retirement$;
