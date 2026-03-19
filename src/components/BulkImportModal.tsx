import { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StudentPayload } from "@/lib/validators";

type ParsedRow = StudentPayload & { _row: number; _valid: boolean; _errors: string[] };
export type ImportResult = { inserted: number; skipped: number };

interface Props {
  onClose: () => void;
  onImport: (rows: StudentPayload[]) => Promise<ImportResult>;
}

// Maps every reasonable column alias → StudentPayload key
const ALIAS: Record<string, keyof StudentPayload> = {
  lrn:               "studentCode",
  studentcode:       "studentCode",
  student_code:      "studentCode",
  lrncode:           "studentCode",
  learnerreferencenumber: "studentCode",
  firstname:         "firstName",
  first_name:        "firstName",
  givenname:         "firstName",
  lastname:          "lastName",
  last_name:         "lastName",
  surname:           "lastName",
  familyname:        "lastName",
  gradelevel:        "gradeLevel",
  grade_level:       "gradeLevel",
  grade:             "gradeLevel",
  yearlevel:         "gradeLevel",
  year_level:        "gradeLevel",
  guardiancontact:   "guardianContact",
  guardian_contact:  "guardianContact",
  contact:           "guardianContact",
  guardian:          "guardianContact",
  phone:             "guardianContact",
  parentcontact:     "guardianContact",
  status:            "status",
  notes:             "notes",
  remarks:           "notes",
};

function normalizeKey(k: string) {
  return k.trim().toLowerCase().replace(/[\s_\-]/g, "");
}

