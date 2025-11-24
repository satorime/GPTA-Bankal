import { NextRequest } from "next/server";
import { createPayment, fetchPayments } from "@/lib/db";
import { handleApiError, jsonResponse } from "@/lib/http";
import { paymentSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const studentId = request.nextUrl.searchParams.get("studentId") ?? undefined;
    const payments = await fetchPayments(studentId);
    return jsonResponse({ payments });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = paymentSchema.parse(body);
    const payment = await createPayment(payload);
    return jsonResponse({ payment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}




