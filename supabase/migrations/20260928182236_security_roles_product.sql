-- Security specification: docs/SECURITY-AUTHORIZATION-MATRIX.md.
-- Prepared and validated locally; do not apply to Production in this Work run.
BEGIN;
ALTER TABLE public.profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK(role IN ('admin','participant','suspect','jury'));

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND is_active)
$$;
CREATE FUNCTION private.is_jury() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='jury' AND is_active)
$$;
CREATE OR REPLACE FUNCTION public.is_group_member(target_group_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(
 SELECT 1 FROM public.group_members m JOIN public.groups g ON g.id=m.group_id JOIN public.profiles p ON p.id=m.user_id
 WHERE m.user_id=auth.uid() AND m.group_id=target_group_id AND p.role='participant' AND p.is_active AND g.is_active)
$$;
CREATE OR REPLACE FUNCTION public.is_own_suspect(target_suspect_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles p JOIN public.suspects s ON s.id=p.suspect_id
 WHERE p.id=auth.uid() AND p.role='suspect' AND p.is_active AND s.is_active AND s.id=target_suspect_id)
$$;
CREATE FUNCTION private.has_game_access() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.is_active AND
 (p.role IN ('admin','jury') OR (p.role='suspect' AND public.is_own_suspect(p.suspect_id)) OR
 (p.role='participant' AND EXISTS(SELECT 1 FROM public.group_members m WHERE m.user_id=p.id AND public.is_group_member(m.group_id)))))
$$;
REVOKE ALL ON FUNCTION private.is_jury(),private.has_game_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.is_jury(),private.has_game_access() TO authenticated,service_role;

