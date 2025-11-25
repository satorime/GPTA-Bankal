import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { fetchStatusCollection } from "@/lib/db";
import { handleApiError } from "@/lib/http";

export async function GET() {
  try {
    const statuses = await fetchStatusCollection();

    const sheetData = statuses.map((status) => ({
      "Student Code": status.studentCode,
      "Student Name": status.studentName,
      "Grade Level": status.gradeLevel ?? "",
      "Total Required": status.totalRequired,
      "Total Paid": status.totalPaid,
      Balance: status.balance,
      Status:
        status.paymentStatus === "fully_paid"
          ? "Fully Paid"
          : status.paymentStatus === "partial"
          ? "Partial"
          : status.paymentStatus === "unpaid"
          ? "Unpaid"
          : "No Requirements",
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Summary");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const filename = `gpta-summary-${new Date().toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

