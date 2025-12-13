# Automatic Excel Backup System

This system automatically creates and maintains an Excel backup file that mirrors all data in Supabase.

## How It Works

1. **Initial Backup**: When the admin page loads, an initial backup is automatically created
2. **Real-time Sync**: The system subscribes to Supabase real-time changes and automatically updates the backup file whenever data changes
3. **Backup Location**: Backups are stored in `backups/database-backup.xlsx` in the project root

## Setup

### 1. Enable Real-time in Supabase

Run the migration to enable real-time on all tables:

```bash
supabase db push --file supabase/migrations/0002_enable_realtime.sql
```

Or manually in Supabase Dashboard:
- Go to Database → Replication
- Enable replication for: `students`, `payment_requirements`, `student_payments`

### 2. Backup File Structure

The Excel backup file contains 4 sheets:

1. **Students**: All student records with full details
2. **Requirements**: All payment requirements
3. **Payments**: All payment transactions
4. **Summary**: Payment summary with student names resolved

## API Endpoints

### `POST /api/backup/sync`
Manually trigger a backup sync. Returns the backup file path.

### `GET /api/backup/sync`
Check if backup file exists.

### `POST /api/backup/init`
Initialize the backup sync system (called automatically on admin page load).

## Automatic Sync Behavior

- **Debounced Updates**: Changes are debounced by 2 seconds to avoid excessive file writes
- **Multiple Changes**: If multiple changes occur quickly, only one backup is created after the last change
- **Initial Backup**: Created automatically when the admin page first loads
- **Real-time Monitoring**: Monitors all INSERT, UPDATE, and DELETE operations on all three tables

## File Location

Backups are stored in: `{project-root}/backups/database-backup.xlsx`

The `backups/` directory is automatically created if it doesn't exist and is ignored by git.

## Notes

- The backup file is overwritten on each sync (not versioned)
- In serverless environments (like Vercel), file system writes may not persist. Consider using cloud storage for production.
- Real-time subscriptions require proper Supabase configuration and RLS policies

