import { NextResponse } from "next/server";
import { createBackup } from "@/lib/backup-service";
import { handleApiError, jsonResponse } from "@/lib/http";

/**
 * POST /api/backup/sync
 * Manually trigger a backup sync
 * Note: Backup failures are non-critical and won't break the app
 */
export async function POST() {
  const backupPath = await createBackup();
  if (backupPath) {
    return jsonResponse({
      success: true,
      message: "Backup created successfully",
      path: backupPath,
    });
  } else {
    // Backup is optional - silently fail
    return jsonResponse({
      success: false,
      message: "Unable to create backup file. The application will continue to work normally.",
      warning: true,
    });
  }
}

/**
 * GET /api/backup/sync
 * Get backup status
 */
export async function GET() {
  try {
    const { backupExists } = await import("@/lib/backup-service");
    const exists = await backupExists();
    return jsonResponse({
      exists,
      message: exists ? "Backup file exists" : "Backup file not found",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

