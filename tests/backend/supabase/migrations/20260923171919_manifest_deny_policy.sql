CREATE POLICY test_manifest_deny ON private.test_migration_manifest
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