function parseSheet(ws: XLSX.WorkSheet): ParsedRow[] {
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  return rawRows.map((raw, i) => {
    const mapped: Partial<Record<keyof StudentPayload, string>> = {};
    for (const [k, v] of Object.entries(raw)) {
      const field = ALIAS[normalizeKey(k)];
      if (field) mapped[field] = String(v ?? "").trim();
    }

    const errors: string[] = [];
    const studentCode = (mapped.studentCode ?? "").toUpperCase();
    const firstName   = mapped.firstName   ?? "";
    const lastName    = mapped.lastName    ?? "";

    if (!studentCode)           errors.push("LRN is required");
    else if (studentCode.length < 3) errors.push("LRN must be at least 3 characters");
    if (!firstName)             errors.push("First name is required");
    if (!lastName)              errors.push("Last name is required");

    const statusRaw = (mapped.status ?? "").toLowerCase();
    const status: "active" | "inactive" = statusRaw === "inactive" ? "inactive" : "active";

    return {
      studentCode,
      firstName,
      lastName,
      gradeLevel:      mapped.gradeLevel      || null,
      guardianContact: mapped.guardianContact || null,
      status,
      notes:           mapped.notes           || null,
      _row:    i + 2, // row 1 = headers
      _valid:  errors.length === 0,
      _errors: errors,
    };
  });
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["lrn", "first_name", "last_name", "grade_level", "guardian_contact"],
    ["123456789012", "Juan", "Dela Cruz", "7", "09XX-XXX-XXXX"],
    ["123456789013", "Maria", "Santos",   "8", "09YY-YYY-YYYY"],
  ]);
  // Column widths for readability
  ws["!cols"] = [
    { wch: 16 }, { wch: 16 }, { wch: 16 },
    { wch: 13 }, { wch: 20 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  XLSX.writeFile(wb, "students_template.xlsx");
}

export default function BulkImportModal({ onClose, onImport }: Props) {
  const [rows,      setRows]      = useState<ParsedRow[] | null>(null);
  const [fileName,  setFileName]  = useState("");
  const [importing, setImporting] = useState(false);
  const [result,    setResult]    = useState<ImportResult | null>(null);
  const [dragOver,  setDragOver]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const wb   = XLSX.read(data, { type: "array" });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      setRows(parseSheet(ws));
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const validRows    = rows?.filter((r) => r._valid)  ?? [];
  const invalidCount = (rows?.length ?? 0) - validRows.length;

  const handleImport = async () => {
    if (!validRows.length) return;
    setImporting(true);
    try {
      const payloads: StudentPayload[] = validRows.map(
        ({ studentCode, firstName, lastName, gradeLevel, guardianContact, status, notes }) =>
          ({ studentCode, firstName, lastName, gradeLevel, guardianContact, status, notes })
      );
      const res = await onImport(payloads);
      setResult(res);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal card */}
      <div className="relative nm-card w-full max-w-2xl max-h-[90vh] overflow-y-auto scroll-hidden rounded-3xl p-6 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--brand-green-dark)]">
              Import Students from Excel
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Supports .xlsx, .xls, and .csv files
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={downloadTemplate} title="Download sample template">
              <Download className="h-4 w-4 mr-1.5" />
              Template
            </Button>
            <Button variant="ghost" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Result state ── */}
        {result ? (
          <div className="nm-inset rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-[var(--brand-green)]" />
            <div>
              <p className="font-bold text-[var(--brand-green-dark)] text-base">Import complete</p>
              <p className="text-sm text-[var(--foreground)] mt-1">
                <span className="font-bold text-[var(--brand-green)]">{result.inserted}</span>
                {" "}student{result.inserted !== 1 ? "s" : ""} added
                {result.skipped > 0 && (
                  <>
                    {" · "}
                    <span className="font-bold text-[var(--muted)]">{result.skipped}</span>
                    {" "}skipped (LRN already exists)
                  </>
                )}
              </p>
            </div>
            <Button onClick={onClose}>Done</Button>
          </div>

        ) : rows === null ? (
          /* ── Drop zone ── */
          <>
            <div
              className={`nm-inset rounded-2xl flex flex-col items-center justify-center gap-3 p-12 cursor-pointer transition-opacity ${dragOver ? "opacity-60" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            >
              <FileSpreadsheet className="h-14 w-14 text-[var(--brand-green)] opacity-60" />
              <p className="font-semibold text-[var(--foreground)]">Drop your file here</p>
              <p className="text-sm text-[var(--muted)]">or click to browse (.xlsx, .xls, .csv)</p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            {/* Column guide */}
            <div className="nm-inset-sm rounded-xl px-4 py-3 text-xs text-[var(--muted)] space-y-1">
              <p className="font-semibold uppercase tracking-wide text-[var(--foreground)]">
                Expected columns
              </p>
              <p>
                <span className="font-mono text-[var(--foreground)]">lrn</span>
                {" · "}
                <span className="font-mono text-[var(--foreground)]">first_name</span>
                {" · "}
                <span className="font-mono text-[var(--foreground)]">last_name</span>
                {" · "}
                <span className="font-mono text-[var(--foreground)]">grade_level</span>
                {" · "}
                <span className="font-mono text-[var(--foreground)]">guardian_contact</span>
              </p>
              <p>
                Only <span className="font-mono text-[var(--foreground)]">lrn</span>,{" "}
                <span className="font-mono text-[var(--foreground)]">first_name</span>, and{" "}
                <span className="font-mono text-[var(--foreground)]">last_name</span> are required.
                Column names are case-insensitive.
              </p>
            </div>
          </>

        ) : (
          /* ── Preview state ── */
          <>
            {/* Summary bar */}
            <div className="nm-inset-sm rounded-xl px-4 py-2.5 flex items-center justify-between text-sm">
              <span className="text-[var(--muted)] flex items-center gap-2 truncate">
                <FileSpreadsheet className="h-4 w-4 text-[var(--brand-green)] shrink-0" />
                <span className="truncate">{fileName}</span>
              </span>
              <div className="flex gap-3 shrink-0 ml-3">
                <span className="text-[var(--brand-green)] font-semibold">
                  {validRows.length} valid
                </span>
                {invalidCount > 0 && (
                  <span className="text-rose-500 font-semibold flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {invalidCount} error{invalidCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {/* Preview table */}
            <div className="nm-inset rounded-xl overflow-auto max-h-64 scroll-hidden">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[var(--background)]">
                  <tr className="text-left text-[var(--muted)] uppercase tracking-wide border-b border-[rgba(90,175,34,0.12)]">
                    <th className="px-3 py-2 font-semibold">#</th>
                    <th className="px-3 py-2 font-semibold">LRN</th>
                    <th className="px-3 py-2 font-semibold">First Name</th>
                    <th className="px-3 py-2 font-semibold">Last Name</th>
                    <th className="px-3 py-2 font-semibold">Grade</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row._row}
                      className={`border-t border-[rgba(90,175,34,0.08)] ${
                        !row._valid ? "bg-rose-50/60" : ""
                      }`}
                    >
                      <td className="px-3 py-1.5 text-[var(--muted)]">{row._row}</td>
                      <td className="px-3 py-1.5 font-mono">
                        {row.studentCode || <span className="text-rose-400 italic">missing</span>}
                      </td>
                      <td className="px-3 py-1.5">
                        {row.firstName || <span className="text-rose-400 italic">missing</span>}
                      </td>
                      <td className="px-3 py-1.5">
                        {row.lastName || <span className="text-rose-400 italic">missing</span>}
                      </td>
                      <td className="px-3 py-1.5">{row.gradeLevel || "—"}</td>
                      <td className="px-3 py-1.5">{row.status}</td>
                      <td className="px-3 py-1.5 text-rose-500">{row._errors.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invalidCount > 0 && (
              <p className="text-xs text-[var(--muted)]">
                Rows with errors will be skipped. Only valid rows will be imported.
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => { setRows(null); setFileName(""); }}
              >
                Change file
              </Button>
              <Button
                onClick={handleImport}
                loading={importing}
                disabled={validRows.length === 0}
              >
                Import {validRows.length} student{validRows.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
