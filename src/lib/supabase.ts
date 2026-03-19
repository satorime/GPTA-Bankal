import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ── Data client (service role) ─────────────────────────────────
// Used for all CRUD operations. Bypasses RLS — keep this private.
let adminClient: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  if (!url || (!serviceRoleKey && !anonKey)) {
    throw new Error(
      "Supabase environment variables are missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY in your .env file."
    );
  }

  adminClient = createClient(url, serviceRoleKey ?? anonKey, {
    auth: { persistSession: false },
  });

  return adminClient;
}

// ── Auth client (anon key) ─────────────────────────────────────
// Used exclusively for sign-in / sign-out / session management.
// Session is persisted to localStorage so admins stay logged in
// between app restarts.
let authClient: SupabaseClient | null = null;

export function getAuthClient(): SupabaseClient {
  if (authClient) return authClient;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase environment variables are missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
    );
  }

  authClient = createClient(url, anonKey, {
    auth: { persistSession: true },
  });

  return authClient;
}
