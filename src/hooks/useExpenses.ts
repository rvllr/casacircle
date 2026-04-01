import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { DEMO_ALL_EXPENSES, DEMO_EXPENSE_SHARES } from "@/lib/demoData";
import { normalizeRelation } from "@/lib/supabaseHelpers";

export interface Expense {
  id: string;
  house_id: string;
  paid_by: string;
  description: string;
  amount: number;
  created_at: string;
  category?: string;
  expense_date?: string | null;
  houses: { name: string } | null;
}

export interface ExpenseShare {
  id: string;
  expense_id: string;
  user_id: string;
  amount: number;
}

interface UseExpensesReturn {
  data: Expense[];
  shares: ExpenseShare[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useExpenses(): UseExpensesReturn {
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const [data, setData] = useState<Expense[]>([]);
  const [shares, setShares] = useState<ExpenseShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (isDemo) {
      setData(DEMO_ALL_EXPENSES as Expense[]);
      setShares(DEMO_EXPENSE_SHARES);
      setLoading(false);
      return;
    }
    if (!user) {
      setData([]);
      setShares([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const [expRes, sharesRes] = await Promise.all([
      supabase
        .from("expenses")
        .select("id, house_id, paid_by, description, amount, created_at, category, expense_date, houses(name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("expense_shares")
        .select("id, expense_id, user_id, amount"),
    ]);

    if (expRes.error) {
      setError(expRes.error.message);
      setLoading(false);
      return;
    }

    const expList: Expense[] = (expRes.data || []).map((e) => ({
      id: e.id,
      house_id: e.house_id,
      paid_by: e.paid_by,
      description: e.description,
      amount: e.amount,
      created_at: e.created_at,
      category: e.category,
      expense_date: e.expense_date,
      houses: normalizeRelation(e.houses),
    }));
    setData(expList);

    const expIds = new Set(expList.map((e) => e.id));
    setShares((sharesRes.data || []).filter((s) => expIds.has(s.expense_id)));

    setLoading(false);
  }, [user, isDemo]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, shares, loading, error, refetch };
}
