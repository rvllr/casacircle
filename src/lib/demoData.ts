import { addDays, subDays, format } from "date-fns";

const now = new Date();

export const DEMO_HOUSES = [
  { id: "demo-house-1", name: "Mas de Provence", family_id: "demo-family" },
  { id: "demo-house-2", name: "Chalet des Alpes", family_id: "demo-family" },
];

export const DEMO_HOUSES_FULL = [
  {
    id: "demo-house-1",
    name: "Mas de Provence",
    location: "Gordes, Vaucluse",
    description: "Magnifique mas provençal avec piscine et vue sur le Luberon.",
    capacity: 10,
    family_id: "demo-family",
    owner_id: "demo-user-1",
  },
  {
    id: "demo-house-2",
    name: "Chalet des Alpes",
    location: "Chamonix, Haute-Savoie",
    description: "Chalet cosy au pied du Mont-Blanc, idéal pour le ski.",
    capacity: 8,
    family_id: "demo-family",
    owner_id: "demo-user-1",
  },
];

export const DEMO_FAMILY = {
  id: "demo-family",
  name: "Famille Dupont",
  created_by: "demo-user-1",
  type: "family" as const,
  description: "Patrimoine familial Dupont",
  ownership_enabled: true,
};

export const DEMO_FAMILY_MEMBERS = [
  { id: "demo-fm-1", family_id: "demo-family", user_id: "demo-user-1", role: "admin" as const, users_profiles: { first_name: "Marie", last_name: "Dupont", email: "marie@demo.com" } },
  { id: "demo-fm-2", family_id: "demo-family", user_id: "demo-user-2", role: "member" as const, users_profiles: { first_name: "Pierre", last_name: "Martin", email: "pierre@demo.com" } },
  { id: "demo-fm-3", family_id: "demo-family", user_id: "demo-user-3", role: "member" as const, users_profiles: { first_name: "Sophie", last_name: "Bernard", email: "sophie@demo.com" } },
];

export const DEMO_PROFILE = {
  first_name: "Marie",
  last_name: "Dupont",
  avatar_url: null,
  email: "marie@demo.com",
  phone: null,
};

export const DEMO_BOOKINGS = [
  {
    id: "demo-b1",
    start_date: format(addDays(now, 3), "yyyy-MM-dd"),
    end_date: format(addDays(now, 10), "yyyy-MM-dd"),
    status: "approved",
    user_id: "demo-user-1",
    house_id: "demo-house-1",
    total_price: 420,
    amount_paid: 420,
    payment_status: "paid",
    houses: { name: "Mas de Provence", location: "Gordes, Vaucluse" },
  },
  {
    id: "demo-b2",
    start_date: format(addDays(now, 15), "yyyy-MM-dd"),
    end_date: format(addDays(now, 22), "yyyy-MM-dd"),
    status: "pending",
    user_id: "demo-user-2",
    house_id: "demo-house-1",
    total_price: 490,
    amount_paid: 0,
    payment_status: "unpaid",
    houses: { name: "Mas de Provence", location: "Gordes, Vaucluse" },
  },
  {
    id: "demo-b3",
    start_date: format(addDays(now, 25), "yyyy-MM-dd"),
    end_date: format(addDays(now, 30), "yyyy-MM-dd"),
    status: "approved",
    user_id: "demo-user-3",
    house_id: "demo-house-2",
    total_price: 350,
    amount_paid: 175,
    payment_status: "partial",
    houses: { name: "Chalet des Alpes", location: "Chamonix" },
  },
];

