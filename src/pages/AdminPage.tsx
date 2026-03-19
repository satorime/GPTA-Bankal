import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AlertTriangle, Edit, KeyRound, Layers3, LogOut, Plus, RefreshCcw, Trash2, Upload, Users, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchStudents, createStudent, updateStudent, deleteStudent, bulkCreateStudents,
  fetchRequirements, createRequirement, updateRequirement, deleteRequirement,
  fetchPayments, createPayment, updatePayment, deletePayment,
  fetchStatusCollection, fetchDashboardMetrics,
} from "@/lib/db";
import type {
  DashboardMetrics, PaymentRequirement, Student, StudentPayment, StudentStatus,
} from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getAuthClient } from "@/lib/supabase";
import BulkImportModal from "@/components/BulkImportModal";
import type { ImportResult } from "@/components/BulkImportModal";

type StudentFormValues = {
  studentCode: string; firstName: string; lastName: string;
  gradeLevel?: string | null; guardianContact?: string | null;
  status: "active" | "inactive"; notes?: string | null;
};
type RequirementFormValues = {
  label: string; description?: string | null;
  amount: number; dueDate?: string | null; isRequired: boolean;
};
type PaymentFormValues = {
  studentId: string; requirementId?: string | null;
  amountPaid: number; paidOn?: string | null;
  method?: string | null; remarks?: string | null;
};

type PendingDelete = {
  type: "student" | "requirement" | "payment";
  id: string;
  label: string;
};

type PasswordFormValues = { newPassword: string; confirmPassword: string };

const today = () => {
  const d = new Date();
  // Use local year/month/day, not UTC (toISOString returns UTC which can be off by one day).
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const studentDefaults: StudentFormValues = {
  studentCode: "", firstName: "", lastName: "",
  gradeLevel: "", guardianContact: "", status: "active", notes: "",
};
const requirementDefaults: RequirementFormValues = {
  label: "", description: "", amount: 0, dueDate: "", isRequired: true,
};
const getPaymentDefaults = (): PaymentFormValues => ({
  studentId: "", requirementId: "", amountPaid: 0,
  paidOn: today(), method: "", remarks: "",
});

const GRADE_LEVELS = ["7", "8", "9", "10", "11", "12"];
const PAYMENT_METHODS = ["Cash", "GCash", "Bank Transfer", "Cheque", "Other"];

/** Small helper: renders a required-field error message */
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-rose-600 mt-0.5">{message}</p>;
}

