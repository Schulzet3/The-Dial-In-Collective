-- Remember actual feed choice after a newly logged shot, scoped to setup version.
-- Enabling/disabling tracking still resets it through save_setup_settings.
create function private.remember_feed_condition() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.feed_mode in ('standard','slow') then
  update public.setup_preferences set slow_feed=(new.feed_mode='slow')
   where owner_id=new.owner_id and setup_id=new.setup_id and setup_version_id=new.setup_version_id
    and track_slow_feed and slow_feed is distinct from (new.feed_mode='slow');
 end if;
 return new;
end $$;
revoke all on function private.remember_feed_condition() from public,anon,authenticated;
create trigger remember_feed_condition after insert on public.shots for each row execute function private.remember_feed_condition();
