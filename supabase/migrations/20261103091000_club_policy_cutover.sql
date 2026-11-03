-- Phase 2: switch Club data to Club-scoped permissions. Homepage tables remain untouched.
update public.club_modules set required_permission = 'club:portal:view'
where required_permission = 'campions-club:view';

drop policy if exists "club_modules_admin_write" on public.club_modules;
drop policy if exists "club_modules_select_member" on public.club_modules;
create policy "club_modules_admin_write" on public.club_modules for all to authenticated using (public.current_user_has_permission('club:admin')) with check (public.current_user_has_permission('club:admin'));
create policy "club_modules_select_member" on public.club_modules for select to authenticated using (public.current_user_has_permission(required_permission) or public.current_user_has_permission('club:admin'));

drop policy if exists "countrycheck_countries_admin_write" on public.countrycheck_countries;
drop policy if exists "countrycheck_countries_select_member" on public.countrycheck_countries;
create policy "countrycheck_countries_admin_write" on public.countrycheck_countries for all to authenticated using (public.current_user_has_permission('club:admin')) with check (public.current_user_has_permission('club:admin') and (updated_by is null or updated_by = auth.uid()));
create policy "countrycheck_countries_select_member" on public.countrycheck_countries for select to authenticated using ((publish_status = 'published' and public.current_user_has_permission('club:portal:view')) or public.current_user_has_permission('club:admin'));

drop policy if exists "countrycheck_settings_admin_write" on public.countrycheck_settings;
drop policy if exists "countrycheck_settings_select_member" on public.countrycheck_settings;
create policy "countrycheck_settings_admin_write" on public.countrycheck_settings for all to authenticated using (public.current_user_has_permission('club:admin')) with check (public.current_user_has_permission('club:admin') and (updated_by is null or updated_by = auth.uid()));
create policy "countrycheck_settings_select_member" on public.countrycheck_settings for select to authenticated using (public.current_user_has_permission('club:portal:view') or public.current_user_has_permission('club:admin'));

drop policy if exists "countrycheck_rules_admin_write" on public.countrycheck_rules;
drop policy if exists "countrycheck_rules_select_member" on public.countrycheck_rules;
create policy "countrycheck_rules_admin_write" on public.countrycheck_rules for all to authenticated using (public.current_user_has_permission('club:admin')) with check (public.current_user_has_permission('club:admin') and (updated_by is null or updated_by = auth.uid()));
create policy "countrycheck_rules_select_member" on public.countrycheck_rules for select to authenticated using ((public.current_user_has_permission('club:portal:view') and exists (select 1 from public.countrycheck_countries c where c.iso_code = countrycheck_rules.country_iso_code and c.publish_status = 'published')) or public.current_user_has_permission('club:admin'));

drop policy if exists "countrycheck_sources_admin_write" on public.countrycheck_sources;
drop policy if exists "countrycheck_sources_select_member" on public.countrycheck_sources;
create policy "countrycheck_sources_admin_write" on public.countrycheck_sources for all to authenticated using (public.current_user_has_permission('club:admin')) with check (public.current_user_has_permission('club:admin') and (updated_by is null or updated_by = auth.uid()));
create policy "countrycheck_sources_select_member" on public.countrycheck_sources for select to authenticated using ((public.current_user_has_permission('club:portal:view') and exists (select 1 from public.countrycheck_countries c where c.iso_code = countrycheck_sources.country_iso_code and c.publish_status = 'published')) or public.current_user_has_permission('club:admin'));

drop policy if exists "countrycheck_rule_sources_admin_write" on public.countrycheck_rule_sources;
drop policy if exists "countrycheck_rule_sources_select_member" on public.countrycheck_rule_sources;
create policy "countrycheck_rule_sources_admin_write" on public.countrycheck_rule_sources for all to authenticated using (public.current_user_has_permission('club:admin')) with check (public.current_user_has_permission('club:admin'));
create policy "countrycheck_rule_sources_select_member" on public.countrycheck_rule_sources for select to authenticated using (exists (select 1 from public.countrycheck_rules r join public.countrycheck_countries c on c.iso_code = r.country_iso_code where r.id = countrycheck_rule_sources.rule_id and ((public.current_user_has_permission('club:portal:view') and c.publish_status = 'published') or public.current_user_has_permission('club:admin'))));

drop policy if exists "countrycheck_rule_history_insert_admin" on public.countrycheck_rule_history;
drop policy if exists "countrycheck_rule_history_select_admin" on public.countrycheck_rule_history;
create policy "countrycheck_rule_history_insert_admin" on public.countrycheck_rule_history for insert to authenticated with check (public.current_user_has_permission('club:admin') and (changed_by is null or changed_by = auth.uid()));
create policy "countrycheck_rule_history_select_admin" on public.countrycheck_rule_history for select to authenticated using (public.current_user_has_permission('club:admin'));
