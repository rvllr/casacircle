-- ============================================================================
-- DURCISSEMENT SÉCURITÉ RLS — audit du 2026-07-20
-- Migration idempotente : DROP ... IF EXISTS / CREATE OR REPLACE partout.
-- Aucune migration existante n'est modifiée.
-- ============================================================================


-- ============================================================================
-- BLOC 0 — Fonctions utilitaires partagées
-- ============================================================================

-- safe_uuid : cast texte -> uuid sans lever d'exception.
-- Nécessaire pour les policies storage : le bucket `documents` mélange deux
-- conventions de chemin ('{house_id}/...' et 'spaces/{space_id}/...'), donc
-- (storage.foldername(name))[1] n'est PAS toujours un uuid. Le cast direct
-- `::uuid` utilisé aujourd'hui lève une exception 22P02 et fait échouer la
-- requête entière (cf. BLOC 7).
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

-- is_public_house : test « la maison est publique » en SECURITY DEFINER.
-- Indispensable : les policies anon de `house_guides` / `house_units` créées en
-- 20260308074703 font `EXISTS (SELECT 1 FROM public.houses WHERE ... is_public)`.
-- Cette sous-requête est elle-même soumise à la RLS de `houses`. Comme le BLOC 2
-- supprime les policies SELECT anon/authenticated sur `houses`, la sous-requête
-- ne renverrait plus rien et la page publique perdrait guides + unités.
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
-- BLOC 1 — CRITIQUE : auto-promotion admin sur n'importe quel espace
-- ----------------------------------------------------------------------------
-- FAILLE : la policy "Creator can add self as member" sur public.family_members
-- (état final défini en 20260308070200) avait
--     WITH CHECK (auth.uid() = user_id AND role = 'admin'::family_role)
-- sans AUCUNE vérification sur family_id. N'importe quel utilisateur
-- authentifié pouvait donc s'insérer comme ADMIN dans n'importe quel espace
-- existant en devinant/lisant un family_id, et obtenir par ricochet un accès
-- admin à toutes les maisons rattachées (is_house_admin s'appuie sur
-- family_members.role = 'admin').
--
-- CORRECTIF : suppression de la policy. Le bootstrap du créateur passe
-- désormais par un trigger AFTER INSERT sur `families`, en réutilisant
-- exactement le pattern `auto_add_house_creator_as_admin` (20260308140144).
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
-- BLOC 2 — CRITIQUE : fuite des colonnes sensibles de `houses` en accès public
-- ----------------------------------------------------------------------------
-- FAILLE : 20260401153624 a créé deux policies SELECT sur public.houses :
--   - "Public can view public houses"        TO anon          USING (is_public = true)
--   - "Authenticated can view public houses" TO authenticated USING (is_public = true)
-- La RLS filtre les LIGNES, pas les COLONNES : n'importe quel visiteur anonyme
-- pouvait donc faire `select wifi_password, access_code, join_code,
-- emergency_contact from houses where is_public` et récupérer les secrets de
-- toutes les maisons publiques (le join_code permettant en plus de rejoindre
-- la maison via join_house_by_code).
--
-- CORRECTIF : suppression des deux policies. L'accès public passe désormais
-- EXCLUSIVEMENT par la vue public_houses.
--
-- La vue était en `security_invoker = true` (20260308140156) : elle s'appuyait
-- donc sur les policies qu'on supprime et serait devenue vide. Elle est
-- recréée en `security_invoker = false` (exécution avec les droits du
-- propriétaire, donc hors RLS) et ne projette que des colonnes non sensibles.
-- `family_id` est retiré : il n'était consommé par aucun appelant et servait
-- d'énumération de la structure des espaces à des visiteurs anonymes.
-- Colonnes conservées : celles réellement lues par src/pages/PublicHousePage.tsx
-- (id, name, location, description, capacity, photo_url) + is_public (utilisé
-- dans le .eq("is_public", true) du même fichier) + booking_auto_approve et
-- created_at (conservés pour ne pas casser d'éventuels appelants).
-- ============================================================================

DROP POLICY IF EXISTS "Public can view public houses" ON public.houses;
DROP POLICY IF EXISTS "Authenticated can view public houses" ON public.houses;

-- La liste des colonnes change (retrait de family_id) : CREATE OR REPLACE VIEW
-- refuserait, il faut donc un DROP explicite.
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

-- Réécriture des policies anon de house_guides / house_units : la sous-requête
-- sur `houses` est remplacée par is_public_house() (SECURITY DEFINER), sinon la
-- page publique casserait (cf. BLOC 0). Les policies sont en outre étendues à
-- `authenticated` : ces données étaient déjà intégralement lisibles par anon,
-- l'étendre aux utilisateurs connectés n'élargit aucune frontière de sécurité
-- et corrige l'incohérence actuelle (un visiteur connecté non-membre voyait la
-- maison mais ni ses guides ni ses unités).
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
-- BLOC 3 — CRITIQUE : usurpation d'identité via join_house_by_code
-- ----------------------------------------------------------------------------
-- FAILLE : join_house_by_code(_join_code text, _user_id uuid), définie en
-- 20260331211938 en SECURITY DEFINER, n'exigeait pas _user_id = auth.uid().
-- N'importe quel utilisateur pouvait donc inscrire un TIERS arbitraire dans une
-- maison (et, avec un code valide, peupler une maison de comptes qu'il ne
-- contrôle pas). La fonction contournait par ailleurs entièrement la RLS de
-- house_members.
--
-- CORRECTIF : nouvelle signature à un seul argument, l'identité étant lue
-- côté serveur via auth.uid(). L'ancienne signature est supprimée.
-- Entropie du code d'invitation également renforcée : `md5(random()::text)`
-- s'appuie sur un PRNG non cryptographique et n'exposait que 24 bits utiles
-- (6 caractères hex) — brute-forçable. Remplacé par gen_random_bytes (CSPRNG)
-- sur 48 bits, avec boucle anti-collision.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- search_path inclut `extensions` car pgcrypto y est installé sur Supabase
-- (et reste résolu si l'extension se trouve dans `public`).
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

-- Le trigger existe déjà (set_join_code_on_insert) mais on le recrée pour
-- garantir l'idempotence de cette migration.
DROP TRIGGER IF EXISTS set_join_code_on_insert ON public.houses;
CREATE TRIGGER set_join_code_on_insert
  BEFORE INSERT ON public.houses
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_join_code();

-- Suppression de l'ancienne signature vulnérable.
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
-- BLOC 4 — ÉLEVÉ : policies FOR UPDATE sans WITH CHECK
-- ----------------------------------------------------------------------------
-- FAILLE : en PostgreSQL, une policy UPDATE sans WITH CHECK n'applique le
-- prédicat qu'aux lignes AVANT modification (USING). La ligne RÉSULTANTE n'est
-- pas contrôlée : un utilisateur autorisé à modifier une ligne peut la
-- « déplacer » hors de son périmètre — p.ex. réaffecter un booking à une autre
-- maison, transférer une dépense à un autre payeur, ou changer created_by pour
-- se faire passer pour un tiers.
--
-- CORRECTIF : ajout d'un WITH CHECK sur chacune des policies FOR UPDATE de
-- l'état final du schéma. Inventaire exhaustif ci-dessous (24 policies
-- corrigées). Non listées car déjà conformes :
--   - bookings / "Owner can cancel own booking" (20260308140144) : possède
--     déjà WITH CHECK (auth.uid() = user_id AND status = 'cancelled').
-- Note : public.family_members ne possède AUCUNE policy FOR UPDATE dans l'état
-- final (celle-ci n'a jamais été créée) — rien à corriger de ce côté, mais le
-- trigger d'immuabilité est tout de même posé en défense en profondeur.
-- ============================================================================

-- users_profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.users_profiles;
CREATE POLICY "Users can update own profile"
ON public.users_profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- families
DROP POLICY IF EXISTS "Admins can update their families" ON public.families;
CREATE POLICY "Admins can update their families"
ON public.families FOR UPDATE TO authenticated
USING (public.is_family_admin(auth.uid(), id))
WITH CHECK (public.is_family_admin(auth.uid(), id));

-- houses
DROP POLICY IF EXISTS "Admins can update houses" ON public.houses;
CREATE POLICY "Admins can update houses"
ON public.houses FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), id))
WITH CHECK (public.is_house_admin(auth.uid(), id));

