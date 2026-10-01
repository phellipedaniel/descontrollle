alter table public.behavior_checkins
  drop constraint if exists behavior_checkins_focus_category_id_user_id_fkey;

alter table public.behavior_checkins
  add constraint behavior_checkins_focus_category_id_user_id_fkey
  foreign key(focus_category_id,user_id)
  references public.categories(id,user_id)
  on delete set null (focus_category_id);
