import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import StudentPage from "./pages/StudentPage";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import { getAdminClient, getAuthClient } from "./lib/supabase";

const instance = import.meta.env.VITE_APP_INSTANCE;

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // undefined = still checking; null = no session; Session = logged in

  // Keep Supabase active — free-tier projects pause after 7 days of inactivity.
  // This lightweight ping runs every 4 hours while the app is open.
  useEffect(() => {
    const ping = () => {
      try {
        getAdminClient()
          .from("students")
          .select("id", { count: "exact", head: true })
          .then(() => {/* no-op */});
      } catch {
        // silently ignore — this is a best-effort keep-alive
      }
    };
    ping();
    const id = setInterval(ping, 4 * 60 * 60 * 1000); // every 4 hours
    return () => clearInterval(id);
  }, []);

  // Auth session management — admin portal only
  useEffect(() => {
    if (instance !== "admin") return;

    const auth = getAuthClient();

    // Restore existing session on startup
    auth.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    // Listen for sign-in / sign-out events
    const { data: { subscription } } = auth.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Student portal — no auth required
  if (instance !== "admin") return <StudentPage />;

  // Admin portal — auth required
  if (session === undefined) {
    // Still loading session from storage — show a brief blank screen (< 300ms)
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[var(--muted)] animate-pulse">Loading…</p>
      </main>
    );
  }

  if (!session) return <LoginPage />;

  return <AdminPage session={session} />;
}
