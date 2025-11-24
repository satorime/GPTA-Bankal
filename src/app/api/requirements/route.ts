import { NextRequest } from "next/server";
import { createRequirement, fetchRequirements } from "@/lib/db";
import { handleApiError, jsonResponse } from "@/lib/http";
import { paymentRequirementSchema } from "@/lib/validators";

export async function GET() {
  try {
    const requirements = await fetchRequirements();
    return jsonResponse({ requirements });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = paymentRequirementSchema.parse(body);
    const requirement = await createRequirement(payload);
    return jsonResponse({ requirement }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}




