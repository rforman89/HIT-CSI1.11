-- Test-only bootstrap for the missing pre-July application schema.
-- Apply ONLY to an empty CSI HIT TEST database, then replay repository migrations.
-- Deliberately omits the clue facade/RPCs already defined by those migrations.
SET check_function_bodies = false;


CREATE TABLE public."groups" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "credits" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."suspects" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "photo_url" text
);
CREATE TABLE public."group_members" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."group_clues" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL,
  "clue_id" uuid NOT NULL,
  "status" text DEFAULT 'requested'::text NOT NULL,
  "source" text DEFAULT 'purchase'::text NOT NULL,
  "requested_at" timestamp with time zone DEFAULT now(),
  "released_at" timestamp with time zone
);
CREATE TABLE public."suspect_notes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL,
  "suspect_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "note" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."suspect_statuses" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL,
  "suspect_id" uuid NOT NULL,
  "status" text DEFAULT 'unknown'::text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."notifications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid,
  "user_id" uuid,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "type" text DEFAULT 'info'::text NOT NULL,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "notification_type" text DEFAULT 'general'::text,
  "created_by" uuid,
  "link_url" text
);
CREATE TABLE public."profiles" (
  "id" uuid NOT NULL,
  "email" text NOT NULL,
  "display_name" text,
  "role" text DEFAULT 'participant'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "suspect_id" uuid
);
CREATE TABLE public."settings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "value" text NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."agenda_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone,
  "item_type" text DEFAULT 'activity'::text NOT NULL,
  "credits_reward" integer DEFAULT 0 NOT NULL,
  "is_visible" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."suspect_users" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "suspect_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."app_settings" (
  "key" text NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now(),
  "updated_by" uuid
);
CREATE TABLE public."credit_transactions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL,
  "amount" integer NOT NULL,
  "reason" text,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."final_reports" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "group_id" uuid NOT NULL,
  "suspect_id" uuid,
  "motive" text DEFAULT ''::text,
  "evidence" text DEFAULT ''::text,
  "submitted_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now(),
  "submitted_by" uuid,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."clues" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "price" integer DEFAULT 0 NOT NULL,
  "clue_type" text DEFAULT 'general'::text NOT NULL,
  "suspect_id" uuid,
  "pdf_url" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "is_visible" boolean DEFAULT true NOT NULL,
  "is_global" boolean DEFAULT false NOT NULL,
  "is_free" boolean DEFAULT false NOT NULL,
  "file_url" text,
  "category_id" uuid
);
CREATE TABLE public."clue_categories" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);
ALTER TABLE public."groups" ADD CONSTRAINT "groups_pkey" PRIMARY KEY (id);
ALTER TABLE public."group_members" ADD CONSTRAINT "group_members_pkey" PRIMARY KEY (id);
ALTER TABLE public."group_members" ADD CONSTRAINT "group_members_group_id_user_id_key" UNIQUE (group_id, user_id);
ALTER TABLE public."suspects" ADD CONSTRAINT "suspects_pkey" PRIMARY KEY (id);
ALTER TABLE public."clues" ADD CONSTRAINT "clues_clue_type_check" CHECK ((clue_type = ANY (ARRAY['suspect'::text, 'general'::text, 'free'::text])));
ALTER TABLE public."clues" ADD CONSTRAINT "clues_pkey" PRIMARY KEY (id);
ALTER TABLE public."group_clues" ADD CONSTRAINT "group_clues_status_check" CHECK ((status = ANY (ARRAY['requested'::text, 'released'::text])));
ALTER TABLE public."group_clues" ADD CONSTRAINT "group_clues_source_check" CHECK ((source = ANY (ARRAY['purchase'::text, 'free'::text, 'manual'::text])));
ALTER TABLE public."group_clues" ADD CONSTRAINT "group_clues_pkey" PRIMARY KEY (id);
ALTER TABLE public."group_clues" ADD CONSTRAINT "group_clues_group_id_clue_id_key" UNIQUE (group_id, clue_id);
ALTER TABLE public."suspect_notes" ADD CONSTRAINT "suspect_notes_pkey" PRIMARY KEY (id);
ALTER TABLE public."suspect_statuses" ADD CONSTRAINT "suspect_statuses_status_check" CHECK ((status = ANY (ARRAY['unknown'::text, 'suspect'::text, 'doubt'::text, 'excluded'::text])));
ALTER TABLE public."suspect_statuses" ADD CONSTRAINT "suspect_statuses_pkey" PRIMARY KEY (id);
ALTER TABLE public."suspect_statuses" ADD CONSTRAINT "suspect_statuses_group_id_suspect_id_key" UNIQUE (group_id, suspect_id);
ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY (id);
ALTER TABLE public."agenda_items" ADD CONSTRAINT "agenda_items_item_type_check" CHECK ((item_type = ANY (ARRAY['activity'::text, 'food'::text, 'credits'::text, 'free_time'::text, 'deadline'::text])));
ALTER TABLE public."agenda_items" ADD CONSTRAINT "agenda_items_pkey" PRIMARY KEY (id);
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'participant'::text, 'suspect'::text])));
ALTER TABLE public."suspect_users" ADD CONSTRAINT "suspect_users_pkey" PRIMARY KEY (id);
ALTER TABLE public."suspect_users" ADD CONSTRAINT "suspect_users_suspect_id_user_id_key" UNIQUE (suspect_id, user_id);
ALTER TABLE public."credit_transactions" ADD CONSTRAINT "credit_transactions_pkey" PRIMARY KEY (id);
ALTER TABLE public."settings" ADD CONSTRAINT "settings_pkey" PRIMARY KEY (id);
ALTER TABLE public."settings" ADD CONSTRAINT "settings_key_key" UNIQUE (key);
ALTER TABLE public."app_settings" ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY (key);
ALTER TABLE public."group_members" ADD CONSTRAINT "group_members_one_group_per_user" UNIQUE (user_id);
ALTER TABLE public."final_reports" ADD CONSTRAINT "final_reports_pkey" PRIMARY KEY (id);
ALTER TABLE public."final_reports" ADD CONSTRAINT "final_reports_group_id_key" UNIQUE (group_id);
ALTER TABLE public."app_settings" ADD CONSTRAINT "app_settings_key_unique" UNIQUE (key);
ALTER TABLE public."suspect_statuses" ADD CONSTRAINT "suspect_statuses_one_status_per_group_suspect" UNIQUE (group_id, suspect_id);
ALTER TABLE public."clue_categories" ADD CONSTRAINT "clue_categories_pkey" PRIMARY KEY (id);
ALTER TABLE public."clues" ADD CONSTRAINT "clues_price_nonnegative" CHECK ((price >= 0));
ALTER TABLE public."groups" ADD CONSTRAINT "groups_credits_nonnegative" CHECK ((credits >= 0));
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
ALTER TABLE public."group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."clues" ADD CONSTRAINT "clues_suspect_id_fkey" FOREIGN KEY (suspect_id) REFERENCES suspects(id) ON DELETE SET NULL;
ALTER TABLE public."group_clues" ADD CONSTRAINT "group_clues_group_id_fkey" FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
ALTER TABLE public."group_clues" ADD CONSTRAINT "group_clues_clue_id_fkey" FOREIGN KEY (clue_id) REFERENCES clues(id) ON DELETE CASCADE;
ALTER TABLE public."suspect_notes" ADD CONSTRAINT "suspect_notes_group_id_fkey" FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
ALTER TABLE public."suspect_notes" ADD CONSTRAINT "suspect_notes_suspect_id_fkey" FOREIGN KEY (suspect_id) REFERENCES suspects(id) ON DELETE CASCADE;
ALTER TABLE public."suspect_notes" ADD CONSTRAINT "suspect_notes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."suspect_statuses" ADD CONSTRAINT "suspect_statuses_group_id_fkey" FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
ALTER TABLE public."suspect_statuses" ADD CONSTRAINT "suspect_statuses_suspect_id_fkey" FOREIGN KEY (suspect_id) REFERENCES suspects(id) ON DELETE CASCADE;
ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_group_id_fkey" FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."suspect_users" ADD CONSTRAINT "suspect_users_suspect_id_fkey" FOREIGN KEY (suspect_id) REFERENCES suspects(id) ON DELETE CASCADE;
ALTER TABLE public."suspect_users" ADD CONSTRAINT "suspect_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public."credit_transactions" ADD CONSTRAINT "credit_transactions_group_id_fkey" FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
ALTER TABLE public."credit_transactions" ADD CONSTRAINT "credit_transactions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE public."app_settings" ADD CONSTRAINT "app_settings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_suspect_id_fkey" FOREIGN KEY (suspect_id) REFERENCES suspects(id);
ALTER TABLE public."final_reports" ADD CONSTRAINT "final_reports_group_id_fkey" FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
ALTER TABLE public."final_reports" ADD CONSTRAINT "final_reports_suspect_id_fkey" FOREIGN KEY (suspect_id) REFERENCES suspects(id);
ALTER TABLE public."final_reports" ADD CONSTRAINT "final_reports_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id);
ALTER TABLE public."clues" ADD CONSTRAINT "clues_category_id_fkey" FOREIGN KEY (category_id) REFERENCES clue_categories(id) ON DELETE SET NULL;


