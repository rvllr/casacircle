-- ==============================================
-- Mode de répartition par dépense
--
-- Jusqu'ici la répartition était toujours égalitaire côté client, tandis que le
-- tableau de bord financier recalculait le dû au prorata des quotes-parts : les deux
-- chiffres ne se réconciliaient jamais. On matérialise désormais le mode retenu sur
-- chaque dépense, et les lignes de `expense_shares` deviennent la seule source de vérité.
--
-- Migration idempotente : elle peut être rejouée sans erreur.
-- ==============================================

-- ----------------------------------------------
-- 1. Type énuméré des modes de répartition
--    CREATE TYPE ne supporte pas IF NOT EXISTS : on rattrape duplicate_object.
-- ----------------------------------------------
DO $$
BEGIN
  CREATE TYPE public.expense_split_mode AS ENUM ('equal', 'ownership', 'manual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------
-- 2. Colonne split_mode sur expenses
--    DEFAULT 'equal' : l'historique existant a bien été réparti à parts égales,
--    on ne le réinterprète donc pas rétroactivement.
-- ----------------------------------------------
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS split_mode public.expense_split_mode NOT NULL DEFAULT 'equal';

COMMENT ON COLUMN public.expenses.split_mode IS
  'Mode de répartition utilisé pour générer les lignes expense_shares : equal | ownership | manual. '
  'Purement informatif/traçabilité : les montants font foi dans expense_shares.';

-- ----------------------------------------------
-- 3. Index de lecture des parts par dépense
--    Le tableau de bord charge les parts par lot d'expense_id (WHERE expense_id IN (...)).
--    La contrainte UNIQUE (expense_id, user_id) fournit déjà un index utilisable en
--    préfixe sur expense_id ; on ne crée donc rien de plus. On ajoute en revanche un
--    index sur user_id, utilisé pour agréger le dû par personne.
-- ----------------------------------------------
CREATE INDEX IF NOT EXISTS expense_shares_user_id_idx
  ON public.expense_shares (user_id);
