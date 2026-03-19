import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Search, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchStudentStatusByCode } from "@/lib/db";
import type { StudentStatusDetail } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type FormValues = { code: string };

const LOOKUP_COOLDOWN_MS = 2000; // 2 seconds between lookups

export default function StudentPage() {
  const [studentCode, setStudentCode]   = useState("");
  const [lastLookup,  setLastLookup]    = useState(0);
  const [cooldownMsg, setCooldownMsg]   = useState<string | null>(null);
  const form = useForm<FormValues>({ defaultValues: { code: "" } });

  const { data, isFetching, isError, error } = useQuery<StudentStatusDetail>({
    queryKey: ["student-status", studentCode],
    queryFn: () => fetchStudentStatusByCode(studentCode),
    enabled: Boolean(studentCode),
  });

  const statusVariant = useMemo(() => {
    switch (data?.paymentStatus) {
      case "fully_paid": return { label: "Fully Paid",       variant: "success" as const };
      case "partial":    return { label: "Partial",          variant: "warning" as const };
      case "unpaid":     return { label: "Unpaid",           variant: "danger"  as const };
      default:           return { label: "No Requirements",  variant: "info"    as const };
    }
  }, [data?.paymentStatus]);

  const onSubmit = (values: FormValues) => {
    const code = values.code.trim().toUpperCase();
    if (!code) return;
    const now = Date.now();
    if (now - lastLookup < LOOKUP_COOLDOWN_MS) {
      setCooldownMsg("Please wait a moment before searching again.");
      setTimeout(() => setCooldownMsg(null), LOOKUP_COOLDOWN_MS);
      return;
    }
    setLastLookup(now);
    setCooldownMsg(null);
    setStudentCode(code);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">

      {/* Header */}
      <header className="nm-card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-5">
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
            <p className="text-sm font-bold uppercase tracking-widest text-[var(--brand-green)]"
               style={{ fontFamily: "'Plus Jakarta Sans', system-ui" }}>
              Student Portal
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--brand-green-dark)]"
                style={{ fontFamily: "'Plus Jakarta Sans', system-ui" }}>
              StudentPay Tracker
            </h1>
          </div>
        </div>
        <p className="text-sm text-[var(--muted)]">
          Enter your LRN (Learner Reference Number) to view your balance, requirement breakdown, and payment history.
        </p>
      </header>

      {/* Search form */}
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="nm-card flex flex-col gap-3 p-4 sm:flex-row"
      >
        <Input
          placeholder="Enter your LRN"
          {...form.register("code", { required: true })}
          className="uppercase"
          onInput={(e) => {
            const el = e.currentTarget;
            const pos = el.selectionStart;
            el.value = el.value.toUpperCase();
            el.setSelectionRange(pos, pos);
          }}
        />
        <Button type="submit" disabled={Date.now() - lastLookup < LOOKUP_COOLDOWN_MS} className="inline-flex items-center gap-2 whitespace-nowrap">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </form>

      {/* Loading */}
      {isFetching && (
        <p className="text-sm text-[var(--muted)] animate-pulse">Loading…</p>
      )}

      {/* Cooldown message */}
      {cooldownMsg && (
        <div className="nm-card border-l-4 border-amber-400 p-5">
          <p className="text-sm text-amber-700">{cooldownMsg}</p>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="nm-card border-l-4 border-rose-400 p-5">
          <p className="text-sm text-rose-700">
            {error instanceof Error ? error.message : "Unable to load student record."}
          </p>
        </div>
      )}

      {/* Student result */}
      {data && (
        <>
          {/* Identity card */}
          <Card className="nm-card-static">
            <CardHeader>
              <CardDescription>Student</CardDescription>
              <CardTitle className="text-xl text-[var(--brand-green-dark)]">
                {data.studentName}
              </CardTitle>
              <p className="text-sm text-[var(--muted)]">
                Grade {data.gradeLevel ?? "N/A"} · {data.studentCode}
              </p>
            </CardHeader>
          </Card>

          {/* Summary metrics */}
          <section className="grid gap-5 md:grid-cols-3">
            <Card className="nm-card-static">
              <CardHeader>
                <CardDescription>Total Required</CardDescription>
                <CardTitle className="text-2xl text-[var(--foreground)]">
                  {formatCurrency(data.totalRequired)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="nm-card-static">
              <CardHeader>
                <CardDescription>Total Paid</CardDescription>
                <CardTitle className="text-2xl text-[var(--brand-green)]">
                  {formatCurrency(data.totalPaid)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="nm-card-static">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardDescription>Balance</CardDescription>
                  <CardTitle className="text-2xl text-[var(--foreground)]">
                    {formatCurrency(data.balance)}
                  </CardTitle>
                </div>
                <Badge variant={statusVariant.variant}>{statusVariant.label}</Badge>
              </CardHeader>
            </Card>
          </section>

          {/* Breakdown + History */}
          <section className="grid gap-6 lg:grid-cols-2">

            {/* Requirement breakdown */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Requirement Breakdown</CardTitle>
                  <CardDescription>Track what is left per requirement</CardDescription>
                </div>
                <div className="nm-inset-deep flex h-10 w-10 items-center justify-center rounded-xl">
                  <Wallet className="h-5 w-5 text-[var(--brand-green)]" />
                </div>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm text-[var(--foreground)]">
                  <thead className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                    <tr>
                      <th className="pb-3">Requirement</th>
                      <th className="pb-3 text-right">Required</th>
                      <th className="pb-3 text-right">Paid</th>
                      <th className="pb-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.breakdown.map((item) => {
                      const balance = item.amountRequired - item.amountPaid;
                      return (
                        <tr key={`${item.requirementId}-${item.label}`}
                            className="border-t border-[rgba(90,175,34,0.1)]">
                          <td className="py-2.5 font-medium">{item.label}</td>
                          <td className="py-2.5 text-right">{formatCurrency(item.amountRequired)}</td>
                          <td className="py-2.5 text-right text-[var(--brand-green)]">{formatCurrency(item.amountPaid)}</td>
                          <td className="py-2.5 text-right font-semibold">{formatCurrency(Math.max(balance, 0))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Payment history */}
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Latest recorded payments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-72 overflow-y-auto scroll-hidden">
                {data.payments.length === 0 && (
                  <p className="text-sm text-[var(--muted)]">No payments logged yet.</p>
                )}
                {data.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="nm-pill flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {formatCurrency(payment.amountPaid)}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {payment.method ?? "Unspecified"} · {formatDate(payment.paidOn)}
                      </p>
                    </div>
                    {payment.remarks && (
                      <span className="text-xs text-[var(--muted)] text-right max-w-[40%]">
                        {payment.remarks}
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

          </section>
        </>
      )}

      {/* Empty state */}
      {!data && !isFetching && !isError && (
        <p className="text-sm text-[var(--muted)]">
          Provide your LRN to see your personalized dashboard.
        </p>
      )}
    </main>
  );
}