-- bookings (policy admin ; la policy « Owner can cancel own booking » est déjà correcte)
DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
CREATE POLICY "Admins can update bookings"
ON public.bookings FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), house_id))
WITH CHECK (public.is_house_admin(auth.uid(), house_id));

-- expenses
DROP POLICY IF EXISTS "Expense creator can update" ON public.expenses;
CREATE POLICY "Expense creator can update"
ON public.expenses FOR UPDATE TO authenticated
USING (auth.uid() = paid_by)
WITH CHECK (auth.uid() = paid_by AND public.is_house_member(auth.uid(), house_id));

-- vote_responses
DROP POLICY IF EXISTS "Members can update own vote" ON public.vote_responses;
CREATE POLICY "Members can update own vote"
ON public.vote_responses FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- house_guides
DROP POLICY IF EXISTS "Admins can update guides" ON public.house_guides;
CREATE POLICY "Admins can update guides"
ON public.house_guides FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), house_id))
WITH CHECK (public.is_house_admin(auth.uid(), house_id));

-- maintenance_tickets
DROP POLICY IF EXISTS "Admins can update tickets" ON public.maintenance_tickets;
CREATE POLICY "Admins can update tickets"
ON public.maintenance_tickets FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), house_id))
WITH CHECK (public.is_house_admin(auth.uid(), house_id));

