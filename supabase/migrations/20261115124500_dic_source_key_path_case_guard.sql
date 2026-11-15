-- #509 additive source-only correction: keep host/tracking normalization; preserve path case.
-- Existing migrations, production provider state, data and grants remain untouched.
CREATE OR REPLACE FUNCTION private.dic_source_key(value text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare raw text; path text; params text; kept text:=''; part text;
begin
 raw:=btrim(coalesce(value,''));
 if raw !~* '^https?://[^/?#[:space:]]+' or length(raw)>4000 then return null;end if;
 raw:=split_part(raw,'#',1);
 raw:=regexp_replace(raw,'^https?://(www\.)?','','i');
 path:=split_part(raw,'?',1);
 if path='' then return null;end if;
 params:=case when strpos(raw,'?')>0 then substring(raw from strpos(raw,'?')+1) else '' end;
 if params<>'' then
  foreach part in array string_to_array(params,'&') loop
   if split_part(lower(part),'=',1)!~'^utm_' and
     lower(split_part(part,'=',1)) not in ('gclid','fbclid','msclkid','srsltid')
       and part<>'' then
    kept:=concat_ws('&',nullif(kept,''),part);
   end if;
  end loop;
 end if;
 path:=rtrim(path,'/');
 -- Origin hostnames are case-insensitive; remote HTTP paths are case-sensitive.
 return lower(split_part(path,'/',1))||substring(path from length(split_part(path,'/',1))+1)||case when kept<>'' then '?'||kept else '' end;
end $function$;
