/**
 * Répartition d'une dépense entre indivisaires.
 *
 * Règles du module :
 *  - tous les calculs se font en CENTIMES ENTIERS, jamais en float ;
 *  - INVARIANT ABSOLU : somme(parts) === montant total, exactement, dans tous les cas ;
 *  - aucune I/O, aucune dépendance : fonctions pures et testables.
 *
 * Ce module est la SEULE source de vérité pour le calcul des parts.
 * Les lignes produites sont persistées dans `expense_shares` ; le tableau de bord
 * financier lit ces lignes au lieu de refaire un calcul de son côté, ce qui garantit
 * la réconciliation par construction.
 */

/** Mode de répartition, aligné sur la colonne `expenses.split_mode`. */
export type SplitMode = "equal" | "ownership" | "manual";

export const SPLIT_MODES: SplitMode[] = ["equal", "ownership", "manual"];

/** Libellés FR des modes, pour les sélecteurs de l'UI. */
export const SPLIT_MODE_LABELS: Record<SplitMode, string> = {
  equal: "Égalitaire",
  ownership: "Au prorata des quotes-parts",
  manual: "Manuel",
};

export interface SplitParticipant {
  userId: string;
  /** Quote-part en % (0 à 100). Requise en mode `ownership`, ignorée sinon. */
  percentage?: number;
  /** Part imposée en centimes entiers. Requise en mode `manual`, ignorée sinon. */
  amountCents?: number;
}

export interface SplitShare {
  userId: string;
  amountCents: number;
}

export type SplitErrorCode =
  | "INVALID_AMOUNT"
  | "NO_PARTICIPANTS"
  | "DUPLICATE_PARTICIPANT"
  | "INVALID_PERCENTAGE"
  | "ZERO_PERCENTAGE_TOTAL"
  | "INVALID_MANUAL_AMOUNT"
  | "MANUAL_SUM_MISMATCH";

/**
 * Résultat discriminé par une chaîne (`status`) et non par un booléen : le projet
 * compile avec `strictNullChecks: false`, configuration dans laquelle TypeScript ne
 * réduit pas correctement une union discriminée par un littéral booléen.
 */
export type SplitResult =
  | { status: "ok"; shares: SplitShare[] }
  | { status: "error"; code: SplitErrorCode; message: string };

/** Tolérance sur la somme des quotes-parts (les pourcentages sont en `numeric`). */
export const OWNERSHIP_TOTAL_TOLERANCE = 0.01;

const fail = (code: SplitErrorCode, message: string): SplitResult => ({ status: "error", code, message });

/**
 * Convertit un montant en euros (float saisi par l'utilisateur) en centimes entiers.
 *
 * `euros * 100` dérive en binaire (1.005 * 100 === 100.49999999999999, qui s'arrondirait
 * à 100 au lieu de 101). On repasse par une précision décimale de 12 chiffres significatifs
 * avant d'arrondir : c'est très au-delà de ce qu'un montant en euros peut porter, et cela
 * élimine le bruit de représentation.
 */
export function eurosToCents(euros: number): number {
  if (!Number.isFinite(euros)) return NaN;
  return Math.round(Number((euros * 100).toPrecision(12)));
}

/** Convertit des centimes entiers en euros (pour l'affichage / la persistance NUMERIC(10,2)). */
export function centsToEuros(cents: number): number {
  return cents / 100;
}

/**
 * Vérifie que la somme des quotes-parts vaut bien 100 % (à la tolérance décimale près).
 * Utilisé par l'UI pour refuser une répartition `ownership` sur une assiette incohérente,
 * AVANT d'appeler `splitExpense` — la fonction de calcul, elle, normalise sur la somme réelle.
 */
export function isOwnershipTotalValid(percentages: number[]): boolean {
  if (percentages.length === 0) return false;
  const total = percentages.reduce((a, b) => a + b, 0);
  // Marge epsilon en plus de la tolérance métier : sans elle, 33.33 × 3 donne un écart
  // flottant de 0.010000000000005 qui dépasserait tout juste une tolérance de 0.01.
  return Math.abs(total - 100) <= OWNERSHIP_TOTAL_TOLERANCE + 1e-9;
}

/**
 * Répartit `totalCents` entre les participants selon `mode`.
 *
 * - `equal`   : parts égales ; les centimes indivisibles sont donnés 1 par 1 aux N premiers
 *               participants dans l'ordre croissant de `userId` (déterministe et reproductible).
 * - `ownership`: prorata des quotes-parts, avec répartition des centimes restants par la
 *               méthode du plus fort reste (Hare / largest remainder). Si la somme des
 *               quotes-parts ne vaut pas 100, on normalise sur la somme réelle : l'invariant
 *               est préservé (voir `isOwnershipTotalValid` pour refuser ce cas côté UI).
 * - `manual`  : parts fournies par l'appelant, refusées si leur somme ≠ total.
 */
