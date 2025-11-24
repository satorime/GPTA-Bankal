import { deleteStudent, updateStudent } from "@/lib/db";
import { handleApiError, jsonResponse } from "@/lib/http";
import { studentSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const body = await request.json();
    const payload = studentSchema.partial().parse(body);
    const { id } = await params;
    const student = await updateStudent(id, payload);
    return jsonResponse({ student });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    await deleteStudent(id);
    return jsonResponse({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

