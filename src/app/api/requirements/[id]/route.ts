import { deleteRequirement, updateRequirement } from "@/lib/db";
import { handleApiError, jsonResponse } from "@/lib/http";
import { paymentRequirementSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const body = await request.json();
    const payload = paymentRequirementSchema.partial().parse(body);
    const { id } = await params;
    const requirement = await updateRequirement(id, payload);
    return jsonResponse({ requirement });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    await deleteRequirement(id);
    return jsonResponse({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

