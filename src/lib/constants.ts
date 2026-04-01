export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export interface StatusConfig {
  label: string;
  variant: BadgeVariant;
}

/** Booking status labels & badge variants */
export const BOOKING_STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { label: "En attente", variant: "secondary" },
  approved: { label: "Confirmée", variant: "default" },
  refused: { label: "Refusée", variant: "destructive" },
  cancelled: { label: "Annulée", variant: "outline" },
};

/** Simple label-only map (for CSV export, etc.) */
export const BOOKING_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(BOOKING_STATUS_CONFIG).map(([k, v]) => [k, v.label])
);

/** Payment status labels & badge variants */
export const PAYMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  not_applicable: { label: "N/A", variant: "outline" },
  unpaid: { label: "Non payé", variant: "destructive" },
  partial: { label: "Partiel", variant: "secondary" },
  paid: { label: "Payé", variant: "default" },
};

/** Expense category display labels */
export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  courses: "Courses",
  travaux: "Travaux",
  entretien: "Entretien",
  energie: "Énergie",
  assurance: "Assurance",
  taxes: "Taxes",
  menage: "Ménage",
  autre: "Autre",
};