export const DEMO_ALL_BOOKINGS = [
  ...DEMO_BOOKINGS,
  {
    id: "demo-b4",
    start_date: format(subDays(now, 60), "yyyy-MM-dd"),
    end_date: format(subDays(now, 53), "yyyy-MM-dd"),
    status: "approved",
    user_id: "demo-user-1",
    house_id: "demo-house-1",
    total_price: 490,
    amount_paid: 490,
    payment_status: "paid",
    houses: { name: "Mas de Provence", location: "Gordes, Vaucluse" },
  },
  {
    id: "demo-b5",
    start_date: format(subDays(now, 120), "yyyy-MM-dd"),
    end_date: format(subDays(now, 113), "yyyy-MM-dd"),
    status: "approved",
    user_id: "demo-user-2",
    house_id: "demo-house-2",
    total_price: 350,
    amount_paid: 350,
    payment_status: "paid",
    houses: { name: "Chalet des Alpes", location: "Chamonix" },
  },
];

// Bookings enriched for BookingsPage (with users_profiles, house_units, family_id)
export const DEMO_BOOKINGS_ENRICHED = DEMO_ALL_BOOKINGS.map((b) => ({
  ...b,
  unit_id: null,
  created_at: b.start_date,
  houses: { ...b.houses, family_id: "demo-family" },
  house_units: null,
  users_profiles: b.user_id === "demo-user-1"
    ? { first_name: "Marie", last_name: "Dupont" }
    : b.user_id === "demo-user-2"
    ? { first_name: "Pierre", last_name: "Martin" }
    : { first_name: "Sophie", last_name: "Bernard" },
}));

export const DEMO_EXPENSES = [
  { id: "demo-e1", amount: 245, description: "Réparation toiture", created_at: format(subDays(now, 5), "yyyy-MM-dd"), paid_by: "demo-user-1", house_id: "demo-house-1", category: "travaux", expense_date: format(subDays(now, 5), "yyyy-MM-dd"), houses: { name: "Mas de Provence" } },
  { id: "demo-e2", amount: 89, description: "Courses d'accueil", created_at: format(subDays(now, 12), "yyyy-MM-dd"), paid_by: "demo-user-2", house_id: "demo-house-1", category: "courses", expense_date: format(subDays(now, 12), "yyyy-MM-dd"), houses: { name: "Mas de Provence" } },
  { id: "demo-e3", amount: 150, description: "Facture électricité", created_at: format(subDays(now, 20), "yyyy-MM-dd"), paid_by: "demo-user-1", house_id: "demo-house-2", category: "energie", expense_date: format(subDays(now, 20), "yyyy-MM-dd"), houses: { name: "Chalet des Alpes" } },
  { id: "demo-e4", amount: 60, description: "Ménage de printemps", created_at: format(subDays(now, 30), "yyyy-MM-dd"), paid_by: "demo-user-3", house_id: "demo-house-1", category: "menage", expense_date: format(subDays(now, 30), "yyyy-MM-dd"), houses: { name: "Mas de Provence" } },
];

export const DEMO_ALL_EXPENSES = [
  ...DEMO_EXPENSES,
  { id: "demo-e5", amount: 1200, description: "Assurance annuelle", created_at: format(subDays(now, 90), "yyyy-MM-dd"), paid_by: "demo-user-1", house_id: "demo-house-1", category: "assurance", expense_date: format(subDays(now, 90), "yyyy-MM-dd"), houses: { name: "Mas de Provence" } },
  { id: "demo-e6", amount: 320, description: "Taxe foncière", created_at: format(subDays(now, 60), "yyyy-MM-dd"), paid_by: "demo-user-1", house_id: "demo-house-2", category: "taxes", expense_date: format(subDays(now, 60), "yyyy-MM-dd"), houses: { name: "Chalet des Alpes" } },
];

export const DEMO_EXPENSE_SHARES = [
  { id: "demo-es1", expense_id: "demo-e1", user_id: "demo-user-1", amount: 81.67 },
  { id: "demo-es2", expense_id: "demo-e1", user_id: "demo-user-2", amount: 81.67 },
  { id: "demo-es3", expense_id: "demo-e1", user_id: "demo-user-3", amount: 81.67 },
  { id: "demo-es4", expense_id: "demo-e2", user_id: "demo-user-1", amount: 44.5 },
  { id: "demo-es5", expense_id: "demo-e2", user_id: "demo-user-2", amount: 44.5 },
  { id: "demo-es6", expense_id: "demo-e3", user_id: "demo-user-1", amount: 75 },
  { id: "demo-es7", expense_id: "demo-e3", user_id: "demo-user-3", amount: 75 },
];

