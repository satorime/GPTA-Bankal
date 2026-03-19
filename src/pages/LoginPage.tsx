import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getAuthClient } from "@/lib/supabase";

type FormValues = { email: string; password: string };

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 30_000; // 30 seconds

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [attempts,     setAttempts]     = useState(0);
  const [lockedUntil,  setLockedUntil]  = useState(0);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();

  // Tick every second while locked so the button re-enables automatically
  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => {
      if (Date.now() >= lockedUntil) {
        setLockedUntil(0);
        setErrorMsg(null);
        clearInterval(id);
      } else {
        const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
        setErrorMsg(`Too many failed attempts. Please wait ${secs}s before trying again.`);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const onSubmit = async (values: FormValues) => {
    // Lockout check
    const now = Date.now();
    if (now < lockedUntil) {
      const secs = Math.ceil((lockedUntil - now) / 1000);
      setErrorMsg(`Too many failed attempts. Please wait ${secs}s before trying again.`);
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      const { error } = await getAuthClient().auth.signInWithPassword({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });
      if (error) {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        if (nextAttempts >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_MS);
          setAttempts(0);
          setErrorMsg(`Too many failed attempts. Please wait 30 seconds before trying again.`);
        } else {
          setErrorMsg(
            error.message === "Invalid login credentials"
              ? `Incorrect email or password. ${MAX_ATTEMPTS - nextAttempts} attempt${MAX_ATTEMPTS - nextAttempts !== 1 ? "s" : ""} remaining.`
              : error.message
          );
        }
      } else {
        setAttempts(0);
        // On success, onAuthStateChange in App.tsx will update the session automatically.
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm flex flex-col gap-8">

        {/* Header */}
        <div className="nm-card flex flex-col items-center gap-4 p-8 text-center">
          <div className="nm-inset-deep flex h-20 w-20 items-center justify-center rounded-full">
            <img
              src="./bankal-logo.png"
              width={64}
              height={64}
              alt="Bankal National High School"
              className="object-contain"
              style={{ mixBlendMode: "multiply" }}
            />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand-green)]"
               style={{ fontFamily: "'Plus Jakarta Sans', system-ui" }}>
              Admin Portal
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--brand-green-dark)]"
                style={{ fontFamily: "'Plus Jakarta Sans', system-ui" }}>
              StudentPay Tracker
            </h1>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Bankal National High School
            </p>
          </div>
        </div>

        {/* Login form */}
        <div className="nm-card p-6">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Email
              </label>
              <Input
                type="email"
                placeholder="you@school.edu.ph"
                autoComplete="email"
                {...register("email", { required: "Email is required" })}
              />
              {errors.email && (
                <p className="text-xs text-rose-600">{errors.email.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-12"
                  {...register("password", { required: "Password is required" })}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--brand-green)] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />
                  }
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-rose-600">{errors.password.message}</p>
              )}
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div className="rounded-xl border-l-4 border-rose-400 bg-rose-50 px-4 py-3">
                <p className="text-xs text-rose-700">{errorMsg}</p>
              </div>
            )}

            <Button type="submit" loading={loading} disabled={Date.now() < lockedUntil} className="mt-1 w-full gap-2">
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--muted)]">
          Only authorized school staff may sign in.
          <br />
          Contact your administrator to request access.
        </p>
      </div>
    </main>
  );
}