export function splitExpense(
  totalCents: number,
  participants: SplitParticipant[],
  mode: SplitMode
): SplitResult {
  if (!Number.isFinite(totalCents) || !Number.isInteger(totalCents)) {
    return fail("INVALID_AMOUNT", "Le montant doit être un nombre entier de centimes.");
  }
  if (totalCents < 0) {
    return fail("INVALID_AMOUNT", "Le montant ne peut pas être négatif.");
  }
  if (participants.length === 0) {
    return fail("NO_PARTICIPANTS", "Aucun participant : la dépense ne peut pas être répartie.");
  }

  const userIds = participants.map((p) => p.userId);
  if (new Set(userIds).size !== userIds.length) {
    return fail("DUPLICATE_PARTICIPANT", "Un même participant apparaît plusieurs fois.");
  }

  // Ordre stable : tri par user_id croissant. Il conditionne l'attribution des centimes
  // résiduels, donc le résultat est reproductible quel que soit l'ordre d'entrée.
  const sorted = [...participants].sort((a, b) => (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0));

  switch (mode) {
    case "equal":
      return splitEqual(totalCents, sorted);
    case "ownership":
      return splitByOwnership(totalCents, sorted);
    case "manual":
      return splitManual(totalCents, sorted);
  }
}

/** Répartition égale : reste distribué 1 centime aux premiers participants (ordre stable). */
function splitEqual(totalCents: number, participants: SplitParticipant[]): SplitResult {
  const n = participants.length;
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n; // 0 <= remainder < n

  const shares = participants.map((p, i) => ({
    userId: p.userId,
    amountCents: base + (i < remainder ? 1 : 0),
  }));

  return { status: "ok", shares };
}

/**
 * Répartition au prorata des quotes-parts, méthode du plus fort reste.
 *
 * Les pourcentages sont des `numeric` pouvant porter des décimales (33.33…). On les convertit
 * en poids entiers (×1e6) et on mène tout le calcul en BigInt : aucune perte de précision,
 * aucun risque de dépassement de Number.MAX_SAFE_INTEGER sur les gros montants.
 */
function splitByOwnership(totalCents: number, participants: SplitParticipant[]): SplitResult {
  const PERCENT_SCALE = 1_000_000;

  const weights: bigint[] = [];
  for (const p of participants) {
    const pct = p.percentage ?? 0;
    if (!Number.isFinite(pct) || pct < 0) {
      return fail("INVALID_PERCENTAGE", `Quote-part invalide pour le participant ${p.userId}.`);
    }
    weights.push(BigInt(Math.round(pct * PERCENT_SCALE)));
  }

  const totalWeight = weights.reduce((a, b) => a + b, 0n);
  if (totalWeight === 0n) {
    return fail(
      "ZERO_PERCENTAGE_TOTAL",
      "La somme des quotes-parts est nulle : impossible de répartir au prorata."
    );
  }

  const total = BigInt(totalCents);

  // 1) Part plancher de chacun + reste fractionnaire (numérateur du reste, sur totalWeight).
  const rows = participants.map((p, i) => {
    const numerator = total * weights[i];
    const base = numerator / totalWeight; // division entière BigInt
    const remainder = numerator - base * totalWeight;
    return { userId: p.userId, index: i, base: Number(base), remainder };
  });

  // 2) Centimes restants à distribuer.
  const distributed = rows.reduce((s, r) => s + r.base, 0);
  let leftover = totalCents - distributed;

  // 3) Plus fort reste d'abord ; à reste égal, ordre stable des user_id (rows est déjà trié).
  const byRemainder = [...rows].sort((a, b) => {
    if (a.remainder > b.remainder) return -1;
    if (a.remainder < b.remainder) return 1;
    return a.index - b.index;
  });

  const bonus = new Set<number>();
  for (const row of byRemainder) {
    if (leftover <= 0) break;
    bonus.add(row.index);
    leftover -= 1;
  }

  const shares = rows.map((r) => ({
    userId: r.userId,
    amountCents: r.base + (bonus.has(r.index) ? 1 : 0),
  }));

  return { status: "ok", shares };
}

/** Répartition manuelle : on valide que les parts fournies somment exactement au total. */
function splitManual(totalCents: number, participants: SplitParticipant[]): SplitResult {
  const shares: SplitShare[] = [];

  for (const p of participants) {
    const amount = p.amountCents;
    if (amount === undefined || !Number.isFinite(amount) || !Number.isInteger(amount)) {
      return fail(
        "INVALID_MANUAL_AMOUNT",
        `Part manquante ou non entière (en centimes) pour le participant ${p.userId}.`
      );
    }
    if (amount < 0) {
      return fail("INVALID_MANUAL_AMOUNT", `Part négative pour le participant ${p.userId}.`);
    }
    shares.push({ userId: p.userId, amountCents: amount });
  }

  const sum = shares.reduce((s, x) => s + x.amountCents, 0);
  if (sum !== totalCents) {
    return fail(
      "MANUAL_SUM_MISMATCH",
      `La somme des parts (${centsToEuros(sum).toFixed(2)} €) ne correspond pas au montant total (${centsToEuros(totalCents).toFixed(2)} €).`
    );
  }

  return { status: "ok", shares };
}
