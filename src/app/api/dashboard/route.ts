import { fetchDashboardMetrics } from "@/lib/db";
import { handleApiError, jsonResponse } from "@/lib/http";

export async function GET() {
  try {
    const metrics = await fetchDashboardMetrics();
    return jsonResponse({ metrics });
  } catch (error) {
    return handleApiError(error);
  }
}