CREATE OR REPLACE FUNCTION public.is_own_suspect(target_suspect_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'suspect'
      and p.suspect_id = target_suspect_id
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_test_mode()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.app_settings
    where key = 'game_mode'
      and value = 'test'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.are_final_reports_open()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.app_settings
    where key = 'final_reports_open'
      and value = 'true'
  );
$function$
;

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

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    'participant'
  );
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_group_member(target_group_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.group_members
    where user_id = auth.uid()
    and group_id = target_group_id
  );
$function$
;

CREATE VIEW public."admin_aankopen_overzicht" WITH (security_invoker=true) AS  SELECT gc.id AS aankoop_id,
    gc.group_id,
    g.name AS groep_naam,
    gc.clue_id,
    c.title AS aanwijzing_titel,
    c.description AS aanwijzing_omschrijving,
    c.price AS aanwijzing_prijs,
    c.clue_type,
    c.file_url,
    c.pdf_url,
    c.suspect_id,
    s.name AS verdachte_naam,
    gc.status AS aankoop_status,
    gc.source AS bron,
    gc.requested_at,
    gc.released_at,
    COALESCE(gc.released_at, gc.requested_at) AS moment
   FROM group_clues gc
     LEFT JOIN groups g ON g.id = gc.group_id
     LEFT JOIN clues c ON c.id = gc.clue_id
     LEFT JOIN suspects s ON s.id = c.suspect_id
  ORDER BY (COALESCE(gc.released_at, gc.requested_at)) DESC NULLS LAST, g.name, c.title;

