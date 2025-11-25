"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Edit, Layers3, Plus, RefreshCcw, Trash2, Users, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import type {
  DashboardMetrics,
  PaymentRequirement,
  Student,
  StudentPayment,
  StudentStatus,
} from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type StudentFormValues = {
  studentCode: string;
  firstName: string;
  lastName: string;
  gradeLevel?: string | null;
  guardianContact?: string | null;
  status: "active" | "inactive";
  notes?: string | null;
};

type RequirementFormValues = {
  label: string;
  description?: string | null;
  amount: number;
  dueDate?: string | null;
  isRequired: boolean;
};

type PaymentFormValues = {
  studentId: string;
  requirementId?: string | null;
  amountPaid: number;
  paidOn?: string | null;
  method?: string | null;
  remarks?: string | null;
};

const studentDefaults: StudentFormValues = {
  studentCode: "",
  firstName: "",
  lastName: "",
  gradeLevel: "",
  guardianContact: "",
  status: "active",
  notes: "",
};

const requirementDefaults: RequirementFormValues = {
  label: "",
  description: "",
  amount: 0,
  dueDate: "",
  isRequired: true,
};

const paymentDefaults: PaymentFormValues = {
  studentId: "",
  requirementId: "",
  amountPaid: 0,
  paidOn: "",
  method: "",
  remarks: "",
};

