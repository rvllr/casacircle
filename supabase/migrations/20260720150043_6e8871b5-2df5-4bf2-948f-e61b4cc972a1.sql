-- ============================================================================
-- DURCISSEMENT SÉCURITÉ RLS — audit du 2026-07-20
-- Migration idempotente : DROP ... IF EXISTS / CREATE OR REPLACE partout.
-- Aucune migration existante n'est modifiée.
-- ============================================================================


-- ============================================================================
-- BLOC 0 — Fonctions utilitaires partagées
-- ============================================================================

CREATE OR REPLACE FUNCTION public.safe_uuid(_value text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN _value::uuid;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_public_house(_house_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.houses
    WHERE id = _house_id AND is_public = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_public_house(uuid) TO anon, authenticated;


-- ============================================================================
-- BLOC 1 — auto-promotion admin sur n'importe quel espace
-- ============================================================================

DROP POLICY IF EXISTS "Creator can add self as member" ON public.family_members;

CREATE OR REPLACE FUNCTION public.auto_add_family_creator_as_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.family_members (family_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'admin'::public.family_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_add_family_creator ON public.families;
CREATE TRIGGER trigger_auto_add_family_creator
  AFTER INSERT ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_family_creator_as_admin();


-- ============================================================================
-- BLOC 2 — fuite colonnes sensibles houses
-- ============================================================================

DROP POLICY IF EXISTS "Public can view public houses" ON public.houses;
DROP POLICY IF EXISTS "Authenticated can view public houses" ON public.houses;

DROP VIEW IF EXISTS public.public_houses;

CREATE VIEW public.public_houses
WITH (security_invoker = false)
AS
SELECT
  id,
  name,
  description,
  location,
  photo_url,
  capacity,
  is_public,
  booking_auto_approve,
  created_at
FROM public.houses
WHERE is_public = true;

REVOKE ALL ON public.public_houses FROM PUBLIC;
GRANT SELECT ON public.public_houses TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view guides of public houses" ON public.house_guides;
CREATE POLICY "Public can view guides of public houses"
ON public.house_guides
FOR SELECT
TO anon, authenticated
USING (public.is_public_house(house_id));

DROP POLICY IF EXISTS "Public can view units of public houses" ON public.house_units;
CREATE POLICY "Public can view units of public houses"
ON public.house_units
FOR SELECT
TO anon, authenticated
USING (public.is_public_house(house_id));


-- ============================================================================
-- BLOC 3 — join_house_by_code sans usurpation
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public, extensions'
AS $$
DECLARE
  _candidate text;
  _attempts integer := 0;
BEGIN
  IF NEW.join_code IS NULL THEN
    LOOP
      _attempts := _attempts + 1;
      _candidate := 'CASA-' || upper(encode(gen_random_bytes(6), 'hex'));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.houses WHERE join_code = _candidate
      );
      IF _attempts >= 10 THEN
        RAISE EXCEPTION 'Impossible de générer un code d''invitation unique.';
      END IF;
    END LOOP;
    NEW.join_code := _candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_join_code_on_insert ON public.houses;
CREATE TRIGGER set_join_code_on_insert
  BEFORE INSERT ON public.houses
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_join_code();

DROP FUNCTION IF EXISTS public.join_house_by_code(text, uuid);
DROP FUNCTION IF EXISTS public.join_house_by_code(text);

CREATE OR REPLACE FUNCTION public.join_house_by_code(_join_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _house_id uuid;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentification requise.';
  END IF;

  SELECT id INTO _house_id
  FROM public.houses
  WHERE join_code = upper(trim(_join_code));

  IF _house_id IS NULL THEN
    RAISE EXCEPTION 'Code invalide. Vérifiez le code et réessayez.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.house_members
    WHERE house_id = _house_id AND user_id = _uid
  ) THEN
    RAISE EXCEPTION 'Vous êtes déjà membre de cette maison.';
  END IF;

  INSERT INTO public.house_members (house_id, user_id, role)
  VALUES (_house_id, _uid, 'member');

  RETURN _house_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_house_by_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_house_by_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.join_house_by_code(text) TO authenticated;


-- ============================================================================
-- BLOC 4 — policies FOR UPDATE avec WITH CHECK
-- ============================================================================

DROP POLICY IF EXISTS "Users can update own profile" ON public.users_profiles;
CREATE POLICY "Users can update own profile"
ON public.users_profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update their families" ON public.families;
CREATE POLICY "Admins can update their families"
ON public.families FOR UPDATE TO authenticated
USING (public.is_family_admin(auth.uid(), id))
WITH CHECK (public.is_family_admin(auth.uid(), id));

DROP POLICY IF EXISTS "Admins can update houses" ON public.houses;
CREATE POLICY "Admins can update houses"
ON public.houses FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), id))
WITH CHECK (public.is_house_admin(auth.uid(), id));

DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
CREATE POLICY "Admins can update bookings"
ON public.bookings FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), house_id))
WITH CHECK (public.is_house_admin(auth.uid(), house_id));

DROP POLICY IF EXISTS "Expense creator can update" ON public.expenses;
CREATE POLICY "Expense creator can update"
ON public.expenses FOR UPDATE TO authenticated
USING (auth.uid() = paid_by)
WITH CHECK (auth.uid() = paid_by AND public.is_house_member(auth.uid(), house_id));

DROP POLICY IF EXISTS "Members can update own vote" ON public.vote_responses;
CREATE POLICY "Members can update own vote"
ON public.vote_responses FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update guides" ON public.house_guides;
CREATE POLICY "Admins can update guides"
ON public.house_guides FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), house_id))
WITH CHECK (public.is_house_admin(auth.uid(), house_id));

DROP POLICY IF EXISTS "Admins can update tickets" ON public.maintenance_tickets;
CREATE POLICY "Admins can update tickets"
ON public.maintenance_tickets FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), house_id))
WITH CHECK (public.is_house_admin(auth.uid(), house_id));

DROP POLICY IF EXISTS "Admins can update units" ON public.house_units;
CREATE POLICY "Admins can update units"
ON public.house_units FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), house_id))
WITH CHECK (public.is_house_admin(auth.uid(), house_id));

DROP POLICY IF EXISTS "House admin can update members" ON public.house_members;
CREATE POLICY "House admin can update members"
ON public.house_members FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), house_id))
WITH CHECK (public.is_house_admin(auth.uid(), house_id));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Creator can update news" ON public.house_news;
CREATE POLICY "Creator can update news"
ON public.house_news FOR UPDATE TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by AND public.is_house_member(auth.uid(), house_id));

DROP POLICY IF EXISTS "Creator can update memories" ON public.house_memories;
CREATE POLICY "Creator can update memories"
ON public.house_memories FOR UPDATE TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by AND public.is_house_member(auth.uid(), house_id));

DROP POLICY IF EXISTS "Creator can update votes" ON public.votes;
CREATE POLICY "Creator can update votes"
ON public.votes FOR UPDATE TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (
  auth.uid() = created_by
  AND (house_id IS NULL OR public.is_house_member(auth.uid(), house_id))
);

DROP POLICY IF EXISTS "Space vote creator can update" ON public.votes;
CREATE POLICY "Space vote creator can update"
ON public.votes FOR UPDATE TO authenticated
USING (space_id IS NOT NULL AND auth.uid() = created_by)
WITH CHECK (
  space_id IS NOT NULL
  AND auth.uid() = created_by
  AND public.is_family_member(auth.uid(), space_id)
);

DROP POLICY IF EXISTS "Admins can update house pricing" ON public.house_pricing;
CREATE POLICY "Admins can update house pricing"
ON public.house_pricing FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), house_id))
WITH CHECK (public.is_house_admin(auth.uid(), house_id));

DROP POLICY IF EXISTS "Admins can update pricing periods" ON public.pricing_periods;
CREATE POLICY "Admins can update pricing periods"
ON public.pricing_periods FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), house_id))
WITH CHECK (public.is_house_admin(auth.uid(), house_id));