CREATE VIEW public."admin_groep_activiteit" WITH (security_invoker=true) AS  SELECT g.id AS group_id,
    g.name AS groep_naam,
    g.credits,
    g.is_active,
    g.created_at AS groep_aangemaakt_op,
    count(DISTINCT gc.id) AS aantal_aanwijzingen,
    count(DISTINCT sn.id) AS aantal_notities,
    count(DISTINCT ss.id) AS aantal_statussen,
    count(DISTINCT n.id) AS aantal_meldingen,
    count(DISTINCT ct.id) AS aantal_pegel_transacties,
    GREATEST(COALESCE(max(gc.released_at), max(gc.requested_at), '1970-01-01 00:00:00'::timestamp without time zone::timestamp with time zone), COALESCE(max(sn.created_at), '1970-01-01 00:00:00'::timestamp without time zone::timestamp with time zone), COALESCE(max(ss.updated_at), '1970-01-01 00:00:00'::timestamp without time zone::timestamp with time zone), COALESCE(max(n.created_at), '1970-01-01 00:00:00'::timestamp without time zone::timestamp with time zone), COALESCE(max(ct.created_at), '1970-01-01 00:00:00'::timestamp without time zone::timestamp with time zone), COALESCE(max(g.created_at), '1970-01-01 00:00:00'::timestamp without time zone::timestamp with time zone)) AS laatste_activiteit
   FROM groups g
     LEFT JOIN group_clues gc ON gc.group_id = g.id
     LEFT JOIN suspect_notes sn ON sn.group_id = g.id
     LEFT JOIN suspect_statuses ss ON ss.group_id = g.id
     LEFT JOIN notifications n ON n.group_id = g.id
     LEFT JOIN credit_transactions ct ON ct.group_id = g.id
  GROUP BY g.id, g.name, g.credits, g.is_active, g.created_at
  ORDER BY (GREATEST(COALESCE(max(gc.released_at), max(gc.requested_at), '1970-01-01 00:00:00'::timestamp without time zone::timestamp with time zone), COALESCE(max(sn.created_at), '1970-01-01 00:00:00'::timestamp without time zone::timestamp with time zone), COALESCE(max(ss.updated_at), '1970-01-01 00:00:00'::timestamp without time zone::timestamp with time zone), COALESCE(max(n.created_at), '1970-01-01 00:00:00'::timestamp without time zone::timestamp with time zone), COALESCE(max(ct.created_at), '1970-01-01 00:00:00'::timestamp without time zone::timestamp with time zone), COALESCE(max(g.created_at), '1970-01-01 00:00:00'::timestamp without time zone::timestamp with time zone))) DESC;

