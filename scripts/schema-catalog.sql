-- Read-only, schema/code only. Never includes users, gameplay rows or object names.
BEGIN READ ONLY;
SET LOCAL search_path = public, extensions;
WITH entries AS (
 SELECT 'relation:'||n.nspname||'.'||c.relname AS key,
 jsonb_build_object('kind',c.relkind,'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,'options',c.reloptions) AS value
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN ('public','private') AND c.relkind IN ('r','v') AND c.relname NOT IN ('test_migration_manifest')
 UNION ALL
 SELECT 'column:'||table_schema||'.'||table_name||'.'||column_name,
 jsonb_build_object('type',udt_name,'nullable',is_nullable,'default',column_default,'position',ordinal_position)
 FROM information_schema.columns WHERE table_schema IN ('public','private') AND table_name <> 'test_migration_manifest'
 UNION ALL
 SELECT 'function:'||n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'definer',p.prosecdef,'config',p.proconfig,
 'anon',has_function_privilege('anon',p.oid,'EXECUTE'),'authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE'),'service_role',has_function_privilege('service_role',p.oid,'EXECUTE'))
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private') AND p.prokind='f'
 UNION ALL
 SELECT 'view:'||schemaname||'.'||viewname,to_jsonb(definition) FROM pg_views WHERE schemaname IN ('public','private')
 UNION ALL
 SELECT 'policy:'||schemaname||'.'||tablename||'.'||policyname,to_jsonb(p)-'schemaname'-'tablename'-'policyname'
 FROM pg_policies p WHERE schemaname IN ('public','private','storage') AND tablename <> 'test_migration_manifest'
 UNION ALL
 SELECT 'index:'||schemaname||'.'||indexname,to_jsonb(indexdef) FROM pg_indexes
 WHERE schemaname IN ('public','private') AND tablename <> 'test_migration_manifest'
 UNION ALL
 SELECT 'constraint:'||n.nspname||'.'||r.relname||'.'||c.conname,to_jsonb(pg_get_constraintdef(c.oid))
 FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
 WHERE n.nspname IN ('public','private') AND r.relname <> 'test_migration_manifest'
 UNION ALL
 SELECT 'trigger:'||n.nspname||'.'||c.relname||'.'||t.tgname,to_jsonb(pg_get_triggerdef(t.oid))
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE NOT t.tgisinternal AND (n.nspname IN ('public','private') OR (n.nspname='auth' AND t.tgname='on_auth_user_created'))
 UNION ALL
 SELECT 'grant:'||table_schema||'.'||table_name||'.'||grantee||'.'||privilege_type,to_jsonb(is_grantable)
 FROM information_schema.role_table_grants WHERE table_schema IN ('public','private') AND grantee IN ('anon','authenticated','service_role') AND table_name <> 'test_migration_manifest'
 UNION ALL
 SELECT 'publication:'||pubname||'.'||schemaname||'.'||tablename,to_jsonb(attnames::text)
 FROM pg_publication_tables WHERE schemaname IN ('public','private')
 UNION ALL
 SELECT 'bucket:'||id,jsonb_build_object('public',public,'file_size_limit',file_size_limit,'allowed_mime_types',allowed_mime_types) FROM storage.buckets
)
SELECT coalesce(jsonb_object_agg(key,value ORDER BY key),'{}')::text AS catalog FROM entries;
COMMIT;
