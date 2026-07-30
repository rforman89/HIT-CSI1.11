drop policy "public can view clue files"
on storage.objects;

create policy "clue file access if purchased or admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'clue-files'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.clues_base c
      join public.group_clues gc on gc.clue_id = c.id
      join public.group_members gm on gm.group_id = gc.group_id
      where gm.user_id = auth.uid()
        and (
          c.file_url like '%/clue-files/' || storage.objects.name
          or c.pdf_url like '%/clue-files/' || storage.objects.name
        )
    )
  )
);

update storage.buckets
set public = false
where id = 'clue-files';
