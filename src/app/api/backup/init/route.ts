import { NextResponse } from "next/server";
import { createBackup } from "@/lib/backup-service";
import { jsonResponse, handleApiError } from "@/lib/http";

/**
 * POST /api/backup/init
 * Initialize backup system by creating an initial backup
 * This is called automatically when the admin page loads
 * Note: Backup failures are non-critical and won't break the app
 */
export async function POST() {
  const backupPath = await createBackup();
  if (backupPath) {
    return jsonResponse({
      success: true,
      message: "Initial backup created",
      path: backupPath,
    });
  } else {
    // Backup is optional - silently fail
    return jsonResponse({
      success: false,
      message: "Backup system unavailable. The application will continue to work normally, but automatic backups are disabled.",
      warning: true,
    });
  }
}