DROP POLICY IF EXISTS "Admins can update ownership shares" ON public.ownership_shares;
CREATE POLICY "Admins can update ownership shares"
ON public.ownership_shares FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), house_id))
WITH CHECK (public.is_house_admin(auth.uid(), house_id));

DROP POLICY IF EXISTS "Creator can update events" ON public.house_history_events;
CREATE POLICY "Creator can update events"
ON public.house_history_events FOR UPDATE TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by AND public.is_house_member(auth.uid(), house_id));

DROP POLICY IF EXISTS "Family admins can update nodes" ON public.family_tree_nodes;
CREATE POLICY "Family admins can update nodes"
ON public.family_tree_nodes FOR UPDATE TO authenticated
USING (public.is_family_admin(auth.uid(), family_id))
WITH CHECK (public.is_family_admin(auth.uid(), family_id));

DROP POLICY IF EXISTS "Admins can update pacts" ON public.family_pacts;
CREATE POLICY "Admins can update pacts"
ON public.family_pacts FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), house_id))
WITH CHECK (public.is_house_admin(auth.uid(), house_id));

DROP POLICY IF EXISTS "Admins can update checklists" ON public.house_checklists;
CREATE POLICY "Admins can update checklists"
ON public.house_checklists FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), house_id))
WITH CHECK (public.is_house_admin(auth.uid(), house_id));

DROP POLICY IF EXISTS "Admins can update items" ON public.checklist_items;
CREATE POLICY "Admins can update items"
ON public.checklist_items FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), public.get_house_id_from_checklist(checklist_id)))
WITH CHECK (public.is_house_admin(auth.uid(), public.get_house_id_from_checklist(checklist_id)));

DROP POLICY IF EXISTS "Admins can update space documents" ON public.space_documents;
CREATE POLICY "Admins can update space documents"
ON public.space_documents FOR UPDATE TO authenticated
USING (public.is_family_admin(auth.uid(), space_id))
WITH CHECK (public.is_family_admin(auth.uid(), space_id));

DROP POLICY IF EXISTS "Space admins can update subscription" ON public.space_subscriptions;
CREATE POLICY "Space admins can update subscription"
ON public.space_subscriptions FOR UPDATE TO authenticated
USING (public.is_family_admin(auth.uid(), space_id))
WITH CHECK (public.is_family_admin(auth.uid(), space_id));

CREATE OR REPLACE FUNCTION public.prevent_house_member_key_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.house_id IS DISTINCT FROM OLD.house_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'house_id et user_id sont immuables sur house_members.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_house_members_immutable_keys ON public.house_members;
CREATE TRIGGER trg_house_members_immutable_keys
  BEFORE UPDATE ON public.house_members
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_house_member_key_change();

CREATE OR REPLACE FUNCTION public.prevent_family_member_key_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.family_id IS DISTINCT FROM OLD.family_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'family_id et user_id sont immuables sur family_members.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_family_members_immutable_keys ON public.family_members;
CREATE TRIGGER trg_family_members_immutable_keys
  BEFORE UPDATE ON public.family_members
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_family_member_key_change();


-- ============================================================================
-- BLOC 5 — storage.objects house-photos / memories / avatars
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can upload house photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload house photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'house-photos'
  AND public.is_house_admin(auth.uid(), public.safe_uuid((storage.foldername(name))[1]))
);

DROP POLICY IF EXISTS "Authenticated users can update house photos" ON storage.objects;
CREATE POLICY "Authenticated users can update house photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'house-photos'
  AND public.is_house_admin(auth.uid(), public.safe_uuid((storage.foldername(name))[1]))
)
WITH CHECK (
  bucket_id = 'house-photos'
  AND public.is_house_admin(auth.uid(), public.safe_uuid((storage.foldername(name))[1]))
);

DROP POLICY IF EXISTS "Authenticated users can delete house photos" ON storage.objects;
CREATE POLICY "Authenticated users can delete house photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'house-photos'
  AND public.is_house_admin(auth.uid(), public.safe_uuid((storage.foldername(name))[1]))
);

