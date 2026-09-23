BEGIN;
-- No production execution in this work order. Apply to isolated TEST first.
CREATE TABLE public.backup_runs (
 id uuid PRIMARY KEY, started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
 status text NOT NULL CHECK (status IN ('running','success','failed','skipped_test','verified')),
 source text NOT NULL CHECK (source IN ('cron','manual','portable','drill')),
 actor uuid, game_mode text, path text, row_counts jsonb, storage_count integer,
 error_code text, cleanup_warning text, duration_ms bigint
);
CREATE INDEX backup_runs_started_idx ON public.backup_runs(started_at DESC);
CREATE TABLE public.operation_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), action_id text NOT NULL,
 actor uuid, action_type text NOT NULL, target text, occurred_at timestamptz NOT NULL DEFAULT now(),
 before_data jsonb, after_data jsonb, result text NOT NULL DEFAULT 'success'
);
CREATE INDEX operation_audit_time_idx ON public.operation_audit(occurred_at DESC);
CREATE TABLE public.client_diagnostics (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), occurred_at timestamptz NOT NULL DEFAULT now(),
 actor uuid, category text NOT NULL, screen text NOT NULL, release text
);
CREATE INDEX client_diagnostics_time_idx ON public.client_diagnostics(occurred_at DESC);
CREATE TABLE public.restore_checks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), verified_at timestamptz NOT NULL DEFAULT now(),
 backup_id uuid NOT NULL, target text NOT NULL, report jsonb NOT NULL
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['backup_runs','operation_audit','client_diagnostics','restore_checks'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  EXECUTE format('CREATE POLICY admin_read ON public.%I FOR SELECT TO authenticated USING ((SELECT public.is_admin()))',t);
 END LOOP;
END $$;
CREATE TABLE private.backup_snapshots (id uuid PRIMARY KEY REFERENCES public.backup_runs(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), payload jsonb NOT NULL);
ALTER TABLE private.backup_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.backup_snapshots FROM PUBLIC,anon,authenticated,service_role;
CREATE POLICY deny_clients ON private.backup_snapshots TO authenticated USING(false);

CREATE FUNCTION private.backup_tables() RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT ARRAY['suspects','groups','clue_categories','profiles','group_members','suspect_users',
 'agenda_items','clues_base','group_clues','suspect_notes','suspect_statuses','notifications',
 'credit_transactions','final_reports','settings','app_settings','operation_audit']::text[]
$$;
CREATE FUNCTION private.schema_fingerprint() RETURNS text LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT md5(string_agg(n.nspname||'.'||c.relname||'.'||a.attname||':'||pg_catalog.format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull::text,',' ORDER BY c.relname,a.attnum))
 FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
 JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname=ANY(private.backup_tables()) AND a.attnum>0 AND NOT a.attisdropped
$$;
-- STABLE: all internal reads use the calling query's MVCC snapshot, also under READ COMMITTED.
CREATE FUNCTION private.capture_backup() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public AS $$
DECLARE t text; rows jsonb; datasets jsonb:='{}';
BEGIN
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'
 AND c.relname<>ALL(private.backup_tables()||ARRAY['backup_runs','client_diagnostics','restore_checks'])) THEN RAISE EXCEPTION 'unclassified_public_table'; END IF;
 IF EXISTS(SELECT 1 FROM public.app_settings WHERE key NOT IN ('game_mode','final_reports_open','latest_auto_backup','test_environment'))
 OR EXISTS(SELECT 1 FROM public.settings WHERE key NOT IN ('email_notifications_enabled','email_on_new_callback','email_on_forward_callback','manager_email_on_urgent','reminder_enabled','escalation_enabled','reminder_hours','escalation_hours'))
 THEN RAISE EXCEPTION 'unclassified_setting'; END IF;
 FOR t IN SELECT unnest(private.backup_tables()) LOOP
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY %I),''[]''::jsonb) FROM public.%I r',CASE WHEN t='app_settings' THEN 'key' ELSE 'id' END,t) INTO rows;
  datasets:=datasets||jsonb_build_object(t,rows);
 END LOOP;
 datasets:=datasets||jsonb_build_object('auth_users',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'email',email,'email_confirmed',email_confirmed_at IS NOT NULL) ORDER BY id),'[]') FROM auth.users));
 datasets:=datasets||jsonb_build_object('storage_buckets',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'public',public,'file_size_limit',file_size_limit,'allowed_mime_types',allowed_mime_types) ORDER BY id),'[]') FROM storage.buckets WHERE id<>'backups'));
 datasets:=datasets||jsonb_build_object('storage_objects',(SELECT coalesce(jsonb_agg(jsonb_build_object('bucket',bucket_id,'path',name,'size',(metadata->>'size')::bigint,'content_type',metadata->>'mimetype','updated_at',updated_at) ORDER BY bucket_id,name),'[]') FROM storage.objects WHERE bucket_id<>'backups'));
 RETURN jsonb_build_object('datasets',datasets,'snapshot_at',statement_timestamp(),'snapshot_id',pg_current_snapshot()::text,
 'schema_version','operations-v2','schema_fingerprint',private.schema_fingerprint());
