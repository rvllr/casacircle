import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Users, Moon, PieChart, TrendingUp, Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from "recharts";
import { startOfYear, endOfYear, differenceInCalendarDays, eachMonthOfInterval, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface FinancialDashboardProps {
  houseId: string;
  members: { user_id: string; profile?: { first_name: string | null; last_name: string | null; email: string | null } }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  courses: "Courses", travaux: "Travaux", entretien: "Entretien",
  energie: "Énergie", assurance: "Assurance", taxes: "Taxes",
  menage: "Ménage", autre: "Autre",
};

const PIE_COLORS = [
  "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--chart-1))",
  "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))",
];

const FinancialDashboard = ({ houseId, members }: FinancialDashboardProps) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [shares, setShares] = useState<Record<string, number>>({});
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

  // Cost per ownership share
  const costByShare = Object.entries(shares).map(([userId, pct]) => ({
    name: getName(userId),
    share: pct,
    cost: Math.round(totalExpenses * (pct / 100)),
    paid: Math.round(expenses.filter((e) => e.paid_by === userId).reduce((s, e) => s + Number(e.amount), 0)),
  }));

  // Simulator
  const simResult = simAmount ? Object.entries(shares).map(([userId, pct]) => {
    const amount = Number(simAmount);
    if (simMode === "ownership") return { name: getName(userId), part: Math.round(amount * pct / 100) };
    if (simMode === "equal") return { name: getName(userId), part: Math.round(amount / memberCount) };
    // hybrid
    const nightsMap: Record<string, number> = {};
    let totalN = 0;
    bookings.forEach((b: any) => {
      const n = Math.max(1, differenceInCalendarDays(new Date(b.end_date), new Date(b.start_date)));
      nightsMap[b.user_id] = (nightsMap[b.user_id] || 0) + n;
      totalN += n;
    });
    const usagePct = totalN > 0 ? ((nightsMap[userId] || 0) / totalN) * 100 : pct;
    const hybridPct = (pct + usagePct) / 2;
    return { name: getName(userId), part: Math.round(amount * hybridPct / 100) };
  }) : [];

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

      {/* Cost per ownership share */}
      {costByShare.length > 0 && (
        <Card className="border-border/50 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Coût par quote-part</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {costByShare.map((m) => {
                const balance = m.paid - m.cost;
                return (
                  <div key={m.name} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.share}% · Dû: {m.cost} € · Payé: {m.paid} €</p>
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
              {simResult.map((r) => (
                <div key={r.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                  <span className="text-foreground font-medium">{r.name}</span>
                  <span className="text-foreground font-bold">{r.part} €</span>
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
