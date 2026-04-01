import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHouseContext } from "@/contexts/HouseContext";
import { useDemo } from "@/contexts/DemoContext";
import { useActiveSpace } from "@/contexts/ActiveSpaceContext";
import { DEMO_BOOKINGS, DEMO_ALL_BOOKINGS, DEMO_EXPENSES, DEMO_ALL_EXPENSES, DEMO_MEMORIES, DEMO_NEWS, DEMO_PROFILES, DEMO_PROFILE } from "@/lib/demoData";
import AppLayout from "@/components/AppLayout";
import HouseSelector from "@/components/HouseSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, CalendarDays, Wallet, Heart, Plus, ArrowRight, Megaphone, TrendingUp, AlertCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, differenceInCalendarDays, startOfYear, endOfYear, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Booking {
  id: string; start_date: string; end_date: string; status: string;
  user_id: string; house_id: string;
  total_price: number | null; amount_paid: number | null;
  payment_status: string;
  houses: { name: string; location: string | null } | null;
}

interface Expense {
  id: string; amount: number; description: string;
  created_at: string; paid_by: string; house_id: string;
  category?: string;
  houses: { name: string } | null;
}

interface MemoryRow {
  id: string; title: string; description: string | null;
  visit_start: string | null; visit_end: string | null;
  created_at: string; created_by: string; house_id: string;
  houses: { name: string } | null;
}

interface Profile { user_id: string; first_name: string | null; last_name: string | null; }

interface NewsRow {
  id: string; title: string; content: string | null;
  created_at: string; created_by: string; house_id: string;
  houses: { name: string } | null;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "secondary" },
  approved: { label: "Confirmée", variant: "default" },
  refused: { label: "Refusée", variant: "destructive" },
  cancelled: { label: "Annulée", variant: "outline" },
};

const CATEGORY_LABELS: Record<string, string> = {
  courses: "Courses", travaux: "Travaux", entretien: "Entretien",
  energie: "Énergie", assurance: "Assurance", taxes: "Taxes",
  menage: "Ménage", autre: "Autre",
};

const PIE_COLORS = [
  "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--honey))",
  "hsl(var(--lavender))", "hsl(var(--chart-1))", "hsl(var(--chart-2))",
  "hsl(var(--chart-3))", "hsl(var(--chart-4))",
];

