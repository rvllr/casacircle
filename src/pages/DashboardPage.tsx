import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHouseContext } from "@/contexts/HouseContext";
import AppLayout from "@/components/AppLayout";
import HouseSelector from "@/components/HouseSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, CalendarDays, Wallet, Heart, Plus, MapPin, Users, ArrowRight, Megaphone } from "lucide-react";
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

      if (selectedHouseId !== "all") {
        bookingsQuery = bookingsQuery.eq("house_id", selectedHouseId);
        expensesQuery = expensesQuery.eq("house_id", selectedHouseId);
        memoriesQuery = memoriesQuery.eq("house_id", selectedHouseId);
      }

      const [profileRes, bookingsRes, expensesRes, memoriesRes] = await Promise.all([
        supabase.from("users_profiles").select("first_name").eq("user_id", user.id).maybeSingle(),
        bookingsQuery,
        expensesQuery,
        memoriesQuery,
      ]);

      if (profileRes.data) setMyProfile(profileRes.data);

      const bookingsList = (bookingsRes.data || []).map((b) => ({ ...b, houses: b.houses as Booking["houses"] }));
      setBookings(bookingsList);

      const expensesList = (expensesRes.data || []).map((e) => ({ ...e, houses: e.houses as Expense["houses"] }));
      setExpenses(expensesList);

      const memList = (memoriesRes.data || []).map((m) => ({ ...m, houses: m.houses as MemoryRow["houses"] }));
      setMemories(memList);

      const authorIds = [...new Set([
        ...expensesList.map((e) => e.paid_by),
        ...memList.map((m) => m.created_by),
        ...bookingsList.map((b) => b.user_id),
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
      <div className="space-y-8 max-w-5xl">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-display text-foreground">
              Bonjour{myProfile?.first_name ? `, ${myProfile.first_name}` : ""} 👋
            </h2>
            <p className="text-muted-foreground mt-1">Voici un résumé de vos maisons.</p>
          </div>
          <Button asChild>
            <Link to="/bookings">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle réservation
            </Link>
          </Button>
        </div>

        <HouseSelector />

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="py-4 flex flex-col items-center text-center">
              <Building2 className="h-6 w-6 text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{filteredHouseCount}</p>
              <p className="text-xs text-muted-foreground">Maison{filteredHouseCount > 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex flex-col items-center text-center">
              <CalendarDays className="h-6 w-6 text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{bookings.length}</p>
              <p className="text-xs text-muted-foreground">Réservation{bookings.length > 1 ? "s" : ""} à venir</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex flex-col items-center text-center">
              <Wallet className="h-6 w-6 text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">
                {expenses.reduce((s, e) => s + Number(e.amount), 0).toFixed(0)}€
              </p>
              <p className="text-xs text-muted-foreground">Dépenses récentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 flex flex-col items-center text-center">
              <Heart className="h-6 w-6 text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{memories.length}</p>
              <p className="text-xs text-muted-foreground">Souvenir{memories.length > 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
        </div>

        {/* Prochaines réservations */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl text-foreground flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Prochaines réservations
            </h3>
            <Link to="/bookings" className="text-sm text-primary hover:underline flex items-center gap-1">
              Tout voir <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {bookings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Aucune réservation à venir.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{booking.houses?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(booking.start_date)} → {formatDate(booking.end_date)}
                        <span className="ml-2 text-xs">par {getAuthorName(booking.user_id)}</span>
                      </p>
                    </div>
                    <Badge variant={statusLabels[booking.status]?.variant || "secondary"}>
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
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl text-foreground flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Dépenses récentes
              </h3>
              <Link to="/expenses" className="text-sm text-primary hover:underline flex items-center gap-1">
                Tout voir <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {expenses.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Wallet className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucune dépense.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <Card key={expense.id}>
                    <CardContent className="py-4 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{expense.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {getAuthorName(expense.paid_by)} · {formatDate(expense.created_at)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-foreground">{Number(expense.amount).toFixed(2)}€</p>
                          <Badge variant="outline" className="text-xs">{expense.houses?.name}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Derniers souvenirs */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl text-foreground flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Derniers souvenirs
              </h3>
              <Link to="/journal" className="text-sm text-primary hover:underline flex items-center gap-1">
                Tout voir <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {memories.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Le journal est vide pour le moment.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {memories.map((memory) => (
                  <Card key={memory.id}>
                    <CardContent className="py-4 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-foreground text-sm">{memory.title}</p>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">{memory.houses?.name}</Badge>
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
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
