-- CSI HIT security and backup hardening
-- Built against the live schema of project CSI HIT ALPEN on 2026-07-30.
--
-- Goals:
--   * expose only shop metadata before a clue is unlocked;
--   * block direct client access to clues_base;
--   * keep free/global clues usable;
--   * serialize purchases so credits cannot be overspent concurrently;
--   * prevent anonymous RPC execution and reduce unnecessary grants;
--   * restrict Storage uploads by size and MIME type.

-- ---------------------------------------------------------------------------
-- 1. Database constraints and redundant indexes
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.clues_base'::regclass
      and conname = 'clues_price_nonnegative'
  ) then
    alter table public.clues_base
      add constraint clues_price_nonnegative check (price >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.groups'::regclass
      and conname = 'groups_credits_nonnegative'
  ) then
    alter table public.groups
      add constraint groups_credits_nonnegative check (credits >= 0);
  end if;
end;
$$;

-- The live database currently contains two identical unique constraints and
-- an additional duplicate index for (group_id, clue_id). Keep the original
-- constraint and remove only the redundant copies.
alter table public.group_clues
  drop constraint if exists group_clues_one_clue_per_group;

drop index if exists public.idx_group_clues_group_clue;

-- ---------------------------------------------------------------------------
-- 2. Safe clue facade
-- ---------------------------------------------------------------------------

-- The browser must not have SELECT on clues_base, even though the app still
-- needs a writable public.clues facade. A SECURITY DEFINER function in a
-- non-exposed schema performs the filtering and masking. Calling the function
-- directly would return exactly the same masked rows.
create schema if not exists private;
revoke all privileges on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.get_visible_clues()
returns table (
  id uuid,
  title text,
  description text,
  suspect_id uuid,
  pdf_url text,
  price integer,
  is_active boolean,
  sort_order integer,
  created_at timestamptz,
  clue_type text,
  is_visible boolean,
  is_global boolean,
  is_free boolean,
  file_url text,
  category_id uuid
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    cb.id,
    cb.title,
    case
      when public.is_admin()
        or cb.is_free
        or cb.is_global
        or public.is_own_suspect(cb.suspect_id)
        or exists (
          select 1
          from public.group_clues gc
          join public.group_members gm on gm.group_id = gc.group_id
          where gc.clue_id = cb.id
            and gm.user_id = auth.uid()
        )
      then cb.description
      else null::text
    end as description,
    cb.suspect_id,
    case
      when public.is_admin()
        or cb.is_free
        or cb.is_global
        or exists (
          select 1
          from public.group_clues gc
          join public.group_members gm on gm.group_id = gc.group_id
          where gc.clue_id = cb.id
            and gm.user_id = auth.uid()
        )
      then cb.pdf_url
      else null::text
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
        or cb.is_free
        or cb.is_global
        or exists (
          select 1
          from public.group_clues gc
          join public.group_members gm on gm.group_id = gc.group_id
          where gc.clue_id = cb.id
            and gm.user_id = auth.uid()
        )
      then cb.file_url
      else null::text
    end as file_url,
    cb.category_id
  from public.clues_base cb
  where
    public.is_admin()
    or (
      auth.uid() is not null
      and cb.is_visible = true
      and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and coalesce(p.role, 'participant') <> 'suspect'
      )
    )
    or (
      auth.uid() is not null
      and cb.is_visible = true
      and public.is_own_suspect(cb.suspect_id)
    );
$$;

revoke all on function private.get_visible_clues() from public, anon;
grant execute on function private.get_visible_clues() to authenticated;

create or replace view public.clues
with (security_invoker = true, security_barrier = true)
as
select *
from private.get_visible_clues();

-- Remove the old participant/suspect SELECT paths on the base table. Admin
-- writes continue through the checked INSTEAD OF trigger functions below.
drop policy if exists "clues select by role" on public.clues_base;
drop policy if exists "clues select own suspect" on public.clues_base;

revoke all privileges on public.clues_base from anon, authenticated;
revoke all privileges on public.clues from anon, authenticated;
grant select, insert, update, delete on public.clues to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Admin-only view mutations
-- ---------------------------------------------------------------------------

create or replace function public.clues_view_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then
    raise exception using
      errcode = '42501',
      message = 'Alleen admin mag aanwijzingen toevoegen.';
  end if;

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
  returning
    id,
    created_at
  into
    new.id,
    new.created_at;

  return new;
end;
$$;

create or replace function public.clues_view_update()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then
    raise exception using
      errcode = '42501',
      message = 'Alleen admin mag aanwijzingen wijzigen.';
  end if;

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

  if not found then
    raise exception 'Aanwijzing niet gevonden.';
  end if;

  return new;
end;
$$;

create or replace function public.clues_view_delete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then
    raise exception using
      errcode = '42501',
      message = 'Alleen admin mag aanwijzingen verwijderen.';
  end if;

  delete from public.clues_base
  where id = old.id;

  if not found then
    raise exception 'Aanwijzing niet gevonden.';
  end if;

  return old;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Atomic credit changes and purchases
-- ---------------------------------------------------------------------------

