import { addDays, subDays, format } from "date-fns";

const now = new Date();

export const DEMO_HOUSES = [
  { id: "demo-house-1", name: "Mas de Provence", family_id: "demo-family" },
  { id: "demo-house-2", name: "Chalet des Alpes", family_id: "demo-family" },
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

export const DEMO_EXPENSES = [
  { id: "demo-e1", amount: 245, description: "Réparation toiture", created_at: format(subDays(now, 5), "yyyy-MM-dd"), paid_by: "demo-user-1", house_id: "demo-house-1", category: "travaux", houses: { name: "Mas de Provence" } },
  { id: "demo-e2", amount: 89, description: "Courses d'accueil", created_at: format(subDays(now, 12), "yyyy-MM-dd"), paid_by: "demo-user-2", house_id: "demo-house-1", category: "courses", houses: { name: "Mas de Provence" } },
  { id: "demo-e3", amount: 150, description: "Facture électricité", created_at: format(subDays(now, 20), "yyyy-MM-dd"), paid_by: "demo-user-1", house_id: "demo-house-2", category: "energie", houses: { name: "Chalet des Alpes" } },
  { id: "demo-e4", amount: 60, description: "Ménage de printemps", created_at: format(subDays(now, 30), "yyyy-MM-dd"), paid_by: "demo-user-3", house_id: "demo-house-1", category: "menage", houses: { name: "Mas de Provence" } },
];

export const DEMO_ALL_EXPENSES = [
  ...DEMO_EXPENSES,
  { id: "demo-e5", amount: 1200, description: "Assurance annuelle", created_at: format(subDays(now, 90), "yyyy-MM-dd"), paid_by: "demo-user-1", house_id: "demo-house-1", category: "assurance", houses: { name: "Mas de Provence" } },
  { id: "demo-e6", amount: 320, description: "Taxe foncière", created_at: format(subDays(now, 60), "yyyy-MM-dd"), paid_by: "demo-user-1", house_id: "demo-house-2", category: "taxes", houses: { name: "Chalet des Alpes" } },
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
