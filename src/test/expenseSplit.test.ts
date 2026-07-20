import { describe, it, expect } from "vitest";
import {
  splitExpense,
  eurosToCents,
  centsToEuros,
  isOwnershipTotalValid,
  type SplitMode,
  type SplitParticipant,
  type SplitResult,
} from "@/lib/expenseSplit";

/** Helper : extrait les parts d'un résultat attendu comme valide. */
function sharesOf(result: SplitResult) {
  if (result.status === "error") throw new Error(`Répartition inattendue en erreur : ${result.code} — ${result.message}`);
  return result.shares;
}

/** Helper : somme des parts. */
function sum(result: SplitResult) {
  return sharesOf(result).reduce((s, x) => s + x.amountCents, 0);
}

/** Helper : parts indexées par user_id. */
function byUser(result: SplitResult) {
  const map: Record<string, number> = {};
  sharesOf(result).forEach((s) => { map[s.userId] = s.amountCents; });
  return map;
}

const P = (userId: string, percentage?: number, amountCents?: number): SplitParticipant =>
  ({ userId, percentage, amountCents });

describe("expenseSplit — conversions", () => {
  it("convertit les euros en centimes entiers sans dérive flottante", () => {
    expect(eurosToCents(100)).toBe(10000);
    expect(eurosToCents(0.1)).toBe(10);
    expect(eurosToCents(1.005)).toBe(101); // pas de 100.49999...
    expect(eurosToCents(19.99)).toBe(1999);
    expect(eurosToCents(0)).toBe(0);
  });

  it("reconvertit les centimes en euros", () => {
    expect(centsToEuros(10000)).toBe(100);
    expect(centsToEuros(3333)).toBe(33.33);
  });
});

