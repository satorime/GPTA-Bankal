-- Enable real-time for all tables to support automatic backup sync
alter publication supabase_realtime add table public.students;
alter publication supabase_realtime add table public.payment_requirements;
alter publication supabase_realtime add table public.student_payments;

