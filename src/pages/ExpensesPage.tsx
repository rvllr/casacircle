import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHouseContext } from "@/contexts/HouseContext";
import AppLayout from "@/components/AppLayout";
import HouseSelector from "@/components/HouseSelector";
import NewExpenseDialog from "@/components/NewExpenseDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, ArrowUpRight, ArrowDownRight, Scale, Download } from "lucide-react";
import { exportExpensesCsv } from "@/lib/csvExport";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Profile { user_id: string; first_name: string | null; last_name: string | null; }
interface Expense {
  id: string; house_id: string; paid_by: string;
  description: string; amount: number; created_at: string;
  category?: string; expense_date?: string | null;
  houses: { name: string } | null;
}
interface ExpenseShare { id: string; expense_id: string; user_id: string; amount: number; }
interface BalanceEntry { userId: string; name: string; paid: number; owes: number; balance: number; }
interface Settlement { from: string; to: string; amount: number; }

const ExpensesPage = () => {
  const { user } = useAuth();
  const { houses, selectedHouseId, loading: housesLoading } = useHouseContext();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [shares, setShares] = useState<ExpenseShare[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: expData } = await supabase
      .from("expenses")
      .select("id, house_id, paid_by, description, amount, created_at, category, expense_date, houses(name)")
      .order("created_at", { ascending: false });

    const expList = (expData || []).map((e) => ({ ...e, houses: e.houses as Expense["houses"] }));
    setExpenses(expList);

    const expIds = expList.map((e) => e.id);
    if (expIds.length > 0) {
      const { data: sharesData } = await supabase
        .from("expense_shares")
        .select("id, expense_id, user_id, amount")
        .in("expense_id", expIds);
      setShares(sharesData || []);
    } else {
      setShares([]);
    }

    const userIds = [...new Set(expList.map((e) => e.paid_by))];
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("users_profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);
      setProfiles(profs || []);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredExpenses = selectedHouseId === "all"
    ? expenses
    : expenses.filter((e) => e.house_id === selectedHouseId);

  const filteredShares = useMemo(() => {
    const expIds = new Set(filteredExpenses.map((e) => e.id));
    return shares.filter((s) => expIds.has(s.expense_id));
  }, [filteredExpenses, shares]);

  const getName = (userId: string) => {
    const p = profiles.find((pr) => pr.user_id === userId);
    if (p?.first_name) return `${p.first_name}${p.last_name ? ` ${p.last_name}` : ""}`;
    return "Membre";
  };

  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  const balances: BalanceEntry[] = useMemo(() => {
    const map = new Map<string, { paid: number; owes: number }>();
    filteredExpenses.forEach((e) => {
      const entry = map.get(e.paid_by) || { paid: 0, owes: 0 };
      entry.paid += e.amount;
      map.set(e.paid_by, entry);
    });
    filteredShares.forEach((s) => {
      const entry = map.get(s.user_id) || { paid: 0, owes: 0 };
      entry.owes += s.amount;
      map.set(s.user_id, entry);
    });
    return Array.from(map.entries()).map(([userId, { paid, owes }]) => ({
      userId, name: getName(userId), paid, owes, balance: paid - owes,
    })).sort((a, b) => b.balance - a.balance);
  }, [filteredExpenses, filteredShares, profiles]);

  const settlements: Settlement[] = useMemo(() => {
    const debtors = balances.filter((b) => b.balance < 0).map((b) => ({ ...b, remaining: -b.balance }));
    const creditors = balances.filter((b) => b.balance > 0).map((b) => ({ ...b, remaining: b.balance }));
    const result: Settlement[] = [];
    let di = 0, ci = 0;
    while (di < debtors.length && ci < creditors.length) {
      const amount = Math.min(debtors[di].remaining, creditors[ci].remaining);
      if (amount > 0.01) {
        result.push({ from: debtors[di].name, to: creditors[ci].name, amount: Math.round(amount * 100) / 100 });
      }
      debtors[di].remaining -= amount;
      creditors[ci].remaining -= amount;
      if (debtors[di].remaining < 0.01) di++;
      if (creditors[ci].remaining < 0.01) ci++;
    }
    return result;
  }, [balances]);

  const formatDate = (d: string) => {
    try { return format(new Date(d), "d MMM yyyy", { locale: fr }); }
    catch { return d; }
  };

  if (loading || housesLoading) {
    return (
      <AppLayout title="Dépenses">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dépenses">
      <div className="space-y-6 max-w-5xl animate-fade-in">
        <div className="page-header">
          <div>
            <h2 className="page-header-title">Dépenses</h2>
            <p className="page-header-subtitle">Suivez et partagez les frais entre membres.</p>
          </div>
          <NewExpenseDialog onCreated={fetchData} />
        </div>

        <HouseSelector />

        {houses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-xl text-foreground mb-2">Aucune maison</h3>
              <p className="text-muted-foreground">Créez d'abord une famille et une maison.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="summary" className="space-y-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="summary">Résumé</TabsTrigger>
                <TabsTrigger value="list">Historique</TabsTrigger>
              </TabsList>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  exportExpensesCsv(
                    filteredExpenses.map((e) => ({
                      description: e.description,
                      amount: e.amount,
                      category: e.category || "autre",
                      paidBy: getName(e.paid_by),
                      houseName: e.houses?.name || "Maison",
                      date: e.expense_date || e.created_at,
                    }))
                  );
                }}
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Export CSV
              </Button>
            </div>

            <TabsContent value="summary" className="space-y-4">
              <Card>
                <CardContent className="py-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Total des dépenses</p>
                    <p className="text-3xl font-display text-foreground">{totalExpenses.toFixed(2)} €</p>
                  </div>
                </CardContent>
              </Card>

              {balances.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                      <Scale className="h-5 w-5 text-muted-foreground" />
                      Soldes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {balances.map((b) => (
                        <div key={b.userId} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div>
                            <p className="font-medium text-foreground">{b.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Payé {b.paid.toFixed(2)} € · Doit {b.owes.toFixed(2)} €
                            </p>
                          </div>
                          <Badge
                            variant={b.balance > 0.01 ? "default" : b.balance < -0.01 ? "destructive" : "secondary"}
                            className="font-mono"
                          >
                            {b.balance > 0 ? "+" : ""}{b.balance.toFixed(2)} €
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {settlements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-lg">Qui doit combien à qui ?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {settlements.map((s, i) => (
                        <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                          <div className="flex items-center gap-2 flex-1">
                            <ArrowUpRight className="h-4 w-4 text-destructive flex-shrink-0" />
                            <span className="font-medium text-foreground">{s.from}</span>
                          </div>
                          <Badge variant="outline" className="font-mono">{s.amount.toFixed(2)} €</Badge>
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <span className="font-medium text-foreground">{s.to}</span>
                            <ArrowDownRight className="h-4 w-4 text-accent flex-shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {balances.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">Aucune dépense enregistrée.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="list">
              {filteredExpenses.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">Aucune dépense.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredExpenses.map((e) => {
                    const expShares = shares.filter((s) => s.expense_id === e.id);
                    return (
                      <Card key={e.id}>
                        <CardContent className="py-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">{e.description}</p>
                                <Badge variant="outline">{e.houses?.name}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Payé par {getName(e.paid_by)} · {formatDate(e.created_at)}
                                {expShares.length > 0 && ` · Partagé entre ${expShares.length} pers.`}
                              </p>
                            </div>
                            <p className="text-lg font-display text-foreground">{e.amount.toFixed(2)} €</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
};

export default ExpensesPage;
