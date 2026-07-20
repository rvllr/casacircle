-- ==============================================
-- Intégrité des quotes-parts : la somme d'une maison doit valoir 100 %
--
-- Problème : rien n'empêchait un état incohérent (somme à 80 % ou 120 %), et l'UI
-- se contentait de bloquer au-delà de 100, donc une répartition incomplète pouvait
-- être enregistrée puis servir de base à une répartition de dépense au prorata.
--
-- STRATÉGIE RETENUE (la plus simple qui marche) :
--   1. Une CONSTRAINT TRIGGER DEFERRABLE INITIALLY DEFERRED : la validation n'a lieu
--      qu'au COMMIT, pas ligne par ligne. Un état transitoire incohérent est donc
--      permis *à l'intérieur* d'une transaction, ce qui autorise le remplacement
--      complet des parts (DELETE puis INSERT) sans se bloquer soi-même.
--   2. Une RPC `save_ownership_shares` qui enregistre TOUTES les parts d'une maison
--      de façon atomique (une transaction = un COMMIT = une validation), et journalise
--      l'historique. C'est le chemin que doit emprunter le client.
--
-- Conséquence assumée : une écriture PostgREST ligne par ligne sur ownership_shares
-- (une transaction par ligne) échouera si elle laisse la somme ≠ 100. C'est voulu —
-- l'édition unitaire d'une quote-part est intrinsèquement incohérente en indivision.
--
-- L'état "aucune ligne" reste toléré : c'est l'état initial d'une maison, et
-- c'est aussi l'état transitoire d'une remise à zéro.
--
-- Migration idempotente.
-- ==============================================

-- ----------------------------------------------
-- 1. Fonction de validation
-- ----------------------------------------------
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
  -- Sur DELETE, l'enregistrement NEW n'est pas affecté : y accéder lèverait
  -- « record "new" is not assigned yet ». On distingue donc l'opération.
  IF TG_OP = 'DELETE' THEN
    _house_id := OLD.house_id;
  ELSE
    _house_id := NEW.house_id;
  END IF;

  SELECT count(*), COALESCE(sum(percentage), 0)
    INTO _count, _total
    FROM public.ownership_shares
   WHERE house_id = _house_id;

  -- Aucune ligne : maison sans quotes-parts définies, état légitime.
  IF _count = 0 THEN
    RETURN NULL;
  END IF;

  -- Tolérance de 0.01 : les parts sont en numeric et 33.33 × 3 = 99.99.
  IF abs(_total - 100) > 0.01 THEN
    RAISE EXCEPTION
      'La somme des quotes-parts de la maison % vaut % %% au lieu de 100 %%.',
      _house_id, _total
      USING ERRCODE = 'check_violation',
            HINT = 'Enregistrez toutes les quotes-parts en une seule fois via save_ownership_shares().';
  END IF;

  RETURN NULL;
END $$;

-- ----------------------------------------------
-- 2. Contrainte différée (validée au COMMIT)
-- ----------------------------------------------
DROP TRIGGER IF EXISTS ownership_shares_total_check ON public.ownership_shares;

CREATE CONSTRAINT TRIGGER ownership_shares_total_check
  AFTER INSERT OR UPDATE OR DELETE ON public.ownership_shares
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_ownership_shares_total();

-- ----------------------------------------------
-- 3. RPC de sauvegarde atomique de toutes les quotes-parts d'une maison
--
--    _shares : tableau jsonb [{ "user_id": "...", "percentage": 50 }, ...]
--    Les membres absents du tableau (ou à 0 %) voient leur ligne SUPPRIMÉE, ce qui
--    permet enfin de retirer un copropriétaire.
-- ----------------------------------------------
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
  -- SECURITY DEFINER contourne la RLS : on refait le contrôle d'accès explicitement.
  IF _actor IS NULL OR NOT public.is_house_admin(_actor, _house_id) THEN
    RAISE EXCEPTION 'Accès refusé : seul un administrateur de la maison peut modifier les quotes-parts.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Parts normalisées : on ignore les entrées à 0 (= retrait du copropriétaire).
  -- DROP préalable : une table ON COMMIT DROP survit jusqu'au COMMIT, donc un second
  -- appel dans la même transaction échouerait sur un nom déjà pris.
  -- (test via to_regclass plutôt que DROP IF EXISTS, qui émettrait un NOTICE à chaque appel)
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

  -- On autorise la remise à zéro complète (tableau vide) ; sinon la somme doit faire 100.
  IF (SELECT count(*) FROM _incoming) > 0 AND abs(_total - 100) > 0.01 THEN
    RAISE EXCEPTION 'La somme des quotes-parts doit valoir 100 %% (reçu : % %%).', _total
      USING ERRCODE = 'check_violation';
  END IF;

  -- Historique AVANT modification (diff entre l'état courant et l'état cible).
  INSERT INTO public.ownership_history (house_id, user_id, old_percentage, new_percentage, changed_by)
  SELECT _house_id,
         COALESCE(cur.user_id, inc.user_id),
         COALESCE(cur.percentage, 0),
         COALESCE(inc.percentage, 0),
         _actor
    FROM (SELECT user_id, percentage FROM public.ownership_shares WHERE house_id = _house_id) cur
    FULL OUTER JOIN _incoming inc ON inc.user_id = cur.user_id
   WHERE COALESCE(cur.percentage, 0) IS DISTINCT FROM COALESCE(inc.percentage, 0);

  -- Retraits : lignes existantes absentes de la cible.
  DELETE FROM public.ownership_shares os
   WHERE os.house_id = _house_id
     AND NOT EXISTS (SELECT 1 FROM _incoming inc WHERE inc.user_id = os.user_id);

  -- Créations / mises à jour.
  INSERT INTO public.ownership_shares (house_id, user_id, percentage)
  SELECT _house_id, inc.user_id, inc.percentage FROM _incoming inc
  ON CONFLICT (house_id, user_id)
  DO UPDATE SET percentage = EXCLUDED.percentage, updated_at = now();

  -- La contrainte différée est vérifiée ici, au COMMIT de la transaction.
END $$;

REVOKE ALL ON FUNCTION public.save_ownership_shares(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.save_ownership_shares(uuid, jsonb) TO authenticated;

COMMENT ON FUNCTION public.save_ownership_shares(uuid, jsonb) IS
  'Remplace de façon atomique toutes les quotes-parts d''une maison. '
  'Valide la somme à 100 %, journalise ownership_history, supprime les copropriétaires retirés.';