const DashboardPage = () => {
  const { user } = useAuth();
  const { houses, selectedHouseId } = useHouseContext();
  const { isDemo } = useDemo();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [news, setNews] = useState<NewsRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [myProfile, setMyProfile] = useState<{ first_name: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      const filterByHouse = (items: any[]) =>
        selectedHouseId === "all" ? items : items.filter((i: any) => i.house_id === selectedHouseId);
      setMyProfile({ first_name: DEMO_PROFILE.first_name });
      setBookings(filterByHouse(DEMO_BOOKINGS) as Booking[]);
      setAllBookings(filterByHouse(DEMO_ALL_BOOKINGS) as Booking[]);
      setExpenses(filterByHouse(DEMO_EXPENSES) as Expense[]);
      setAllExpenses(filterByHouse(DEMO_ALL_EXPENSES) as Expense[]);
      setMemories(filterByHouse(DEMO_MEMORIES) as MemoryRow[]);
      setNews(filterByHouse(DEMO_NEWS) as NewsRow[]);
      setProfiles(DEMO_PROFILES);
      setLoading(false);
      return;
    }

    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      let bookingsQuery = supabase
        .from("bookings")
        .select("id, start_date, end_date, status, user_id, house_id, total_price, amount_paid, payment_status, houses(name, location)")
        .gte("end_date", new Date().toISOString().split("T")[0])
        .order("start_date", { ascending: true })
        .limit(5);

      let allBookingsQuery = supabase
        .from("bookings")
        .select("id, start_date, end_date, status, user_id, house_id, total_price, amount_paid, payment_status, houses(name, location)")
        .eq("status", "approved");

      let expensesQuery = supabase
        .from("expenses")
        .select("id, amount, description, created_at, paid_by, house_id, category, houses(name)")
        .order("created_at", { ascending: false })
        .limit(5);

      let allExpensesQuery = supabase
        .from("expenses")
        .select("id, amount, description, created_at, paid_by, house_id, category, houses(name)");

      let memoriesQuery = supabase
        .from("house_memories")
        .select("id, title, description, visit_start, visit_end, created_at, created_by, house_id, houses(name)")
        .order("created_at", { ascending: false })
        .limit(5);

      let newsQuery = supabase
        .from("house_news")
        .select("id, title, content, created_at, created_by, house_id, houses(name)")
        .order("created_at", { ascending: false })
        .limit(5);

      if (selectedHouseId !== "all") {
        bookingsQuery = bookingsQuery.eq("house_id", selectedHouseId);
        allBookingsQuery = allBookingsQuery.eq("house_id", selectedHouseId);
        expensesQuery = expensesQuery.eq("house_id", selectedHouseId);
        allExpensesQuery = allExpensesQuery.eq("house_id", selectedHouseId);
        memoriesQuery = memoriesQuery.eq("house_id", selectedHouseId);
        newsQuery = newsQuery.eq("house_id", selectedHouseId);
      }

      const [profileRes, bookingsRes, allBookingsRes, expensesRes, allExpensesRes, memoriesRes, newsRes] = await Promise.all([
        supabase.from("users_profiles").select("first_name").eq("user_id", user.id).maybeSingle(),
        bookingsQuery,
        allBookingsQuery,
        expensesQuery,
        allExpensesQuery,
        memoriesQuery,
        newsQuery,
      ]);

      if (profileRes.data) setMyProfile(profileRes.data);

      const bookingsList = (bookingsRes.data || []).map((b) => ({ ...b, houses: b.houses as Booking["houses"] }));
      setBookings(bookingsList);

      const allBookingsList = (allBookingsRes.data || []).map((b) => ({ ...b, houses: b.houses as Booking["houses"] }));
      setAllBookings(allBookingsList);

      const expensesList = (expensesRes.data || []).map((e) => ({ ...e, houses: e.houses as Expense["houses"] }));
      setExpenses(expensesList);

      const allExpensesList = (allExpensesRes.data || []).map((e) => ({ ...e, houses: e.houses as Expense["houses"] }));
      setAllExpenses(allExpensesList);

      const memList = (memoriesRes.data || []).map((m) => ({ ...m, houses: m.houses as MemoryRow["houses"] }));
      setMemories(memList);

      const newsList = (newsRes.data || []).map((n) => ({ ...n, houses: n.houses as NewsRow["houses"] }));
      setNews(newsList);

      const authorIds = [...new Set([
        ...expensesList.map((e) => e.paid_by),
        ...memList.map((m) => m.created_by),
        ...bookingsList.map((b) => b.user_id),
        ...newsList.map((n) => n.created_by),
      ])];
      if (authorIds.length > 0) {
        const { data: profs } = await supabase
          .from("users_profiles")
          .select("user_id, first_name, last_name")
          .in("user_id", authorIds);
        setProfiles(profs || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [user, selectedHouseId, isDemo]);

  const getAuthorName = (userId: string) => {
    const p = profiles.find((pr) => pr.user_id === userId);
    return p?.first_name || "Membre";
  };

  const formatDate = (dateStr: string) => {
    try { return format(new Date(dateStr), "d MMM yyyy", { locale: fr }); }
    catch { return dateStr; }
  };

  const filteredHouseCount = selectedHouseId === "all" ? houses.length : 1;

  // ===== CHART DATA =====
  const now = new Date();
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  // Occupancy per month (approved bookings)
  const occupancyData = months.map((month) => {
    const mStart = startOfMonth(month);
    const mEnd = endOfMonth(month);
    const totalDays = differenceInCalendarDays(mEnd, mStart) + 1;
    let bookedDays = 0;

    allBookings.forEach((b) => {
      const bStart = new Date(b.start_date);
      const bEnd = new Date(b.end_date);
      const overlapStart = bStart < mStart ? mStart : bStart;
      const overlapEnd = bEnd > mEnd ? mEnd : bEnd;
      if (overlapStart <= overlapEnd) {
        bookedDays += differenceInCalendarDays(overlapEnd, overlapStart) + 1;
      }
    });

    const rate = totalDays > 0 ? Math.min(100, Math.round((bookedDays / totalDays) * 100)) : 0;
    return {
      month: format(month, "MMM", { locale: fr }),
      taux: rate,
    };
  });

  // Expense breakdown by category
  const expenseByCategory = (() => {
    const map = new Map<string, number>();
    allExpenses.forEach((e) => {
      const cat = e.category || "autre";
      map.set(cat, (map.get(cat) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([category, amount]) => ({
        name: CATEGORY_LABELS[category] || category,
        value: Math.round(amount * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value);
  })();

  // Annual totals
  const yearBookings = allBookings.filter((b) => {
    const d = new Date(b.start_date);
    return isWithinInterval(d, { start: yearStart, end: yearEnd });
  });
  const totalNightsYear = yearBookings.reduce((sum, b) => {
    return sum + Math.max(1, differenceInCalendarDays(new Date(b.end_date), new Date(b.start_date)));
  }, 0);
  const totalExpensesYear = allExpenses
    .filter((e) => isWithinInterval(new Date(e.created_at), { start: yearStart, end: yearEnd }))
    .reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-8 max-w-5xl animate-fade-in">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl warm-gradient border border-border/40 p-6 md:p-8">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl md:text-3xl font-display text-foreground tracking-tight">
                Bonjour{myProfile?.first_name ? `, ${myProfile.first_name}` : ""} 👋
              </h2>
              <p className="text-muted-foreground">Voici un résumé de vos maisons.</p>
            </div>
            <Button asChild className="rounded-xl shadow-soft group self-start">
              <Link to="/bookings">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle réservation
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/5" />
          <div className="absolute -bottom-6 -right-12 w-24 h-24 rounded-full bg-accent/5" />
        </div>

        <HouseSelector />

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { icon: Building2, value: filteredHouseCount, label: `Maison${filteredHouseCount > 1 ? "s" : ""}`, color: "text-primary", bg: "bg-primary/8" },
            { icon: CalendarDays, value: bookings.length, label: `Réservation${bookings.length > 1 ? "s" : ""} à venir`, color: "text-accent", bg: "bg-accent/8" },
            { icon: Wallet, value: `${expenses.reduce((s, e) => s + Number(e.amount), 0).toFixed(0)}€`, label: "Dépenses récentes", color: "text-honey", bg: "bg-honey/8" },
            { icon: Heart, value: memories.length, label: `Souvenir${memories.length > 1 ? "s" : ""}`, color: "text-lavender", bg: "bg-lavender/8" },
          ].map((stat, i) => (
            <Card key={i} className="border-border/50 shadow-soft hover:shadow-card transition-shadow duration-300">
              <CardContent className="p-4 md:py-5 flex flex-col items-center text-center gap-2">
                <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold text-foreground tracking-tight">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Paiements en attente */}
        {(() => {
          const pendingPayments = [...bookings, ...allBookings]
            .filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i)
            .filter(b => b.status !== "cancelled" && b.status !== "refused" && (b.payment_status === "unpaid" || b.payment_status === "partial"));
          
          if (pendingPayments.length === 0) return null;

          const totalDue = pendingPayments.reduce((sum, b) => {
            const total = Number(b.total_price) || 0;
            const paid = Number(b.amount_paid) || 0;
            return sum + (total - paid);
          }, 0);

          return (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl text-foreground flex items-center gap-2.5">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Paiements en attente
                  <Badge variant="destructive" className="ml-1 text-xs">{pendingPayments.length}</Badge>
                </h3>
                <Link to="/bookings" className="text-sm text-primary hover:underline flex items-center gap-1 font-medium">
                  Voir les réservations <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <Card className="border-destructive/20 bg-destructive/5 shadow-soft">
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Total restant dû</span>
                    <span className="text-xl font-bold text-destructive">{totalDue.toFixed(2)} €</span>
                  </div>
                  <div className="space-y-2">
                    {pendingPayments.slice(0, 5).map((b) => {
                      const remaining = (Number(b.total_price) || 0) - (Number(b.amount_paid) || 0);
                      return (
                        <div key={b.id} className="flex items-center justify-between gap-2 text-sm">
                          <div className="min-w-0 flex items-center gap-2">
                            <Badge variant={b.payment_status === "unpaid" ? "destructive" : "secondary"} className="text-[10px] flex-shrink-0">
                              {b.payment_status === "unpaid" ? "Impayé" : "Partiel"}
                            </Badge>
                            <span className="text-foreground truncate">{b.houses?.name}</span>
                            <span className="text-muted-foreground text-xs whitespace-nowrap">
                              {formatDate(b.start_date)} → {formatDate(b.end_date)}
                            </span>
                          </div>
                          <span className="font-semibold text-foreground flex-shrink-0">{remaining.toFixed(2)} €</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </section>
          );
        })()}

        {(allBookings.length > 0 || allExpenses.length > 0) && (
          <section className="space-y-4">
            <h3 className="font-display text-xl text-foreground flex items-center gap-2.5">
              <TrendingUp className="h-5 w-5 text-primary" />
              Statistiques {now.getFullYear()}
            </h3>

            {/* Annual summary cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-border/50 shadow-soft">
                <CardContent className="py-4 text-center">
                  <p className="text-sm text-muted-foreground">Nuitées cette année</p>
                  <p className="text-2xl font-display text-foreground">{totalNightsYear}</p>
                </CardContent>
              </Card>
              <Card className="border-border/50 shadow-soft">
                <CardContent className="py-4 text-center">
                  <p className="text-sm text-muted-foreground">Dépenses cette année</p>
                  <p className="text-2xl font-display text-foreground">{totalExpensesYear.toFixed(0)} €</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Occupancy chart */}
              {allBookings.length > 0 && (
                <Card className="border-border/50 shadow-soft">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-base">Taux d'occupation mensuel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={occupancyData}>
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="%" domain={[0, 100]} />
                          <Tooltip
                            formatter={(value: number) => [`${value}%`, "Occupation"]}
                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                          />
                          <Bar dataKey="taux" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Expense pie chart */}
              {expenseByCategory.length > 0 && (
                <Card className="border-border/50 shadow-soft">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-base">Répartition des dépenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 flex items-center">
                      <ResponsiveContainer width="50%" height="100%">
                        <PieChart>
                          <Pie
                            data={expenseByCategory}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            innerRadius={35}
                          >
                            {expenseByCategory.map((_, idx) => (
                              <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => [`${value.toFixed(0)} €`]}
                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-1.5 pl-2">
                        {expenseByCategory.slice(0, 5).map((cat, idx) => (
                          <div key={cat.name} className="flex items-center gap-2 text-xs">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                            <span className="text-muted-foreground truncate">{cat.name}</span>
                            <span className="font-medium text-foreground ml-auto">{cat.value.toFixed(0)} €</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        )}

        {/* Prochaines réservations */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl text-foreground flex items-center gap-2.5">
              <CalendarDays className="h-5 w-5 text-primary" />
              Prochaines réservations
            </h3>
            <Link to="/bookings" className="text-sm text-primary hover:underline flex items-center gap-1 font-medium">
              Tout voir <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {bookings.length === 0 ? (
            <Card className="border-border/50 shadow-soft">
              <CardContent className="empty-state">
                <CalendarDays className="empty-state-icon" />
                <p className="text-muted-foreground">Aucune réservation à venir.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {bookings.map((booking) => (
                <Card key={booking.id} className="border-border/50 shadow-soft hover:shadow-card transition-all duration-200">
                  <CardContent className="py-4 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{booking.houses?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(booking.start_date)} → {formatDate(booking.end_date)}
                        <span className="ml-2 text-xs opacity-70">par {getAuthorName(booking.user_id)}</span>
                      </p>
                    </div>
                    <Badge variant={statusLabels[booking.status]?.variant || "secondary"} className="self-start sm:self-center">
                      {statusLabels[booking.status]?.label || booking.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Dépenses récentes */}
          <section className="space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-xl text-foreground flex items-center gap-2.5 truncate">
                <Wallet className="h-5 w-5 text-primary flex-shrink-0" />
                Dépenses récentes
              </h3>
              <Link to="/expenses" className="text-sm text-primary hover:underline flex items-center gap-1 font-medium whitespace-nowrap flex-shrink-0">
                Tout voir <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {expenses.length === 0 ? (
              <Card className="border-border/50 shadow-soft">
                <CardContent className="empty-state">
                  <Wallet className="empty-state-icon" />
                  <p className="text-muted-foreground">Aucune dépense.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {expenses.map((expense) => (
                  <Card key={expense.id} className="border-border/50 shadow-soft hover:shadow-card transition-all duration-200">
                    <CardContent className="py-3.5 px-5 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{expense.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {getAuthorName(expense.paid_by)} · {formatDate(expense.created_at)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-foreground">{Number(expense.amount).toFixed(2)}€</p>
                          <Badge variant="outline" className="text-[10px]">{expense.houses?.name}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Derniers souvenirs */}
          <section className="space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-xl text-foreground flex items-center gap-2.5 truncate">
                <Heart className="h-5 w-5 text-primary flex-shrink-0" />
                Derniers souvenirs
              </h3>
              <Link to="/journal" className="text-sm text-primary hover:underline flex items-center gap-1 font-medium whitespace-nowrap flex-shrink-0">
                Tout voir <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {memories.length === 0 ? (
              <Card className="border-border/50 shadow-soft">
                <CardContent className="empty-state">
                  <Heart className="empty-state-icon" />
                  <p className="text-muted-foreground">Le journal est vide pour le moment.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {memories.map((memory) => (
                  <Card key={memory.id} className="border-border/50 shadow-soft hover:shadow-card transition-all duration-200">
                    <CardContent className="py-3.5 px-5 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-foreground text-sm">{memory.title}</p>
                        <Badge variant="outline" className="text-[10px] whitespace-nowrap">{memory.houses?.name}</Badge>
                      </div>
                      {memory.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{memory.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {getAuthorName(memory.created_by)} · {memory.visit_start ? formatDate(memory.visit_start) : formatDate(memory.created_at)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Actualités */}
        {news.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-foreground flex items-center gap-2.5">
                <Megaphone className="h-5 w-5 text-primary" />
                Actualités
              </h3>
            </div>
            <div className="space-y-2.5">
              {news.map((n) => (
                <Card key={n.id} className="border-border/50 shadow-soft hover:shadow-card transition-all duration-200">
                  <CardContent className="py-3.5 px-5 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-foreground text-sm">{n.title}</p>
                      <Badge variant="outline" className="text-[10px] whitespace-nowrap">{n.houses?.name}</Badge>
                    </div>
                    {n.content && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{n.content}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {getAuthorName(n.created_by)} · {formatDate(n.created_at)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
