-- Deterministic structural fixtures; no passwords, real people, sessions or Storage bytes.
-- Executable only in the disposable database created by database-proof.cjs.
BEGIN;
DO $$ BEGIN
 IF current_database() !~ '^csi_buildproof_[0-9a-f]{16}$' THEN
   RAISE EXCEPTION 'Seed requires a disposable local buildproof database';
 END IF;
END $$;
INSERT INTO public.app_settings(key,value) VALUES ('game_mode','test'),('test_environment','csi-hit-reliability')
ON CONFLICT(key) DO UPDATE SET value=excluded.value;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
('00000000-0000-4000-8000-000000000001','admin@example.test','{}'),
('00000000-0000-4000-8000-000000000002','jury@example.test','{}'),
('00000000-0000-4000-8000-000000000003','participant@example.test','{}'),
('00000000-0000-4000-8000-000000000004','suspect@example.test','{}') ON CONFLICT(id) DO NOTHING;
INSERT INTO public.groups(id,name,credits) VALUES ('00000000-0000-4000-8000-000000000010','TEST buildproof',100) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.suspects(id,name) VALUES ('00000000-0000-4000-8000-000000000020','TEST fictieve verdachte') ON CONFLICT(id) DO NOTHING;
UPDATE public.profiles SET role=CASE id
 WHEN '00000000-0000-4000-8000-000000000001' THEN 'admin'
 WHEN '00000000-0000-4000-8000-000000000002' THEN 'jury'
 WHEN '00000000-0000-4000-8000-000000000004' THEN 'suspect' ELSE 'participant' END,
 suspect_id=CASE WHEN id='00000000-0000-4000-8000-000000000004' THEN '00000000-0000-4000-8000-000000000020'::uuid ELSE NULL END;
INSERT INTO public.group_members(group_id,user_id) VALUES ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000003') ON CONFLICT(group_id,user_id) DO NOTHING;
INSERT INTO public.clues_base(id,title,description,price,suspect_id) VALUES ('00000000-0000-4000-8000-000000000030','TEST aanwijzing','Fictieve tekst',5,'00000000-0000-4000-8000-000000000020') ON CONFLICT(id) DO NOTHING;
DO $$ BEGIN
 IF (SELECT count(DISTINCT role) FROM public.profiles) <> 4 OR (SELECT credits FROM public.groups WHERE id='00000000-0000-4000-8000-000000000010') <> 100
 THEN RAISE EXCEPTION 'Deterministic seed verification failed'; END IF;
END $$;
COMMIT;
