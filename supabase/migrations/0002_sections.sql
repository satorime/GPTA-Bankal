-- Sections: grouping students by class/section
create table if not exists public.sections (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  grade_level text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_sections_updated_at
  before update on public.sections
  for each row execute procedure public.set_updated_at();

-- Add section FK to students (nullable — students can be ungrouped)
alter table public.students
  add column if not exists section_id uuid references public.sections(id) on delete set null;

-- RLS
alter table public.sections enable row level security;

create policy "Allow read for authenticated"
  on public.sections for select
  using (auth.role() = 'authenticated');

create policy "Allow service role full access on sections"
  on public.sections
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