-- house_units
DROP POLICY IF EXISTS "Admins can update units" ON public.house_units;
CREATE POLICY "Admins can update units"
ON public.house_units FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), house_id))
WITH CHECK (public.is_house_admin(auth.uid(), house_id));

-- house_members
DROP POLICY IF EXISTS "House admin can update members" ON public.house_members;
CREATE POLICY "House admin can update members"
ON public.house_members FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), house_id))
WITH CHECK (public.is_house_admin(auth.uid(), house_id));

-- notifications
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- house_news
DROP POLICY IF EXISTS "Creator can update news" ON public.house_news;
CREATE POLICY "Creator can update news"
ON public.house_news FOR UPDATE TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by AND public.is_house_member(auth.uid(), house_id));

-- house_memories
DROP POLICY IF EXISTS "Creator can update memories" ON public.house_memories;
CREATE POLICY "Creator can update memories"
ON public.house_memories FOR UPDATE TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by AND public.is_house_member(auth.uid(), house_id));

-- votes (vote de maison) — house_id est nullable depuis 20260331221811
-- (votes d'espace) : on tolère house_id IS NULL, ces lignes étant couvertes par
-- la policy « Space vote creator can update » ci-dessous.
DROP POLICY IF EXISTS "Creator can update votes" ON public.votes;
CREATE POLICY "Creator can update votes"
ON public.votes FOR UPDATE TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (
  auth.uid() = created_by
  AND (house_id IS NULL OR public.is_house_member(auth.uid(), house_id))
);

-- votes (vote d'espace)
DROP POLICY IF EXISTS "Space vote creator can update" ON public.votes;
CREATE POLICY "Space vote creator can update"
ON public.votes FOR UPDATE TO authenticated
USING (space_id IS NOT NULL AND auth.uid() = created_by)
WITH CHECK (
  space_id IS NOT NULL
  AND auth.uid() = created_by
  AND public.is_family_member(auth.uid(), space_id)
);

-- house_pricing
DROP POLICY IF EXISTS "Admins can update house pricing" ON public.house_pricing;
CREATE POLICY "Admins can update house pricing"
ON public.house_pricing FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), house_id))
WITH CHECK (public.is_house_admin(auth.uid(), house_id));

