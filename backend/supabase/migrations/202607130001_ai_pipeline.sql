alter table public.generation_jobs
  drop constraint if exists generation_jobs_type_check;

alter table public.generation_jobs
  add constraint generation_jobs_type_check check (
    job_type in (
      'genesis.generate',
      'portrait.generate',
      'genesis.mint',
      'chapter.generate',
      'chapter.image',
      'chapter.mint'
    )
  );