CREATE VIEW public."admin_notities_overzicht" WITH (security_invoker=true) AS  SELECT sn.id AS notitie_id,
    sn.created_at,
    sn.group_id,
    g.name AS groep_naam,
    sn.suspect_id,
    s.name AS verdachte_naam,
    sn.user_id,
    p.display_name AS auteur_naam,
    p.email AS auteur_email,
    sn.note
   FROM suspect_notes sn
     LEFT JOIN groups g ON g.id = sn.group_id
     LEFT JOIN suspects s ON s.id = sn.suspect_id
     LEFT JOIN profiles p ON p.id = sn.user_id
  ORDER BY sn.created_at DESC;

CREATE VIEW public."admin_statussen_overzicht" WITH (security_invoker=true) AS  SELECT ss.id AS status_id,
    ss.group_id,
    g.name AS groep_naam,
    ss.suspect_id,
    s.name AS verdachte_naam,
    ss.status,
        CASE
            WHEN ss.status = 'suspect'::text THEN 'Verdacht'::text
            WHEN ss.status = 'doubt'::text THEN 'Twijfel'::text
            WHEN ss.status = 'excluded'::text THEN 'Uitgesloten'::text
            ELSE 'Onbekend'::text
        END AS status_label,
    ss.updated_at AS bijgewerkt_op
   FROM suspect_statuses ss
     LEFT JOIN groups g ON g.id = ss.group_id
     LEFT JOIN suspects s ON s.id = ss.suspect_id
  ORDER BY ss.updated_at DESC NULLS LAST;

CREATE VIEW public."admin_eindrapporten_overzicht" WITH (security_invoker=true) AS  SELECT fr.id AS eindrapport_id,
    fr.group_id,
    g.name AS groep_naam,
    fr.suspect_id,
    s.name AS verdachte_naam,
    fr.motive,
    fr.evidence,
    fr.submitted_by,
    p.display_name AS ingediend_door_naam,
    p.email AS ingediend_door_email,
    fr.submitted_at,
    fr.updated_at,
    fr.created_at
   FROM final_reports fr
     LEFT JOIN groups g ON g.id = fr.group_id
     LEFT JOIN suspects s ON s.id = fr.suspect_id
     LEFT JOIN profiles p ON p.id = fr.submitted_by
  ORDER BY fr.updated_at DESC NULLS LAST, fr.submitted_at DESC NULLS LAST;

