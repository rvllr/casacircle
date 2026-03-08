import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHouseContext } from "@/contexts/HouseContext";
import AppLayout from "@/components/AppLayout";
import HouseSelector from "@/components/HouseSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, CalendarDays, Wallet, Heart, Plus, ArrowRight, Megaphone, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Booking {
  id: string; start_date: string; end_date: string; status: string;
  user_id: string; house_id: string;
  houses: { name: string; location: string | null } | null;
}

interface Expense {
  id: string; amount: number; description: string;
  created_at: string; paid_by: string; house_id: string;
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

const DashboardPage = () => {
  const { user } = useAuth();
  const { houses, selectedHouseId } = useHouseContext();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [news, setNews] = useState<NewsRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [myProfile, setMyProfile] = useState<{ first_name: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      let bookingsQuery = supabase
        .from("bookings")
        .select("id, start_date, end_date, status, user_id, house_id, houses(name, location)")
        .gte("end_date", new Date().toISOString().split("T")[0])
        .order("start_date", { ascending: true })
        .limit(5);

      let expensesQuery = supabase
        .from("expenses")
        .select("id, amount, description, created_at, paid_by, house_id, houses(name)")
        .order("created_at", { ascending: false })
        .limit(5);

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
        expensesQuery = expensesQuery.eq("house_id", selectedHouseId);
        memoriesQuery = memoriesQuery.eq("house_id", selectedHouseId);
        newsQuery = newsQuery.eq("house_id", selectedHouseId);
      }

      const [profileRes, bookingsRes, expensesRes, memoriesRes, newsRes] = await Promise.all([
        supabase.from("users_profiles").select("first_name").eq("user_id", user.id).maybeSingle(),
        bookingsQuery,
        expensesQuery,
        memoriesQuery,
        newsQuery,
      ]);

      if (profileRes.data) setMyProfile(profileRes.data);

      const bookingsList = (bookingsRes.data || []).map((b) => ({ ...b, houses: b.houses as Booking["houses"] }));
      setBookings(bookingsList);

      const expensesList = (expensesRes.data || []).map((e) => ({ ...e, houses: e.houses as Expense["houses"] }));
      setExpenses(expensesList);

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
  }, [user, selectedHouseId]);

  const getAuthorName = (userId: string) => {
    const p = profiles.find((pr) => pr.user_id === userId);
    return p?.first_name || "Membre";
  };

  const formatDate = (dateStr: string) => {
    try { return format(new Date(dateStr), "d MMM yyyy", { locale: fr }); }
    catch { return dateStr; }
  };

  const filteredHouseCount = selectedHouseId === "all" ? houses.length : 1;

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

        <div className="grid md:grid-cols-2 gap-8">
          {/* Dépenses récentes */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-foreground flex items-center gap-2.5">
                <Wallet className="h-5 w-5 text-primary" />
                Dépenses récentes
              </h3>
              <Link to="/expenses" className="text-sm text-primary hover:underline flex items-center gap-1 font-medium">
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
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-foreground flex items-center gap-2.5">
                <Heart className="h-5 w-5 text-primary" />
                Derniers souvenirs
              </h3>
              <Link to="/journal" className="text-sm text-primary hover:underline flex items-center gap-1 font-medium">
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
