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

const isFormDataBody = (body: RequestInit["body"]): body is FormData => {
  return typeof FormData !== "undefined" && body instanceof FormData;
};

async function request<TResponse>(input: RequestInfo, init?: RequestInit) {
  const headers =
    init?.body && isFormDataBody(init.body)
      ? init?.headers
      : {
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        };

  const response = await fetch(input, {
    ...init,
    headers,
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
  bulkUploadStudents: (file: Blob) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ inserted: number; total: number }>("/api/students/bulk", {
      method: "POST",
      body: formData,
    });
  },
  downloadSummary: () =>
    fetch("/api/summary/export").then(async (res) => {
      if (!res.ok) {
        let message = "Failed to generate summary.";
        try {
          const body = await res.json();
          message = body.message ?? message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }
      return res.blob();
    }),
};