ALTER TABLE public."groups" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."groups" FROM anon, authenticated;
GRANT ALL ON public."groups" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."groups" TO authenticated;
ALTER TABLE public."suspects" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."suspects" FROM anon, authenticated;
GRANT ALL ON public."suspects" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."suspects" TO authenticated;
ALTER TABLE public."group_members" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."group_members" FROM anon, authenticated;
GRANT ALL ON public."group_members" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."group_members" TO authenticated;
ALTER TABLE public."group_clues" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."group_clues" FROM anon, authenticated;
GRANT ALL ON public."group_clues" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."group_clues" TO authenticated;
ALTER TABLE public."suspect_notes" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."suspect_notes" FROM anon, authenticated;
GRANT ALL ON public."suspect_notes" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."suspect_notes" TO authenticated;
ALTER TABLE public."suspect_statuses" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."suspect_statuses" FROM anon, authenticated;
GRANT ALL ON public."suspect_statuses" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."suspect_statuses" TO authenticated;
ALTER TABLE public."notifications" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."notifications" FROM anon, authenticated;
GRANT ALL ON public."notifications" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."notifications" TO authenticated;
ALTER TABLE public."profiles" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."profiles" FROM anon, authenticated;
GRANT ALL ON public."profiles" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."profiles" TO authenticated;
ALTER TABLE public."settings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."settings" FROM anon, authenticated;
GRANT ALL ON public."settings" TO service_role;
ALTER TABLE public."agenda_items" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."agenda_items" FROM anon, authenticated;
GRANT ALL ON public."agenda_items" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."agenda_items" TO authenticated;
ALTER TABLE public."suspect_users" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."suspect_users" FROM anon, authenticated;
GRANT ALL ON public."suspect_users" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."suspect_users" TO authenticated;
ALTER TABLE public."app_settings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."app_settings" FROM anon, authenticated;
GRANT ALL ON public."app_settings" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."app_settings" TO authenticated;
ALTER TABLE public."credit_transactions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."credit_transactions" FROM anon, authenticated;
GRANT ALL ON public."credit_transactions" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."credit_transactions" TO authenticated;
ALTER TABLE public."final_reports" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."final_reports" FROM anon, authenticated;
GRANT ALL ON public."final_reports" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."final_reports" TO authenticated;
ALTER TABLE public."clues" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."clues" FROM anon, authenticated;
GRANT ALL ON public."clues" TO service_role;
ALTER TABLE public."clue_categories" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."clue_categories" FROM anon, authenticated;
GRANT ALL ON public."clue_categories" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."clue_categories" TO authenticated;
REVOKE ALL ON public."admin_aankopen_overzicht" FROM anon, authenticated;
GRANT ALL ON public."admin_aankopen_overzicht" TO service_role;
GRANT SELECT ON public."admin_aankopen_overzicht" TO authenticated;
REVOKE ALL ON public."admin_groep_activiteit" FROM anon, authenticated;
GRANT ALL ON public."admin_groep_activiteit" TO service_role;
GRANT SELECT ON public."admin_groep_activiteit" TO authenticated;
REVOKE ALL ON public."admin_notities_overzicht" FROM anon, authenticated;
GRANT ALL ON public."admin_notities_overzicht" TO service_role;
GRANT SELECT ON public."admin_notities_overzicht" TO authenticated;
REVOKE ALL ON public."admin_statussen_overzicht" FROM anon, authenticated;
GRANT ALL ON public."admin_statussen_overzicht" TO service_role;
GRANT SELECT ON public."admin_statussen_overzicht" TO authenticated;
REVOKE ALL ON public."admin_eindrapporten_overzicht" FROM anon, authenticated;
GRANT ALL ON public."admin_eindrapporten_overzicht" TO service_role;
GRANT SELECT ON public."admin_eindrapporten_overzicht" TO authenticated;
REVOKE ALL ON public."clues" FROM anon, authenticated;
GRANT ALL ON public."clues" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."clues" TO authenticated;


CREATE POLICY "group_clues select own or admin" ON "public"."group_clues" AS PERMISSIVE FOR SELECT TO authenticated USING ((is_admin() OR is_group_member(group_id)));

CREATE POLICY "group_members admin all" ON "public"."group_members" AS PERMISSIVE FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "groups admin all" ON "public"."groups" AS PERMISSIVE FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "profiles select own or admin" ON "public"."profiles" AS PERMISSIVE FOR SELECT TO authenticated USING (((id = auth.uid()) OR is_admin()));

CREATE POLICY "group_clues admin update" ON "public"."group_clues" AS PERMISSIVE FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "groups select own or admin" ON "public"."groups" AS PERMISSIVE FOR SELECT TO authenticated USING ((is_admin() OR is_group_member(id)));

CREATE POLICY "notifications admin all" ON "public"."notifications" AS PERMISSIVE FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "suspect_notes admin all" ON "public"."suspect_notes" AS PERMISSIVE FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "suspect_statuses admin all" ON "public"."suspect_statuses" AS PERMISSIVE FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "suspect_notes select own group admin or own suspect" ON "public"."suspect_notes" AS PERMISSIVE FOR SELECT TO authenticated USING ((is_admin() OR is_group_member(group_id) OR is_own_suspect(suspect_id)));

