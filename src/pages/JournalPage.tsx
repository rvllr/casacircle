import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDemo } from "@/contexts/DemoContext";
import { DEMO_MEMORIES, DEMO_PROFILES } from "@/lib/demoData";
import { useAuth } from "@/contexts/AuthContext";
import { useHouseContext } from "@/contexts/HouseContext";
import AppLayout from "@/components/AppLayout";
import HouseSelector from "@/components/HouseSelector";
import NewMemoryDialog from "@/components/NewMemoryDialog";
import MemoryCard from "@/components/journal/MemoryCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { signMemoryPhotoUrls, resolveMemoryPhotoUrl } from "@/lib/memoryStorage";

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
  const { toast } = useToast();
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

    const { data: memData, error: memError } = await supabase
      .from("house_memories")
      .select("id, house_id, created_by, title, description, visit_start, visit_end, created_at, houses(name)")
      .order("visit_start", { ascending: false, nullsFirst: false });

    if (memError) {
      toast({ title: "Erreur de chargement", description: "Impossible de récupérer les souvenirs.", variant: "destructive" });
      setLoading(false);
      return;
    }

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
        <div className="space-y-6 max-w-3xl">
          <div className="page-header">
            <div>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-64 mt-2" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>
          <Skeleton className="h-10 w-full" />
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-5 space-y-3">
                <div className="flex justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-48" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
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
          <Card className="border-border/50 shadow-soft">
            <CardContent className="py-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-lavender/10 flex items-center justify-center mx-auto">
                <BookOpen className="h-6 w-6 text-lavender" />
              </div>
              <h3 className="font-display text-lg text-foreground">Aucun souvenir</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">Immortalisez vos plus beaux moments en ajoutant un premier souvenir.</p>
              <NewMemoryDialog onCreated={fetchData} />
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

                  {grouped[year].map((m) => (
                    <MemoryCard
                      key={m.id}
                      memory={m}
                      photos={getPhotosForMemory(m.id)}
                      authorName={getName(m.created_by)}
                      onLightbox={setLightboxImg}
                      onRefresh={fetchData}
                    />
                  ))}
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
