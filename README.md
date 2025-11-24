## StudentPay Tracker

Full-stack application for managing student payment requirements and collections. Built with Next.js App Router, Tailwind CSS, Supabase (Postgres + Auth), and React Query.

### App Modes

This repo now powers **two separate deployments** that share the same Supabase backend:

| Mode      | Env value                            | Routes available            | Notes                                                                 |
|-----------|--------------------------------------|-----------------------------|-----------------------------------------------------------------------|
| Student   | `NEXT_PUBLIC_APP_INSTANCE=student`   | `/student` + API endpoints  | `/admin` is blocked via proxy. Use the **same Supabase keys** as admin. |
| Admin     | `NEXT_PUBLIC_APP_INSTANCE=admin`     | `/admin` + API endpoints    | `/student` is blocked via proxy. Use the **same Supabase keys** so both portals read/write the same DB. |

- Deploy the repo twice (e.g., `student.paytracker.com` and `admin.paytracker.com`) with different `NEXT_PUBLIC_APP_INSTANCE` values but identical Supabase credentials to ensure both apps interact with the same database.
- The root path (`/`) now auto-redirects to the only portal available in that deployment (student or admin). The old marketing landing page has been removed.

### Features

- Student portal to view balance, payment breakdown, and payment history.
- Admin dashboard with cards, filters, charts, and CRUD management for students, payment requirements, and payments.
- Status filters for fully paid vs lacking students plus a balances chart.
- Shared Supabase schema, migrations, and REST API routes.

### Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   - Duplicate `env.example` → `.env.local`
   - Fill the values from your Supabase project:
     ```
     NEXT_PUBLIC_SUPABASE_URL=...
     NEXT_PUBLIC_SUPABASE_ANON_KEY=...
     SUPABASE_SERVICE_ROLE_KEY=...
     ```
   - Optionally set `NEXT_PUBLIC_DEMO_STUDENT_CODE` for the student portal default.
   - Set `NEXT_PUBLIC_APP_INSTANCE=student` **or** `NEXT_PUBLIC_APP_INSTANCE=admin` depending on which portal you are running.

3. **Provision Supabase**
   ```bash
   supabase db push --file supabase/migrations/0001_init.sql
   ```
   This creates tables (`students`, `payment_requirements`, `student_payments`), RLS policies, and the `student_payment_status` view.

4. **Run the dev server**
   ```bash
   # Student portal
   npm run dev:student

   # Admin portal
   npm run dev:admin
   ```
   The root path automatically redirects to the appropriate dashboard.

### API surface

All routes live under `/app/api` and rely on the Supabase service-role key.

| Route | Methods | Description |
| --- | --- | --- |
| `/api/students` | GET, POST | List/create students |
| `/api/students/[id]` | PATCH, DELETE | Update/delete a student |
| `/api/requirements` | GET, POST | Manage payment requirements |
| `/api/requirements/[id]` | PATCH, DELETE | Update/delete requirements |
| `/api/payments` | GET, POST | List payments (optional `studentId` filter) or create |
| `/api/payments/[id]` | PATCH, DELETE | Update/delete payment entries |
| `/api/status` | GET | Student status lookup by `studentCode` |
| `/api/status/all` | GET | Admin status feed with `filter=fully_paid|lacking` |
| `/api/dashboard` | GET | Summary metrics for cards |

### Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 + custom UI primitives
- React Query, React Hook Form, Zod
- Supabase (Postgres, RLS, migrations)
- Recharts for the balances snapshot

### Deployment

1. Deploy the repo twice (student + admin) or set up two environments in your host.
2. Create a Supabase project and run the migration.
3. Configure environment variables for each deployment (notably `NEXT_PUBLIC_APP_INSTANCE`).
4. Use `npm run build:student` / `npm run build:admin` for the respective deployments, then `npm run start` or `npm run start:admin`.

The service-role key must remain server-side only; never expose it to the client.