describe("expenseSplit — mode 'equal'", () => {
  it("100 € / 3 : les parts somment EXACTEMENT à 10000 centimes (bug historique : 99,99 €)", () => {
    const r = splitExpense(10000, [P("a"), P("b"), P("c")], "equal");
    expect(sum(r)).toBe(10000);
    expect(byUser(r)).toEqual({ a: 3334, b: 3333, c: 3333 });
  });

  it("distribue le reste aux N premiers selon l'ordre croissant des user_id", () => {
    // 10 centimes / 3 => 4, 3, 3 (le premier prend le centime en trop)
    const r = splitExpense(10, [P("zoe"), P("alice"), P("marc")], "equal");
    expect(byUser(r)).toEqual({ alice: 4, marc: 3, zoe: 3 });
    expect(sum(r)).toBe(10);
  });

  it("est déterministe : l'ordre d'entrée n'influence pas le résultat", () => {
    const a = byUser(splitExpense(10000, [P("a"), P("b"), P("c")], "equal"));
    const b = byUser(splitExpense(10000, [P("c"), P("a"), P("b")], "equal"));
    const c = byUser(splitExpense(10000, [P("b"), P("c"), P("a")], "equal"));
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it("répartit exactement quand la division tombe juste", () => {
    const r = splitExpense(10000, [P("a"), P("b"), P("c"), P("d")], "equal");
    expect(byUser(r)).toEqual({ a: 2500, b: 2500, c: 2500, d: 2500 });
  });

  it("1 participant reçoit la totalité", () => {
    const r = splitExpense(12345, [P("solo")], "equal");
    expect(byUser(r)).toEqual({ solo: 12345 });
  });

  it("1 centime pour 3 personnes : un seul centime attribué, invariant respecté", () => {
    const r = splitExpense(1, [P("c"), P("b"), P("a")], "equal");
    expect(sum(r)).toBe(1);
    expect(byUser(r)).toEqual({ a: 1, b: 0, c: 0 });
  });

  it("2 centimes pour 3 personnes", () => {
    const r = splitExpense(2, [P("a"), P("b"), P("c")], "equal");
    expect(sum(r)).toBe(2);
    expect(byUser(r)).toEqual({ a: 1, b: 1, c: 0 });
  });

  it("montant 0 : toutes les parts à 0", () => {
    const r = splitExpense(0, [P("a"), P("b")], "equal");
    expect(sum(r)).toBe(0);
    expect(byUser(r)).toEqual({ a: 0, b: 0 });
  });
});

describe("expenseSplit — mode 'ownership'", () => {
  it("prorata 50/30/20 sur un montant qui ne tombe pas rond", () => {
    // 100,03 € = 10003 centimes
    const r = splitExpense(10003, [P("a", 50), P("b", 30), P("c", 20)], "ownership");
    expect(sum(r)).toBe(10003);
    // exact : 5001.5 / 3000.9 / 2000.6 -> plancher 5001/3000/2000 = 10001, reste 2 centimes
    // plus forts restes : b (.9) puis c (.6)
    expect(byUser(r)).toEqual({ a: 5001, b: 3001, c: 2001 });
  });

  it("prorata 50/30/20 sur un montant rond", () => {
    const r = splitExpense(10000, [P("a", 50), P("b", 30), P("c", 20)], "ownership");
    expect(byUser(r)).toEqual({ a: 5000, b: 3000, c: 2000 });
  });

  it("quotes-parts 1/3-1/3-1/3 sur 100 €", () => {
    const third = 100 / 3; // 33.333333...
    const r = splitExpense(10000, [P("a", third), P("b", third), P("c", third)], "ownership");
    expect(sum(r)).toBe(10000);
    expect(byUser(r)).toEqual({ a: 3334, b: 3333, c: 3333 });
  });

  it("quotes-parts saisies 33.33 / 33.33 / 33.34 (somme = 100)", () => {
    const r = splitExpense(10000, [P("a", 33.33), P("b", 33.33), P("c", 33.34)], "ownership");
    expect(sum(r)).toBe(10000);
    expect(byUser(r)).toEqual({ a: 3333, b: 3333, c: 3334 });
  });

  it("utilise le plus fort reste, pas un Math.round par part", () => {
    // 3 parts à 1/3 sur 1 centime : un Math.round naïf donnerait 0+0+0 ou 1+1+1.
    const r = splitExpense(1, [P("a", 33.34), P("b", 33.33), P("c", 33.33)], "ownership");
    expect(sum(r)).toBe(1);
    expect(byUser(r)).toEqual({ a: 1, b: 0, c: 0 });
  });

  it("quote-part à 0 : le participant ne paie rien mais l'invariant tient", () => {
    const r = splitExpense(10000, [P("a", 60), P("b", 40), P("c", 0)], "ownership");
    expect(sum(r)).toBe(10000);
    expect(byUser(r)).toEqual({ a: 6000, b: 4000, c: 0 });
  });

  it("quotes-parts dont la somme ≠ 100 : normalise sur la somme réelle, invariant préservé", () => {
    // 30 + 30 = 60 -> chacun la moitié
    const r = splitExpense(10000, [P("a", 30), P("b", 30)], "ownership");
    expect(sum(r)).toBe(10000);
    expect(byUser(r)).toEqual({ a: 5000, b: 5000 });
  });

  it("somme des quotes-parts > 100 : normalise aussi, invariant préservé", () => {
    const r = splitExpense(9999, [P("a", 100), P("b", 50)], "ownership");
    expect(sum(r)).toBe(9999);
    expect(byUser(r)).toEqual({ a: 6666, b: 3333 });
  });

  it("refuse une somme de quotes-parts nulle", () => {
    const r = splitExpense(10000, [P("a", 0), P("b", 0)], "ownership");
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.code).toBe("ZERO_PERCENTAGE_TOTAL");
  });

  it("refuse une quote-part négative", () => {
    const r = splitExpense(10000, [P("a", -10), P("b", 110)], "ownership");
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.code).toBe("INVALID_PERCENTAGE");
  });

  it("1 seul participant prend tout, quelle que soit sa quote-part", () => {
    const r = splitExpense(7777, [P("solo", 42)], "ownership");
    expect(byUser(r)).toEqual({ solo: 7777 });
  });

  it("montant 0 : toutes les parts à 0", () => {
    const r = splitExpense(0, [P("a", 70), P("b", 30)], "ownership");
    expect(byUser(r)).toEqual({ a: 0, b: 0 });
  });

  it("reste déterministe sur des restes égaux (départage par user_id)", () => {
    // 1 centime, deux parts strictement égales : c'est le plus petit user_id qui l'obtient
    const r1 = byUser(splitExpense(1, [P("b", 50), P("a", 50)], "ownership"));
    const r2 = byUser(splitExpense(1, [P("a", 50), P("b", 50)], "ownership"));
    expect(r1).toEqual({ a: 1, b: 0 });
    expect(r1).toEqual(r2);
  });

  it("tient sur de très gros montants (pas de dépassement de précision)", () => {
    const total = 999_999_999_99; // ~1 milliard d'euros en centimes
    const r = splitExpense(total, [P("a", 33.33), P("b", 33.33), P("c", 33.34)], "ownership");
    expect(sum(r)).toBe(total);
  });
});

