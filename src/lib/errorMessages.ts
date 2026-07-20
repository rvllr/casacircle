/**
 * Map raw Supabase/PostgREST errors into safe user-facing messages.
 * Keeps schema names, constraint names, and policy details out of the UI.
 * Raw errors are still surfaced to the browser console for debugging.
 */
export function friendlyError(error: unknown, fallback = "Une erreur inattendue est survenue."): string {
  const raw =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "";

  if (import.meta.env.DEV) {
    console.error("[friendlyError]", error);
  }

  if (!raw) return fallback;

  const msg = raw.toLowerCase();

  if (msg.includes("row-level security") || msg.includes("permission denied")) {
    return "Accès refusé.";
  }
  if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
    return "Cette valeur existe déjà.";
  }
  if (msg.includes("violates not-null") || msg.includes("null value")) {
    return "Un champ obligatoire est manquant.";
  }
  if (msg.includes("foreign key")) {
    return "Référence invalide.";
  }
  if (msg.includes("invalid input syntax")) {
    return "Format invalide.";
  }
  if (msg.includes("jwt") || msg.includes("token") || msg.includes("expired")) {
    return "Session expirée, veuillez vous reconnecter.";
  }
  if (msg.includes("network") || msg.includes("failed to fetch")) {
    return "Problème de connexion. Vérifiez votre réseau.";
  }
  if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
    return "Identifiants invalides.";
  }
  if (msg.includes("email") && msg.includes("confirm")) {
    return "Veuillez confirmer votre email avant de vous connecter.";
  }
  if (msg.includes("rate limit")) {
    return "Trop de tentatives. Réessayez dans un instant.";
  }

  // Preserve app-thrown French exceptions (raised by our own RPCs/triggers).
  if (/^[A-ZÀ-Ý]/.test(raw) && raw.length < 200 && !/[a-z]_[a-z]/.test(raw)) {
    return raw;
  }

  return fallback;
}