CREATE POLICY "suspect_statuses select own group admin or own suspect" ON "public"."suspect_statuses" AS PERMISSIVE FOR SELECT TO authenticated USING ((is_admin() OR is_group_member(group_id) OR is_own_suspect(suspect_id)));

CREATE POLICY "suspects select active admin or own suspect" ON "public"."suspects" AS PERMISSIVE FOR SELECT TO authenticated USING (((is_active = true) OR is_admin() OR is_own_suspect(id)));

CREATE POLICY "final reports insert own group when open or admin" ON "public"."final_reports" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((is_admin() OR (are_final_reports_open() AND is_group_member(group_id))));

CREATE POLICY "agenda admin all" ON "public"."agenda_items" AS PERMISSIVE FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "agenda select visible or admin" ON "public"."agenda_items" AS PERMISSIVE FOR SELECT TO authenticated USING (((is_visible = true) OR is_admin()));

CREATE POLICY "admins can upload suspect photos" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'suspect-photos'::text) AND is_admin()));

CREATE POLICY "admins can update suspect photos" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'suspect-photos'::text) AND is_admin())) WITH CHECK (((bucket_id = 'suspect-photos'::text) AND is_admin()));

CREATE POLICY "admins can delete suspect photos" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'suspect-photos'::text) AND is_admin()));

CREATE POLICY "admins can upload clue files" ON "storage"."objects" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'clue-files'::text) AND is_admin()));

CREATE POLICY "final reports select own group or admin" ON "public"."final_reports" AS PERMISSIVE FOR SELECT TO authenticated USING ((is_admin() OR is_group_member(group_id)));

CREATE POLICY "admins can update clue files" ON "storage"."objects" AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'clue-files'::text) AND is_admin())) WITH CHECK (((bucket_id = 'clue-files'::text) AND is_admin()));

CREATE POLICY "admins can delete clue files" ON "storage"."objects" AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'clue-files'::text) AND is_admin()));

CREATE POLICY "admins can delete group clues" ON "public"."group_clues" AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "admins can delete suspect notes" ON "public"."suspect_notes" AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "admins can delete suspect statuses" ON "public"."suspect_statuses" AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "admins can delete notifications" ON "public"."notifications" AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "admins can delete credit transactions" ON "public"."credit_transactions" AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "credit transactions admin insert" ON "public"."credit_transactions" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "credit transactions select own or admin" ON "public"."credit_transactions" AS PERMISSIVE FOR SELECT TO authenticated USING ((is_admin() OR is_group_member(group_id)));

CREATE POLICY "groups select active for suspects" ON "public"."groups" AS PERMISSIVE FOR SELECT TO authenticated USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'suspect'::text))))));

CREATE POLICY "final reports update own group when open or admin" ON "public"."final_reports" AS PERMISSIVE FOR UPDATE TO authenticated USING ((is_admin() OR (are_final_reports_open() AND is_group_member(group_id)))) WITH CHECK ((is_admin() OR (are_final_reports_open() AND is_group_member(group_id))));

CREATE POLICY "final reports delete admin" ON "public"."final_reports" AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "app settings admin insert" ON "public"."app_settings" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "app settings admin update" ON "public"."app_settings" AS PERMISSIVE FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "app settings admin delete" ON "public"."app_settings" AS PERMISSIVE FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "clues admin all" ON "public"."clues" AS PERMISSIVE FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "group_members select own membership or admin" ON "public"."group_members" AS PERMISSIVE FOR SELECT TO authenticated USING ((is_admin() OR (user_id = auth.uid())));

CREATE POLICY "notifications select own or group or admin" ON "public"."notifications" AS PERMISSIVE FOR SELECT TO authenticated USING ((is_admin() OR (user_id = auth.uid()) OR ((group_id IS NOT NULL) AND is_group_member(group_id))));

CREATE POLICY "suspect_notes insert own group" ON "public"."suspect_notes" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((is_group_member(group_id) AND (user_id = auth.uid())));

CREATE POLICY "suspect_statuses insert own group" ON "public"."suspect_statuses" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_group_member(group_id));

CREATE POLICY "suspect_statuses update own group" ON "public"."suspect_statuses" AS PERMISSIVE FOR UPDATE TO authenticated USING (is_group_member(group_id)) WITH CHECK (is_group_member(group_id));

