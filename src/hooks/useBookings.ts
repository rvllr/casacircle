import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { DEMO_BOOKINGS_ENRICHED } from "@/lib/demoData";
import { normalizeRelation } from "@/lib/supabaseHelpers";

export interface BookingRow {
  id: string;
  house_id: string;
  unit_id: string | null;
  user_id: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  payment_status: string;
  total_price: number | null;
  amount_paid: number | null;
  houses: { name: string; family_id: string | null; location?: string | null } | null;
  house_units: { name: string; type: string } | null;
  users_profiles: { first_name: string | null; last_name: string | null } | null;
}

export interface BlockedPeriod {
  id: string;
  house_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

interface UseBookingsReturn {
  data: BookingRow[];
  blockedPeriods: BlockedPeriod[];
  pricingActiveHouseIds: Set<string>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBookings(): UseBookingsReturn {
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const [data, setData] = useState<BookingRow[]>([]);
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [pricingActiveHouseIds, setPricingActiveHouseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (isDemo) {
      setData(DEMO_BOOKINGS_ENRICHED as BookingRow[]);
      setBlockedPeriods([]);
      setPricingActiveHouseIds(new Set());
      setLoading(false);
      return;
    }
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const [bookingsRes, blockedRes, pricingRes, profilesRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, house_id, unit_id, user_id, start_date, end_date, status, created_at, payment_status, total_price, amount_paid, houses(name, family_id, location), house_units(name, type)")
        .order("start_date", { ascending: true }),
      supabase
        .from("blocked_periods")
        .select("id, house_id, start_date, end_date, reason"),
      supabase
        .from("house_pricing")
        .select("house_id, is_active")
        .eq("is_active", true),
      supabase
        .from("users_profiles")
        .select("user_id, first_name, last_name"),
    ]);

    if (bookingsRes.error) {
      setError(bookingsRes.error.message);
      setLoading(false);
      return;
    }

    setPricingActiveHouseIds(new Set((pricingRes.data || []).map((p) => p.house_id)));
    setBlockedPeriods(
      (blockedRes.data || []).map((bp) => ({
        id: bp.id,
        house_id: bp.house_id,
        start_date: bp.start_date,
        end_date: bp.end_date,
        reason: bp.reason,
      }))
    );

    const profileMap = new Map(
      (profilesRes.data || []).map((p) => [p.user_id, { first_name: p.first_name, last_name: p.last_name }])
    );

    const enriched: BookingRow[] = (bookingsRes.data || []).map((b) => ({
      id: b.id,
      house_id: b.house_id,
      unit_id: b.unit_id,
      user_id: b.user_id,
      start_date: b.start_date,
      end_date: b.end_date,
      status: b.status,
      created_at: b.created_at,
      payment_status: b.payment_status,
      total_price: b.total_price,
      amount_paid: b.amount_paid,
      houses: normalizeRelation(b.houses),
      house_units: normalizeRelation(b.house_units),
      users_profiles: profileMap.get(b.user_id) ?? null,
    }));

    setData(enriched);
    setLoading(false);
  }, [user, isDemo]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, blockedPeriods, pricingActiveHouseIds, loading, error, refetch };
}
