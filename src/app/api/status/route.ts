import { NextRequest } from "next/server";
import { fetchStudentStatusByCode } from "@/lib/db";
import { handleApiError, jsonResponse } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const studentCode = request.nextUrl.searchParams.get("studentCode");
    if (!studentCode) {
      throw new Error("studentCode is required");
    }
    const status = await fetchStudentStatusByCode(studentCode);
    return jsonResponse({ status });
  } catch (error) {
    return handleApiError(error);
  }
}




