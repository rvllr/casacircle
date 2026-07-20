import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listHouses from "./tools/list-houses";
import listBookings from "./tools/list-bookings";
import createBooking from "./tools/create-booking";
import listExpenses from "./tools/list-expenses";
import listMaintenance from "./tools/list-maintenance";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "casacircle-mcp",
  title: "CasaCircle",
  version: "0.1.0",
  instructions:
    "Outils pour CasaCircle : lister les biens, réservations, dépenses et tickets de maintenance de l'utilisateur, et créer des demandes de réservation. Toutes les actions s'exécutent au nom de l'utilisateur connecté et respectent ses droits d'accès.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listHouses, listBookings, createBooking, listExpenses, listMaintenance],
});
