import * as XLSX from "xlsx";
import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import { fetchStudents, fetchRequirements, fetchPayments, fetchStatusCollection } from "./db";
import type { Student, PaymentRequirement, StudentPayment, StudentStatus, RequirementBreakdown } from "./types";

/**
 * Gets a writable backup directory
 * Uses user's Documents folder (or home directory) which is always writable
 */
async function getBackupDir(): Promise<string> {
  // Get user's home directory
  const homeDir = homedir();
  
  // Try Documents folder first (Windows/Mac), fall back to home directory
  const possibleDirs = [
    join(homeDir, "Documents", "StudentPayTracker", "backups"), // Windows/Mac Documents
    join(homeDir, "StudentPayTracker", "backups"), // Fallback to home directory
  ];

  for (const backupDir of possibleDirs) {
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(backupDir, { recursive: true });
      // Verify we can write to it
      const testFile = join(backupDir, ".test");
      await fs.writeFile(testFile, "test");
      await fs.unlink(testFile);
      return backupDir;
    } catch {
      // Try next directory
      continue;
    }
  }

  // If all else fails, throw an error
  throw new Error(
    "Unable to create backup directory. Please check file system permissions."
  );
}

/**
 * Ensures the backup directory exists
 */
async function ensureBackupDir(): Promise<string> {
  const backupDir = await getBackupDir();
  try {
    await fs.access(backupDir);
  } catch {
    await fs.mkdir(backupDir, { recursive: true });
  }
  return backupDir;
}

/**
 * Creates or updates the Excel backup file with all data from Supabase
 * Returns the backup file path on success, or null on failure
 */
