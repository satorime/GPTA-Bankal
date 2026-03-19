import { getAdminClient, getAuthClient } from "./supabase";
import type {
  DashboardMetrics,
  PaymentRequirement,
  RequirementBreakdown,
  Student,
  StudentPayment,
  StudentStatus,
  StudentStatusDetail,
} from "./types";
import type {
  PaymentPayload,
  PaymentRequirementPayload,
  StudentPayload,
} from "./validators";

type NumericLike = string | number | null | undefined;

type StudentRow = {
  id: string;
  student_code: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
  guardian_contact: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type RequirementRow = {
  id: string;
  label: string;
  description: string | null;
  amount: NumericLike;
  due_date: string | null;
  is_required: boolean;
  created_at: string;
  updated_at: string;
};

type PaymentRow = {
  id: string;
  student_id: string;
  requirement_id: string | null;
  amount_paid: NumericLike;
  paid_on: string | null;
  method: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
};

type StatusRow = {
  id: string;
  student_code: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
  total_required: NumericLike;
  total_paid: NumericLike;
  balance: NumericLike;
  payment_status: string;
};

const toNumber = (value: NumericLike) => Number(value ?? 0);

const studentColumns =
  "id, student_code, first_name, last_name, grade_level, guardian_contact, status, notes, created_at, updated_at";
const requirementColumns =
  "id, label, description, amount, due_date, is_required, created_at, updated_at";
const paymentColumns =
  "id, student_id, requirement_id, amount_paid, paid_on, method, remarks, created_at, updated_at";

const mapStudent = (row: StudentRow): Student => ({
  id: row.id,
  studentCode: row.student_code,
  firstName: row.first_name,
  lastName: row.last_name,
  gradeLevel: row.grade_level,
  guardianContact: row.guardian_contact,
  status: row.status as Student["status"],
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapRequirement = (row: RequirementRow): PaymentRequirement => ({
  id: row.id,
  label: row.label,
  description: row.description,
  amount: toNumber(row.amount),
  dueDate: row.due_date,
  isRequired: row.is_required,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapPayment = (row: PaymentRow): StudentPayment => ({
  id: row.id,
  studentId: row.student_id,
  requirementId: row.requirement_id,
  amountPaid: toNumber(row.amount_paid),
  paidOn: row.paid_on,
  method: row.method,
  remarks: row.remarks,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function fetchStudents(search?: string) {
  const client = getAuthClient();
  let query = client.from("students").select(studentColumns).order("created_at");
  if (search) {
    query = query.or(
      `student_code.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
    );
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data.map(mapStudent);
}

export async function createStudent(payload: StudentPayload) {
  const client = getAdminClient();
  const { data, error } = await client
    .from("students")
    .insert({
      student_code: payload.studentCode,
      first_name: payload.firstName,
      last_name: payload.lastName,
      grade_level: payload.gradeLevel,
      guardian_contact: payload.guardianContact,
      status: payload.status,
      notes: payload.notes,
    })
    .select(studentColumns)
    .single();
  if (error) throw new Error(error.message);
  return mapStudent(data);
}

export async function updateStudent(id: string, payload: Partial<StudentPayload>) {
  const client = getAdminClient();
  const { data, error } = await client
    .from("students")
    .update({
      student_code: payload.studentCode,
      first_name: payload.firstName,
      last_name: payload.lastName,
      grade_level: payload.gradeLevel,
      guardian_contact: payload.guardianContact,
      status: payload.status,
      notes: payload.notes,
    })
    .eq("id", id)
    .select(studentColumns)
    .single();
  if (error) throw new Error(error.message);
  return mapStudent(data);
}

export async function deleteStudent(id: string) {
  const client = getAdminClient();
  const { error } = await client.from("students").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function bulkCreateStudents(
  students: StudentPayload[]
): Promise<{ inserted: number; skipped: number }> {
  const client = getAdminClient();
  const rows = students.map((s) => ({
    student_code:     s.studentCode.toUpperCase(),
    first_name:       s.firstName,
    last_name:        s.lastName,
    grade_level:      s.gradeLevel      || null,
    guardian_contact: s.guardianContact || null,
    status:           s.status,
    notes:            s.notes           || null,
  }));
  // ignoreDuplicates: true → rows whose student_code already exists are silently skipped
  const { data, error } = await client
    .from("students")
    .upsert(rows, { onConflict: "student_code", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(error.message);
  const inserted = data?.length ?? 0;
  return { inserted, skipped: students.length - inserted };
}

export async function fetchRequirements() {
  const client = getAdminClient();
  const { data, error } = await client
    .from("payment_requirements")
    .select(requirementColumns)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data.map(mapRequirement);
}

export async function createRequirement(payload: PaymentRequirementPayload) {
  const client = getAdminClient();
  const { data, error } = await client
    .from("payment_requirements")
    .insert({
      label: payload.label,
      description: payload.description,
      amount: payload.amount,
      due_date: payload.dueDate,
      is_required: payload.isRequired,
    })
    .select(requirementColumns)
    .single();
  if (error) throw new Error(error.message);
  return mapRequirement(data);
}

export async function updateRequirement(
  id: string,
  payload: Partial<PaymentRequirementPayload>
) {
  const client = getAdminClient();
  const { data, error } = await client
    .from("payment_requirements")
    .update({
      label: payload.label,
      description: payload.description,
      amount: payload.amount,
      due_date: payload.dueDate,
      is_required: payload.isRequired,
    })
    .eq("id", id)
    .select(requirementColumns)
    .single();
  if (error) throw new Error(error.message);
  return mapRequirement(data);
}

export async function deleteRequirement(id: string) {
  const client = getAdminClient();
  const { error } = await client.from("payment_requirements").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchPayments(studentId?: string) {
  const client = getAuthClient();
  let query = client.from("student_payments").select(paymentColumns).order("paid_on", {
    ascending: false,
  });
  if (studentId) {
    query = query.eq("student_id", studentId);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data.map(mapPayment);
}

export async function createPayment(payload: PaymentPayload) {
  const client = getAdminClient();
  const { data, error } = await client
    .from("student_payments")
    .insert({
      student_id: payload.studentId,
      requirement_id: payload.requirementId,
      amount_paid: payload.amountPaid,
      paid_on: payload.paidOn,
      method: payload.method,
      remarks: payload.remarks,
    })
    .select(paymentColumns)
    .single();
  if (error) throw new Error(error.message);
  return mapPayment(data);
}

export async function updatePayment(id: string, payload: Partial<PaymentPayload>) {
  const client = getAdminClient();
  const { data, error } = await client
    .from("student_payments")
    .update({
      student_id: payload.studentId,
      requirement_id: payload.requirementId,
      amount_paid: payload.amountPaid,
      paid_on: payload.paidOn,
      method: payload.method,
      remarks: payload.remarks,
    })
    .eq("id", id)
    .select(paymentColumns)
    .single();
  if (error) throw new Error(error.message);
  return mapPayment(data);
}

export async function deletePayment(id: string) {
  const client = getAdminClient();
  const { error } = await client.from("student_payments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

const mapStatusRow = (row: StatusRow): StudentStatus => ({
  studentId: row.id,
  studentCode: row.student_code,
  studentName: `${row.first_name} ${row.last_name}`,
  gradeLevel: row.grade_level,
  totalRequired: toNumber(row.total_required),
  totalPaid: toNumber(row.total_paid),
  balance: toNumber(row.balance),
  paymentStatus: row.payment_status as StudentStatus["paymentStatus"],
});

export async function fetchStatusCollection(filter?: "fully_paid" | "lacking") {
  const client = getAdminClient();
  let query = client.from("student_payment_status").select("*");
  if (filter === "fully_paid") {
    query = query.eq("payment_status", "fully_paid");
  }
  if (filter === "lacking") {
    query = query.in("payment_status", ["partial", "unpaid"]);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data.map(mapStatusRow);
}

export async function fetchStudentStatusByCode(
  studentCode: string
): Promise<StudentStatusDetail> {
  const client = getAdminClient();
  const { data: statusRow, error: statusError } = await client
    .from("student_payment_status")
    .select("*")
    .eq("student_code", studentCode)
    .single();
  if (statusError) {
    // PGRST116 = "no rows returned" — Supabase's .single() error when the code doesn't exist
    if (statusError.code === "PGRST116") {
      throw new Error(`LRN "${studentCode}" was not found. Please check and try again.`);
    }
    throw new Error(statusError.message);
  }
  if (!statusRow) throw new Error(`LRN "${studentCode}" was not found. Please check and try again.`);

  const adminClient = getAdminClient();
  const [requirements, paymentsResult] = await Promise.all([
    fetchRequirements(),
    adminClient.from("student_payments").select(paymentColumns)
      .eq("student_id", statusRow.id).order("paid_on", { ascending: false }),
  ]);
  if (paymentsResult.error) throw new Error(paymentsResult.error.message);
  const studentPayments = paymentsResult.data.map(mapPayment);

  const breakdownMap = new Map<string, RequirementBreakdown>();
  requirements.forEach((req) => {
    breakdownMap.set(req.id, {
      requirementId: req.id,
      label: req.label,
      amountRequired: req.amount,
      amountPaid: 0,
    });
  });

  const miscKey = "misc";
  breakdownMap.set(miscKey, {
    requirementId: null,
    label: "Miscellaneous",
    amountRequired: 0,
    amountPaid: 0,
  });

  studentPayments.forEach((payment) => {
    const key = payment.requirementId ?? miscKey;
    const existing =
      breakdownMap.get(key) ??
      {
        requirementId: payment.requirementId ?? null,
        label: "Unmapped requirement",
        amountRequired: 0,
        amountPaid: 0,
      };
    existing.amountPaid += payment.amountPaid;
    breakdownMap.set(key, existing);
  });

  const breakdown = Array.from(breakdownMap.values()).filter(
    (item) => item.amountRequired > 0 || item.amountPaid > 0
  );

  return {
    ...mapStatusRow(statusRow),
    payments: studentPayments,
    breakdown,
  };
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const [requirements, statuses] = await Promise.all([
    fetchRequirements(),
    fetchStatusCollection(),
  ]);

  // Sum each student's actual totalRequired from the view — not a multiply,
  // because optional requirements may vary per student in the future.
  const totalRequired   = statuses.reduce((sum, s) => sum + s.totalRequired, 0);
  const totalCollected  = statuses.reduce((sum, s) => sum + s.totalPaid, 0);
  const totalOutstanding = statuses.reduce((sum, s) => sum + s.balance, 0);
  const fullyPaidCount  = statuses.filter((s) => s.paymentStatus === "fully_paid").length;
  // "lacking" = partial or unpaid only — students with no requirements are not lacking
  const lackingCount    = statuses.filter(
    (s) => s.paymentStatus === "partial" || s.paymentStatus === "unpaid"
  ).length;

  return {
    totalRequired,
    totalCollected,
    totalOutstanding,
    fullyPaidCount,
    lackingCount,
  };
}

