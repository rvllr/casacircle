import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, CalendarDays, Newspaper, Heart, Plus, MapPin, Users, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface House {
  id: string;
  name: string;
  location: string | null;
  capacity: number | null;
  family_id: string;
  families?: { name: string };
}

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  houses?: { name: string; location: string | null };
}

interface News {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  houses?: { name: string };
  users_profiles?: { first_name: string | null; last_name: string | null };
}

interface Memory {
  id: string;
  title: string;
  description: string | null;
  visit_start: string | null;
  visit_end: string | null;
  created_at: string;
  houses?: { name: string };
  users_profiles?: { first_name: string | null; last_name: string | null };
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "secondary" },
  approved: { label: "Confirmée", variant: "default" },
  refused: { label: "Refusée", variant: "destructive" },
  cancelled: { label: "Annulée", variant: "outline" },
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [profile, setProfile] = useState<{ first_name: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      const [profileRes, housesRes, bookingsRes, newsRes, memoriesRes] = await Promise.all([
        supabase.from("users_profiles").select("first_name").eq("user_id", user.id).single(),
        supabase.from("houses").select("id, name, location, capacity, family_id, families(name)"),
        supabase
          .from("bookings")
          .select("id, start_date, end_date, status, houses(name, location)")
          .eq("user_id", user.id)
          .gte("end_date", new Date().toISOString().split("T")[0])
          .order("start_date", { ascending: true })
          .limit(5),
        supabase
          .from("house_news")
          .select("id, title, content, created_at, houses(name), users_profiles!house_news_created_by_fkey(first_name, last_name)")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("house_memories")
          .select("id, title, description, visit_start, visit_end, created_at, houses(name), users_profiles!house_memories_created_by_fkey(first_name, last_name)")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (housesRes.data) setHouses(housesRes.data as unknown as House[]);
      if (bookingsRes.data) setBookings(bookingsRes.data as unknown as Booking[]);
      if (newsRes.data) setNews(newsRes.data as unknown as News[]);
      if (memoriesRes.data) setMemories(memoriesRes.data as unknown as Memory[]);

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d MMM yyyy", { locale: fr });
    } catch {
      return dateStr;
    }
  };

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
              Bonjour{profile?.first_name ? `, ${profile.first_name}` : ""} 👋
            </h2>
            <p className="text-muted-foreground mt-1">Voici un résumé de votre espace familial.</p>
          </div>
          <Button asChild>
            <Link to="/bookings/new">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle réservation
            </Link>
          </Button>
        </div>

        {/* Mes maisons */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl text-foreground flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Mes maisons
            </h3>
            <Link to="/houses" className="text-sm text-primary hover:underline flex items-center gap-1">
              Tout voir <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {houses.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">Aucune maison pour le moment.</p>
                <Button variant="outline" asChild>
                  <Link to="/houses">Créer ou rejoindre une maison</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {houses.map((house) => (
                <Card key={house.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-display">{house.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {house.location && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> {house.location}
                      </p>
                    )}
                    {house.capacity && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" /> {house.capacity} personnes
                      </p>
                    )}
                    {house.families && (
                      <Badge variant="secondary" className="text-xs">{(house.families as any).name}</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

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
                      <p className="font-medium text-foreground">{(booking.houses as any)?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(booking.start_date)} → {formatDate(booking.end_date)}
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
          {/* Actualités */}
          <section>
            <h3 className="font-display text-xl text-foreground flex items-center gap-2 mb-4">
              <Newspaper className="h-5 w-5 text-primary" />
              Actualités
            </h3>

            {news.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Newspaper className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucune actualité.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {news.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="py-4 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-foreground text-sm">{item.title}</p>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">{(item.houses as any)?.name}</Badge>
                      </div>
                      {item.content && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {(item.users_profiles as any)?.first_name} · {formatDate(item.created_at)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Derniers souvenirs */}
          <section>
            <h3 className="font-display text-xl text-foreground flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-primary" />
              Derniers souvenirs
            </h3>

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
                        <Badge variant="outline" className="text-xs whitespace-nowrap">{(memory.houses as any)?.name}</Badge>
                      </div>
                      {memory.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{memory.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {(memory.users_profiles as any)?.first_name} · {memory.visit_start ? formatDate(memory.visit_start) : formatDate(memory.created_at)}
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
