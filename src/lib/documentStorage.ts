import { supabase } from "@/integrations/supabase/client";

/**
 * Helpers d'accès au bucket storage privé `documents`.
 *
 * Le bucket est privé (`public = false`, migration 20260308094738) : une URL
 * `getPublicUrl()` y est bien formée mais renvoie 400. On ne persiste donc
 * plus d'URL — on stocke le CHEMIN (`file_path`) et on signe à la demande.
 */

export const DOCUMENTS_BUCKET = "documents";

/** Durée de validité d'une URL signée (secondes). 5 minutes : le temps d'ouvrir le fichier. */
export const SIGNED_URL_TTL = 300;

/** Marqueur des anciennes URLs publiques persistées en base. */
const PUBLIC_URL_MARKER = "/storage/v1/object/public/documents/";

/**
 * Extrait le chemin storage d'une ancienne URL publique.
 * Reproduit côté client la logique de `public.extract_documents_storage_path`
 * (migration 20260720150000) pour les lignes que le backfill n'aurait pas pu
 * traiter. Renvoie null si le format ne correspond pas.
 */
export function extractStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;

  const index = url.indexOf(PUBLIC_URL_MARKER);
  if (index === -1) return null;

  // On retire une éventuelle query string puis un éventuel fragment.
  const path = url
    .slice(index + PUBLIC_URL_MARKER.length)
    .split("?")[0]
    .split("#")[0];

  return path.trim() === "" ? null : path;
}

/**
 * Résout le chemin storage d'un document, en privilégiant `file_path` et en
 * retombant sur l'ancienne colonne `file_url` pour les lignes historiques.
 */
export function resolveStoragePath(doc: {
  file_path?: string | null;
  file_url?: string | null;
}): string | null {
  if (doc.file_path && doc.file_path.trim() !== "") return doc.file_path;
  return extractStoragePath(doc.file_url);
}

/**
 * Génère une URL signée temporaire pour un chemin du bucket `documents`.
 * @returns l'URL signée, ou un message d'erreur exploitable pour un toast.
 */
export async function createDocumentSignedUrl(
  path: string
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);

  if (error) return { url: null, error: error.message };
  if (!data?.signedUrl) return { url: null, error: "URL signée introuvable." };

  return { url: data.signedUrl, error: null };
}