DROP POLICY IF EXISTS "Family members can upload memory photos" ON storage.objects;
CREATE POLICY "Family members can upload memory photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'memories'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_house_active_member(
        auth.uid(),
        public.get_house_id_from_memory(public.safe_uuid((storage.foldername(name))[2]))
      )
);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- ============================================================================
-- BLOC 6 — création espace au nom d'un tiers
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;
CREATE POLICY "Authenticated users can create families"
ON public.families FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);


-- ============================================================================
-- BLOC 7 — policies storage bucket documents (safe_uuid + spaces/)
-- ============================================================================

DROP POLICY IF EXISTS "House members can view documents" ON storage.objects;
CREATE POLICY "House members can view documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND CASE
        WHEN (storage.foldername(name))[1] = 'spaces'
          THEN public.is_family_member(auth.uid(), public.safe_uuid((storage.foldername(name))[2]))
        ELSE public.is_house_member(auth.uid(), public.safe_uuid((storage.foldername(name))[1]))
      END
);

DROP POLICY IF EXISTS "House members can upload documents" ON storage.objects;
CREATE POLICY "House members can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND CASE
        WHEN (storage.foldername(name))[1] = 'spaces'
          THEN public.is_family_admin(auth.uid(), public.safe_uuid((storage.foldername(name))[2]))
        ELSE public.is_house_admin(auth.uid(), public.safe_uuid((storage.foldername(name))[1]))
      END
);

DROP POLICY IF EXISTS "House admins can delete documents" ON storage.objects;
CREATE POLICY "House admins can delete documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND CASE
        WHEN (storage.foldername(name))[1] = 'spaces'
          THEN public.is_family_admin(auth.uid(), public.safe_uuid((storage.foldername(name))[2]))
        ELSE public.is_house_admin(auth.uid(), public.safe_uuid((storage.foldername(name))[1]))
      END
);


-- ============================================================================
-- MIGRATION 2 : expense_split_mode
-- ============================================================================

