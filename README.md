# StudentPay Tracker

Desktop application for managing student payment requirements and collections at **Bankal National High School**.

Built with Electron, Vite, React, TypeScript, Tailwind CSS, and Supabase.

---

## Architecture

This is a **native desktop application** — no web server, no API routes. The React frontend calls Supabase directly. Two separate `.exe` installers are produced from one codebase.

```
Electron (desktop shell)
  └── Vite + React (UI, bundled to static files)
        └── Supabase JS SDK (direct database access)
```

---

## App Modes

| Mode    | Build command               | Output              | Who uses it                                                |
| ------- | --------------------------- | ------------------- | ---------------------------------------------------------- |
| Student | `npm run build:exe:student` | `dist-exe/student/` | Students — look up their own balance & payment history     |
| Admin   | `npm run build:exe:admin`   | `dist-exe/admin/`   | Staff — full CRUD for students, requirements, and payments |

Both modes share the same Supabase database.

---

## Features

**Student portal**

- Look up payment status by student code
- View balance, total required, and total paid
- Requirement breakdown per fee type
- Full payment history

**Admin portal**

- Login screen — email + password authentication (staff only)
- Dashboard cards: total required fees, collected, outstanding, student counts
- Balances snapshot bar chart with status filters
- Full CRUD management for students, payment requirements, and payment records

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `env.example` to `.env` and fill in your Supabase credentials:

```bash
cp env.example .env
```

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: pre-fill the student code field on launch
VITE_DEMO_STUDENT_CODE=STU-0001
```

> **Note:** The `VITE_APP_INSTANCE` variable is set automatically by the build scripts. Do not set it manually.

### 3. Create admin accounts

Admin accounts are managed through Supabase Authentication — no separate user table needed.

1. Go to your [Supabase project dashboard](https://supabase.com/dashboard)
2. Navigate to **Authentication → Users**
3. Click **Invite user**
4. Enter the email address of the teacher, cashier, or office staff
5. They will receive an invite email with a link to set their own password

> To remove access, go to **Authentication → Users** and delete their account.

#### Changing passwords

Staff can change their own password at any time from inside the Admin portal — no need to contact Supabase:

1. Open the Admin app and sign in
2. Click the **Change Password** button in the top-right corner of the header
3. Enter a new password (minimum 8 characters) and confirm it
4. Click **Update Password**

This is the recommended flow when the admin assigns a temporary password: the staff member logs in with the temporary password and immediately changes it to one only they know.

### 5. Provision the database

Run the migration against your Supabase project:

```bash
supabase db push --file supabase/migrations/0001_init.sql
```

This creates the `students`, `payment_requirements`, and `student_payments` tables, RLS policies, and the `student_payment_status` view.

---

## Deploying to Render

Both portals can be deployed as separate static sites on [Render](https://render.com) (free tier) from the same repository.

### Prerequisites

1. Push this repository to GitHub (or GitLab)
2. Make sure your `.env` values are ready — you will enter them as environment variables in Render, **not** in the repo

### Steps

1. Go to [render.com](https://render.com) and sign in
2. Click **New → Blueprint** and connect your GitHub repository
3. Render will detect the `render.yaml` file and propose two services:
   - `bankal-student` — the Student Portal
   - `bankal-admin` — the Admin Portal
4. Click **Apply** — Render will ask you to fill in the secret environment variables before deploying

### Environment variables to set (for each service)

| Variable                         | Where to find it                                     |
| -------------------------------- | ---------------------------------------------------- |
| `VITE_SUPABASE_URL`              | Supabase → Project Settings → API → Project URL      |
| `VITE_SUPABASE_ANON_KEY`         | Supabase → Project Settings → API → anon public key  |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key |

> `VITE_DEMO_STUDENT_CODE` is optional — leave it blank or set it to a default student code to pre-fill the search field on the Student Portal.

### Deploying manually (without Blueprint)

If you prefer to create each site manually:

**Student Portal**

- Build Command: `npm run build:student`
- Publish Directory: `dist`

**Admin Portal**

- Build Command: `npm run build:admin`
- Publish Directory: `dist`

Set the same three environment variables above for each service.
