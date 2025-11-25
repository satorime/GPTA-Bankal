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

### Desktop (Tauri) Shell

If you want a desktop experience without deploying to a domain, wrap the app with Tauri:

Prerequisites (Windows):
- Rust toolchain (`winget install Rustlang.Rustup`, then `rustup default stable`).
- Visual Studio Build Tools with “Desktop development with C++” + Windows 10 SDK.
- Download the portable Node runtime (`node-v20.11.1-win-x64.zip`) and extract it into `src-tauri/resources/node` so the installer can ship its own Node.js binary.[^node]

Commands:
```bash
# Student desktop shell (starts Next locally and opens a native window)
npm run desktop:student

# Admin desktop shell
npm run desktop:admin
```

These commands launch the corresponding Next.js dev server and open a Tauri window pointed at it, so every machine can run the app locally while still talking to the shared Supabase database. (Packaging installers via `npm run desktop:student:build` / `desktop:admin:build` is possible but still experimental—the local Next server must be running for the UI to load.)

#### Self-contained installers (no localhost dependency)

The build scripts now bundle the production Next.js standalone output **and** the Node runtime inside Tauri. To produce installers that run with zero external commands:

```bash
# Build standalone student installer (.msi / .exe in src-tauri/target/release/bundle)
npm run desktop:student:build

# Build standalone admin installer
npm run desktop:admin:build
```

During packaging, the scripts copy `.next/standalone`, `.next/static`, and `public/` into `src-tauri/resources/app/<portal>` and Tauri spawns the bundled Node server automatically on port `1420`. Launching the installed desktop app now “just works” on any PC with internet access—no local `npm run dev` needed—while still hitting the same Supabase cloud database.

[^node]: Node.js v20.11.1 portable zip download: https://nodejs.org/dist/v20.11.1/node-v20.11.1-win-x64.zip

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
| `/api/students/bulk` | POST | Accepts an Excel file (LRN, First Name, Last Name, Grade Level) and bulk-creates students |
| `/api/summary/export` | GET | Streams an Excel summary of all students with totals/ balances |

#### Bulk student template

Bulk uploads expect an `.xlsx` sheet with columns named **LRN**, **First Name**, **Last Name**, and **Grade Level** (order does not matter). All imported students are automatically marked **active**. Any validation errors (missing LRN, duplicate codes, etc.) are surfaced in the admin UI so you can fix the row and retry.

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

### Desktop (Tauri) installers

You can also distribute the portals as native Windows apps that embed their own Node.js runtime and standalone Next.js build—no local server or browser required. Each installer still talks to the same Supabase cloud database.

1. **Prerequisites (once per machine)**
   - Rust toolchain: `winget install --id Rustlang.Rustup` → `rustup default stable`.
   - Visual Studio 2022 Build Tools with the “Desktop development with C++” workload and Windows 10 SDK.
2. **Provide runtime env files**  
   Create `.env.desktop.student` / `.env.desktop.admin` (or `.env.desktop`, or fall back to `.env.local`) with all Supabase keys/secrets you want baked into the installer.
3. **Build installers**
   ```bash
   npm run desktop:student:build   # outputs MSI/EXE in src-tauri/target/release/bundle
   npm run desktop:admin:build
   ```
   Each command runs `next build`, bundles the standalone output plus your current Node runtime, and packages a Tauri executable that auto-starts the server on `http://127.0.0.1:1420`.
4. **Run locally or develop**
   ```bash
   npm run desktop:student   # dev shell (uses next dev)
   npm run desktop:admin
   ```

After installation, double-clicking the generated app launches the embedded Node server and UI automatically—no IDE, terminal, or localhost setup is required (other than internet access to reach Supabase).