describe("expenseSplit — mode 'manual'", () => {
  it("accepte des parts dont la somme correspond exactement au total", () => {
    const r = splitExpense(10000, [P("a", undefined, 7000), P("b", undefined, 3000)], "manual");
    expect(sum(r)).toBe(10000);
    expect(byUser(r)).toEqual({ a: 7000, b: 3000 });
  });

  it("refuse explicitement une somme inférieure au total", () => {
    const r = splitExpense(10000, [P("a", undefined, 5000), P("b", undefined, 4000)], "manual");
    expect(r.status).toBe("error");
    if (r.status === "error") {
      expect(r.code).toBe("MANUAL_SUM_MISMATCH");
      expect(r.message).toContain("90.00");
      expect(r.message).toContain("100.00");
    }
  });

  it("refuse explicitement une somme supérieure au total", () => {
    const r = splitExpense(10000, [P("a", undefined, 9000), P("b", undefined, 2000)], "manual");
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.code).toBe("MANUAL_SUM_MISMATCH");
  });

  it("refuse une part manquante", () => {
    const r = splitExpense(10000, [P("a", undefined, 10000), P("b")], "manual");
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.code).toBe("INVALID_MANUAL_AMOUNT");
  });

  it("refuse une part non entière (centimes fractionnaires)", () => {
    const r = splitExpense(10000, [P("a", undefined, 5000.5), P("b", undefined, 4999.5)], "manual");
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.code).toBe("INVALID_MANUAL_AMOUNT");
  });

  it("refuse une part négative", () => {
    const r = splitExpense(10000, [P("a", undefined, 11000), P("b", undefined, -1000)], "manual");
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.code).toBe("INVALID_MANUAL_AMOUNT");
  });

  it("accepte un total de 0 avec des parts à 0", () => {
    const r = splitExpense(0, [P("a", undefined, 0), P("b", undefined, 0)], "manual");
    expect(sum(r)).toBe(0);
  });
});

describe("expenseSplit — cas limites communs", () => {
  const modes: SplitMode[] = ["equal", "ownership", "manual"];

  it.each(modes)("refuse 0 participant (mode %s)", (mode) => {
    const r = splitExpense(10000, [], mode);
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.code).toBe("NO_PARTICIPANTS");
  });

  it.each(modes)("refuse un montant négatif (mode %s)", (mode) => {
    const r = splitExpense(-1, [P("a", 100, -1)], mode);
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.code).toBe("INVALID_AMOUNT");
  });

  it.each(modes)("refuse un montant non entier (mode %s)", (mode) => {
    const r = splitExpense(100.5, [P("a", 100, 100.5)], mode);
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.code).toBe("INVALID_AMOUNT");
  });

  it.each(modes)("refuse un montant NaN (mode %s)", (mode) => {
    const r = splitExpense(NaN, [P("a", 100, 0)], mode);
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.code).toBe("INVALID_AMOUNT");
  });

  it.each(modes)("refuse un participant en double (mode %s)", (mode) => {
    const r = splitExpense(10000, [P("a", 50, 5000), P("a", 50, 5000)], mode);
    expect(r.status).toBe("error");
    if (r.status === "error") expect(r.code).toBe("DUPLICATE_PARTICIPANT");
  });

  it.each(modes)("retourne autant de parts que de participants (mode %s)", (mode) => {
    const parts = [P("a", 50, 5000), P("b", 30, 3000), P("c", 20, 2000)];
    const r = splitExpense(10000, parts, mode);
    expect(sharesOf(r)).toHaveLength(3);
  });

  it.each(modes)("ne produit jamais de part non entière (mode %s)", (mode) => {
    const r = splitExpense(10003, [P("a", 50, 5002), P("b", 30, 3000), P("c", 20, 2001)], mode);
    sharesOf(r).forEach((s) => expect(Number.isInteger(s.amountCents)).toBe(true));
  });
});

