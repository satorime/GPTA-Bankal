import { NextRequest } from "next/server";
import { fetchStatusCollection } from "@/lib/db";
import { handleApiError, jsonResponse } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const filter = request.nextUrl.searchParams.get("filter") as
      | "fully_paid"
      | "lacking"
      | null;
    const statuses = await fetchStatusCollection(filter ?? undefined);
    return jsonResponse({ statuses });
  } catch (error) {
    return handleApiError(error);
  }
}