/** Labelled field wrapper */
function Field({ label, children, error }: {
  label: string; children: React.ReactNode; error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

export default function AdminPage({ session }: { session: Session }) {
  const [statusFilter, setStatusFilter] = useState<"all" | "fully_paid" | "lacking">("all");
  const [activeTab, setActiveTab] = useState<"students" | "requirements" | "payments">("students");
  const [message, setMessage]           = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [showChangePw,   setShowChangePw]   = useState(false);
  const [pwLoading,      setPwLoading]      = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const listRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const queryClient = useQueryClient();

  const pwForm = useForm<PasswordFormValues>({ defaultValues: { newPassword: "", confirmPassword: "" } });

  const studentForm     = useForm<StudentFormValues>({ defaultValues: studentDefaults });
  const requirementForm = useForm<RequirementFormValues>({ defaultValues: requirementDefaults });
  const paymentForm     = useForm<PaymentFormValues>({ defaultValues: getPaymentDefaults() });

  const [editingStudent,     setEditingStudent]     = useState<Student | null>(null);
  const [editingRequirement, setEditingRequirement] = useState<PaymentRequirement | null>(null);
  const [editingPayment,     setEditingPayment]     = useState<StudentPayment | null>(null);

  // Student combobox for Log Payment
  const [studentSearch,      setStudentSearch]      = useState("");
  const [showStudentList,    setShowStudentList]    = useState(false);
  const studentComboRef = useRef<HTMLDivElement>(null);

  // Payment log filter combobox
  const [paymentFilterId,    setPaymentFilterId]    = useState("");
  const [filterSearch,       setFilterSearch]       = useState("");
  const [showFilterList,     setShowFilterList]     = useState(false);
  const filterComboRef = useRef<HTMLDivElement>(null);

  const studentsQuery     = useQuery<Student[]>({ queryKey: ["students"],      queryFn: () => fetchStudents() });
  const requirementsQuery = useQuery<PaymentRequirement[]>({ queryKey: ["requirements"], queryFn: () => fetchRequirements() });
  const paymentsQuery     = useQuery<StudentPayment[]>({ queryKey: ["payments"],    queryFn: () => fetchPayments() });
  const dashboardQuery    = useQuery<DashboardMetrics>({ queryKey: ["dashboard"],   queryFn: () => fetchDashboardMetrics() });
  // Filtered list for the Status List card (respects the filter buttons)
  const statusesQuery     = useQuery<StudentStatus[]>({
    queryKey: ["statuses", statusFilter],
    queryFn: () => fetchStatusCollection(statusFilter === "all" ? undefined : statusFilter),
  });
  // Unfiltered, always-all for the chart — chart shows top balances across everyone
  const allStatusesQuery  = useQuery<StudentStatus[]>({
    queryKey: ["statuses-all"],
    queryFn: () => fetchStatusCollection(),
  });

  // Map student id → display name for payment log
  // Uses allStatusesQuery (view, no RLS) so it works even when studentsQuery is blocked.
  const studentMap = useMemo(() => {
    const map = new Map<string, string>();
    (allStatusesQuery.data ?? []).forEach((s) => {
      map.set(s.studentId, `${s.studentName} (${s.studentCode})`);
    });
    return map;
  }, [allStatusesQuery.data]);

  // Filtered students for the searchable combobox — same source
  const filteredStudents = useMemo(() => {
    const q = studentSearch.toLowerCase();
    return (allStatusesQuery.data ?? []).filter(s =>
      s.studentName.toLowerCase().includes(q) ||
      s.studentCode.toLowerCase().includes(q)
    );
  }, [allStatusesQuery.data, studentSearch]);

  // Filtered list for the payment log filter combobox
  const filteredFilterStudents = useMemo(() => {
    const q = filterSearch.toLowerCase();
    return (allStatusesQuery.data ?? []).filter(s =>
      s.studentName.toLowerCase().includes(q) ||
      s.studentCode.toLowerCase().includes(q)
    );
  }, [allStatusesQuery.data, filterSearch]);

  // Close both combobox dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (studentComboRef.current && !studentComboRef.current.contains(e.target as Node))
        setShowStudentList(false);
      if (filterComboRef.current && !filterComboRef.current.contains(e.target as Node))
        setShowFilterList(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Show themed scrollbar while scrolling, hide 800 ms after idle
  useEffect(() => {
    const timers = new Map<EventTarget, ReturnType<typeof setTimeout>>();

    const makeHandler = (target: EventTarget, classTarget: Element) => () => {
      classTarget.classList.add("is-scrolling");
      const prev = timers.get(target);
      if (prev) clearTimeout(prev);
      timers.set(target, setTimeout(() => classTarget.classList.remove("is-scrolling"), 800));
    };

    // Page-level scrollbar
    const pageHandler = makeHandler(window, document.documentElement);
    window.addEventListener("scroll", pageHandler, { passive: true });

    // List card scrollbars
    const cleanups: Array<() => void> = [];
    listRefs.forEach((ref) => {
      const el = ref.current;
      if (!el) return;
      const h = makeHandler(el, el);
      el.addEventListener("scroll", h, { passive: true });
      cleanups.push(() => el.removeEventListener("scroll", h));
    });

    return () => {
      window.removeEventListener("scroll", pageHandler);
      cleanups.forEach(fn => fn());
      timers.forEach(clearTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss success after 3 s, error after 7 s
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(id);
  }, [message]);

  useEffect(() => {
    if (!errorMessage) return;
    const id = setTimeout(() => setErrorMessage(null), 7000);
    return () => clearTimeout(id);
  }, [errorMessage]);

  const invalidateCore = () => {
    queryClient.invalidateQueries({ queryKey: ["students"] });
    queryClient.invalidateQueries({ queryKey: ["requirements"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["statuses"] });
    queryClient.invalidateQueries({ queryKey: ["statuses-all"] });
  };

  const mutation = useMutation({
    mutationFn: async (action: () => Promise<unknown>) => action(),
    onSuccess: invalidateCore,
  });

  const setSuccess   = (t: string) => { setErrorMessage(null); setMessage(t); };
  const setErrorText = (t: string) => { setMessage(null); setErrorMessage(t); };

  // ── Change password ──────────────────────────────────────────────
  const handleChangePassword = pwForm.handleSubmit(async (values) => {
    setPwLoading(true);
    try {
      const { error } = await getAuthClient().auth.updateUser({ password: values.newPassword });
      if (error) throw new Error(error.message);
      setSuccess("Password updated successfully.");
      pwForm.reset();
      setShowChangePw(false);
    } catch (e) {
      setErrorText(e instanceof Error ? e.message : "Failed to update password.");
    } finally {
      setPwLoading(false);
    }
  });

  // ── Student form ────────────────────────────────────────────────
  const handleStudentSubmit = studentForm.handleSubmit(async (values) => {
    try {
      const payload = {
        ...values,
        studentCode: values.studentCode.toUpperCase(),
        gradeLevel: values.gradeLevel || null,
        guardianContact: values.guardianContact || null,
        notes: values.notes || null,
      };
      await mutation.mutateAsync(async () => {
        editingStudent ? await updateStudent(editingStudent.id, payload)
                       : await createStudent(payload);
      });
      setSuccess(editingStudent ? "Student updated." : "Student added.");
      setEditingStudent(null);
      studentForm.reset(studentDefaults);
    } catch (e) { setErrorText(e instanceof Error ? e.message : "Failed to save student."); }
  });

  // ── Requirement form ────────────────────────────────────────────
  const handleRequirementSubmit = requirementForm.handleSubmit(async (values) => {
    try {
      const payload = {
        ...values, amount: Number(values.amount),
        description: values.description || null,
        dueDate: values.dueDate || null,
        isRequired: Boolean(values.isRequired),
      };
      await mutation.mutateAsync(async () => {
        editingRequirement ? await updateRequirement(editingRequirement.id, payload)
                           : await createRequirement(payload);
      });
      setSuccess(editingRequirement ? "Requirement updated." : "Requirement added.");
      setEditingRequirement(null);
      requirementForm.reset(requirementDefaults);
    } catch (e) { setErrorText(e instanceof Error ? e.message : "Failed to save requirement."); }
  });

  // ── Payment form ────────────────────────────────────────────────
  const handlePaymentSubmit = paymentForm.handleSubmit(async (values) => {
    try {
      const payload = {
        ...values, amountPaid: Number(values.amountPaid),
        requirementId: values.requirementId || null,
        paidOn: values.paidOn || null,
        method: values.method || null,
        remarks: values.remarks || null,
      };
      await mutation.mutateAsync(async () => {
        editingPayment ? await updatePayment(editingPayment.id, payload)
                       : await createPayment(payload);
      });
      setSuccess(editingPayment ? "Payment updated." : "Payment recorded.");
      setEditingPayment(null);
      paymentForm.reset(getPaymentDefaults());
      setStudentSearch("");
    } catch (e) { setErrorText(e instanceof Error ? e.message : "Failed to save payment."); }
  });

  // ── Delete flow ─────────────────────────────────────────────────
  const requestDelete = (type: PendingDelete["type"], id: string, label: string) => {
    setPendingDelete({ type, id, label });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { type, id } = pendingDelete;
    setPendingDelete(null);
    try {
      await mutation.mutateAsync(async () => {
        if (type === "student")     await deleteStudent(id);
        if (type === "requirement") await deleteRequirement(id);
        if (type === "payment")     await deletePayment(id);
      });
      setSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted.`);
    } catch (e) { setErrorText(e instanceof Error ? e.message : "Failed to delete."); }
  };

  // ── Edit side-effects ────────────────────────────────────────────
  useEffect(() => {
    if (editingStudent) {
      studentForm.reset({
        studentCode: editingStudent.studentCode,
        firstName: editingStudent.firstName, lastName: editingStudent.lastName,
        gradeLevel: editingStudent.gradeLevel ?? "",
        guardianContact: editingStudent.guardianContact ?? "",
        status: editingStudent.status as "active" | "inactive",
        notes: editingStudent.notes ?? "",
      });
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editingStudent, studentForm]);

  useEffect(() => {
    if (editingRequirement) {
      requirementForm.reset({
        label: editingRequirement.label,
        description: editingRequirement.description ?? "",
        amount: editingRequirement.amount,
        dueDate: editingRequirement.dueDate ?? "",
        isRequired: editingRequirement.isRequired,
      });
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editingRequirement, requirementForm]);

  useEffect(() => {
    if (editingPayment) {
      paymentForm.reset({
        studentId: editingPayment.studentId,
        requirementId: editingPayment.requirementId ?? "",
        amountPaid: editingPayment.amountPaid,
        paidOn: editingPayment.paidOn ?? today(),
        method: editingPayment.method ?? "",
        remarks: editingPayment.remarks ?? "",
      });
      // Populate combobox display with the student name
      const name = allStatusesQuery.data?.find(s => s.studentId === editingPayment.studentId);
      setStudentSearch(name ? `${name.studentName} (${name.studentCode})` : "");
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editingPayment, paymentForm]);

  // Chart always shows top 8 by balance across ALL students — independent of the list filter
  const chartData = useMemo(() =>
    (allStatusesQuery.data ?? [])
      .slice()
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 8)
      .map((s) => ({ name: s.studentCode, balance: s.balance, paid: s.totalPaid })),
    [allStatusesQuery.data]);

  const renderStatusBadge = (status: StudentStatus["paymentStatus"]) => {
    switch (status) {
      case "fully_paid": return <Badge variant="success">Fully Paid</Badge>;
      case "partial":    return <Badge variant="warning">Partial</Badge>;
      case "unpaid":     return <Badge variant="danger">Unpaid</Badge>;
      default:           return <Badge>No Requirements</Badge>;
    }
  };

  const sErr = studentForm.formState.errors;
  const rErr = requirementForm.formState.errors;
  const pErr = paymentForm.formState.errors;

  const handleBulkImport = async (payloads: Parameters<typeof bulkCreateStudents>[0]): Promise<ImportResult> => {
    const result = await bulkCreateStudents(payloads);
    await queryClient.invalidateQueries({ queryKey: ["students"] });
    await queryClient.invalidateQueries({ queryKey: ["statuses"] });
    await queryClient.invalidateQueries({ queryKey: ["statuses-all"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    return result;
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">

      {/* Header */}
      <header className="nm-card flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="nm-inset-deep flex h-20 w-20 shrink-0 items-center justify-center rounded-full">
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
                Admin Dashboard
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-[var(--brand-green-dark)]"
                  style={{ fontFamily: "'Plus Jakarta Sans', system-ui" }}>
                StudentPay Tracker
              </h1>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <p className="text-xs text-[var(--muted)] text-right max-w-[180px] truncate">
              {session.user.email}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setShowChangePw((v) => !v); pwForm.reset(); }}
                className="gap-2 text-xs"
                title="Change your password"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Change Password
              </Button>
              <Button
                variant="outline"
                onClick={() => getAuthClient().auth.signOut()}
                className="gap-2 text-xs"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
        <p className="text-sm text-[var(--muted)]">
          Manage students, payment requirements, and payment records for Bankal National High School.
        </p>
      </header>

      {/* Change password panel */}
      {showChangePw && (
        <div className="nm-card p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--brand-green-dark)] mb-4"
              style={{ fontFamily: "'Plus Jakarta Sans', system-ui" }}>
            Change Password
          </h2>
          <form className="grid gap-4 sm:grid-cols-2 sm:items-end" onSubmit={handleChangePassword}>
            <Field label="New Password *" error={pwForm.formState.errors.newPassword?.message}>
              <Input
                type="password"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                {...pwForm.register("newPassword", {
                  required: "New password is required",
                  minLength: { value: 8, message: "Password must be at least 8 characters" },
                })}
              />
            </Field>
            <Field label="Confirm Password *" error={pwForm.formState.errors.confirmPassword?.message}>
              <Input
                type="password"
                placeholder="Re-enter new password"
                autoComplete="new-password"
                {...pwForm.register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (val) =>
                    val === pwForm.getValues("newPassword") || "Passwords do not match",
                })}
              />
            </Field>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" loading={pwLoading}>
                Update Password
              </Button>
              <Button type="button" variant="outline" onClick={() => { setShowChangePw(false); pwForm.reset(); }}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Metrics */}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Required Fees", value: formatCurrency(dashboardQuery.data?.totalRequired ?? 0), icon: <Layers3 className="h-5 w-5 text-[var(--brand-green)]" /> },
          { label: "Collected",           value: formatCurrency(dashboardQuery.data?.totalCollected ?? 0), icon: <Wallet className="h-5 w-5 text-[var(--brand-green)]" /> },
          { label: "Outstanding",         value: formatCurrency(dashboardQuery.data?.totalOutstanding ?? 0), icon: <RefreshCcw className="h-5 w-5 text-rose-500" /> },
          {
            label: "Students",
            value: dashboardQuery.data
              ? `${dashboardQuery.data.fullyPaidCount} paid / ${dashboardQuery.data.lackingCount} lacking`
              : "—",
            icon: <Users className="h-5 w-5 text-[var(--brand-green)]" />,
          },
        ].map(({ label, value, icon }) => (
          <Card key={label} className="nm-card-static cursor-default">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-lg text-[var(--brand-green-dark)]">{value}</CardTitle>
              </div>
              <div className="nm-inset-deep flex h-10 w-10 items-center justify-center rounded-xl">
                {icon}
              </div>
            </CardHeader>
          </Card>
        ))}
      </section>

      {/* Chart + Status list */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Balances Snapshot</CardTitle>
              <CardDescription>
                Top {chartData.length} students by balance
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {(["all", "fully_paid", "lacking"] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={statusFilter === filter ? "default" : "outline"}
                  onClick={() => setStatusFilter(filter)}
                  className="text-xs px-3 py-1.5"
                >
                  {filter === "all" ? "All" : filter === "fully_paid" ? "Fully Paid" : "Lacking"}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(90,175,34,0.15)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--background)",
                    border: "none",
                    boxShadow: "var(--shadow-nm)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="balance" fill="var(--brand-gold)"  name="Balance" radius={[4,4,0,0]} />
                <Bar dataKey="paid"    fill="var(--brand-green)" name="Paid"    radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status List</CardTitle>
            <CardDescription>Filter: {statusFilter.replace("_", " ")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-72 overflow-y-auto pr-1 scroll-hidden">
            {(statusesQuery.data ?? []).length === 0 && (
              <p className="text-sm text-[var(--muted)]">No students match this filter.</p>
            )}
            {(statusesQuery.data ?? []).map((status) => (
              <div key={status.studentId} className="nm-pill flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--brand-green-dark)]">
                    {status.studentName} · {status.studentCode}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Paid {formatCurrency(status.totalPaid)} / {formatCurrency(status.totalRequired)}
                  </p>
                </div>
                {renderStatusBadge(status.paymentStatus)}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Delete confirmation */}
      {pendingDelete && (
        <div className="nm-card border-l-4 border-rose-400 p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
            <p className="text-sm font-medium text-rose-700">
              Delete <span className="font-bold">{pendingDelete.label}</span>? This cannot be undone.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              loading={mutation.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Feedback message */}
      {(message || errorMessage) && (
        <div className={`nm-card p-4 text-sm border-l-4 ${
          errorMessage ? "border-rose-400" : "border-[var(--brand-green)]"
        }`}>
          <span className={errorMessage ? "text-rose-700" : "text-[var(--brand-green-dark)]"}>
            {errorMessage ?? message}
          </span>
        </div>
      )}

      {/* Tab buttons */}
      <div className="flex flex-wrap gap-3">
        {([
          ["students",     `Students (${studentsQuery.data?.length ?? "…"})`],
          ["requirements", `Requirements (${requirementsQuery.data?.length ?? "…"})`],
          ["payments",     `Payments (${paymentsQuery.data?.length ?? "…"})`],
        ] as const).map(([tab, label]) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* ── Students tab ───────────────────────────────────────── */}
      {activeTab === "students" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Students</CardTitle>
                <CardDescription>Manage roster and codes</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowBulkImport(true)}>
                  <Upload className="mr-2 h-4 w-4" /> Import
                </Button>
                <Button variant="outline" onClick={() => { setEditingStudent(null); studentForm.reset(studentDefaults); }}>
                  <Plus className="mr-2 h-4 w-4" /> New
                </Button>
              </div>
            </CardHeader>
            <CardContent ref={listRefs[0]} className="space-y-3 max-h-[420px] overflow-y-auto scroll-hidden">
              {(studentsQuery.data ?? []).length === 0 && (
                <p className="text-sm text-[var(--muted)]">No students yet. Add one using the form.</p>
              )}
              {(studentsQuery.data ?? []).map((student) => (
                <div key={student.id} className="nm-pill px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs uppercase text-[var(--muted)]">{student.studentCode}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" onClick={() => setEditingStudent(student)} title="Edit student">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        title="Delete student"
                        onClick={() => requestDelete("student", student.id,
                          `${student.firstName} ${student.lastName}`)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    Grade {student.gradeLevel ?? "N/A"} · {student.status}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div ref={formRef}>
            <Card>
              <CardHeader>
                <CardTitle>{editingStudent ? "Edit Student" : "Add Student"}</CardTitle>
                <CardDescription>{editingStudent ? "Update student details." : "Provide basic information."}</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={handleStudentSubmit}>
                  <Field label="LRN *" error={sErr.studentCode?.message}>
                    <Input
                      placeholder="e.g. 123456789012"
                      className="uppercase"
                      {...studentForm.register("studentCode", { required: "LRN is required" })}
                    />
                  </Field>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="First Name *" error={sErr.firstName?.message}>
                      <Input {...studentForm.register("firstName", { required: "First name is required" })} />
                    </Field>
                    <Field label="Last Name *" error={sErr.lastName?.message}>
                      <Input {...studentForm.register("lastName", { required: "Last name is required" })} />
                    </Field>
                  </div>
                  <Field label="Grade Level">
                    <Select {...studentForm.register("gradeLevel")}>
                      <option value="">— Select grade —</option>
                      {GRADE_LEVELS.map((g) => (
                        <option key={g} value={g}>Grade {g}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Guardian Contact">
                    <Input placeholder="e.g. 09XX-XXX-XXXX" {...studentForm.register("guardianContact")} />
                  </Field>
                  <Field label="Status">
                    <Select defaultValue="active" {...studentForm.register("status")}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Select>
                  </Field>
                  <Field label="Notes">
                    <Textarea rows={3} placeholder="Optional notes" {...studentForm.register("notes")} />
                  </Field>
                  <div className="flex gap-2">
                    <Button type="submit" loading={mutation.isPending}>
                      {editingStudent ? "Update Student" : "Add Student"}
                    </Button>
                    {editingStudent && (
                      <Button type="button" variant="outline" onClick={() => {
                        setEditingStudent(null);
                        studentForm.reset(studentDefaults);
                      }}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* ── Requirements tab ───────────────────────────────────── */}
      {activeTab === "requirements" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment Requirements</CardTitle>
                <CardDescription>Define tuition, exams, and misc fees</CardDescription>
              </div>
              <Button variant="outline" onClick={() => { setEditingRequirement(null); requirementForm.reset(requirementDefaults); }}>
                <Plus className="mr-2 h-4 w-4" /> New
              </Button>
            </CardHeader>
            <CardContent ref={listRefs[1]} className="space-y-3 max-h-[420px] overflow-y-auto scroll-hidden">
              {(requirementsQuery.data ?? []).length === 0 && (
                <p className="text-sm text-[var(--muted)]">No requirements yet. Add one using the form.</p>
              )}
              {(requirementsQuery.data ?? []).map((req) => (
                <div key={req.id} className="nm-pill px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">{req.label}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {formatCurrency(req.amount)} · Due {req.dueDate ? formatDate(req.dueDate) : "N/A"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" title="Edit requirement" onClick={() => setEditingRequirement(req)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        title="Delete requirement"
                        onClick={() => requestDelete("requirement", req.id, req.label)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  </div>
                  {req.description && <p className="text-xs text-[var(--muted)]">{req.description}</p>}
                </div>
              ))}
            </CardContent>
          </Card>

          <div ref={formRef}>
            <Card>
              <CardHeader>
                <CardTitle>{editingRequirement ? "Edit Requirement" : "Add Requirement"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={handleRequirementSubmit}>
                  <Field label="Label *" error={rErr.label?.message}>
                    <Input
                      placeholder="e.g. Tuition Fee"
                      {...requirementForm.register("label", { required: "Label is required" })}
                    />
                  </Field>
                  <Field label="Description">
                    <Textarea rows={2} placeholder="Optional description" {...requirementForm.register("description")} />
                  </Field>
                  <Field label="Amount (₱) *" error={rErr.amount?.message}>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      {...requirementForm.register("amount", {
                        valueAsNumber: true,
                        required: "Amount is required",
                        min: { value: 0.01, message: "Amount must be greater than 0" },
                      })}
                    />
                  </Field>
                  <Field label="Due Date">
                    <Input type="date" {...requirementForm.register("dueDate")} />
                  </Field>
                  <Field label="Type">
                    <Select {...requirementForm.register("isRequired", { setValueAs: (v) => v === "true" })}>
                      <option value="true">Required</option>
                      <option value="false">Optional</option>
                    </Select>
                  </Field>
                  <div className="flex gap-2">
                    <Button type="submit" loading={mutation.isPending}>
                      {editingRequirement ? "Update Requirement" : "Add Requirement"}
                    </Button>
                    {editingRequirement && (
                      <Button type="button" variant="outline" onClick={() => {
                        setEditingRequirement(null);
                        requirementForm.reset(requirementDefaults);
                      }}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* ── Payments tab ───────────────────────────────────────── */}
      {activeTab === "payments" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment Logs</CardTitle>
                <CardDescription>Update or remove incorrect entries</CardDescription>
              </div>
              <Button variant="outline" onClick={() => { setEditingPayment(null); paymentForm.reset(getPaymentDefaults()); setStudentSearch(""); }}>
                <Plus className="mr-2 h-4 w-4" /> New
              </Button>
            </CardHeader>
            <CardContent ref={listRefs[2]} className="space-y-3 max-h-[420px] overflow-y-auto scroll-hidden">
              <div ref={filterComboRef} className="relative">
                <Input
                  placeholder="Search student by name or LRN…"
                  value={filterSearch}
                  onFocus={() => setShowFilterList(true)}
                  onChange={(e) => {
                    setFilterSearch(e.target.value);
                    setShowFilterList(true);
                    if (!e.target.value) setPaymentFilterId("");
                  }}
                />
                {filterSearch && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                    onMouseDown={(e) => { e.preventDefault(); setFilterSearch(""); setPaymentFilterId(""); }}
                  >
                    ✕
                  </button>
                )}
                {showFilterList && filteredFilterStudents.length > 0 && (
                  <ul className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-lg max-h-52 overflow-y-auto text-sm">
                    {filteredFilterStudents.map((s) => (
                      <li
                        key={s.studentId}
                        className="px-3 py-2 cursor-pointer hover:bg-[var(--brand-green-light)] hover:text-[var(--brand-green-dark)] transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setPaymentFilterId(s.studentId);
                          setFilterSearch(`${s.studentName} (${s.studentCode})`);
                          setShowFilterList(false);
                        }}
                      >
                        <span className="font-medium">{s.studentName}</span>
                        <span className="ml-2 text-xs text-[var(--muted)]">{s.studentCode}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {(() => {
                const list = (paymentsQuery.data ?? []).filter(p =>
                  !paymentFilterId || p.studentId === paymentFilterId
                );
                if (list.length === 0)
                  return <p className="text-sm text-[var(--muted)]">No payments recorded yet.</p>;
                return list.map((payment) => (
                <div key={payment.id} className="nm-pill px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">
                        {formatCurrency(payment.amountPaid)}
                      </p>
                      <p className="text-xs text-[var(--brand-green-dark)] font-medium">
                        {studentMap.get(payment.studentId) ?? "Unknown student"}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {payment.method ?? "Unspecified method"} · {formatDate(payment.paidOn)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" title="Edit payment" onClick={() => setEditingPayment(payment)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        title="Delete payment"
                        onClick={() => requestDelete("payment", payment.id,
                          `₱${payment.amountPaid} from ${studentMap.get(payment.studentId) ?? "unknown"}`)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  </div>
                  {payment.remarks && <p className="text-xs text-[var(--muted)] mt-1">{payment.remarks}</p>}
                </div>
                ));
              })()}
            </CardContent>
          </Card>

          <div ref={formRef}>
            <Card>
              <CardHeader>
                <CardTitle>{editingPayment ? "Edit Payment" : "Log Payment"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={handlePaymentSubmit}>
                  <Field label="Student *" error={pErr.studentId?.message}>
                    {/* hidden field keeps react-hook-form value */}
                    <input type="hidden" {...paymentForm.register("studentId", { required: "Please select a student" })} />
                    <div ref={studentComboRef} className="relative">
                      <Input
                        placeholder="Search by name or LRN…"
                        value={studentSearch}
                        onFocus={() => setShowStudentList(true)}
                        onChange={(e) => {
                          setStudentSearch(e.target.value);
                          setShowStudentList(true);
                          // Clear selection if user edits the text
                          paymentForm.setValue("studentId", "", { shouldValidate: false });
                        }}
                      />
                      {showStudentList && filteredStudents.length > 0 && (
                        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-lg max-h-52 overflow-y-auto text-sm">
                          {filteredStudents.map((s) => (
                            <li
                              key={s.studentId}
                              className="px-3 py-2 cursor-pointer hover:bg-[var(--brand-green-light)] hover:text-[var(--brand-green-dark)] transition-colors"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                paymentForm.setValue("studentId", s.studentId, { shouldValidate: true });
                                setStudentSearch(`${s.studentName} (${s.studentCode})`);
                                setShowStudentList(false);
                              }}
                            >
                              <span className="font-medium">{s.studentName}</span>
                              <span className="ml-2 text-xs text-[var(--muted)]">{s.studentCode}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {showStudentList && studentSearch.length > 0 && filteredStudents.length === 0 && (
                        <div className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-lg px-3 py-2 text-sm text-[var(--muted)]">
                          No students found
                        </div>
                      )}
                    </div>
                  </Field>
                  <Field label="Requirement">
                    <Select {...paymentForm.register("requirementId")}>
                      <option value="">No specific requirement</option>
                      {(requirementsQuery.data ?? []).map((req) => (
                        <option key={req.id} value={req.id}>{req.label}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Amount Paid (₱) *" error={pErr.amountPaid?.message}>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      {...paymentForm.register("amountPaid", {
                        valueAsNumber: true,
                        required: "Amount is required",
                        min: { value: 0.01, message: "Amount must be greater than 0" },
                      })}
                    />
                  </Field>
                  <Field label="Date Paid">
                    <Input type="date" {...paymentForm.register("paidOn")} />
                  </Field>
                  <Field label="Payment Method">
                    <Select {...paymentForm.register("method")}>
                      <option value="">— Select method —</option>
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Remarks">
                    <Textarea rows={2} placeholder="Optional notes about this payment" {...paymentForm.register("remarks")} />
                  </Field>
                  <div className="flex gap-2">
                    <Button type="submit" loading={mutation.isPending}>
                      {editingPayment ? "Update Payment" : "Record Payment"}
                    </Button>
                    {editingPayment && (
                      <Button type="button" variant="outline" onClick={() => {
                        setEditingPayment(null);
                        paymentForm.reset(getPaymentDefaults());
                      }}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {showBulkImport && (
        <BulkImportModal
          onClose={() => setShowBulkImport(false)}
          onImport={handleBulkImport}
        />
      )}

    </main>
  );
}