-- Restrictive gates compose with existing row predicates, not replace ownership.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['groups','suspects','group_members','group_clues','suspect_notes','suspect_statuses','notifications','agenda_items','suspect_users','app_settings','credit_transactions','final_reports','clue_categories'] LOOP
  EXECUTE format('CREATE POLICY active_game_access ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT private.has_game_access())) WITH CHECK ((SELECT private.has_game_access()))',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['groups','suspects','group_clues','suspect_notes','suspect_statuses','credit_transactions','final_reports','agenda_items','clue_categories'] LOOP
  EXECUTE format('CREATE POLICY jury_read ON public.%I FOR SELECT TO authenticated USING ((SELECT private.is_jury()))',t);
 END LOOP;
END $$;
DROP POLICY "profiles insert own" ON public.profiles;
REVOKE INSERT,DELETE ON public.profiles FROM authenticated;

ALTER POLICY "suspects select active admin or own suspect" ON public.suspects USING (
 public.is_admin() OR public.is_own_suspect(id) OR (is_active AND EXISTS(
 SELECT 1 FROM public.group_members m WHERE m.user_id=auth.uid() AND public.is_group_member(m.group_id))));
ALTER POLICY "clue_categories_select_authenticated" ON public.clue_categories USING(is_active AND (SELECT private.has_game_access()));
ALTER POLICY "notifications select own or group or admin" ON public.notifications USING (
 public.is_admin() OR ((user_id IS NULL OR user_id=auth.uid()) AND
 ((group_id IS NOT NULL AND public.is_group_member(group_id)) OR (group_id IS NULL AND user_id=auth.uid()))));

CREATE OR REPLACE FUNCTION public.is_test_mode() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.has_game_access() AND EXISTS(SELECT 1 FROM public.app_settings WHERE key='game_mode' AND value='test')
$$;
CREATE OR REPLACE FUNCTION public.are_final_reports_open() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.has_game_access() AND EXISTS(SELECT 1 FROM public.app_settings WHERE key='final_reports_open' AND value='true')
$$;

CREATE OR REPLACE FUNCTION private.get_visible_clues() RETURNS TABLE(id uuid, title text, description text, suspect_id uuid, pdf_url text, price integer, is_active boolean, sort_order integer, created_at timestamp with time zone, clue_type text, is_visible boolean, is_global boolean, is_free boolean, file_url text, category_id uuid)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT c.id,c.title,CASE WHEN e.unlocked THEN c.description END,c.suspect_id,
 CASE WHEN e.unlocked THEN c.pdf_url END,c.price,c.is_active,c.sort_order,c.created_at,c.clue_type,c.is_visible,c.is_global,c.is_free,
 CASE WHEN e.unlocked THEN c.file_url END,c.category_id
 FROM public.clues_base c CROSS JOIN LATERAL (SELECT
 public.is_admin() OR private.is_jury() OR public.is_own_suspect(c.suspect_id) OR c.is_free OR c.is_global OR
 EXISTS(SELECT 1 FROM public.group_clues gc WHERE gc.clue_id=c.id AND public.is_group_member(gc.group_id)) AS unlocked) e
 WHERE private.has_game_access() AND (public.is_admin() OR private.is_jury() OR
 (c.is_visible AND c.is_active AND (public.is_own_suspect(c.suspect_id) OR
 EXISTS(SELECT 1 FROM public.group_members m WHERE m.user_id=auth.uid() AND public.is_group_member(m.group_id)))))
$$;
CREATE OR REPLACE FUNCTION private.can_read_clue_file(object_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.has_game_access() AND (public.is_admin() OR EXISTS(
 SELECT 1 FROM private.get_visible_clues() c WHERE c.file_url=object_name OR c.pdf_url=object_name))
$$;

-- Private photos: accept old own Storage public URLs without rewriting game rows.
UPDATE storage.buckets SET public=false WHERE id='suspect-photos';
CREATE FUNCTION private.photo_path(value text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE WHEN value ~ '^https?://[^/]+/storage/v1/object/public/suspect-photos/'
 THEN regexp_replace(value,'^https?://[^/]+/storage/v1/object/public/suspect-photos/','')
 ELSE value END
$$;
CREATE FUNCTION private.can_read_suspect_photo(object_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.has_game_access() AND (public.is_admin() OR EXISTS(
 SELECT 1 FROM public.suspects s WHERE private.photo_path(s.photo_url)=object_name AND
 (private.is_jury() OR public.is_own_suspect(s.id) OR (s.is_active AND EXISTS(SELECT 1 FROM public.group_members m WHERE m.user_id=auth.uid() AND public.is_group_member(m.group_id))))))
$$;
REVOKE ALL ON FUNCTION private.photo_path(text),private.can_read_suspect_photo(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.photo_path(text),private.can_read_suspect_photo(text) TO authenticated,service_role;
DROP POLICY IF EXISTS "admins can select suspect photos" ON storage.objects;
CREATE POLICY "authorized suspect photo read" ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='suspect-photos' AND private.can_read_suspect_photo(name));

CREATE OR REPLACE FUNCTION public.mutate_group_credits(target_group_id uuid, amount_change integer, mutation_reason text, action_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  prior public.credit_transactions%ROWTYPE;
  balance integer;
  transaction_id uuid;
  actor uuid := auth.uid();
  reason_text text := btrim(coalesce(mutation_reason, ''));
BEGIN
  IF actor IS NULL OR NOT (public.is_admin() OR private.is_jury()) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Alleen jury of admin mag pegels aanpassen.';
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
$function$
;
CREATE FUNCTION public.release_group_clue(target_purchase_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT(public.is_admin() OR private.is_jury()) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Alleen jury of admin mag aanwijzingen vrijgeven.';
 END IF;
 UPDATE public.group_clues SET status='released',released_at=coalesce(released_at,now())
 WHERE id=target_purchase_id AND status='requested';
 IF NOT FOUND AND NOT EXISTS(SELECT 1 FROM public.group_clues WHERE id=target_purchase_id AND status='released') THEN
  RAISE EXCEPTION 'Toewijzing ontbreekt.';
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.release_group_clue(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.release_group_clue(uuid) TO authenticated;

-- Final report authors cannot impersonate another account.
CREATE POLICY final_report_actor ON public.final_reports AS RESTRICTIVE FOR ALL TO authenticated
 USING(true) WITH CHECK(public.is_admin() OR (submitted_by=auth.uid() AND public.is_group_member(group_id)));

-- No client needs SQL DDL capabilities or TRUNCATE (which does not use RLS).
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT c.relname FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind='r' LOOP
  EXECUTE format('REVOKE TRUNCATE,REFERENCES,TRIGGER ON public.%I FROM anon,authenticated',t.relname);
 END LOOP;
END $$;
REVOKE CREATE ON SCHEMA public FROM PUBLIC,anon,authenticated;
-- Existing public helpers are intentional boolean RPCs; no anonymous execution.
REVOKE ALL ON FUNCTION public.is_admin(),public.is_group_member(uuid),public.is_own_suspect(uuid),
 public.is_test_mode(),public.are_final_reports_open() FROM PUBLIC,anon;
ALTER FUNCTION public.handle_new_user() SET search_path=pg_catalog,public;
NOTIFY pgrst,'reload schema';
COMMIT;