-- pricing_periods
DROP POLICY IF EXISTS "Admins can update pricing periods" ON public.pricing_periods;
CREATE POLICY "Admins can update pricing periods"
ON public.pricing_periods FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), house_id))
WITH CHECK (public.is_house_admin(auth.uid(), house_id));

-- ownership_shares
DROP POLICY IF EXISTS "Admins can update ownership shares" ON public.ownership_shares;
CREATE POLICY "Admins can update ownership shares"
ON public.ownership_shares FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), house_id))
WITH CHECK (public.is_house_admin(auth.uid(), house_id));

-- house_history_events
DROP POLICY IF EXISTS "Creator can update events" ON public.house_history_events;
CREATE POLICY "Creator can update events"
ON public.house_history_events FOR UPDATE TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by AND public.is_house_member(auth.uid(), house_id));

-- family_tree_nodes
DROP POLICY IF EXISTS "Family admins can update nodes" ON public.family_tree_nodes;
CREATE POLICY "Family admins can update nodes"
ON public.family_tree_nodes FOR UPDATE TO authenticated
USING (public.is_family_admin(auth.uid(), family_id))
WITH CHECK (public.is_family_admin(auth.uid(), family_id));

-- family_pacts
DROP POLICY IF EXISTS "Admins can update pacts" ON public.family_pacts;
CREATE POLICY "Admins can update pacts"
ON public.family_pacts FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), house_id))
WITH CHECK (public.is_house_admin(auth.uid(), house_id));

-- house_checklists
DROP POLICY IF EXISTS "Admins can update checklists" ON public.house_checklists;
CREATE POLICY "Admins can update checklists"
ON public.house_checklists FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), house_id))
WITH CHECK (public.is_house_admin(auth.uid(), house_id));

-- checklist_items
DROP POLICY IF EXISTS "Admins can update items" ON public.checklist_items;
CREATE POLICY "Admins can update items"
ON public.checklist_items FOR UPDATE TO authenticated
USING (public.is_house_admin(auth.uid(), public.get_house_id_from_checklist(checklist_id)))
WITH CHECK (public.is_house_admin(auth.uid(), public.get_house_id_from_checklist(checklist_id)));

-- space_documents
DROP POLICY IF EXISTS "Admins can update space documents" ON public.space_documents;
CREATE POLICY "Admins can update space documents"
ON public.space_documents FOR UPDATE TO authenticated
USING (public.is_family_admin(auth.uid(), space_id))
WITH CHECK (public.is_family_admin(auth.uid(), space_id));

-- space_subscriptions
DROP POLICY IF EXISTS "Space admins can update subscription" ON public.space_subscriptions;
CREATE POLICY "Space admins can update subscription"
ON public.space_subscriptions FOR UPDATE TO authenticated
USING (public.is_family_admin(auth.uid(), space_id))
WITH CHECK (public.is_family_admin(auth.uid(), space_id));

-- ----------------------------------------------------------------------------
-- Immuabilité des clés d'appartenance (défense en profondeur).
-- Même avec un WITH CHECK correct, un admin de la maison A pourrait modifier
-- house_id/user_id d'une ligne pour la faire pointer ailleurs si les deux
-- prédicats se trouvaient satisfaits. Ces triggers rendent le couple
-- (house_id, user_id) / (family_id, user_id) strictement immuable : toute
-- réaffectation doit passer par un DELETE + INSERT, tous deux soumis à la RLS.
-- ----------------------------------------------------------------------------

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
-- BLOC 5 — ÉLEVÉ : policies storage.objects sans contrôle de propriétaire
-- ----------------------------------------------------------------------------
-- FAILLE A (bucket 'house-photos', 20260308074522) : les policies UPDATE et
-- DELETE n'avaient que USING (bucket_id = 'house-photos'). N'importe quel
-- utilisateur authentifié pouvait écraser ou supprimer la photo de couverture
-- de n'importe quelle maison (défiguration / destruction de données).
-- L'INSERT était tout aussi permissif (WITH CHECK (bucket_id = ...)).
--
-- FAILLE B (bucket 'memories', 20260308064428) : l'INSERT n'avait que
-- WITH CHECK (bucket_id = 'memories'). N'importe quel utilisateur authentifié
-- pouvait déposer des fichiers arbitraires dans le dossier d'un autre
-- utilisateur (bucket public => hébergement de contenu tiers sous une
-- identité usurpée).
--
-- Conventions de chemin réelles vérifiées dans le front :
--   * house-photos : src/components/EditHouseDialog.tsx  -> `${house.id}/cover-${Date.now()}.${ext}`
--   * memories     : src/components/NewMemoryDialog.tsx  -> `${user.id}/${memory.id}/${uuid}.${ext}`
-- ============================================================================