export async function createBackup(): Promise<string | null> {
  try {
    // Ensure backup directory exists
    const BACKUP_DIR = await ensureBackupDir();
    const BACKUP_FILE = join(BACKUP_DIR, "database-backup.xlsx");

    // Fetch all data from Supabase
    const [students, requirements, payments, statuses] = await Promise.all([
      fetchStudents(),
      fetchRequirements(),
      fetchPayments(),
      fetchStatusCollection(),
    ]);

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Students
    const studentsData = students.map((student) => ({
      ID: student.id,
      "Student Code": student.studentCode,
      "First Name": student.firstName,
      "Last Name": student.lastName,
      "Grade Level": student.gradeLevel ?? "",
      "Guardian Contact": student.guardianContact ?? "",
      Status: student.status,
      Notes: student.notes ?? "",
      "Created At": student.createdAt,
      "Updated At": student.updatedAt,
    }));
    const studentsSheet = XLSX.utils.json_to_sheet(studentsData);
    XLSX.utils.book_append_sheet(workbook, studentsSheet, "Students");

    // Sheet 2: Payment Requirements
    const requirementsData = requirements.map((req) => ({
      ID: req.id,
      Label: req.label,
      Description: req.description ?? "",
      Amount: req.amount,
      "Due Date": req.dueDate ?? "",
      "Is Required": req.isRequired ? "Yes" : "No",
      "Created At": req.createdAt,
      "Updated At": req.updatedAt,
    }));
    const requirementsSheet = XLSX.utils.json_to_sheet(requirementsData);
    XLSX.utils.book_append_sheet(workbook, requirementsSheet, "Requirements");

    // Sheet 3: Payments
    const paymentsData = payments.map((payment) => ({
      ID: payment.id,
      "Student ID": payment.studentId,
      "Requirement ID": payment.requirementId ?? "",
      "Amount Paid": payment.amountPaid,
      "Paid On": payment.paidOn ?? "",
      Method: payment.method ?? "",
      Remarks: payment.remarks ?? "",
      "Created At": payment.createdAt,
      "Updated At": payment.updatedAt,
    }));
    const paymentsSheet = XLSX.utils.json_to_sheet(paymentsData);
    XLSX.utils.book_append_sheet(workbook, paymentsSheet, "Payments");

    // Sheet 4: Payment Status Overview (shows what's paid vs owed per student)
    const statusData = statuses.map((status) => ({
      "Student Code": status.studentCode,
      "Student Name": status.studentName,
      "Grade Level": status.gradeLevel ?? "",
      "Total Required": status.totalRequired,
      "Total Paid": status.totalPaid,
      "Balance": status.balance,
      "Payment Status": status.paymentStatus === "fully_paid" 
        ? "Fully Paid" 
        : status.paymentStatus === "partial" 
        ? "Partial" 
        : status.paymentStatus === "unpaid"
        ? "Unpaid"
        : "No Requirements",
    }));
    const statusSheet = XLSX.utils.json_to_sheet(statusData);
    XLSX.utils.book_append_sheet(workbook, statusSheet, "Payment Status");

    // Sheet 5: Detailed Breakdown (per student, per requirement)
    const studentsMap = new Map(students.map((s) => [s.id, s]));
    
    // Create breakdown data for each student
    const breakdownData: Array<{
      "Student Code": string;
      "Student Name": string;
      "Grade Level": string;
      "Requirement": string;
      "Required Amount": number;
      "Paid Amount": number;
      "Balance": number;
      "Status": string;
    }> = [];

    // Group payments by student and requirement
    const paymentsByStudent = new Map<string, Map<string | null, number>>();
    
    payments.forEach((payment) => {
      if (!paymentsByStudent.has(payment.studentId)) {
        paymentsByStudent.set(payment.studentId, new Map());
      }
      const studentPayments = paymentsByStudent.get(payment.studentId)!;
      const reqId = payment.requirementId ?? "misc";
      const current = studentPayments.get(reqId) || 0;
      studentPayments.set(reqId, current + payment.amountPaid);
    });

    // Create breakdown rows for each student
    students.forEach((student) => {
      const studentPayments = paymentsByStudent.get(student.id) || new Map();
      
      // Add rows for each requirement
      requirements.forEach((req) => {
        const paid = studentPayments.get(req.id) || 0;
        const required = req.amount;
        const balance = Math.max(required - paid, 0);
        const status = paid >= required ? "Paid" : paid > 0 ? "Partial" : "Unpaid";
        
        breakdownData.push({
          "Student Code": student.studentCode,
          "Student Name": `${student.firstName} ${student.lastName}`,
          "Grade Level": student.gradeLevel ?? "",
          "Requirement": req.label,
          "Required Amount": required,
          "Paid Amount": paid,
          "Balance": balance,
          "Status": status,
        });
      });

      // Add miscellaneous payments row if any
      const miscPaid = studentPayments.get("misc") || 0;
      if (miscPaid > 0) {
        breakdownData.push({
          "Student Code": student.studentCode,
          "Student Name": `${student.firstName} ${student.lastName}`,
          "Grade Level": student.gradeLevel ?? "",
          "Requirement": "Miscellaneous",
          "Required Amount": 0,
          "Paid Amount": miscPaid,
          "Balance": 0,
          "Status": "Paid",
        });
      }
    });

    const breakdownSheet = XLSX.utils.json_to_sheet(breakdownData);
    XLSX.utils.book_append_sheet(workbook, breakdownSheet, "Payment Breakdown");

    // Sheet 6: Summary (with student names resolved) - keeping for backward compatibility
    const summaryData = payments.map((payment) => {
      const student = studentsMap.get(payment.studentId);
      return {
        "Payment ID": payment.id,
        "Student Code": student?.studentCode ?? "",
        "Student Name": student ? `${student.firstName} ${student.lastName}` : "",
        "Requirement ID": payment.requirementId ?? "",
        "Amount Paid": payment.amountPaid,
        "Paid On": payment.paidOn ?? "",
        Method: payment.method ?? "",
        Remarks: payment.remarks ?? "",
      };
    });
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Payment History");

    // Write the workbook to file using buffer approach for better reliability
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    await fs.writeFile(BACKUP_FILE, buffer);
    console.log(`✅ Backup file created at: ${BACKUP_FILE}`);
    return BACKUP_FILE;
  } catch (error) {
    // Log the error but don't break the app
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Backup creation failed:", errorMessage);
    // Return null to indicate failure, but don't throw
    return null;
  }
}

/**
 * Gets the path to the backup file
 * Note: This may not be accurate if backup directory changes, use createBackup() to get actual path
 */
export async function getBackupFilePath(): Promise<string> {
  const BACKUP_DIR = await getBackupDir();
  return join(BACKUP_DIR, "database-backup.xlsx");
}

/**
 * Checks if backup file exists
 */
export async function backupExists(): Promise<boolean> {
  try {
    const BACKUP_DIR = await getBackupDir();
    const BACKUP_FILE = join(BACKUP_DIR, "database-backup.xlsx");
    await fs.access(BACKUP_FILE);
    return true;
  } catch {
    return false;
  }
}