CREATE POLICY "suspects admin all" ON "public"."suspects" AS PERMISSIVE FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "profiles update admin only" ON "public"."profiles" AS PERMISSIVE FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "profiles insert own" ON "public"."profiles" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((id = auth.uid()) AND ((role IS NULL) OR (role = 'participant'::text))));

CREATE POLICY "suspect_notes update own or admin" ON "public"."suspect_notes" AS PERMISSIVE FOR UPDATE TO authenticated USING ((is_admin() OR ((user_id = auth.uid()) AND is_group_member(group_id)))) WITH CHECK ((is_admin() OR ((user_id = auth.uid()) AND is_group_member(group_id))));

CREATE POLICY "suspect_notes delete own or admin" ON "public"."suspect_notes" AS PERMISSIVE FOR DELETE TO authenticated USING ((is_admin() OR ((user_id = auth.uid()) AND is_group_member(group_id))));

CREATE POLICY "suspect_users admin all" ON "public"."suspect_users" AS PERMISSIVE FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "suspect_users select own or admin" ON "public"."suspect_users" AS PERMISSIVE FOR SELECT TO authenticated USING ((is_admin() OR (user_id = auth.uid())));

CREATE POLICY "clue_categories_select_authenticated" ON "public"."clue_categories" AS PERMISSIVE FOR SELECT TO authenticated USING (true);

CREATE POLICY "clue_categories_admin_all" ON "public"."clue_categories" AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));

CREATE POLICY "group_clues insert admin only" ON "public"."group_clues" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "app settings safe read or admin" ON "public"."app_settings" AS PERMISSIVE FOR SELECT TO authenticated USING ((is_admin() OR (key = ANY (ARRAY['game_mode'::text, 'final_reports_open'::text]))));

CREATE POLICY "notifications insert admin only" ON "public"."notifications" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "notifications update admin only" ON "public"."notifications" AS PERMISSIVE FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "public can view clue files" ON storage.objects FOR SELECT TO anon USING (false);

CREATE POLICY "public can view suspect photos" ON storage.objects FOR SELECT TO anon USING (false);

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE INDEX idx_group_members_user_id ON public.group_members USING btree (user_id);

CREATE INDEX idx_group_members_group_id ON public.group_members USING btree (group_id);

CREATE INDEX idx_group_clues_group_id ON public.group_clues USING btree (group_id);

CREATE INDEX idx_group_clues_clue_id ON public.group_clues USING btree (clue_id);

CREATE INDEX idx_suspect_notes_group_id ON public.suspect_notes USING btree (group_id);

CREATE INDEX idx_suspect_notes_suspect_id ON public.suspect_notes USING btree (suspect_id);

CREATE INDEX idx_suspect_notes_created_at ON public.suspect_notes USING btree (created_at DESC);

CREATE INDEX idx_suspect_statuses_group_id ON public.suspect_statuses USING btree (group_id);

CREATE INDEX idx_suspect_statuses_suspect_id ON public.suspect_statuses USING btree (suspect_id);

CREATE INDEX idx_suspect_statuses_group_suspect ON public.suspect_statuses USING btree (group_id, suspect_id);

CREATE INDEX idx_notifications_group_id ON public.notifications USING btree (group_id);

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);

CREATE INDEX idx_profiles_suspect_id ON public.profiles USING btree (suspect_id);

CREATE INDEX idx_settings_key ON public.settings USING btree (key);

CREATE INDEX idx_credit_transactions_group_id ON public.credit_transactions USING btree (group_id);

CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions USING btree (created_at DESC);

CREATE INDEX idx_final_reports_group_id ON public.final_reports USING btree (group_id);

CREATE INDEX idx_clues_suspect_id ON public.clues USING btree (suspect_id);

CREATE INDEX idx_clues_category_id ON public.clues USING btree (category_id);

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES
('clue-files','clue-files',false,26214400,ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/webp']),
('suspect-photos','suspect-photos',true,10485760,ARRAY['image/jpeg','image/png','image/webp']),
('backups','backups',false,52428800,ARRAY['application/json']);


ALTER PUBLICATION supabase_realtime ADD TABLE public.groups, public.clues, public.group_clues, public.suspect_notes, public.suspect_statuses, public.notifications, public.agenda_items, public.credit_transactions;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
