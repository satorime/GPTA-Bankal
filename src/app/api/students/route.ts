import { NextRequest } from "next/server";
import { createStudent, fetchStudents } from "@/lib/db";
import { handleApiError, jsonResponse } from "@/lib/http";
import { studentSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search") ?? undefined;
    const students = await fetchStudents(search);
    return jsonResponse({ students });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = studentSchema.parse(body);
    const student = await createStudent(payload);
    return jsonResponse({ student }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}




