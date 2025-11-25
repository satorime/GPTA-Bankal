"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Search, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import type { StudentStatusDetail } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type FormValues = {
  code: string;
};

export default function StudentPage() {
  const demoCode = process.env.NEXT_PUBLIC_DEMO_STUDENT_CODE ?? "";
  const [studentCode, setStudentCode] = useState(demoCode);
  const form = useForm<FormValues>({
    defaultValues: { code: demoCode },
  });

  const { data, isFetching, isError, error } = useQuery<StudentStatusDetail>({
    queryKey: ["student-status", studentCode],
    queryFn: async () => {
      return api.getStudentStatus(studentCode);
    },
    enabled: Boolean(studentCode),
  });

  const statusVariant = useMemo(() => {
    switch (data?.paymentStatus) {
      case "fully_paid":
        return { label: "Fully Paid", variant: "success" as const };
      case "partial":
        return { label: "Partial", variant: "warning" as const };
      case "unpaid":
        return { label: "Unpaid", variant: "danger" as const };
      default:
        return { label: "No Requirements", variant: "info" as const };
    }
  }, [data?.paymentStatus]);

  const onSubmit = (values: FormValues) => {
    setStudentCode(values.code.trim().toUpperCase());
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <section className="relative overflow-hidden rounded-3xl border border-lime-200 bg-gradient-to-br from-lime-50 via-white to-emerald-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--brand-green)]">
              Student Portal
            </p>
            <h1 className="text-3xl font-semibold text-[var(--brand-green-dark)]">
              Bankal National High School
            </h1>
            <p className="text-slate-700">
              Enter your LRN to keep tabs on GPTA requirements, balances, and your most recent
              payments.
            </p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-white/60 blur-2xl" />
            <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border border-white/60 bg-white/80 shadow-lg">
              <Image
                src="/bankal-logo.png"
                alt="Bankal National High School"
                width={96}
                height={96}
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row"
      >
        <Input
          placeholder="Enter your LRN ex: 1199123456"
          {...form.register("code", { required: true })}
          className="uppercase"
        />
        <Button type="submit" className="inline-flex items-center gap-2">
          <Search className="h-4 w-4" /> Lookup
        </Button>
      </form>

      {isError && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="py-6 text-sm text-rose-700">
            {error instanceof Error ? error.message : "Unable to load student record."}
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <Card className="border border-lime-200 bg-white/90">
            <CardHeader>
              <CardDescription>Student</CardDescription>
              <CardTitle className="text-[var(--brand-green-dark)]">
                {data.studentName}
              </CardTitle>
              <p className="text-sm text-slate-500">
                Grade {data.gradeLevel ?? "N/A"} · {data.studentCode}
              </p>
            </CardHeader>
          </Card>

          <section className="grid gap-5 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Total Required</CardDescription>
                <CardTitle>{formatCurrency(data.totalRequired)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Total Paid</CardDescription>
                <CardTitle>{formatCurrency(data.totalPaid)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardDescription>Balance</CardDescription>
                  <CardTitle>{formatCurrency(data.balance)}</CardTitle>
                </div>
                <Badge variant={statusVariant.variant}>{statusVariant.label}</Badge>
              </CardHeader>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Requirement Breakdown</CardTitle>
                  <CardDescription>Track what is left per requirement</CardDescription>
                </div>
                <Wallet className="h-5 w-5 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm text-slate-700">
                  <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="pb-2">Requirement</th>
                      <th className="pb-2 text-right">Required</th>
                      <th className="pb-2 text-right">Paid</th>
                      <th className="pb-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.breakdown.map((item) => {
                      const balance = item.amountRequired - item.amountPaid;
                      return (
                        <tr key={`${item.requirementId}-${item.label}`}>
                          <td className="py-2 font-medium">{item.label}</td>
                          <td className="py-2 text-right">{formatCurrency(item.amountRequired)}</td>
                          <td className="py-2 text-right">{formatCurrency(item.amountPaid)}</td>
                          <td className="py-2 text-right">{formatCurrency(Math.max(balance, 0))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Latest recorded payments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.payments.length === 0 && (
                  <p className="text-sm text-slate-500">No payments logged yet.</p>
                )}
                {data.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {formatCurrency(payment.amountPaid)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {payment.method ?? "Unspecified"} · {formatDate(payment.paidOn)}
                      </p>
                    </div>
                    {payment.remarks && (
                      <span className="text-xs text-slate-500">{payment.remarks}</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </>
      )}

      {!data && !isFetching && !isError && (
        <p className="text-sm text-slate-500">
          Provide LRN to see your personalized dashboard.
        </p>
      )}
    </main>
  );
}

