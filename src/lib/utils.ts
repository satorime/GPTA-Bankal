export function formatCurrency(amount: number, currency = "PHP") {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount ?? 0);
}

export function formatDate(value?: string | null) {
  if (!value) return "";
  // Append time so the date is parsed as LOCAL midnight, not UTC midnight.
  // Without this, "2025-01-15" parses as UTC 00:00 which renders as Jan 14
  // for any user in a UTC+ timezone.
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}




