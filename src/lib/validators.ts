import { z } from "zod";

export const studentSchema = z.object({
  studentCode: z.string().min(3),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  gradeLevel: z.string().optional().nullable(),
  guardianContact: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: z.string().optional().nullable(),
});

export const paymentRequirementSchema = z.object({
  label: z.string().min(2),
  description: z.string().optional().nullable(),
  amount: z.number().nonnegative(),
  dueDate: z.string().optional().nullable(),
  isRequired: z.boolean().default(true),
});

export const paymentSchema = z.object({
  studentId: z.string().uuid(),
  requirementId: z.string().uuid().optional().nullable(),
  amountPaid: z.number().positive(),
  paidOn: z.string().optional().nullable(),
  method: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export type StudentPayload = z.infer<typeof studentSchema>;
export type PaymentRequirementPayload = z.infer<typeof paymentRequirementSchema>;
export type PaymentPayload = z.infer<typeof paymentSchema>;




