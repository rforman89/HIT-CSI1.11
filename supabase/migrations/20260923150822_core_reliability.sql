-- Reviewed separately before any production application.
-- Existing purchase_clue semantics and RLS masking are intentionally unchanged.
BEGIN;

ALTER TABLE public.credit_transactions
  ADD COLUMN action_id uuid,
  ADD COLUMN balance_after integer;
CREATE UNIQUE INDEX credit_transactions_action_id_key
  ON public.credit_transactions(action_id) WHERE action_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.mutate_group_credits(
  target_group_id uuid, amount_change integer, mutation_reason text, action_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE
  prior public.credit_transactions%ROWTYPE;
  balance integer;
  transaction_id uuid;
  actor uuid := auth.uid();
  reason_text text := btrim(coalesce(mutation_reason, ''));
BEGIN
  IF actor IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Alleen admin mag pegels aanpassen.';
  END IF;
  IF action_id IS NULL OR target_group_id IS NULL OR amount_change IS NULL
    OR amount_change = 0 OR reason_text = '' THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Groep, gehele niet-nulmutatie, reden en actie-ID zijn verplicht.';
  END IF;

  -- Serialize retries before looking up their result (including across groups).
  PERFORM pg_advisory_xact_lock(hashtextextended(action_id::text, 0));
  SELECT * INTO prior FROM public.credit_transactions ct WHERE ct.action_id = mutate_group_credits.action_id;
  IF FOUND THEN
    IF prior.group_id IS DISTINCT FROM target_group_id OR prior.amount IS DISTINCT FROM amount_change
      OR prior.reason IS DISTINCT FROM reason_text OR prior.created_by IS DISTINCT FROM actor THEN
      RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Actie-ID hoort bij een andere pegelactie.';
    END IF;
    RETURN jsonb_build_object('action_id', action_id, 'transaction_id', prior.id,
      'balance', prior.balance_after, 'replayed', true);
  END IF;

  UPDATE public.groups SET credits = credits + amount_change
    WHERE id = target_group_id AND credits + amount_change >= 0
    RETURNING credits INTO balance;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Groep ontbreekt of het saldo zou negatief worden.';
  END IF;
  INSERT INTO public.credit_transactions(group_id, amount, reason, created_by, action_id, balance_after)
    VALUES(target_group_id, amount_change, reason_text, actor, action_id, balance)
    RETURNING id INTO transaction_id;
  INSERT INTO public.notifications(group_id, title, message, notification_type, created_by)
    VALUES(target_group_id, CASE WHEN amount_change > 0 THEN 'Pegels ontvangen' ELSE 'Pegels afgeschreven' END,
      CASE WHEN amount_change > 0 THEN 'Jullie hebben ' || amount_change || ' pegels ontvangen.'
        ELSE abs(amount_change)::text || ' pegels afgeschreven.' END, 'credits', actor);
  RETURN jsonb_build_object('action_id', action_id, 'transaction_id', transaction_id,
    'balance', balance, 'replayed', false);
END;
$$;
REVOKE ALL ON FUNCTION public.mutate_group_credits(uuid,integer,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mutate_group_credits(uuid,integer,text,uuid) TO authenticated;
-- Prevent older clients from continuing the split balance/history workflow.
REVOKE EXECUTE ON FUNCTION public.adjust_group_credits(uuid,integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.require_test_admin() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE mode text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Alleen admin mag testdata wijzigen.';
  END IF;
  -- Lock remains held through the entire mutation; a concurrent LIVE switch waits.
  SELECT value INTO mode FROM public.app_settings WHERE key='game_mode' FOR SHARE;
  IF mode IS DISTINCT FROM 'test' THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Actie geblokkeerd: de actuele spelmodus is niet TEST.';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION private.require_test_admin() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.guard_test_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
  PERFORM private.require_test_admin();
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_test_delete() FROM PUBLIC, anon, authenticated;

-- Notes remain editable/deletable by their owners during LIVE.
CREATE TRIGGER guard_group_clue_delete BEFORE DELETE ON public.group_clues
 FOR EACH ROW EXECUTE FUNCTION private.guard_test_delete();
CREATE TRIGGER guard_credit_history_delete BEFORE DELETE ON public.credit_transactions
 FOR EACH ROW EXECUTE FUNCTION private.guard_test_delete();
CREATE TRIGGER guard_group_delete BEFORE DELETE ON public.groups
 FOR EACH ROW EXECUTE FUNCTION private.guard_test_delete();
CREATE TRIGGER guard_suspect_delete BEFORE DELETE ON public.suspects
 FOR EACH ROW EXECUTE FUNCTION private.guard_test_delete();
CREATE TRIGGER guard_clue_delete BEFORE DELETE ON public.clues_base
 FOR EACH ROW EXECUTE FUNCTION private.guard_test_delete();

CREATE OR REPLACE FUNCTION public.remove_group_clue(target_assignment_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE assignment public.group_clues%ROWTYPE;
BEGIN
  PERFORM private.require_test_admin();
  DELETE FROM public.group_clues WHERE id=target_assignment_id RETURNING * INTO assignment;
  IF NOT FOUND THEN RETURN; END IF;
  INSERT INTO public.notifications(group_id,title,message,notification_type,created_by)
    VALUES(assignment.group_id,'Aanwijzing gecorrigeerd',
      'Een aanwijzing is door de organisatie verwijderd.','clue_removed',auth.uid());
END;
$$;
REVOKE ALL ON FUNCTION public.remove_group_clue(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_group_clue(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_demo_data() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE group_ids uuid[]; suspect_ids uuid[]; clue_ids uuid[];
BEGIN
  PERFORM private.require_test_admin();
  SELECT array_agg(id) INTO group_ids FROM public.groups WHERE name LIKE 'DEMO -%';
  SELECT array_agg(id) INTO suspect_ids FROM public.suspects WHERE name LIKE 'DEMO -%';
  SELECT array_agg(id) INTO clue_ids FROM public.clues_base
    WHERE title LIKE 'DEMO -%' OR suspect_id = ANY(suspect_ids);
  DELETE FROM public.group_clues WHERE group_id=ANY(group_ids) OR clue_id=ANY(clue_ids);
  DELETE FROM public.suspect_notes WHERE group_id=ANY(group_ids) OR suspect_id=ANY(suspect_ids);
  DELETE FROM public.suspect_statuses WHERE group_id=ANY(group_ids) OR suspect_id=ANY(suspect_ids);
  DELETE FROM public.final_reports WHERE group_id=ANY(group_ids) OR suspect_id=ANY(suspect_ids);
  DELETE FROM public.notifications WHERE group_id=ANY(group_ids);
  DELETE FROM public.credit_transactions WHERE group_id=ANY(group_ids);
  DELETE FROM public.clues_base WHERE id=ANY(clue_ids);
  -- A linked account is deliberately not detached. FK failure rolls the whole action back.
  DELETE FROM public.suspects WHERE id=ANY(suspect_ids);
  DELETE FROM public.groups WHERE id=ANY(group_ids);
END;
$$;
REVOKE ALL ON FUNCTION public.delete_demo_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_demo_data() TO authenticated;

-- Demo creation remains the existing flow; every demo write also checks current mode.
CREATE OR REPLACE FUNCTION private.guard_demo_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE row_data jsonb := to_jsonb(NEW); demo boolean;
BEGIN
  demo := coalesce(row_data->>'name', row_data->>'title', '') LIKE 'DEMO -%';
  IF NOT demo AND row_data->>'group_id' IS NOT NULL THEN
    SELECT coalesce(name LIKE 'DEMO -%',false) INTO demo FROM public.groups
      WHERE id=(row_data->>'group_id')::uuid;
  END IF;
  IF NOT coalesce(demo,false) AND row_data->>'suspect_id' IS NOT NULL THEN
    SELECT coalesce(name LIKE 'DEMO -%',false) INTO demo FROM public.suspects
      WHERE id=(row_data->>'suspect_id')::uuid;
  END IF;
  IF coalesce(demo,false) THEN PERFORM private.require_test_admin(); END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_demo_write() FROM PUBLIC, anon, authenticated;
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['groups','suspects','clues_base','group_clues',
    'suspect_notes','suspect_statuses','notifications','credit_transactions','final_reports']
  LOOP
    EXECUTE format('CREATE TRIGGER guard_demo_write BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.guard_demo_write()',table_name);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_test_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  deleted_group_clues integer := 0;
  deleted_notes integer := 0;
  deleted_statuses integer := 0;
  deleted_notifications integer := 0;
  deleted_transactions integer := 0;
  deleted_final_reports integer := 0;
begin
  PERFORM private.require_test_admin();
  if not public.is_admin() then
    raise exception 'Alleen admin mag testdata resetten.';
  end if;

  if not public.is_test_mode() then
    raise exception 'Reset testdata is geblokkeerd omdat het spel live staat.';
  end if;

  delete from public.group_clues
  where group_id is not null;
  get diagnostics deleted_group_clues = row_count;

  delete from public.suspect_notes
  where group_id is not null;
  get diagnostics deleted_notes = row_count;

  delete from public.suspect_statuses
  where group_id is not null;
  get diagnostics deleted_statuses = row_count;

  delete from public.final_reports
  where group_id is not null;
  get diagnostics deleted_final_reports = row_count;

  delete from public.notifications
  where group_id is not null;
  get diagnostics deleted_notifications = row_count;

  delete from public.credit_transactions
  where group_id is not null;
  get diagnostics deleted_transactions = row_count;

  return jsonb_build_object(
    'success', true,
    'deleted_group_clues', deleted_group_clues,
    'deleted_notes', deleted_notes,
    'deleted_statuses', deleted_statuses,
    'deleted_notifications', deleted_notifications,
    'deleted_transactions', deleted_transactions,
    'deleted_final_reports', deleted_final_reports
  );
end;
$function$
;
COMMIT;
