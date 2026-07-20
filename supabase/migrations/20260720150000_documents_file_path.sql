-- ============================================================================
-- DOCUMENTS : passage de l'URL publique persistée au CHEMIN storage
-- ----------------------------------------------------------------------------
-- CONTEXTE / BUG CORRIGÉ
-- Le bucket storage `documents` est PRIVÉ (public = false, cf. migration
-- 20260308094738). Or le front appelait `getPublicUrl()` et persistait l'URL
-- retournée dans `file_url` :
--   * src/pages/DocumentsPage.tsx      -> documents.file_url
--   * src/components/SpaceDocuments.tsx -> space_documents.file_url
--
-- Sur un bucket privé, `getPublicUrl()` ne fait AUCUN appel réseau : il se
-- contente de construire une chaîne
-- `<projet>/storage/v1/object/public/documents/<path>`. L'URL est donc bien
-- formée mais renvoie 400 à l'ouverture. Résultat : le bouton « Ouvrir » est
-- mort pour TOUS les documents, et la panne est silencieuse (l'upload réussit,
-- le toast annonce « Document ajouté ! »).
--
-- CORRECTIF RETENU
-- On cesse de persister une URL. On stocke le CHEMIN storage dans une nouvelle
-- colonne `file_path`, et le front génère une URL signée à la demande via
-- `createSignedUrl(path, expiresIn)`. Une URL signée est par nature temporaire :
-- la persister n'aurait aucun sens.
--
-- POURQUOI UNE NOUVELLE COLONNE PLUTÔT QUE RÉUTILISER `file_url` ?
--   1. `file_url` contient déjà des URLs en production. Y écrire des chemins
--      rendrait les deux formats indistinguables sans parsing, et toute ligne
--      manquée par le backfill casserait silencieusement (un chemin traité
--      comme une URL, ou l'inverse).
--   2. Une colonne dédiée rend le backfill non destructif et réversible : les
--      URLs d'origine restent lisibles pour audit/rollback.
--   3. Le nom `file_url` mentirait sur son contenu ; `file_path` est explicite.
--
-- Migration idempotente (IF NOT EXISTS / WHERE file_path IS NULL partout).
-- ============================================================================


-- ============================================================================
-- BLOC 0 — Fonction d'extraction du chemin depuis une URL publique
-- ----------------------------------------------------------------------------
-- Les URLs déjà stockées suivent le format :
--   https://<ref>.supabase.co/storage/v1/object/public/documents/<path>
-- On extrait tout ce qui suit le marqueur, en retirant une éventuelle
-- query string (?...) ou un fragment (#...).
-- Renvoie NULL si l'entrée ne correspond pas au format attendu : c'est ce qui
-- garantit la prudence du backfill (les lignes non conformes restent intactes).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.extract_documents_storage_path(_url text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  _marker  CONSTANT text := '/storage/v1/object/public/documents/';
  _pos     integer;
  _path    text;
BEGIN
  IF _url IS NULL THEN
    RETURN NULL;
  END IF;

  _pos := position(_marker IN _url);
  IF _pos = 0 THEN
    -- Format inattendu : on ne touche pas à la ligne.
    RETURN NULL;
  END IF;

  _path := substring(_url FROM _pos + length(_marker));

  -- Retrait d'une éventuelle query string puis d'un éventuel fragment.
  _path := split_part(_path, '?', 1);
  _path := split_part(_path, '#', 1);

  -- Un chemin vide n'est pas exploitable.
  IF _path IS NULL OR btrim(_path) = '' THEN
    RETURN NULL;
  END IF;

  RETURN _path;
END;
$$;

COMMENT ON FUNCTION public.extract_documents_storage_path(text) IS
  'Extrait le chemin storage d''une URL publique du bucket documents. NULL si le format ne correspond pas.';


-- ============================================================================
-- BLOC 1 — public.documents
-- ============================================================================

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS file_path text;

COMMENT ON COLUMN public.documents.file_path IS
  'Chemin de l''objet dans le bucket privé `documents` (ex: "<house_id>/<ts>.pdf"). Source de vérité : le front génère une URL signée à la demande.';

COMMENT ON COLUMN public.documents.file_url IS
  'LEGACY — ancienne URL publique (inopérante, bucket privé). Conservée pour audit/rollback. Ne plus écrire : utiliser file_path.';

-- Backfill prudent : uniquement les lignes dont l'URL matche le format attendu.
-- Les autres (URL externe, valeur manuelle, chaîne vide…) restent intactes.
UPDATE public.documents
SET file_path = public.extract_documents_storage_path(file_url)
WHERE file_path IS NULL
  AND public.extract_documents_storage_path(file_url) IS NOT NULL;

-- `file_url` était NOT NULL : on relâche la contrainte pour que les nouvelles
-- lignes n'écrivent plus que `file_path`.
ALTER TABLE public.documents
  ALTER COLUMN file_url DROP NOT NULL;

-- Garde-fou : une ligne doit toujours porter au moins une référence au fichier.
-- NOT VALID : la contrainte s'applique aux écritures futures sans faire échouer
-- la migration sur d'éventuelles lignes historiques incohérentes.
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_file_reference_present;
ALTER TABLE public.documents
  ADD CONSTRAINT documents_file_reference_present
  CHECK (file_path IS NOT NULL OR file_url IS NOT NULL) NOT VALID;


-- ============================================================================
-- BLOC 2 — public.space_documents
-- ============================================================================

ALTER TABLE public.space_documents
  ADD COLUMN IF NOT EXISTS file_path text;

COMMENT ON COLUMN public.space_documents.file_path IS
  'Chemin de l''objet dans le bucket privé `documents` (ex: "spaces/<space_id>/<ts>.pdf"). Source de vérité : le front génère une URL signée à la demande.';

COMMENT ON COLUMN public.space_documents.file_url IS
  'LEGACY — ancienne URL publique (inopérante, bucket privé). Conservée pour audit/rollback. Ne plus écrire : utiliser file_path.';

UPDATE public.space_documents
SET file_path = public.extract_documents_storage_path(file_url)
WHERE file_path IS NULL
  AND public.extract_documents_storage_path(file_url) IS NOT NULL;

ALTER TABLE public.space_documents
  ALTER COLUMN file_url DROP NOT NULL;

ALTER TABLE public.space_documents
  DROP CONSTRAINT IF EXISTS space_documents_file_reference_present;
ALTER TABLE public.space_documents
  ADD CONSTRAINT space_documents_file_reference_present
  CHECK (file_path IS NOT NULL OR file_url IS NOT NULL) NOT VALID;