export const DEMO_MEMORIES = [
  { id: "demo-m1", title: "Été en famille", description: "Magnifique semaine avec les cousins, barbecue et piscine tous les soirs.", visit_start: format(subDays(now, 60), "yyyy-MM-dd"), visit_end: format(subDays(now, 53), "yyyy-MM-dd"), created_at: format(subDays(now, 52), "yyyy-MM-dd"), created_by: "demo-user-1", house_id: "demo-house-1", houses: { name: "Mas de Provence" } },
  { id: "demo-m2", title: "Week-end ski", description: "Première neige de la saison, les enfants ont adoré !", visit_start: format(subDays(now, 120), "yyyy-MM-dd"), visit_end: format(subDays(now, 118), "yyyy-MM-dd"), created_at: format(subDays(now, 117), "yyyy-MM-dd"), created_by: "demo-user-2", house_id: "demo-house-2", houses: { name: "Chalet des Alpes" } },
];

export const DEMO_NEWS = [
  { id: "demo-n1", title: "Nouvelle terrasse installée", content: "Les travaux de la terrasse sont terminés ! Elle est magnifique.", created_at: format(subDays(now, 3), "yyyy-MM-dd"), created_by: "demo-user-1", house_id: "demo-house-1", houses: { name: "Mas de Provence" } },
];

export const DEMO_PROFILES = [
  { user_id: "demo-user-1", first_name: "Marie", last_name: "Dupont" },
  { user_id: "demo-user-2", first_name: "Pierre", last_name: "Martin" },
  { user_id: "demo-user-3", first_name: "Sophie", last_name: "Bernard" },
];

export const DEMO_NOTIFICATIONS = [
  { id: "demo-notif-1", title: "Nouvelle réservation", body: "Pierre a demandé une réservation au Mas de Provence.", type: "booking_request", is_read: false, created_at: format(subDays(now, 1), "yyyy-MM-dd'T'HH:mm:ss"), house_id: "demo-house-1", metadata: null },
  { id: "demo-notif-2", title: "Paiement en attente", body: "Sophie n'a payé que la moitié pour le Chalet des Alpes.", type: "payment_overdue_admin", is_read: false, created_at: format(subDays(now, 2), "yyyy-MM-dd'T'HH:mm:ss"), house_id: "demo-house-2", metadata: { booking_id: "demo-b3" } },
];

export const DEMO_MAINTENANCE_TICKETS = [
  {
    id: "demo-mt1",
    title: "Fuite robinet cuisine",
    description: "Le robinet de la cuisine fuit depuis quelques jours, il faudrait appeler un plombier.",
    status: "open" as const,
    priority: "high" as const,
    created_at: format(subDays(now, 4), "yyyy-MM-dd'T'HH:mm:ss"),
    created_by: "demo-user-2",
    house_id: "demo-house-1",
    house_name: "Mas de Provence",
    creator_name: "Pierre Martin",
  },
  {
    id: "demo-mt2",
    title: "Volet chambre bloqué",
    description: "Le volet de la chambre du 1er ne descend plus complètement.",
    status: "in_progress" as const,
    priority: "medium" as const,
    created_at: format(subDays(now, 10), "yyyy-MM-dd'T'HH:mm:ss"),
    created_by: "demo-user-1",
    house_id: "demo-house-1",
    house_name: "Mas de Provence",
    creator_name: "Marie Dupont",
  },
  {
    id: "demo-mt3",
    title: "Chaudière à réviser",
    description: "Révision annuelle à planifier avant l'hiver.",
    status: "resolved" as const,
    priority: "low" as const,
    created_at: format(subDays(now, 45), "yyyy-MM-dd'T'HH:mm:ss"),
    created_by: "demo-user-3",
    house_id: "demo-house-2",
    house_name: "Chalet des Alpes",
    creator_name: "Sophie Bernard",
  },
];

