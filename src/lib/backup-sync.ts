import { getAdminClient } from "./supabase";
import { createBackup } from "./backup-service";
import type { RealtimeChannel } from "@supabase/supabase-js";

let syncChannel: RealtimeChannel | null = null;
let isSyncing = false;
let syncTimeout: NodeJS.Timeout | null = null;

/**
 * Debounced backup sync - waits for a short period after the last change
 * before creating a backup to avoid excessive file writes
 */
async function debouncedSync() {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    if (isSyncing) return;
    
    try {
      isSyncing = true;
      const result = await createBackup();
      if (result) {
        console.log("✅ Backup synced successfully");
      } else {
        // Backup failed but it's non-critical - just log as warning
        console.warn("⚠️ Backup sync skipped (file system may be read-only)");
      }
    } catch (error) {
      // Should not happen since createBackup now returns null instead of throwing
      console.warn("⚠️ Backup sync error (non-critical):", error);
    } finally {
      isSyncing = false;
    }
  }, 2000); // Wait 2 seconds after last change before syncing
}

/**
 * Initialize automatic backup sync using Supabase real-time subscriptions
 */
export function startBackupSync() {
  if (syncChannel) {
    console.log("Backup sync already started");
    return;
  }

  const client = getAdminClient();

  // Create a channel for real-time subscriptions
  syncChannel = client
    .channel("backup-sync")
    .on(
      "postgres_changes",
      {
        event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
        schema: "public",
        table: "students",
      },
      (payload) => {
        console.log("📝 Students table changed:", payload.eventType);
        debouncedSync();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "payment_requirements",
      },
      (payload) => {
        console.log("📝 Requirements table changed:", payload.eventType);
        debouncedSync();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "student_payments",
      },
      (payload) => {
        console.log("📝 Payments table changed:", payload.eventType);
        debouncedSync();
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("✅ Backup sync subscribed to Supabase real-time changes");
        // Create initial backup (non-critical if it fails)
        createBackup().then((result) => {
          if (result) {
            console.log("✅ Initial backup created");
          } else {
            console.warn("⚠️ Initial backup skipped (file system may be read-only)");
          }
        });
      } else if (status === "CHANNEL_ERROR") {
        console.warn("⚠️ Backup sync channel error (non-critical)");
      }
    });
}

/**
 * Stop the backup sync
 */
export function stopBackupSync() {
  if (syncChannel) {
    syncChannel.unsubscribe();
    syncChannel = null;
    if (syncTimeout) {
      clearTimeout(syncTimeout);
      syncTimeout = null;
    }
    console.log("🛑 Backup sync stopped");
  }
}

