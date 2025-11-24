import type {
  DashboardMetrics,
  PaymentRequirement,
  Student,
  StudentPayment,
  StudentStatus,
  StudentStatusDetail,
} from "@/lib/types";
import type {
  PaymentPayload,
  PaymentRequirementPayload,
  StudentPayload,
} from "@/lib/validators";

async function request<TResponse>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const body = await response.json();
      message = body.message ?? message;
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  return response.json() as Promise<TResponse>;
}

export const api = {
  getStudentStatus: (code: string) =>
    request<{ status: StudentStatusDetail }>(
      `/api/status?studentCode=${encodeURIComponent(code)}`
    ).then((res) => res.status),
  getStudents: (search?: string) =>
    request<{ students: Student[] }>(
      `/api/students${search ? `?search=${encodeURIComponent(search)}` : ""}`
    ).then((res) => res.students),
  createStudent: (payload: StudentPayload) =>
    request<{ student: Student }>("/api/students", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((res) => res.student),
  updateStudent: (id: string, payload: Partial<StudentPayload>) =>
    request<{ student: Student }>(`/api/students/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }).then((res) => res.student),
  deleteStudent: (id: string) =>
    request<{ ok: boolean }>(`/api/students/${id}`, { method: "DELETE" }),
  getRequirements: () =>
    request<{ requirements: PaymentRequirement[] }>("/api/requirements").then(
      (res) => res.requirements
    ),
  createRequirement: (payload: PaymentRequirementPayload) =>
    request<{ requirement: PaymentRequirement }>("/api/requirements", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((res) => res.requirement),
  updateRequirement: (id: string, payload: Partial<PaymentRequirementPayload>) =>
    request<{ requirement: PaymentRequirement }>(`/api/requirements/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }).then((res) => res.requirement),
  deleteRequirement: (id: string) =>
    request<{ ok: boolean }>(`/api/requirements/${id}`, { method: "DELETE" }),
  getPayments: (studentId?: string) =>
    request<{ payments: StudentPayment[] }>(
      `/api/payments${studentId ? `?studentId=${studentId}` : ""}`
    ).then((res) => res.payments),
  createPayment: (payload: PaymentPayload) =>
    request<{ payment: StudentPayment }>("/api/payments", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((res) => res.payment),
  updatePayment: (id: string, payload: Partial<PaymentPayload>) =>
    request<{ payment: StudentPayment }>(`/api/payments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }).then((res) => res.payment),
  deletePayment: (id: string) =>
    request<{ ok: boolean }>(`/api/payments/${id}`, { method: "DELETE" }),
  getStatuses: (filter?: "fully_paid" | "lacking") =>
    request<{ statuses: StudentStatus[] }>(
      `/api/status/all${filter ? `?filter=${encodeURIComponent(filter)}` : ""}`
    ).then((res) => res.statuses),
  getDashboard: () =>
    request<{ metrics: DashboardMetrics }>("/api/dashboard").then((res) => res.metrics),
};

