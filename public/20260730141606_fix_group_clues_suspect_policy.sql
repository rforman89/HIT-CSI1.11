-- Keep clues_base private while allowing participants to read the purchases
-- made by their own group.
--
-- The previous "group_clues select own suspect" policy queried clues_base
-- directly. Because authenticated users intentionally have no SELECT grant on
-- clues_base, PostgreSQL rejected every group_clues query before RLS could
-- return the participant's own purchases.

create or replace function private.clue_is_for_own_suspect(
  target_clue_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.clues_base cb
    where cb.id = target_clue_id
      and public.is_own_suspect(cb.suspect_id)
  );
$$;

revoke all
on function private.clue_is_for_own_suspect(uuid)
from public, anon;

grant execute
on function private.clue_is_for_own_suspect(uuid)
to authenticated;

drop policy if exists "group_clues select own suspect"
on public.group_clues;

create policy "group_clues select own suspect"
on public.group_clues
for select
to authenticated
using ((select private.clue_is_for_own_suspect(clue_id)));
