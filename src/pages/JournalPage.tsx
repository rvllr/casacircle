import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import NewMemoryDialog from "@/components/NewMemoryDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, BookOpen, CalendarDays, User } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface House { id: string; name: string; }
interface Profile { user_id: string; first_name: string | null; last_name: string | null; }
interface Memory {
  id: string; house_id: string; created_by: string;
  title: string; description: string | null;
  visit_start: string | null; visit_end: string | null;
  created_at: string;
  houses: { name: string } | null;
}

const JournalPage = () => {
  const { user } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouse, setSelectedHouse] = useState("all");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: housesData } = await supabase.from("houses").select("id, name");
    setHouses(housesData || []);

    const { data: memData } = await supabase
      .from("house_memories")
      .select("id, house_id, created_by, title, description, visit_start, visit_end, created_at, houses(name)")
      .order("visit_start", { ascending: false, nullsFirst: false });

    const memList = (memData || []).map((m) => ({ ...m, houses: m.houses as Memory["houses"] }));
    setMemories(memList);

    const userIds = [...new Set(memList.map((m) => m.created_by))];
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

  const filtered = selectedHouse === "all"
    ? memories
    : memories.filter((m) => m.house_id === selectedHouse);

  const getName = (userId: string) => {
    const p = profiles.find((pr) => pr.user_id === userId);
    return p?.first_name ? `${p.first_name}${p.last_name ? ` ${p.last_name}` : ""}` : "Membre";
  };

  const formatDate = (d: string) => {
    try { return format(new Date(d), "d MMMM yyyy", { locale: fr }); }
    catch { return d; }
  };

  const formatShortDate = (d: string) => {
    try { return format(new Date(d), "d MMM yyyy", { locale: fr }); }
    catch { return d; }
  };

  // Group memories by year
  const grouped = filtered.reduce<Record<string, Memory[]>>((acc, m) => {
    const dateStr = m.visit_start || m.created_at;
    const year = new Date(dateStr).getFullYear().toString();
    if (!acc[year]) acc[year] = [];
    acc[year].push(m);
    return acc;
  }, {});

  const sortedYears = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

  if (loading) {
    return (
      <AppLayout title="Journal">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Journal">
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-display text-foreground">Journal</h2>
            <p className="text-muted-foreground mt-1">Les souvenirs et anecdotes de vos maisons.</p>
          </div>
          <NewMemoryDialog onCreated={fetchData} />
        </div>

        {/* House filter */}
        {houses.length > 1 && (
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedHouse} onValueChange={setSelectedHouse}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les maisons</SelectItem>
                {houses.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {houses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-xl text-foreground mb-2">Aucune maison</h3>
              <p className="text-muted-foreground">Créez d'abord une famille et une maison.</p>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-xl text-foreground mb-2">Aucun souvenir</h3>
              <p className="text-muted-foreground">Ajoutez votre premier souvenir pour commencer le journal.</p>
            </CardContent>
          </Card>
        ) : (
          /* Timeline */
          <div className="space-y-8">
            {sortedYears.map((year) => (
              <div key={year}>
                {/* Year header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">{year.slice(2)}</span>
                  </div>
                  <h3 className="text-xl font-display text-foreground">{year}</h3>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Timeline entries */}
                <div className="relative pl-8 space-y-4">
                  {/* Vertical line */}
                  <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />

                  {grouped[year].map((m) => (
                    <div key={m.id} className="relative">
                      {/* Dot */}
                      <div className="absolute -left-[17px] top-5 w-3 h-3 rounded-full bg-accent border-2 border-background" />

                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="py-5 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div className="space-y-1">
                              <h4 className="font-display text-lg text-foreground">{m.title}</h4>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                {m.houses?.name && (
                                  <Badge variant="outline" className="text-xs">{m.houses.name}</Badge>
                                )}
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {getName(m.created_by)}
                                </span>
                              </div>
                            </div>
                            {(m.visit_start || m.visit_end) && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {m.visit_start && m.visit_end
                                  ? `${formatShortDate(m.visit_start)} → ${formatShortDate(m.visit_end)}`
                                  : m.visit_start
                                  ? formatDate(m.visit_start)
                                  : formatDate(m.visit_end!)}
                              </div>
                            )}
                          </div>

                          {m.description && (
                            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                              {m.description}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default JournalPage;