-- --- Bucket house-photos : écriture réservée aux admins de la maison ciblée ---
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

-- La lecture reste publique : le bucket est public et les URLs sont servies
-- telles quelles par le front (getPublicUrl). Policy inchangée volontairement.

-- --- Bucket memories : dépôt uniquement dans son propre dossier, et seulement
-- --- sur un souvenir d'une maison dont on est membre actif ------------------
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

-- La policy DELETE existante ("Users can delete own memory photos") contrôle
-- déjà (storage.foldername(name))[1] = auth.uid()::text : elle est conforme et
-- reste inchangée.

-- --- Bucket avatars : FOR UPDATE sans WITH CHECK (relève aussi du BLOC 4) ----
-- FAILLE : "Users can update own avatar" (20260308064140) ne contrôlait que la
-- ligne AVANT modification. Un utilisateur pouvait donc mettre à jour son
-- propre avatar tout en RENOMMANT l'objet vers `{autre_user_id}/avatar.ext`,
-- écrasant ainsi l'avatar d'un tiers.
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
-- BLOC 6 — MOYEN : création d'espace au nom d'un tiers
-- ----------------------------------------------------------------------------
-- FAILLE : 20260401053801 a affaibli la policy INSERT sur public.families en
--     WITH CHECK (auth.uid() IS NOT NULL)
-- (la version d'origine vérifiait auth.uid() = created_by). N'importe quel
-- utilisateur authentifié pouvait donc créer un espace en positionnant
-- created_by sur l'uuid d'un tiers — ce qui, combiné à la policy
-- "Creators can view their families" (20260401054127) et au trigger du BLOC 1,
-- attribue la propriété et le rôle admin de l'espace à ce tiers.
--
-- CORRECTIF : rétablissement de auth.uid() = created_by. La colonne conserve
-- son DEFAULT auth.uid() (posé par la même migration 20260401053801), donc les
-- appelants qui omettent created_by continuent de fonctionner.
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;
CREATE POLICY "Authenticated users can create families"
ON public.families FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);


-- ============================================================================
-- BLOC 7 — MOYEN : exception de cast sur les policies du bucket 'documents'
-- ----------------------------------------------------------------------------
-- FAILLE / BUG : les policies créées en 20260401153624 castent
-- ((storage.foldername(name))[1])::uuid. Or deux conventions de chemin
-- coexistent réellement dans le front :
--   * src/pages/DocumentsPage.tsx    -> `${house_id}/${Date.now()}.${ext}`
--   * src/components/SpaceDocuments.tsx -> `spaces/${spaceId}/${Date.now()}.${ext}`
-- Pour la seconde, le segment [1] vaut littéralement 'spaces' : le cast lève
-- une erreur 22P02 (invalid input syntax for type uuid) qui fait échouer TOUTE
-- la requête storage, y compris les listings mélangeant les deux conventions —
-- un déni de service sur la fonctionnalité documents.
--
-- CORRECTIF : usage de public.safe_uuid() (jamais d'exception, NULL si le
-- segment n'est pas un uuid) et prise en charge explicite des deux conventions.
-- Les documents d'espace sont contrôlés via l'appartenance à l'espace
-- (families), les documents de maison via l'appartenance à la maison.
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
