import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDemo } from "@/contexts/DemoContext";
import { DEMO_MEMORIES, DEMO_PROFILES } from "@/lib/demoData";
import { useAuth } from "@/contexts/AuthContext";
import { useHouseContext } from "@/contexts/HouseContext";
import AppLayout from "@/components/AppLayout";
import HouseSelector from "@/components/HouseSelector";
import NewMemoryDialog from "@/components/NewMemoryDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CalendarDays, User, ImageIcon } from "lucide-react";
import { formatDateLong, formatDate } from "@/lib/dateFormatter";

interface Profile { user_id: string; first_name: string | null; last_name: string | null; }
interface MemoryPhoto { id: string; memory_id: string; image_url: string; }
interface Memory {
  id: string; house_id: string; created_by: string;
  title: string; description: string | null;
  visit_start: string | null; visit_end: string | null;
  created_at: string;
  houses: { name: string } | null;
}

const JournalPage = () => {
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const { houses, selectedHouseId, loading: housesLoading } = useHouseContext();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [photos, setPhotos] = useState<MemoryPhoto[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (isDemo) {
      setMemories(DEMO_MEMORIES as any);
      setPhotos([]);
      setProfiles(DEMO_PROFILES);
      setLoading(false);
      return;
    }
    if (!user) return;
    setLoading(true);

    const { data: memData } = await supabase
      .from("house_memories")
      .select("id, house_id, created_by, title, description, visit_start, visit_end, created_at, houses(name)")
      .order("visit_start", { ascending: false, nullsFirst: false });

    const memList = (memData || []).map((m) => ({ ...m, houses: m.houses as Memory["houses"] }));
    setMemories(memList);

    const memIds = memList.map((m) => m.id);
    if (memIds.length > 0) {
      const { data: photosData } = await supabase
        .from("memory_photos")
        .select("id, memory_id, image_url")
        .in("memory_id", memIds);
      setPhotos(photosData || []);
    } else {
      setPhotos([]);
    }

    const userIds = [...new Set(memList.map((m) => m.created_by))];
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("users_profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);
      setProfiles(profs || []);
    }

    setLoading(false);
  }, [user, isDemo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const contextHouseIds = new Set(houses.map(h => h.id));
  const filtered = selectedHouseId === "all"
    ? memories.filter((m) => contextHouseIds.has(m.house_id))
    : memories.filter((m) => m.house_id === selectedHouseId);

  const getName = (userId: string) => {
    const p = profiles.find((pr) => pr.user_id === userId);
    return p?.first_name ? `${p.first_name}${p.last_name ? ` ${p.last_name}` : ""}` : "Membre";
  };

  const getPhotosForMemory = (memoryId: string) =>
    photos.filter((p) => p.memory_id === memoryId);

  const fmtLong = (d: string) => formatDateLong(d);
  const fmtShort = (d: string) => formatDate(d);

  const grouped = filtered.reduce<Record<string, Memory[]>>((acc, m) => {
    const dateStr = m.visit_start || m.created_at;
    const year = new Date(dateStr).getFullYear().toString();
    if (!acc[year]) acc[year] = [];
    acc[year].push(m);
    return acc;
  }, {});

  const sortedYears = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

  if (loading || housesLoading) {
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
      <div className="space-y-6 max-w-3xl animate-fade-in">
        <div className="page-header">
          <div>
            <h2 className="page-header-title">Journal</h2>
            <p className="page-header-subtitle">Les souvenirs et anecdotes de vos maisons.</p>
          </div>
          <NewMemoryDialog onCreated={fetchData} />
        </div>

        <HouseSelector />

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
          <div className="space-y-8">
            {sortedYears.map((year) => (
              <div key={year}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">{year.slice(2)}</span>
                  </div>
                  <h3 className="text-xl font-display text-foreground">{year}</h3>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="relative pl-8 space-y-4">
                  <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />

                  {grouped[year].map((m) => {
                    const memPhotos = getPhotosForMemory(m.id);
                    return (
                      <div key={m.id} className="relative">
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
                                  {memPhotos.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <ImageIcon className="h-3 w-3" />
                                      {memPhotos.length}
                                    </span>
                                  )}
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

                            {memPhotos.length > 0 && (
                              <div className={`grid gap-2 ${memPhotos.length === 1 ? "grid-cols-1" : memPhotos.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                                {memPhotos.map((photo) => (
                                  <button
                                    key={photo.id}
                                    onClick={() => setLightboxImg(photo.image_url)}
                                    className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity"
                                  >
                                    <img
                                      src={photo.image_url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  </button>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <img
            src={lightboxImg}
            alt=""
            className="max-w-full max-h-[90vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </AppLayout>
  );
};

export default JournalPage;
