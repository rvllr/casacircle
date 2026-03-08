import { format } from "date-fns";
import { fr } from "date-fns/locale";

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const csv = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportBookingsCsv(
  bookings: {
    start_date: string;
    end_date: string;
    status: string;
    userName: string;
    houseName: string;
    unitName?: string;
  }[]
) {
  const headers = ["Maison", "Unité", "Membre", "Début", "Fin", "Statut"];
  const statusLabels: Record<string, string> = {
    pending: "En attente",
    approved: "Confirmée",
    refused: "Refusée",
    cancelled: "Annulée",
  };
  const rows = bookings.map((b) => [
    b.houseName,
    b.unitName || "",
    b.userName,
    format(new Date(b.start_date), "dd/MM/yyyy", { locale: fr }),
    format(new Date(b.end_date), "dd/MM/yyyy", { locale: fr }),
    statusLabels[b.status] || b.status,
  ]);
  downloadCsv(`reservations_${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
}

export function exportExpensesCsv(
  expenses: {
    description: string;
    amount: number;
    category: string;
    paidBy: string;
    houseName: string;
    date: string;
  }[]
) {
  const categoryLabels: Record<string, string> = {
    courses: "Courses",
    travaux: "Travaux",
    entretien: "Entretien",
    energie: "Énergie",
    assurance: "Assurance",
    taxes: "Taxes",
    menage: "Ménage",
    autre: "Autre",
  };
  const headers = ["Maison", "Description", "Montant (€)", "Catégorie", "Payé par", "Date"];
  const rows = expenses.map((e) => [
    e.houseName,
    e.description,
    e.amount.toFixed(2),
    categoryLabels[e.category] || e.category,
    e.paidBy,
    format(new Date(e.date), "dd/MM/yyyy", { locale: fr }),
  ]);
  downloadCsv(`depenses_${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
}