DO $$
BEGIN
  CREATE TYPE public.expense_split_mode AS ENUM ('equal', 'ownership', 'manual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS split_mode public.expense_split_mode NOT NULL DEFAULT 'equal';

COMMENT ON COLUMN public.expenses.split_mode IS
  'Mode de répartition utilisé pour générer les lignes expense_shares : equal | ownership | manual. '
  'Purement informatif/traçabilité : les montants font foi dans expense_shares.';

CREATE INDEX IF NOT EXISTS expense_shares_user_id_idx
  ON public.expense_shares (user_id);


-- ============================================================================
-- MIGRATION 3 : ownership_shares_total_100
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_ownership_shares_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _house_id uuid;
  _count integer;
  _total numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _house_id := OLD.house_id;
  ELSE
    _house_id := NEW.house_id;
  END IF;

  SELECT count(*), COALESCE(sum(percentage), 0)
    INTO _count, _total
    FROM public.ownership_shares
   WHERE house_id = _house_id;

  IF _count = 0 THEN
    RETURN NULL;
  END IF;

  IF abs(_total - 100) > 0.01 THEN
    RAISE EXCEPTION
      'La somme des quotes-parts de la maison % vaut % %% au lieu de 100 %%.',
      _house_id, _total
      USING ERRCODE = 'check_violation',
            HINT = 'Enregistrez toutes les quotes-parts en une seule fois via save_ownership_shares().';
  END IF;

  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS ownership_shares_total_check ON public.ownership_shares;

CREATE CONSTRAINT TRIGGER ownership_shares_total_check
  AFTER INSERT OR UPDATE OR DELETE ON public.ownership_shares
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_ownership_shares_total();

CREATE OR REPLACE FUNCTION public.save_ownership_shares(_house_id uuid, _shares jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total numeric;
  _actor uuid := auth.uid();
BEGIN
  IF _actor IS NULL OR NOT public.is_house_admin(_actor, _house_id) THEN
    RAISE EXCEPTION 'Accès refusé : seul un administrateur de la maison peut modifier les quotes-parts.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF to_regclass('pg_temp._incoming') IS NOT NULL THEN
    DROP TABLE _incoming;
  END IF;
  CREATE TEMP TABLE _incoming ON COMMIT DROP AS
  SELECT (elem->>'user_id')::uuid AS user_id,
         (elem->>'percentage')::numeric AS percentage
    FROM jsonb_array_elements(COALESCE(_shares, '[]'::jsonb)) AS elem
   WHERE (elem->>'percentage')::numeric > 0;

  IF EXISTS (SELECT 1 FROM _incoming GROUP BY user_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Un même membre apparaît plusieurs fois dans les quotes-parts.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT COALESCE(sum(percentage), 0) INTO _total FROM _incoming;

  IF (SELECT count(*) FROM _incoming) > 0 AND abs(_total - 100) > 0.01 THEN
    RAISE EXCEPTION 'La somme des quotes-parts doit valoir 100 %% (reçu : % %%).', _total
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.ownership_history (house_id, user_id, old_percentage, new_percentage, changed_by)
  SELECT _house_id,
         COALESCE(cur.user_id, inc.user_id),
         COALESCE(cur.percentage, 0),
         COALESCE(inc.percentage, 0),
         _actor
    FROM (SELECT user_id, percentage FROM public.ownership_shares WHERE house_id = _house_id) cur
    FULL OUTER JOIN _incoming inc ON inc.user_id = cur.user_id
   WHERE COALESCE(cur.percentage, 0) IS DISTINCT FROM COALESCE(inc.percentage, 0);

  DELETE FROM public.ownership_shares os
   WHERE os.house_id = _house_id
     AND NOT EXISTS (SELECT 1 FROM _incoming inc WHERE inc.user_id = os.user_id);

  INSERT INTO public.ownership_shares (house_id, user_id, percentage)
  SELECT _house_id, inc.user_id, inc.percentage FROM _incoming inc
  ON CONFLICT (house_id, user_id)
  DO UPDATE SET percentage = EXCLUDED.percentage, updated_at = now();
END $$;

REVOKE ALL ON FUNCTION public.save_ownership_shares(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.save_ownership_shares(uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.save_ownership_shares(uuid, jsonb) IS
  'Remplace de façon atomique toutes les quotes-parts d''une maison. '
  'Valide la somme à 100 %, journalise ownership_history, supprime les copropriétaires retirés.';


-- ============================================================================
-- MIGRATION 4 : documents_file_path
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
    RETURN NULL;
  END IF;

  _path := substring(_url FROM _pos + length(_marker));

  _path := split_part(_path, '?', 1);
  _path := split_part(_path, '#', 1);

  IF _path IS NULL OR btrim(_path) = '' THEN
    RETURN NULL;
  END IF;

  RETURN _path;
END;
$$;

COMMENT ON FUNCTION public.extract_documents_storage_path(text) IS
  'Extrait le chemin storage d''une URL publique du bucket documents. NULL si le format ne correspond pas.';

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS file_path text;

COMMENT ON COLUMN public.documents.file_path IS
  'Chemin de l''objet dans le bucket privé `documents` (ex: "<house_id>/<ts>.pdf"). Source de vérité : le front génère une URL signée à la demande.';

COMMENT ON COLUMN public.documents.file_url IS
  'LEGACY — ancienne URL publique (inopérante, bucket privé). Conservée pour audit/rollback. Ne plus écrire : utiliser file_path.';

UPDATE public.documents
SET file_path = public.extract_documents_storage_path(file_url)
WHERE file_path IS NULL
  AND public.extract_documents_storage_path(file_url) IS NOT NULL;

ALTER TABLE public.documents
  ALTER COLUMN file_url DROP NOT NULL;

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_file_reference_present;
ALTER TABLE public.documents
  ADD CONSTRAINT documents_file_reference_present
  CHECK (file_path IS NOT NULL OR file_url IS NOT NULL) NOT VALID;

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