END $$;

CREATE FUNCTION public.backup_begin(run_id uuid, run_source text, run_actor uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE mode text; payload jsonb; counts jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(82910341);
 IF EXISTS(SELECT 1 FROM public.backup_runs WHERE id=run_id) THEN
  RETURN (SELECT to_jsonb(r)||jsonb_build_object('replayed',true) FROM public.backup_runs r WHERE id=run_id);
 END IF;
 UPDATE public.backup_runs SET status='failed',finished_at=now(),error_code='worker_timeout',duration_ms=extract(epoch FROM now()-started_at)*1000
 WHERE status='running' AND started_at<now()-interval '10 minutes';
 IF EXISTS(SELECT 1 FROM public.backup_runs WHERE status='running') THEN RAISE EXCEPTION 'backup_busy'; END IF;
 SELECT value INTO mode FROM public.app_settings WHERE key='game_mode';
 INSERT INTO public.backup_runs(id,status,source,actor,game_mode) VALUES(run_id,'running',run_source,run_actor,mode);
 IF mode NOT IN ('test','live') OR mode IS NULL THEN
  UPDATE public.backup_runs SET status='failed',error_code='invalid_game_mode',finished_at=now() WHERE id=run_id;
  RETURN jsonb_build_object('id',run_id,'status','failed');
 END IF;
 IF mode='test' AND run_source='cron' THEN
  UPDATE public.backup_runs SET status='skipped_test',finished_at=now(),duration_ms=0 WHERE id=run_id;
  RETURN jsonb_build_object('id',run_id,'status','skipped_test');
 END IF;
 RETURN jsonb_build_object('id',run_id,'status','running','game_mode',mode);
END $$;
CREATE FUNCTION public.backup_capture(run_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE payload jsonb; counts jsonb; mode text;
BEGIN
 SELECT game_mode INTO mode FROM public.backup_runs WHERE id=run_id AND status='running' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'backup_not_running'; END IF;
 payload:=private.capture_backup();
 IF (SELECT value->>'value' FROM jsonb_array_elements(payload->'datasets'->'app_settings') WHERE value->>'key'='game_mode') IS DISTINCT FROM mode THEN RAISE EXCEPTION 'game_mode_changed'; END IF;
 IF octet_length(payload::text)>41943040 THEN RAISE EXCEPTION 'snapshot_size_limit'; END IF;
 INSERT INTO private.backup_snapshots VALUES(run_id,now(),payload);
 SELECT jsonb_object_agg(key,jsonb_array_length(value)) INTO counts FROM jsonb_each(payload->'datasets');
 UPDATE public.backup_runs SET row_counts=counts WHERE id=run_id;
 RETURN (payload-'datasets')||jsonb_build_object('id',run_id,'status','running','game_mode',mode,'row_counts',counts);
END $$;

CREATE FUNCTION public.backup_page(run_id uuid,dataset text,page_offset integer,page_size integer DEFAULT 500) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE payload jsonb;
BEGIN
 IF page_offset<0 OR page_size<1 OR page_size>500 THEN RAISE EXCEPTION 'invalid_page'; END IF;
 SELECT s.payload->'datasets' INTO payload FROM private.backup_snapshots s WHERE s.id=run_id;
 IF payload IS NULL OR NOT payload ? dataset THEN RAISE EXCEPTION 'snapshot_dataset_missing'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(value ORDER BY ord),'[]') FROM jsonb_array_elements(payload->dataset) WITH ORDINALITY AS x(value,ord) WHERE ord>page_offset AND ord<=page_offset+page_size);
END $$;

