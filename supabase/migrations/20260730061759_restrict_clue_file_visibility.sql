-- Preserve the original live migration in GitHub.
-- The later csi_security_and_backup_hardening migration tightens this design.

alter table public.clues rename to clues_base;

create view public.clues
with (security_invoker = true) as
select
  cb.id,
  cb.title,
  cb.description,
  cb.suspect_id,
  case
    when public.is_admin()
      or exists (
        select 1
        from public.group_clues gc
        join public.group_members gm on gm.group_id = gc.group_id
        where gc.clue_id = cb.id
          and gm.user_id = auth.uid()
      )
    then cb.pdf_url
    else null
  end as pdf_url,
  cb.price,
  cb.is_active,
  cb.sort_order,
  cb.created_at,
  cb.clue_type,
  cb.is_visible,
  cb.is_global,
  cb.is_free,
  case
    when public.is_admin()
      or exists (
        select 1
        from public.group_clues gc
        join public.group_members gm on gm.group_id = gc.group_id
        where gc.clue_id = cb.id
          and gm.user_id = auth.uid()
      )
    then cb.file_url
    else null
  end as file_url,
  cb.category_id
from public.clues_base cb;

create function public.clues_view_insert()
returns trigger
language plpgsql
as $$
begin
  insert into public.clues_base (
    title,
    description,
    suspect_id,
    pdf_url,
    price,
    is_active,
    sort_order,
    clue_type,
    is_visible,
    is_global,
    is_free,
    file_url,
    category_id
  )
  values (
    new.title,
    new.description,
    new.suspect_id,
    new.pdf_url,
    new.price,
    new.is_active,
    new.sort_order,
    new.clue_type,
    new.is_visible,
    new.is_global,
    new.is_free,
    new.file_url,
    new.category_id
  )
  returning id into new.id;

  return new;
end;
$$;

create trigger clues_view_insert_trigger
instead of insert on public.clues
for each row execute function public.clues_view_insert();

create function public.clues_view_update()
returns trigger
language plpgsql
as $$
begin
  update public.clues_base
  set
    title = new.title,
    description = new.description,
    suspect_id = new.suspect_id,
    pdf_url = new.pdf_url,
    price = new.price,
    is_active = new.is_active,
    sort_order = new.sort_order,
    clue_type = new.clue_type,
    is_visible = new.is_visible,
    is_global = new.is_global,
    is_free = new.is_free,
    file_url = new.file_url,
    category_id = new.category_id
  where id = old.id;

  return new;
end;
$$;

create trigger clues_view_update_trigger
instead of update on public.clues
for each row execute function public.clues_view_update();

create function public.clues_view_delete()
returns trigger
language plpgsql
as $$
begin
  delete from public.clues_base
  where id = old.id;

  return old;
end;
$$;

create trigger clues_view_delete_trigger
instead of delete on public.clues
for each row execute function public.clues_view_delete();

grant select, insert, update, delete on public.clues to anon, authenticated;
