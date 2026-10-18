-- Minimal high-signal administrator read dashboard. No review decisions or
-- privileges are granted here; app_admins remains operator-controlled.
-- Admin authorization is checked server-side, not via client-visible metadata.
create function private.dic_admin_dashboard_read()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if (select auth.uid()) is null or not private.is_admin() then
    raise exception using errcode='42501', message='Administrator access required.';
  end if;
  return jsonb_build_object(
    'review_only', true,
    'generated_at', now(),
    'counts', jsonb_build_object(
      'pending_coffees', (select count(*) from public.coffee_submissions where status='pending'),
      'conflicts', (select count(*) from public.coffee_submissions where status='conflict'),
      'pending_canonical', (select count(*) from public.coffees where verification_state='pending'),
      'verified_coffees', (select count(*) from public.coffees where verification_state='verified'),
      'active_accounts', (select count(*) from private.beta_members where enabled),
      'shot_records', (select count(*) from public.shots where hidden_at is null)
    ),
    'queue_total', (select count(*) from public.coffee_submissions where status in ('pending','conflict')),
    'queue', coalesce((
      select jsonb_agg(item.data order by item.created_at, item.id)
      from (
        select id, created_at,
          jsonb_build_object(
            'id', id,
            'created_at', created_at,
            'status', status,
            'revision', revision,
            'canonical_coffee_id', canonical_coffee_id,
            'base_coffee_revision', base_coffee_revision,
            'source_url', source_url,
            'name', left(coalesce(proposed_data->>'name',''),200),
            'roaster', left(coalesce(proposed_data->>'roaster',''),200),
            'release_label', left(coalesce(proposed_data->>'release_label',''),200),
            'origin', left(coalesce(proposed_data->>'origin',''),300),
            'process', left(coalesce(proposed_data->>'process',''),300),
            'roast_level', left(coalesce(proposed_data->>'roast_level',''),100)
          ) as data
        from public.coffee_submissions
        where status in ('pending','conflict')
        order by created_at, id
        limit 50
      ) item
    ),'[]'::jsonb),
    'backups', jsonb_build_object(
      'status', 'external_not_connected',
      'explanation', 'Backup results are verified in GitHub/Drive; this SQL endpoint does not assert backup freshness.'
    )
  );
end $$;
revoke all on function private.dic_admin_dashboard_read() from public,anon,authenticated;
grant execute on function private.dic_admin_dashboard_read() to authenticated;
create function public.dic_admin_dashboard()
returns jsonb language sql stable security invoker set search_path='' as $$
  select private.dic_admin_dashboard_read();
$$;
revoke all on function public.dic_admin_dashboard() from public,anon,authenticated;
grant execute on function public.dic_admin_dashboard() to authenticated;
comment on function public.dic_admin_dashboard() is 'Administrator-only, read-only review queue/health counts. Never contains owner identities, notes or raw shot records.';
