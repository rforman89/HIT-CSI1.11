-- Preserve authorization semantics; address only new hardening advisor findings.
BEGIN;
ALTER POLICY "suspects select active admin or own suspect" ON public.suspects USING (
 public.is_admin() OR public.is_own_suspect(id) OR (is_active AND EXISTS(
 SELECT 1 FROM public.group_members m WHERE m.user_id=(SELECT auth.uid()) AND public.is_group_member(m.group_id))));
ALTER POLICY final_report_actor ON public.final_reports WITH CHECK(public.is_admin() OR (submitted_by=(SELECT auth.uid()) AND public.is_group_member(group_id)));
-- Reuse the single SELECT policy on these tables instead of adding a second permissive policy.
DROP POLICY jury_read ON public.credit_transactions;
ALTER POLICY "credit transactions select own or admin" ON public.credit_transactions USING(public.is_admin() OR public.is_group_member(group_id) OR (SELECT private.is_jury()));
DROP POLICY jury_read ON public.final_reports;
ALTER POLICY "final reports select own group or admin" ON public.final_reports USING(public.is_admin() OR public.is_group_member(group_id) OR (SELECT private.is_jury()));
-- Expose an invoker wrapper, keep the checked privileged implementation private.
ALTER FUNCTION public.release_group_clue(uuid) SET SCHEMA private;
CREATE FUNCTION public.release_group_clue(target_purchase_id uuid) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT private.release_group_clue(target_purchase_id)
$$;
REVOKE ALL ON FUNCTION public.release_group_clue(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.release_group_clue(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
