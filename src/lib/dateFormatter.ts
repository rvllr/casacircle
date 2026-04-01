import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Safely format a date string or Date object.
 * @param date - ISO string or Date
 * @param fmt - date-fns format string (default: "d MMM yyyy")
 */
export function formatDate(date: string | Date, fmt: string = "d MMM yyyy"): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, fmt, { locale: fr });
  } catch {
    return typeof date === "string" ? date : String(date);
  }
}

/** Long date: "1 janvier 2025" */
export function formatDateLong(date: string | Date): string {
  return formatDate(date, "d MMMM yyyy");
}

/** Short CSV-style date: "01/01/2025" */
export function formatDateSlash(date: string | Date): string {
  return formatDate(date, "dd/MM/yyyy");
}

/**
 * Format a date range: "1 janv. 2025 → 5 janv. 2025"
 */
export function formatDateRange(start: string | Date, end: string | Date): string {
  return `${formatDate(start)} → ${formatDate(end)}`;
}

/**
 * Relative date: "il y a 3 jours", "dans 2 heures", etc.
 */
export function getRelativeDate(date: string | Date): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    return formatDistanceToNow(d, { addSuffix: true, locale: fr });
  } catch {
    return typeof date === "string" ? date : String(date);
  }
}
