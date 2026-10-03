BEGIN;

-- Read-only public dossier fields for an active, linked suspect. Keep
-- is_own_suspect unchanged: research notes, statuses and clues stay own-only.
CREATE POLICY "suspect cross dossier read" ON public.suspects
FOR SELECT TO authenticated USING (
  is_active AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND public.is_own_suspect(p.suspect_id)
  )
);

-- Only photos referenced by an active dossier; no orphan objects or writes.
CREATE POLICY "suspect cross dossier photo read" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'suspect-photos' AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND public.is_own_suspect(p.suspect_id)
  ) AND EXISTS (
    SELECT 1 FROM public.suspects s
    WHERE s.is_active AND private.photo_path(s.photo_url) = storage.objects.name
  )
);

COMMIT;
