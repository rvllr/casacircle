import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Users, Moon, PieChart, TrendingUp, Calculator, AlertTriangle } from "lucide-react";
import { splitExpense, eurosToCents, centsToEuros } from "@/lib/expenseSplit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from "recharts";
import { startOfYear, endOfYear, differenceInCalendarDays, eachMonthOfInterval, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/constants";

interface FinancialDashboardProps {
  houseId: string;
  members: { user_id: string; profile?: { first_name: string | null; last_name: string | null; email: string | null } }[];
}

const CATEGORY_LABELS = EXPENSE_CATEGORY_LABELS;

const PIE_COLORS = [
  "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--chart-1))",
  "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))",
];

interface ExpenseShareRow {
  expense_id: string;
  user_id: string;
  amount: number;
}

const FinancialDashboard = ({ houseId, members }: FinancialDashboardProps) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [shares, setShares] = useState<Record<string, number>>({});
  const [expenseShares, setExpenseShares] = useState<ExpenseShareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [simAmount, setSimAmount] = useState("");
  const [simMode, setSimMode] = useState("ownership");

  const getName = useCallback((userId: string) => {
    const m = members.find((m) => m.user_id === userId);
    if (!m?.profile) return "Membre";
    return [m.profile.first_name, m.profile.last_name].filter(Boolean).join(" ") || "Membre";
  }, [members]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const year = new Date().getFullYear();
      const yearStart = `${year}-01-01`;

      const [{ data: expData }, { data: bookData }, { data: sharesData }] = await Promise.all([
        supabase.from("expenses").select("*").eq("house_id", houseId).gte("created_at", yearStart),
        supabase.from("bookings").select("user_id, start_date, end_date, status")
          .eq("house_id", houseId).in("status", ["approved"]).gte("start_date", yearStart),
        supabase.from("ownership_shares").select("user_id, percentage").eq("house_id", houseId),
      ]);

      setExpenses(expData || []);
      setBookings(bookData || []);
      const map: Record<string, number> = {};
      (sharesData || []).forEach((s: any) => { map[s.user_id] = s.percentage; });
      setShares(map);

      // Le dû de chacun n'est PAS recalculé ici : on lit les lignes de répartition
      // réellement écrites au moment de la saisie de la dépense (expense_shares).
      // Quel que soit le mode de répartition retenu dépense par dépense (égalitaire,
      // prorata, manuel), la réconciliation « somme des dus = total des dépenses »
      // est alors garantie par construction.
      const expenseIds = (expData || []).map((e) => e.id);
      if (expenseIds.length > 0) {
        const { data: shareRows } = await supabase
          .from("expense_shares")
          .select("expense_id, user_id, amount")
          .in("expense_id", expenseIds);
        setExpenseShares((shareRows || []) as ExpenseShareRow[]);
      } else {
        setExpenseShares([]);
      }

      setLoading(false);
    };
    fetchData();
  }, [houseId]);

  if (loading) return <div className="animate-pulse text-muted-foreground text-sm p-4">Chargement...</div>;

  const now = new Date();
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalNights = bookings.reduce((s, b) => {
    return s + Math.max(1, differenceInCalendarDays(new Date(b.end_date), new Date(b.start_date)));
  }, 0);
  const costPerNight = totalNights > 0 ? totalExpenses / totalNights : 0;
  const memberCount = members.length || 1;
  const costPerMember = totalExpenses / memberCount;

  // Expense by category for pie
  const catMap = new Map<string, number>();
  expenses.forEach((e) => {
    const cat = e.category || "autre";
    catMap.set(cat, (catMap.get(cat) || 0) + Number(e.amount));
  });
  const pieData = Array.from(catMap.entries())
    .map(([k, v]) => ({ name: CATEGORY_LABELS[k] || k, value: Math.round(v) }))
    .sort((a, b) => b.value - a.value);

  // Expense by month
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
  const monthlyData = months.map((month) => {
    const mStart = startOfMonth(month);
    const mEnd = endOfMonth(month);
    const amount = expenses
      .filter((e) => isWithinInterval(new Date(e.created_at), { start: mStart, end: mEnd }))
      .reduce((s, e) => s + Number(e.amount), 0);
    return { month: format(month, "MMM", { locale: fr }), montant: Math.round(amount) };
  });

  // ── Soldes : lus depuis les répartitions réelles, jamais recalculés ──────────
  //
  // « Dû » = somme des lignes expense_shares de la personne.
  // « Payé » = somme des dépenses dont elle est le payeur.
  // Solde = payé − dû.

  const dueByUser = new Map<string, number>();
  expenseShares.forEach((s) => {
    dueByUser.set(s.user_id, (dueByUser.get(s.user_id) || 0) + Number(s.amount));
  });

  const paidByUser = new Map<string, number>();
  expenses.forEach((e) => {
    paidByUser.set(e.paid_by, (paidByUser.get(e.paid_by) || 0) + Number(e.amount));
  });

  // Dépenses historiques sans aucune ligne de répartition (créées avant la
  // généralisation d'expense_shares, ou dont l'insertion des parts a échoué).
  // Choix explicite : on les EXCLUT du dû — les inventer au prorata reproduirait
  // exactement le bug qu'on corrige — mais on les signale, car elles restent
  // comptées dans le total et dans le « payé », donc les soldes sont incomplets.
  const expensesWithShares = new Set(expenseShares.map((s) => s.expense_id));
  const unallocatedExpenses = expenses.filter((e) => !expensesWithShares.has(e.id));
  const unallocatedTotal = unallocatedExpenses.reduce((s, e) => s + Number(e.amount), 0);

  const balanceRows = Array.from(
    new Set([...members.map((m) => m.user_id), ...dueByUser.keys(), ...paidByUser.keys()])
  )
    .map((userId) => ({
      userId,
      name: getName(userId),
      share: shares[userId] ?? null,
      cost: Math.round(dueByUser.get(userId) || 0),
      paid: Math.round(paidByUser.get(userId) || 0),
    }))
    .filter((r) => r.cost > 0 || r.paid > 0 || r.share !== null)
    .sort((a, b) => b.paid - b.cost - (a.paid - a.cost));

  // ── Simulateur ──────────────────────────────────────────────────────────────
  // Utilise la même fonction de répartition que la saisie d'une dépense : la somme
  // des parts simulées est donc exactement égale au montant simulé (avant, chaque
  // part était arrondie séparément et le total pouvait ne pas retomber juste).
  const simResult = (() => {
    const amount = Number(simAmount);
    if (!simAmount || !Number.isFinite(amount) || amount <= 0) return [];

    const userIds = Object.keys(shares);
    if (userIds.length === 0) return [];

    // Nuits consommées par personne, pour le mode hybride.
    const nightsMap: Record<string, number> = {};
    let totalN = 0;
    bookings.forEach((b: any) => {
      const n = Math.max(1, differenceInCalendarDays(new Date(b.end_date), new Date(b.start_date)));
      nightsMap[b.user_id] = (nightsMap[b.user_id] || 0) + n;
      totalN += n;
    });

    const participants = userIds.map((userId) => {
      const pct = Number(shares[userId]) || 0;
      if (simMode === "hybrid") {
        const usagePct = totalN > 0 ? ((nightsMap[userId] || 0) / totalN) * 100 : pct;
        return { userId, percentage: (pct + usagePct) / 2 };
      }
      return { userId, percentage: pct };
    });

    // 'equal' et 'hybrid' passent par des poids ; 'ownership' par les quotes-parts.
    const result = splitExpense(
      eurosToCents(amount),
      simMode === "equal" ? participants.map((p) => ({ userId: p.userId })) : participants,
      simMode === "equal" ? "equal" : "ownership"
    );
    if (result.status === "error") return [];

    return result.shares.map((s) => ({
      name: getName(s.userId),
      part: centsToEuros(s.amountCents),
    }));
  })();

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Wallet, label: "Coût total annuel", value: `${totalExpenses.toFixed(0)} €`, color: "text-primary", bg: "bg-primary/8" },
          { icon: Users, label: "Coût / membre", value: `${costPerMember.toFixed(0)} €`, color: "text-accent", bg: "bg-accent/8" },
          { icon: Moon, label: "Coût / nuit", value: `${costPerNight.toFixed(0)} €`, color: "text-chart-1", bg: "bg-chart-1/8" },
          { icon: PieChart, label: "Catégories", value: `${pieData.length}`, color: "text-chart-2", bg: "bg-chart-2/8" },
        ].map((s, i) => (
          <Card key={i} className="border-border/50 shadow-soft">
            <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
              <div className={`h-8 w-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Monthly expenses */}
        <Card className="border-border/50 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Dépenses mensuelles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v} €`, "Montant"]} />
                <Bar dataKey="montant" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category pie */}
        {pieData.length > 0 && (
          <Card className="border-border/50 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <PieChart className="h-4 w-4 text-accent" />
                Par catégorie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPie>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} €`]} />
                </RechartsPie>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Soldes issus des répartitions réellement enregistrées */}
      {balanceRows.length > 0 && (
        <Card className="border-border/50 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Soldes par membre</CardTitle>
          </CardHeader>
          <CardContent>
            {unallocatedTotal > 0 && (
              <div className="flex items-start gap-2 mb-3 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  {unallocatedExpenses.length} dépense{unallocatedExpenses.length > 1 ? "s" : ""} sans
                  répartition enregistrée ({Math.round(unallocatedTotal)} €) : ce montant est compté dans
                  le total annuel mais n'est imputé à personne, les soldes ci-dessous sont donc incomplets.
                </span>
              </div>
            )}
            <div className="space-y-2">
              {balanceRows.map((m) => {
                const balance = m.paid - m.cost;
                return (
                  <div key={m.userId} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.share !== null && `${m.share}% · `}Dû: {m.cost} € · Payé: {m.paid} €
                      </p>
                    </div>
                    <Badge variant={balance >= 0 ? "secondary" : "destructive"} className="text-xs">
                      {balance >= 0 ? `+${balance} €` : `${balance} €`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simulator */}
      <Card className="border-border/50 shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Simulateur de dépense exceptionnelle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Montant (€)</Label>
              <Input type="number" placeholder="Ex: 25000" value={simAmount} onChange={(e) => setSimAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mode de répartition</Label>
              <Select value={simMode} onValueChange={setSimMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ownership">Par quote-part</SelectItem>
                  <SelectItem value="equal">Égalitaire</SelectItem>
                  <SelectItem value="hybrid">Hybride (propriété + usage)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {simResult.length > 0 && (
            <div className="space-y-1.5">
              {simResult.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                  <span className="text-foreground font-medium">{r.name}</span>
                  <span className="text-foreground font-bold">{r.part.toFixed(2)} €</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialDashboard;
