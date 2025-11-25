import { NextResponse } from "next/server";
import { Buffer } from "node:buffer";
import * as XLSX from "xlsx";
import { bulkCreateStudents } from "@/lib/db";
import { handleApiError } from "@/lib/http";
import { studentSchema } from "@/lib/validators";

const REQUIRED_COLUMNS = ["lrn", "first name", "last name", "grade level"] as const;

const normalizeKey = (value: string) => value.trim().toLowerCase();

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ message: "Missing Excel file upload." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const worksheetName = workbook.SheetNames[0];
    if (!worksheetName) {
      return NextResponse.json({ message: "Excel file is empty." }, { status: 400 });
    }

    const worksheet = workbook.Sheets[worksheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: "" });
    if (!rows.length) {
      return NextResponse.json({ message: "Excel sheet has no data rows." }, { status: 400 });
    }

    const missingColumns = REQUIRED_COLUMNS.filter(
      (column) =>
        !Object.keys(rows[0]).some((key) => normalizeKey(key) === normalizeKey(column))
    );
    if (missingColumns.length) {
      return NextResponse.json(
        {
          message: `Missing required columns: ${missingColumns
            .map((col) => `"${col}"`)
            .join(", ")}`,
        },
        { status: 400 }
      );
    }

    const parsedRows = rows
      .map((row, index) => {
        const normalizedEntries = Object.entries(row).reduce<Record<string, string>>(
          (acc, [key, value]) => {
            acc[normalizeKey(key)] = String(value ?? "").trim();
            return acc;
          },
          {}
        );

        const mapped = {
          studentCode: (normalizedEntries["lrn"] ?? "").toUpperCase(),
          firstName: normalizedEntries["first name"] ?? "",
          lastName: normalizedEntries["last name"] ?? "",
          gradeLevel: normalizedEntries["grade level"] || null,
          guardianContact: null,
          status: "active" as const,
          notes: null,
        };

        try {
          return studentSchema.parse(mapped);
        } catch (error) {
          throw new Error(`Row ${index + 2} failed validation: ${(error as Error).message}`);
        }
      })
      .filter(Boolean);

    if (!parsedRows.length) {
      return NextResponse.json(
        { message: "No valid student rows detected. Please check your file." },
        { status: 400 }
      );
    }

    const students = await bulkCreateStudents(parsedRows);

    return NextResponse.json({
      inserted: students.length,
      total: parsedRows.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

