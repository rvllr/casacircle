import { supabase } from "@/integrations/supabase/client";

export const MEMORIES_BUCKET = "memories";
const SIGNED_URL_TTL = 3600;
const PUBLIC_URL_MARKER = "/storage/v1/object/public/memories/";

/** Legacy rows persisted a full public URL; new rows store the storage path only. */
export function extractMemoryStoragePath(value: string | null | undefined): string | null {
  if (!value) return null;
  const idx = value.indexOf(PUBLIC_URL_MARKER);
  if (idx !== -1) {
    return value.slice(idx + PUBLIC_URL_MARKER.length).split("?")[0].split("#")[0];
  }
  // Not a URL — treat as a path already.
  if (!/^https?:\/\//i.test(value)) return value;
  return null;
}

/** Sign a batch of memory photos. Falls back to the raw value if signing fails. */
export async function signMemoryPhotoUrls(
  values: (string | null | undefined)[]
): Promise<Record<string, string>> {
  const paths = Array.from(
    new Set(values.map(extractMemoryStoragePath).filter((p): p is string => !!p))
  );
  if (paths.length === 0) return {};

  const map: Record<string, string> = {};
  const { data } = await supabase.storage
    .from(MEMORIES_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL);

  if (data) {
    for (const item of data) {
      if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
    }
  }
  return map;
}

export function resolveMemoryPhotoUrl(
  raw: string | null | undefined,
  signed: Record<string, string>
): string {
  const path = extractMemoryStoragePath(raw);
  if (path && signed[path]) return signed[path];
  return raw ?? "";
}