describe("isOwnershipTotalValid", () => {
  it("accepte une somme de 100", () => {
    expect(isOwnershipTotalValid([50, 30, 20])).toBe(true);
    expect(isOwnershipTotalValid([100])).toBe(true);
  });

  it("tolère les arrondis décimaux (33.33 × 3 = 99.99)", () => {
    expect(isOwnershipTotalValid([33.33, 33.33, 33.34])).toBe(true);
    expect(isOwnershipTotalValid([33.33, 33.33, 33.33])).toBe(true); // 99.99, dans la tolérance
  });

  it("refuse une somme franchement différente de 100", () => {
    expect(isOwnershipTotalValid([50, 30])).toBe(false);
    expect(isOwnershipTotalValid([60, 60])).toBe(false);
    expect(isOwnershipTotalValid([99.9])).toBe(false);
  });

  it("refuse une liste vide", () => {
    expect(isOwnershipTotalValid([])).toBe(false);
  });
});

describe("expenseSplit — test de propriété : l'invariant tient toujours", () => {
  /** PRNG déterministe (mulberry32) pour que l'échec soit reproductible. */
  function makeRng(seed: number) {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  it("equal : somme(parts) === total sur 2000 combinaisons aléatoires", () => {
    const rng = makeRng(20260720);
    for (let iter = 0; iter < 2000; iter++) {
      const n = 1 + Math.floor(rng() * 12);
      const totalCents = Math.floor(rng() * 5_000_000);
      const parts = Array.from({ length: n }, (_, i) => P(`user-${Math.floor(rng() * 1e9)}-${i}`));
      const r = splitExpense(totalCents, parts, "equal");
      expect(sum(r)).toBe(totalCents);
      // Répartition égale : l'écart max entre deux parts est de 1 centime.
      const amounts = sharesOf(r).map((s) => s.amountCents);
      expect(Math.max(...amounts) - Math.min(...amounts)).toBeLessThanOrEqual(1);
    }
  });

  it("ownership : somme(parts) === total sur 2000 répartitions aléatoires", () => {
    const rng = makeRng(987654321);
    for (let iter = 0; iter < 2000; iter++) {
      const n = 1 + Math.floor(rng() * 12);
      const totalCents = Math.floor(rng() * 5_000_000);

      // Quotes-parts aléatoires ramenées à 100 % avec des décimales (comme en base : numeric)
      const raw = Array.from({ length: n }, () => rng());
      const rawTotal = raw.reduce((a, b) => a + b, 0);
      const pcts = raw.map((v) => Math.round((v / rawTotal) * 10000) / 100);

      const parts = pcts.map((pct, i) => P(`user-${Math.floor(rng() * 1e9)}-${i}`, pct));
      const r = splitExpense(totalCents, parts, "ownership");

      if (pcts.every((p) => p === 0)) {
        expect(r.status).toBe("error");
        continue;
      }
      expect(sum(r)).toBe(totalCents);
      sharesOf(r).forEach((s) => {
        expect(Number.isInteger(s.amountCents)).toBe(true);
        expect(s.amountCents).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it("ownership : chaque part reste à moins d'un centime de sa valeur théorique exacte", () => {
    const rng = makeRng(4242);
    for (let iter = 0; iter < 500; iter++) {
      const n = 2 + Math.floor(rng() * 8);
      const totalCents = Math.floor(rng() * 1_000_000);
      const raw = Array.from({ length: n }, () => 0.05 + rng());
      const rawTotal = raw.reduce((a, b) => a + b, 0);
      const pcts = raw.map((v) => (v / rawTotal) * 100);
      const parts = pcts.map((pct, i) => P(`u${String(i).padStart(3, "0")}`, pct));

      const r = splitExpense(totalCents, parts, "ownership");
      const map = byUser(r);
      parts.forEach((p, i) => {
        const exact = (totalCents * pcts[i]) / 100;
        // Propriété de la méthode du plus fort reste : |part - exact| < 1 centime
        expect(Math.abs(map[p.userId] - exact)).toBeLessThan(1);
      });
    }
  });

  it("manual : accepte toujours une répartition construite par splitExpense elle-même", () => {
    const rng = makeRng(13371337);
    for (let iter = 0; iter < 500; iter++) {
      const n = 1 + Math.floor(rng() * 8);
      const totalCents = Math.floor(rng() * 1_000_000);
      const ids = Array.from({ length: n }, (_, i) => `u${String(i).padStart(3, "0")}`);
      const equal = sharesOf(splitExpense(totalCents, ids.map((id) => P(id)), "equal"));

      const r = splitExpense(
        totalCents,
        equal.map((s) => P(s.userId, undefined, s.amountCents)),
        "manual"
      );
      expect(sum(r)).toBe(totalCents);
    }
  });
});