export default function AdminPage() {
  const [statusFilter, setStatusFilter] = useState<"all" | "fully_paid" | "lacking">("all");
  const [activeTab, setActiveTab] = useState<"students" | "requirements" | "payments">(
    "students"
  );
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const studentForm = useForm<StudentFormValues>({ defaultValues: studentDefaults });
  const requirementForm = useForm<RequirementFormValues>({ defaultValues: requirementDefaults });
  const paymentForm = useForm<PaymentFormValues>({ defaultValues: paymentDefaults });

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingRequirement, setEditingRequirement] = useState<PaymentRequirement | null>(null);
  const [editingPayment, setEditingPayment] = useState<StudentPayment | null>(null);

  const studentsQuery = useQuery<Student[]>({
    queryKey: ["students"],
    queryFn: () => api.getStudents(),
  });

  const requirementsQuery = useQuery<PaymentRequirement[]>({
    queryKey: ["requirements"],
    queryFn: () => api.getRequirements(),
  });

  const paymentsQuery = useQuery<StudentPayment[]>({
    queryKey: ["payments"],
    queryFn: () => api.getPayments(),
  });

  const dashboardQuery = useQuery<DashboardMetrics>({
    queryKey: ["dashboard"],
    queryFn: () => api.getDashboard(),
  });

  const statusesQuery = useQuery<StudentStatus[]>({
    queryKey: ["statuses", statusFilter],
    queryFn: () => api.getStatuses(statusFilter === "all" ? undefined : statusFilter),
  });

  const invalidateCore = () => {
    queryClient.invalidateQueries({ queryKey: ["students"] });
    queryClient.invalidateQueries({ queryKey: ["requirements"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["statuses"] });
  };

  const mutation = useMutation({
    mutationFn: async (action: () => Promise<unknown>) => action(),
    onSuccess: () => {
      invalidateCore();
    },
  });

  const setSuccess = (text: string) => {
    setErrorMessage(null);
    setMessage(text);
  };

  const setErrorText = (text: string) => {
    setMessage(null);
    setErrorMessage(text);
  };

  const handleStudentSubmit = studentForm.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(async () => {
        const payload = {
          ...values,
          studentCode: values.studentCode.toUpperCase(),
          gradeLevel: values.gradeLevel || null,
          guardianContact: values.guardianContact || null,
          notes: values.notes || null,
        };
        if (editingStudent) {
          await api.updateStudent(editingStudent.id, payload);
        } else {
          await api.createStudent(payload);
        }
      });
      setSuccess(editingStudent ? "Student updated" : "Student added");
      setEditingStudent(null);
      studentForm.reset(studentDefaults);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to save student.");
    }
  });

  const handleRequirementSubmit = requirementForm.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(async () => {
        const payload = {
          ...values,
          amount: Number(values.amount),
          description: values.description || null,
          dueDate: values.dueDate || null,
          isRequired: Boolean(values.isRequired),
        };
        if (editingRequirement) {
          await api.updateRequirement(editingRequirement.id, payload);
        } else {
          await api.createRequirement(payload);
        }
      });
      setSuccess(editingRequirement ? "Requirement updated" : "Requirement added");
      setEditingRequirement(null);
      requirementForm.reset(requirementDefaults);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to save requirement.");
    }
  });

  const handlePaymentSubmit = paymentForm.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(async () => {
        const payload = {
          ...values,
          amountPaid: Number(values.amountPaid),
          requirementId: values.requirementId || null,
          paidOn: values.paidOn || null,
          method: values.method || null,
          remarks: values.remarks || null,
        };
        if (editingPayment) {
          await api.updatePayment(editingPayment.id, payload);
        } else {
          await api.createPayment(payload);
        }
      });
      setSuccess(editingPayment ? "Payment updated" : "Payment recorded");
      setEditingPayment(null);
      paymentForm.reset(paymentDefaults);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to save payment.");
    }
  });

  const handleDelete = async (type: "student" | "requirement" | "payment", id: string) => {
    try {
      await mutation.mutateAsync(async () => {
        if (type === "student") await api.deleteStudent(id);
        if (type === "requirement") await api.deleteRequirement(id);
        if (type === "payment") await api.deletePayment(id);
      });
      setSuccess(`${type} removed`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to delete record.");
    }
  };

  useEffect(() => {
    if (editingStudent) {
      studentForm.reset({
        studentCode: editingStudent.studentCode,
        firstName: editingStudent.firstName,
        lastName: editingStudent.lastName,
        gradeLevel: editingStudent.gradeLevel ?? "",
        guardianContact: editingStudent.guardianContact ?? "",
        status: editingStudent.status as "active" | "inactive",
        notes: editingStudent.notes ?? "",
      });
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
    }
  }, [editingRequirement, requirementForm]);

  useEffect(() => {
    if (editingPayment) {
      paymentForm.reset({
        studentId: editingPayment.studentId,
        requirementId: editingPayment.requirementId ?? "",
        amountPaid: editingPayment.amountPaid,
        paidOn: editingPayment.paidOn ?? "",
        method: editingPayment.method ?? "",
        remarks: editingPayment.remarks ?? "",
      });
    }
  }, [editingPayment, paymentForm]);

  const chartData = useMemo(() => {
    return (statusesQuery.data ?? []).slice(0, 7).map((status) => ({
      name: status.studentCode,
      balance: status.balance,
      paid: status.totalPaid,
    }));
  }, [statusesQuery.data]);

  const renderStatusBadge = (status: StudentStatus["paymentStatus"]) => {
    switch (status) {
      case "fully_paid":
        return <Badge variant="success">Fully Paid</Badge>;
      case "partial":
        return <Badge variant="warning">Partial</Badge>;
      case "unpaid":
        return <Badge variant="danger">Unpaid</Badge>;
      default:
        return <Badge>No Requirements</Badge>;
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-4 rounded-2xl border border-lime-200 bg-white/90 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Image src="/bankal-logo.png" width={72} height={72} alt="Bankal National High School" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-[var(--brand-green)]">
              Admin Dashboard
            </p>
            <h1 className="text-3xl font-semibold text-[var(--brand-green-dark)]">StudentPay Tracker</h1>
          </div>
        </div>
        <p className="text-slate-600">
          Manage students, payment requirements, and payment records with a Supabase-backed API built for
          Bankal National High School.
        </p>
      </header>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardDescription>Total Required Fees</CardDescription>
              <CardTitle className="text-[var(--brand-green-dark)]">
                {formatCurrency(dashboardQuery.data?.totalRequired ?? 0)}
              </CardTitle>
            </div>
            <Layers3 className="h-5 w-5 text-[var(--brand-green)]" />
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardDescription>Collected</CardDescription>
              <CardTitle className="text-[var(--brand-green-dark)]">
                {formatCurrency(dashboardQuery.data?.totalCollected ?? 0)}
              </CardTitle>
            </div>
            <Wallet className="h-5 w-5 text-[var(--brand-green)]" />
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardDescription>Outstanding</CardDescription>
              <CardTitle className="text-[var(--brand-green-dark)]">
                {formatCurrency(dashboardQuery.data?.totalOutstanding ?? 0)}
              </CardTitle>
            </div>
            <RefreshCcw className="h-5 w-5 text-rose-500" />
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardDescription>Students</CardDescription>
              <CardTitle className="text-[var(--brand-green-dark)]">
                {dashboardQuery.data
                  ? `${dashboardQuery.data.fullyPaidCount} paid / ${
                      dashboardQuery.data.lackingCount
                    } lacking`
                  : "—"}
              </CardTitle>
            </div>
            <Users className="h-5 w-5 text-[var(--brand-green)]" />
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Balances Snapshot</CardTitle>
              <CardDescription>Top students by outstanding balance</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {(["all", "fully_paid", "lacking"] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={statusFilter === filter ? "default" : "outline"}
                  onClick={() => setStatusFilter(filter)}
                  className="text-xs"
                >
                  {filter === "all" ? "All" : filter === "fully_paid" ? "Fully Paid" : "Lacking"}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="balance" fill="#f6d251" name="Balance" />
                <Bar dataKey="paid" fill="#5aaf22" name="Paid" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status List</CardTitle>
            <CardDescription>Filter: {statusFilter.replace("_", " ")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 overflow-y-auto">
            {(statusesQuery.data ?? []).map((status) => (
              <div
                key={status.studentId}
                className="flex items-center justify-between rounded-lg border border-lime-100 bg-white/70 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--brand-green-dark)]">
                    {status.studentName} · {status.studentCode}
                  </p>
                  <p className="text-xs text-slate-500">
                    Paid {formatCurrency(status.totalPaid)} /{" "}
                    {formatCurrency(status.totalRequired)}
                  </p>
                </div>
                {renderStatusBadge(status.paymentStatus)}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {(message || errorMessage) && (
        <Card className={errorMessage ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}>
          <CardContent className="py-4 text-sm">
            {errorMessage ? (
              <span className="text-rose-700">{errorMessage}</span>
            ) : (
              <span className="text-emerald-700">{message}</span>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        {(["students", "requirements", "payments"] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "students" && "Students"}
            {tab === "requirements" && "Requirements"}
            {tab === "payments" && "Payments"}
          </Button>
        ))}
      </div>

      {activeTab === "students" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Students</CardTitle>
                <CardDescription>Adding names, LRNs, and etc</CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingStudent(null);
                  studentForm.reset(studentDefaults);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {(studentsQuery.data ?? []).map((student) => (
                <div
                  key={student.id}
                  className="rounded-lg border border-slate-100 px-4 py-3 text-sm text-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs uppercase text-slate-500">{student.studentCode}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setEditingStudent(student)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleDelete("student", student.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Grade {student.gradeLevel ?? "N/A"} · {student.status}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{editingStudent ? "Edit Student" : "Add Student"}</CardTitle>
              <CardDescription>
                {editingStudent ? "Update student details." : "Provide basic information."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleStudentSubmit}>
                <Input placeholder="Student Code" {...studentForm.register("studentCode", { required: true })} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Input placeholder="First Name" {...studentForm.register("firstName", { required: true })} />
                  <Input placeholder="Last Name" {...studentForm.register("lastName", { required: true })} />
                </div>
                <Input placeholder="Grade Level" {...studentForm.register("gradeLevel")} />
                <Input placeholder="Guardian Contact" {...studentForm.register("guardianContact")} />
                <Select {...studentForm.register("status")}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
                <Textarea rows={3} placeholder="Notes" {...studentForm.register("notes")} />
                <Button type="submit" loading={mutation.isPending}>
                  {editingStudent ? "Update Student" : "Add Student"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      )}

      {activeTab === "requirements" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment Requirements</CardTitle>
                <CardDescription>Define GPTA contributions</CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingRequirement(null);
                  requirementForm.reset(requirementDefaults);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {(requirementsQuery.data ?? []).map((req) => (
                <div
                  key={req.id}
                  className="rounded-lg border border-slate-100 px-4 py-3 text-sm text-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{req.label}</p>
                      <p className="text-xs text-slate-500">
                        {formatCurrency(req.amount)} · Due {req.dueDate ? formatDate(req.dueDate) : "N/A"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" onClick={() => setEditingRequirement(req)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" onClick={() => handleDelete("requirement", req.id)}>
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </div>
                  </div>
                  {req.description && <p className="text-xs text-slate-500">{req.description}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{editingRequirement ? "Edit Requirement" : "Add Requirement"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleRequirementSubmit}>
                <Input placeholder="Label" {...requirementForm.register("label", { required: true })} />
                <Textarea rows={3} placeholder="Description" {...requirementForm.register("description")} />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  {...requirementForm.register("amount", { valueAsNumber: true })}
                />
                <Input type="date" {...requirementForm.register("dueDate")} />
                <Select
                  {...requirementForm.register("isRequired", {
                    setValueAs: (value) => value === "true",
                  })}
                >
                  <option value="true">Required</option>
                  <option value="false">Optional</option>
                </Select>
                <Button type="submit" loading={mutation.isPending}>
                  {editingRequirement ? "Update Requirement" : "Add Requirement"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      )}

      {activeTab === "payments" && (
        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment Logs</CardTitle>
                <CardDescription>Update or remove incorrect entries</CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setEditingPayment(null);
                  paymentForm.reset(paymentDefaults);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {(paymentsQuery.data ?? []).map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-lg border border-slate-100 px-4 py-3 text-sm text-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(payment.amountPaid)}
                      </p>
                      <p className="text-xs text-slate-500">{formatDate(payment.paidOn)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" onClick={() => setEditingPayment(payment)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" onClick={() => handleDelete("payment", payment.id)}>
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">{payment.method ?? "Unspecified method"}</p>
                  {payment.remarks && <p className="text-xs text-slate-500">{payment.remarks}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{editingPayment ? "Edit Payment" : "Log Payment"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handlePaymentSubmit}>
                <Select {...paymentForm.register("studentId", { required: true })}>
                  <option value="">Select Student</option>
                  {(studentsQuery.data ?? []).map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} ({student.studentCode})
                    </option>
                  ))}
                </Select>
                <Select {...paymentForm.register("requirementId")}>
                  <option value="">No specific requirement</option>
                  {(requirementsQuery.data ?? []).map((req) => (
                    <option key={req.id} value={req.id}>
                      {req.label}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Amount paid"
                  {...paymentForm.register("amountPaid", { valueAsNumber: true })}
                />
                <Input type="date" {...paymentForm.register("paidOn")} />
                <Input placeholder="Method (Cash, GCash, etc.)" {...paymentForm.register("method")} />
                <Textarea rows={3} placeholder="Remarks" {...paymentForm.register("remarks")} />
                <Button type="submit" loading={mutation.isPending}>
                  {editingPayment ? "Update Payment" : "Record Payment"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      )}
    </main>
  );
}

