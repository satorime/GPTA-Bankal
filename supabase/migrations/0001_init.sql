create extension if not exists "pgcrypto";

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_code text not null unique,
  first_name text not null,
  last_name text not null,
  grade_level text,
  guardian_contact text,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_requirements (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text,
  amount numeric(12,2) not null check (amount >= 0),
  due_date date,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  requirement_id uuid references public.payment_requirements (id) on delete set null,
  amount_paid numeric(12,2) not null check (amount_paid >= 0),
  paid_on date not null default now(),
  method text,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_students_updated_at
  before update on public.students
  for each row execute procedure public.set_updated_at();

create trigger trg_requirements_updated_at
  before update on public.payment_requirements
  for each row execute procedure public.set_updated_at();

create trigger trg_payments_updated_at
  before update on public.student_payments
  for each row execute procedure public.set_updated_at();

create view public.student_payment_status as
with total_required as (
  select coalesce(sum(amount), 0) as total from public.payment_requirements
),
student_paid as (
  select student_id, coalesce(sum(amount_paid), 0) as paid
  from public.student_payments
  group by student_id
)
select
  s.id,
  s.student_code,
  s.first_name,
  s.last_name,
  s.grade_level,
  s.status,
  tr.total as total_required,
  coalesce(sp.paid, 0) as total_paid,
  greatest(coalesce(tr.total, 0) - coalesce(sp.paid, 0), 0) as balance,
  case
    when coalesce(tr.total, 0) = 0 then 'no_requirements'
    when coalesce(sp.paid, 0) >= coalesce(tr.total, 0) then 'fully_paid'
    when coalesce(sp.paid, 0) = 0 then 'unpaid'
    else 'partial'
  end as payment_status
from public.students s
cross join total_required tr
left join student_paid sp on sp.student_id = s.id;

alter table public.students enable row level security;
alter table public.payment_requirements enable row level security;
alter table public.student_payments enable row level security;

create policy "Allow read for authenticated"
  on public.students
  for select
  using (auth.role() = 'authenticated');

create policy "Allow read for authenticated"
  on public.payment_requirements
  for select
  using (auth.role() = 'authenticated');

create policy "Allow read for authenticated"
  on public.student_payments
  for select
  using (auth.role() = 'authenticated');

create policy "Allow service role full access on students"
  on public.students
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Allow service role full access on requirements"
  on public.payment_requirements
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Allow service role full access on payments"
  on public.student_payments
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

