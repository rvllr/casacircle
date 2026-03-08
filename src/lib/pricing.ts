import { eachDayOfInterval, getMonth, getDate } from "date-fns";

interface PricingPeriod {
  name: string;
  start_month: number;
  start_day: number;
  end_month: number;
  end_day: number;
  is_recurring: boolean;
  start_date: string | null;
  end_date: string | null;
  price_type: "absolute" | "multiplier";
  price_value: number;
  priority: number;
}

interface PricingConfig {
  pricing_mode: string;
  base_price: number;
  cap_amount: number | null;
}

/**
 * Check if a date falls within a pricing period.
 */
function dateInPeriod(date: Date, period: PricingPeriod): boolean {
  if (!period.is_recurring && period.start_date && period.end_date) {
    const sd = new Date(period.start_date);
    const ed = new Date(period.end_date);
    return date >= sd && date <= ed;
  }

  const m = getMonth(date) + 1; // 1-based
  const d = getDate(date);
  const startVal = period.start_month * 100 + period.start_day;
  const endVal = period.end_month * 100 + period.end_day;
  const dateVal = m * 100 + d;

  // Handle periods that wrap around year end (e.g., Nov → Feb)
  if (startVal <= endVal) {
    return dateVal >= startVal && dateVal <= endVal;
  }
  return dateVal >= startVal || dateVal <= endVal;
}

/**
 * Get the applicable price per unit for a given date.
 * Returns { price, periodName } where price is per-unit (night, person, etc.)
 */
function getPriceForDate(
  date: Date,
  basePrice: number,
  periods: PricingPeriod[]
): { price: number; periodName: string | null } {
  // Find matching periods sorted by priority desc
  const matching = periods
    .filter((p) => dateInPeriod(date, p))
    .sort((a, b) => b.priority - a.priority);

  if (matching.length === 0) {
    return { price: basePrice, periodName: null };
  }

  const best = matching[0];
  if (best.price_type === "absolute") {
    return { price: best.price_value, periodName: best.name };
  }
  return { price: basePrice * best.price_value, periodName: best.name };
}

/**
 * Calculate total booking cost with period-based pricing.
 */
export function calculateBookingCost(
  startDate: Date,
  endDate: Date,
  guestCount: number,
  config: PricingConfig,
  periods: PricingPeriod[]
): { total: number; breakdown: { periodName: string; nights: number; pricePerUnit: number }[] } {
  // Get each night (check-in dates, not check-out)
  const nights = eachDayOfInterval({
    start: startDate,
    end: new Date(endDate.getTime() - 86400000), // exclude checkout day
  });

  if (nights.length === 0) {
    return { total: 0, breakdown: [] };
  }

  // Group nights by effective period
  const grouped = new Map<string, { periodName: string; nights: number; pricePerUnit: number }>();

  for (const night of nights) {
    const { price, periodName } = getPriceForDate(night, config.base_price, periods);
    const key = periodName || "__base__";
    const existing = grouped.get(key);
    if (existing) {
      existing.nights += 1;
    } else {
      grouped.set(key, {
        periodName: periodName || "Tarif de base",
        nights: 1,
        pricePerUnit: price,
      });
    }
  }

  const breakdown = Array.from(grouped.values());

  let total = 0;
  for (const entry of breakdown) {
    if (config.pricing_mode === "per_night") {
      total += entry.pricePerUnit * entry.nights;
    } else if (config.pricing_mode === "per_person") {
      // per_person: price × persons (flat, not per night) — but with periods we do per-night calculation
      total += entry.pricePerUnit * guestCount;
    } else {
      // per_person_per_night
      total += entry.pricePerUnit * guestCount * entry.nights;
    }
  }

  if (config.cap_amount && total > config.cap_amount) {
    total = config.cap_amount;
  }

  return { total, breakdown };
}
