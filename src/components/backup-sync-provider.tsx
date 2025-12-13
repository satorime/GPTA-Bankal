"use client";

import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

/**
 * Client-side component that sets up Supabase real-time subscriptions
 * to automatically trigger backup sync when data changes.
 * 
 * Note: Real-time must be enabled on the tables in Supabase.
 * Run the migration: supabase/migrations/0002_enable_realtime.sql
 */
export function BackupSyncProvider() {
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("Supabase credentials not found, backup sync disabled");
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    // Debounce function to avoid excessive API calls
    let syncTimeout: NodeJS.Timeout | null = null;
    const triggerBackup = () => {
      if (syncTimeout) {
        clearTimeout(syncTimeout);
      }
      syncTimeout = setTimeout(async () => {
        try {
          const response = await fetch("/api/backup/sync", { method: "POST" });
          const result = await response.json();
          if (result.success) {
            console.log("✅ Backup synced after database change");
          } else {
            // Backup failed but it's non-critical - just log as warning
            console.warn("⚠️ Backup sync skipped (non-critical)");
          }
        } catch (error) {
          // Network errors are also non-critical for backups
          console.warn("⚠️ Backup sync error (non-critical):", error);
        }
      }, 2000); // Wait 2 seconds after last change
    };

    // Subscribe to changes on all tables
    const channel = supabase
      .channel("backup-sync-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "students",
        },
        (payload) => {
          console.log("📝 Students table changed:", payload.eventType);
          triggerBackup();
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
          triggerBackup();
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
          triggerBackup();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Backup sync subscribed to Supabase real-time changes");
          // Create initial backup (non-critical if it fails)
          fetch("/api/backup/sync", { method: "POST" })
            .then(async (response) => {
              const result = await response.json();
              if (result.success) {
                console.log("✅ Initial backup created");
              } else {
                console.warn("⚠️ Initial backup skipped (non-critical)");
              }
            })
            .catch((error) => {
              console.warn("⚠️ Initial backup error (non-critical):", error);
            });
        } else if (status === "CHANNEL_ERROR") {
          console.warn("⚠️ Backup sync channel error (non-critical)");
        }
      });

    return () => {
      if (syncTimeout) {
        clearTimeout(syncTimeout);
      }
      supabase.removeChannel(channel);
    };
  }, []);

  return null; // This component doesn't render anything
}

