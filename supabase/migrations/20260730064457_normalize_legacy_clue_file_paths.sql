update public.clues_base
set file_url = regexp_replace(
  file_url,
  '^.*/object/public/clue-files/',
  ''
)
where file_url like '%/object/public/clue-files/%';

update public.clues_base
set pdf_url = regexp_replace(
  pdf_url,
  '^.*/object/public/clue-files/',
  ''
)
where pdf_url like '%/object/public/clue-files/%';
