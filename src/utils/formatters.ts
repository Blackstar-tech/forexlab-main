export function currency(value: number): string {
  const isNeg = value < 0;
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${isNeg ? "-" : ""}$${formatted}`;
}

export function percent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatRatio(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "-";
  return value.toFixed(2);
}

export function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function formatDate(isoString: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
