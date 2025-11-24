import type {
  PaymentPayload,
  PaymentRequirementPayload,
  StudentPayload,
} from "./validators";

export type Student = StudentPayload & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentRequirement = PaymentRequirementPayload & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type StudentPayment = PaymentPayload & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type RequirementBreakdown = {
  requirementId: string | null;
  label: string;
  amountRequired: number;
  amountPaid: number;
};

export type StudentStatus = {
  studentId: string;
  studentCode: string;
  studentName: string;
  gradeLevel: string | null;
  totalRequired: number;
  totalPaid: number;
  balance: number;
  paymentStatus: "fully_paid" | "partial" | "unpaid" | "no_requirements";
};

export type StudentStatusDetail = StudentStatus & {
  payments: StudentPayment[];
  breakdown: RequirementBreakdown[];
};

export type DashboardMetrics = {
  totalRequired: number;
  totalCollected: number;
  totalOutstanding: number;
  fullyPaidCount: number;
  lackingCount: number;
};