export const DEMO_VOTES = [
  {
    id: "demo-v1",
    title: "Refaire la terrasse ?",
    description: "La terrasse est abîmée, devis estimé à 3 500 €. On lance les travaux ?",
    deadline: format(addDays(now, 14), "yyyy-MM-dd"),
    house_id: "demo-house-1",
    created_by: "demo-user-1",
    created_at: format(subDays(now, 3), "yyyy-MM-dd'T'HH:mm:ss"),
    house_name: "Mas de Provence",
    creator_name: "Marie Dupont",
  },
  {
    id: "demo-v2",
    title: "Installer une borne Wi-Fi extérieure",
    description: "Pour avoir du Wi-Fi au bord de la piscine. Coût estimé : 120 €.",
    deadline: null,
    house_id: "demo-house-1",
    created_by: "demo-user-2",
    created_at: format(subDays(now, 7), "yyyy-MM-dd'T'HH:mm:ss"),
    house_name: "Mas de Provence",
    creator_name: "Pierre Martin",
  },
];

export const DEMO_VOTE_RESPONSES = [
  { id: "demo-vr1", vote_id: "demo-v1", user_id: "demo-user-1", response: "yes" as const },
  { id: "demo-vr2", vote_id: "demo-v1", user_id: "demo-user-2", response: "yes" as const },
  { id: "demo-vr3", vote_id: "demo-v1", user_id: "demo-user-3", response: "abstain" as const },
  { id: "demo-vr4", vote_id: "demo-v2", user_id: "demo-user-1", response: "yes" as const },
  { id: "demo-vr5", vote_id: "demo-v2", user_id: "demo-user-3", response: "no" as const },
];

export const DEMO_DOCUMENTS = [
  {
    id: "demo-d1",
    title: "Assurance habitation 2026",
    file_url: "#",
    type: "insurance",
    house_id: "demo-house-1",
    uploaded_by: "demo-user-1",
    created_at: format(subDays(now, 15), "yyyy-MM-dd'T'HH:mm:ss"),
    house_name: "Mas de Provence",
    uploader_name: "Marie Dupont",
  },
  {
    id: "demo-d2",
    title: "Diagnostic énergétique",
    file_url: "#",
    type: "other",
    house_id: "demo-house-2",
    uploaded_by: "demo-user-1",
    created_at: format(subDays(now, 30), "yyyy-MM-dd'T'HH:mm:ss"),
    house_name: "Chalet des Alpes",
    uploader_name: "Marie Dupont",
  },
  {
    id: "demo-d3",
    title: "Facture plombier",
    file_url: "#",
    type: "invoice",
    house_id: "demo-house-1",
    uploaded_by: "demo-user-2",
    created_at: format(subDays(now, 8), "yyyy-MM-dd'T'HH:mm:ss"),
    house_name: "Mas de Provence",
    uploader_name: "Pierre Martin",
  },
];

export const DEMO_HOUSE_UNITS = [
  { id: "demo-u1", house_id: "demo-house-1", name: "Bâtiment principal", type: "building" as const, parent_id: null, capacity: 6 },
  { id: "demo-u2", house_id: "demo-house-1", name: "Chambre lavande", type: "room" as const, parent_id: "demo-u1", capacity: 2 },
  { id: "demo-u3", house_id: "demo-house-1", name: "Chambre olivier", type: "room" as const, parent_id: "demo-u1", capacity: 2 },
  { id: "demo-u4", house_id: "demo-house-2", name: "Chambre Mont-Blanc", type: "room" as const, parent_id: null, capacity: 2 },
];