CREATE FUNCTION public.backup_finish(run_id uuid, succeeded boolean, object_count integer DEFAULT 0, failure_code text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 UPDATE public.backup_runs SET status=CASE WHEN succeeded THEN 'success' WHEN failure_code='verification_snapshot_only' THEN 'verified' ELSE 'failed' END,
 finished_at=now(),duration_ms=extract(epoch FROM now()-started_at)*1000,storage_count=object_count,
 path=CASE WHEN succeeded THEN 'v2/'||id||'.json' ELSE NULL END,error_code=CASE WHEN failure_code='verification_snapshot_only' THEN NULL ELSE left(failure_code,80) END
 WHERE id=run_id AND status='running';
 DELETE FROM private.backup_snapshots WHERE id=run_id;
END $$;
CREATE FUNCTION public.backup_maintenance() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 UPDATE public.backup_runs SET status='failed',finished_at=now(),error_code='worker_timeout',duration_ms=extract(epoch FROM now()-started_at)*1000
 WHERE status='running' AND started_at<now()-interval '10 minutes';
 DELETE FROM private.backup_snapshots WHERE created_at<now()-interval '10 minutes';
 DELETE FROM public.client_diagnostics WHERE occurred_at<now()-interval '30 days';
END $$;

CREATE FUNCTION private.audit_fields(row_data jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT coalesce(jsonb_object_agg(key,value),'{}') FROM jsonb_each(row_data)
 WHERE key=ANY(ARRAY['id','key','group_id','user_id','suspect_id','clue_id','credits','amount','balance_after','action_id','is_active','is_visible','is_free','is_global','price','status','source','role'])
 OR (key='value' AND row_data->>'key' IN ('game_mode','final_reports_open'))
$$;
CREATE FUNCTION private.audit_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE b jsonb:=CASE WHEN TG_OP<>'INSERT' THEN to_jsonb(OLD) END;
 a jsonb:=CASE WHEN TG_OP<>'DELETE' THEN to_jsonb(NEW) END;
BEGIN
 INSERT INTO public.operation_audit(action_id,actor,action_type,target,before_data,after_data)
 VALUES(coalesce(a->>'action_id',b->>'action_id',txid_current()::text),auth.uid(),TG_TABLE_NAME||'.'||lower(TG_OP),
 coalesce(a->>'id',b->>'id',a->>'key',b->>'key'),private.audit_fields(b),private.audit_fields(a));
 RETURN NULL;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['groups','profiles','group_members','suspect_users','suspects','clues_base','group_clues','credit_transactions','app_settings','agenda_items'] LOOP
  EXECUTE format('CREATE TRIGGER operations_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.audit_change()',t);
 END LOOP;
END $$;
-- Explicit action records remain useful even if reset/cleanup affected zero rows.
ALTER FUNCTION public.reset_test_data() RENAME TO reset_test_data_original;
ALTER FUNCTION public.reset_test_data_original() SET SCHEMA private;
ALTER FUNCTION public.delete_demo_data() RENAME TO delete_demo_data_original;
ALTER FUNCTION public.delete_demo_data_original() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.reset_test_data_original(),private.delete_demo_data_original() FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.reset_test_data() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb; BEGIN result:=private.reset_test_data_original();
 INSERT INTO public.operation_audit(action_id,actor,action_type,target) VALUES(txid_current()::text,auth.uid(),'game.reset','game'); RETURN result; END $$;
CREATE FUNCTION public.delete_demo_data() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN PERFORM private.delete_demo_data_original();
 INSERT INTO public.operation_audit(action_id,actor,action_type,target) VALUES(txid_current()::text,auth.uid(),'game.demo_cleanup','game'); END $$;
REVOKE ALL ON FUNCTION public.reset_test_data(),public.delete_demo_data() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reset_test_data(),public.delete_demo_data() TO authenticated;

CREATE FUNCTION public.record_client_diagnostic(category text,screen text,release text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required'; END IF;
 IF category NOT IN ('render','unhandled','promise','sync') OR screen NOT IN ('app','admin','participant','suspect','login')
 OR coalesce(release,'') !~ '^[a-zA-Z0-9._-]{0,64}$' THEN RAISE EXCEPTION 'invalid_diagnostic'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,491));
 IF EXISTS(SELECT 1 FROM public.client_diagnostics d WHERE d.actor=auth.uid() AND d.occurred_at>now()-interval '1 minute') THEN RETURN; END IF;
 INSERT INTO public.client_diagnostics(actor,category,screen,release) VALUES(auth.uid(),category,screen,release);
END $$;
REVOKE ALL ON FUNCTION public.record_client_diagnostic(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_client_diagnostic(text,text,text) TO authenticated;

CREATE FUNCTION public.backup_health() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE mode text; since timestamptz; last_ok public.backup_runs; attempt public.backup_runs; state text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'admin_required'; END IF;
 SELECT value,updated_at INTO mode,since FROM public.app_settings WHERE key='game_mode';
 SELECT * INTO attempt FROM public.backup_runs WHERE status<>'verified' ORDER BY started_at DESC LIMIT 1;
 SELECT * INTO last_ok FROM public.backup_runs WHERE status='success' AND game_mode='live' ORDER BY finished_at DESC LIMIT 1;
 state:=CASE WHEN mode='test' THEN 'test' WHEN mode IS DISTINCT FROM 'live' THEN 'unknown'
 WHEN attempt.status='running' AND attempt.started_at<now()-interval '10 minutes' THEN 'failed'
 WHEN attempt.status='failed' AND attempt.started_at>=coalesce(since,'-infinity') THEN 'failed'
 WHEN last_ok.finished_at>=since AND last_ok.finished_at>now()-interval '30 hours' THEN 'healthy'
 WHEN since>now()-interval '30 hours' THEN 'grace' ELSE 'overdue' END;
 RETURN jsonb_build_object('health',state,'game_mode',mode,'live_since',since,'last_attempt',to_jsonb(attempt),
 'last_success',to_jsonb(last_ok),'last_bundle',(SELECT to_jsonb(r) FROM public.backup_runs r WHERE status='success' ORDER BY finished_at DESC LIMIT 1),'last_restore',(SELECT to_jsonb(r) FROM public.restore_checks r ORDER BY verified_at DESC LIMIT 1));
END $$;
REVOKE ALL ON FUNCTION public.backup_health() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.backup_health() TO authenticated;

CREATE FUNCTION public.restore_preflight(target_ref text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE marker text; BEGIN
 IF target_ref='uhfcrskkgutlqqogahbr' OR (target_ref<>'csi-hit-reliability' AND target_ref !~ '^[a-z]{20}$') OR target_ref IS NULL
 OR coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'ref'='uhfcrskkgutlqqogahbr' THEN RAISE EXCEPTION 'restore_target_forbidden'; END IF;
 IF target_ref<>'csi-hit-reliability' AND coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'ref' IS DISTINCT FROM target_ref THEN RAISE EXCEPTION 'restore_key_mismatch'; END IF;
 SELECT value INTO marker FROM public.app_settings WHERE key='test_environment';
 IF marker IS DISTINCT FROM target_ref THEN RAISE EXCEPTION 'restore_marker_mismatch'; END IF;
 RETURN jsonb_build_object('schema_version','operations-v2','schema_fingerprint',private.schema_fingerprint());
END $$;
CREATE FUNCTION public.restore_database(target_ref text,confirmation text,datasets jsonb,fingerprint text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE t text; counts jsonb:='{}'; row_count integer; names text;
BEGIN
 PERFORM public.restore_preflight(target_ref);
 IF confirmation IS DISTINCT FROM 'RESTORE '||target_ref OR fingerprint IS DISTINCT FROM private.schema_fingerprint() THEN RAISE EXCEPTION 'restore_preflight_failed'; END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(datasets))<>cardinality(private.backup_tables()) THEN RAISE EXCEPTION 'restore_dataset_mismatch'; END IF;
 FOREACH t IN ARRAY private.backup_tables() LOOP
  IF jsonb_typeof(datasets->t) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'restore_dataset_missing'; END IF;
 END LOOP;
 SELECT string_agg(format('public.%I',x),',') INTO names FROM unnest(private.backup_tables()) x;
 EXECUTE 'LOCK TABLE '||names||' IN ACCESS EXCLUSIVE MODE';
 FOREACH t IN ARRAY private.backup_tables() LOOP EXECUTE format('ALTER TABLE public.%I DISABLE TRIGGER USER',t); END LOOP;
 -- Explicit list, no CASCADE; an unknown incoming FK fails safely and rolls back.
 EXECUTE 'TRUNCATE '||names;
 FOREACH t IN ARRAY private.backup_tables() LOOP
  EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_recordset(NULL::public.%I,$1)',t,t) USING datasets->t;
  GET DIAGNOSTICS row_count=ROW_COUNT; counts:=counts||jsonb_build_object(t,row_count);

 END LOOP;
 -- Never open a restored game automatically. The report verifies this intentional difference.
 INSERT INTO public.app_settings(key,value,updated_at) VALUES('test_environment',target_ref,now()),('game_mode','test',now())
 ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=EXCLUDED.updated_at,updated_by=NULL;
 FOREACH t IN ARRAY private.backup_tables() LOOP EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER USER',t); END LOOP;
 RETURN counts;
END $$;
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT oid::regprocedure AS name FROM pg_proc WHERE pronamespace='public'::regnamespace
 AND proname IN ('backup_begin','backup_capture','backup_page','backup_finish','backup_maintenance','restore_preflight','restore_database') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',p.name);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',p.name);
 END LOOP;
 FOR p IN SELECT oid::regprocedure AS name FROM pg_proc WHERE pronamespace='private'::regnamespace
 AND proname IN ('backup_tables','schema_fingerprint','capture_backup','audit_fields','audit_change') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',p.name);
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
CREATE FUNCTION public.backup_storage_inventory() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('bucket',bucket_id,'path',name,'size',(metadata->>'size')::bigint,'content_type',metadata->>'mimetype','updated_at',updated_at) ORDER BY bucket_id,name),'[]') FROM storage.objects WHERE bucket_id<>'backups'
$$;
REVOKE ALL ON FUNCTION public.backup_storage_inventory() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.backup_storage_inventory() TO service_role;
COMMIT;
