import { deletePayment, updatePayment } from "@/lib/db";
import { handleApiError, jsonResponse } from "@/lib/http";
import { paymentSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const body = await request.json();
    const payload = paymentSchema.partial().parse(body);
    const { id } = await params;
    const payment = await updatePayment(id, payload);
    return jsonResponse({ payment });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    await deletePayment(id);
    return jsonResponse({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