create or replace function public.adjust_group_credits(
  target_group_id uuid,
  amount_change integer
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_credit_balance integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception using
      errcode = '42501',
      message = 'Alleen admin mag pegels aanpassen.';
  end if;

  update public.groups
  set credits = credits + amount_change
  where id = target_group_id
    and credits + amount_change >= 0
  returning credits into new_credit_balance;

  if not found then
    if exists (
      select 1
      from public.groups
      where id = target_group_id
    ) then
      raise exception 'Het pegelssaldo mag niet negatief worden.';
    end if;

    raise exception 'Groep niet gevonden.';
  end if;
end;
$$;

create or replace function public.purchase_clue(
  target_group_id uuid,
  target_clue_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  clue_price integer;
  clue_title text;
  clue_is_free boolean;
  clue_is_global boolean;
  current_credits integer;
begin
  if auth.uid() is null or not public.is_group_member(target_group_id) then
    raise exception using
      errcode = '42501',
      message = 'Je bent geen lid van deze groep.';
  end if;

  -- Lock the group row first. Concurrent purchase calls for the same group
  -- are then handled one after another and cannot spend the same credits.
  select g.credits
  into current_credits
  from public.groups g
  where g.id = target_group_id
    and g.is_active = true
  for update;

  if not found then
    raise exception 'Actieve groep niet gevonden.';
  end if;

  select
    cb.price,
    cb.title,
    cb.is_free,
    cb.is_global
  into
    clue_price,
    clue_title,
    clue_is_free,
    clue_is_global
  from public.clues_base cb
  where cb.id = target_clue_id
    and cb.is_visible = true
    and cb.is_active = true;

  if not found then
    raise exception 'Aanwijzing niet gevonden.';
  end if;

  if clue_is_free or clue_is_global then
    raise exception 'Deze aanwijzing hoeft niet gekocht te worden.';
  end if;

  if exists (
    select 1
    from public.group_clues gc
    where gc.group_id = target_group_id
      and gc.clue_id = target_clue_id
  ) then
    raise exception 'Deze aanwijzing is al gekocht.';
  end if;

  if current_credits < clue_price then
    raise exception 'Niet genoeg pegels.';
  end if;

  update public.groups
  set credits = credits - clue_price
  where id = target_group_id;

  insert into public.group_clues (
    group_id,
    clue_id,
    status,
    source,
    requested_at
  )
  values (
    target_group_id,
    target_clue_id,
    'requested',
    'purchase',
    now()
  );

  insert into public.credit_transactions (
    group_id,
    amount,
    reason,
    created_by
  )
  values (
    target_group_id,
    -clue_price,
    'Aanwijzing gekocht: ' || clue_title,
    auth.uid()
  );

  insert into public.notifications (
    group_id,
    title,
    message,
    notification_type,
    created_by
  )
  values (
    target_group_id,
    'Aanwijzing gekocht',
    'Jullie hebben "' || clue_title || '" gekocht.',
    'clue_purchase',
    auth.uid()
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Least-privilege grants
-- ---------------------------------------------------------------------------

-- The app has no unauthenticated database screens. Login and registration use
-- Supabase Auth, so anon does not need table or RPC access in public.
revoke all privileges on all tables in schema public from anon;
revoke execute on all functions in schema public from public, anon;

-- settings is a legacy table with no client policy. Keep it inaccessible and
-- give the advisor an explicit deny policy.
revoke all privileges on public.settings from authenticated;
drop policy if exists "settings deny client access" on public.settings;
create policy "settings deny client access"
on public.settings
as restrictive
for all
to authenticated
using (false)
with check (false);

-- Admin overview views are read-only. Their security_invoker setting means
-- RLS on the underlying tables still limits non-admin callers.
revoke all privileges on
  public.admin_aankopen_overzicht,
  public.admin_eindrapporten_overzicht,
  public.admin_groep_activiteit,
  public.admin_notities_overzicht,
  public.admin_statussen_overzicht
from authenticated;

grant select on
  public.admin_aankopen_overzicht,
  public.admin_eindrapporten_overzicht,
  public.admin_groep_activiteit,
  public.admin_notities_overzicht,
  public.admin_statussen_overzicht
to authenticated;

-- Trigger functions are never direct RPC endpoints. Only the helpers and the
-- three deliberate app RPCs remain callable by signed-in users.
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.clues_view_insert() from authenticated;
revoke execute on function public.clues_view_update() from authenticated;
revoke execute on function public.clues_view_delete() from authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_own_suspect(uuid) to authenticated;
grant execute on function public.is_test_mode() to authenticated;
grant execute on function public.are_final_reports_open() to authenticated;
grant execute on function public.adjust_group_credits(uuid, integer) to authenticated;
grant execute on function public.purchase_clue(uuid, uuid) to authenticated;
grant execute on function public.reset_test_data() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Storage access and upload limits
-- ---------------------------------------------------------------------------

update storage.buckets
set
  public = false,
  file_size_limit = 26214400,
  allowed_mime_types = array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
where id = 'clue-files';

update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
where id = 'suspect-photos';

update storage.buckets
set
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'application/json'
  ]::text[]
where id = 'backups';

drop policy if exists "clue file access if purchased or admin"
on storage.objects;

create or replace function private.can_read_clue_file(object_name text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.clues_base c
      where (c.file_url = object_name or c.pdf_url = object_name)
        and c.is_visible = true
        and c.is_active = true
        and (
          c.is_free = true
          or c.is_global = true
          or exists (
            select 1
            from public.group_clues gc
            join public.group_members gm on gm.group_id = gc.group_id
            where gc.clue_id = c.id
              and gm.user_id = auth.uid()
          )
        )
    );
$$;

revoke all on function private.can_read_clue_file(text) from public, anon;
grant execute on function private.can_read_clue_file(text) to authenticated;

create policy "clue file access if unlocked or admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'clue-files'
  and private.can_read_clue_file(storage.objects.name)
);
