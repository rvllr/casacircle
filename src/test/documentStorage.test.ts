import { describe, it, expect, vi } from "vitest";

// Le client Supabase s'initialise à l'import et exige des variables d'env :
// on le neutralise, ces tests ne portent que sur les fonctions pures.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({ createSignedUrl: async () => ({ data: null, error: null }) }) } },
}));

const { extractStoragePath, resolveStoragePath } = await import("@/lib/documentStorage");

const BASE = "https://abc.supabase.co/storage/v1/object/public/documents/";

describe("extractStoragePath", () => {
  it("extrait le chemin d'une URL publique nominale", () => {
    expect(extractStoragePath(`${BASE}11111111/1700000000.pdf`)).toBe("11111111/1700000000.pdf");
  });

  it("conserve le préfixe `spaces/` (convention SpaceDocuments)", () => {
    expect(extractStoragePath(`${BASE}spaces/55555555/1700000003.pdf`)).toBe("spaces/55555555/1700000003.pdf");
  });

  it("retire une query string", () => {
    expect(extractStoragePath(`${BASE}a/b.pdf?t=123`)).toBe("a/b.pdf");
  });

  it("retire un fragment", () => {
    expect(extractStoragePath(`${BASE}a/b.pdf#page=2`)).toBe("a/b.pdf");
  });

  it("renvoie null sur une URL externe", () => {
    expect(extractStoragePath("https://example.com/un-fichier.pdf")).toBeNull();
  });

  it("renvoie null sur un autre bucket", () => {
    expect(extractStoragePath("https://abc.supabase.co/storage/v1/object/public/avatars/x.png")).toBeNull();
  });

  it("renvoie null quand le chemin est vide", () => {
    expect(extractStoragePath(BASE)).toBeNull();
  });

  it("renvoie null sur une URL signée", () => {
    expect(extractStoragePath("https://abc.supabase.co/storage/v1/object/sign/documents/a.pdf?token=zz")).toBeNull();
  });

  it("renvoie null sur les valeurs absentes", () => {
    expect(extractStoragePath(null)).toBeNull();
    expect(extractStoragePath(undefined)).toBeNull();
    expect(extractStoragePath("")).toBeNull();
    // Valeur des documents de démonstration.
    expect(extractStoragePath("#")).toBeNull();
  });
});

describe("resolveStoragePath", () => {
  it("privilégie file_path quand il est renseigné", () => {
    expect(resolveStoragePath({ file_path: "maison/1.pdf", file_url: `${BASE}autre/2.pdf` })).toBe("maison/1.pdf");
  });

  it("retombe sur file_url pour les lignes historiques", () => {
    expect(resolveStoragePath({ file_path: null, file_url: `${BASE}legacy/2.pdf` })).toBe("legacy/2.pdf");
  });

  it("ignore un file_path vide ou blanc", () => {
    expect(resolveStoragePath({ file_path: "   ", file_url: `${BASE}legacy/3.pdf` })).toBe("legacy/3.pdf");
  });

  it("renvoie null quand aucune source n'est exploitable", () => {
    expect(resolveStoragePath({ file_path: null, file_url: null })).toBeNull();
    expect(resolveStoragePath({})).toBeNull();
  });
});
