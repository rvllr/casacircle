import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, CalendarDays, User, ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import { signMemoryPhotoUrls, resolveMemoryPhotoUrl } from "@/lib/memoryStorage";

interface SmartAlbumProps {
  houseId: string;
  members: { user_id: string; profile?: { first_name: string | null; last_name: string | null; email: string | null } }[];
}

interface Memory {
  id: string;
  title: string;
  description: string | null;
  visit_start: string | null;
  visit_end: string | null;
  created_by: string;
  created_at: string;
}

interface MemoryPhoto {
  id: string;
  memory_id: string;
  image_url: string;
}

interface StayGroup {
  key: string;
  label: string;
  dateRange: string;
  nights: number;
  memories: Memory[];
  photos: MemoryPhoto[];
  participants: string[];
}

const SmartAlbum = ({ houseId, members }: SmartAlbumProps) => {
  const [groups, setGroups] = useState<StayGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const getName = useCallback((userId: string) => {
    const m = members.find((m) => m.user_id === userId);
    if (!m?.profile) return "Membre";
    return [m.profile.first_name, m.profile.last_name].filter(Boolean).join(" ") || "Membre";
  }, [members]);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: memData }, { data: photoData }] = await Promise.all([
        supabase.from("house_memories").select("id, title, description, visit_start, visit_end, created_by, created_at")
          .eq("house_id", houseId).order("visit_start", { ascending: false, nullsFirst: false }),
        supabase.from("memory_photos").select("id, memory_id, image_url"),
      ]);

      const memories = (memData || []) as Memory[];
      const rawPhotos = (photoData || []) as MemoryPhoto[];
      const signed = await signMemoryPhotoUrls(rawPhotos.map((p) => p.image_url));
      const photos = rawPhotos.map((p) => ({ ...p, image_url: resolveMemoryPhotoUrl(p.image_url, signed) }));


      // Group memories by overlapping or close visit dates (within 3 days)
      const grouped: StayGroup[] = [];
      const used = new Set<string>();

      memories.forEach((mem) => {
        if (used.has(mem.id)) return;
        
        const cluster = [mem];
        used.add(mem.id);

        if (mem.visit_start && mem.visit_end) {
          const start = new Date(mem.visit_start);
          const end = new Date(mem.visit_end);

          memories.forEach((other) => {
            if (used.has(other.id) || !other.visit_start || !other.visit_end) return;
            const oStart = new Date(other.visit_start);
            const oEnd = new Date(other.visit_end);
            // Overlap or within 3 days
            if (oStart <= new Date(end.getTime() + 3 * 86400000) && oEnd >= new Date(start.getTime() - 3 * 86400000)) {
              cluster.push(other);
              used.add(other.id);
            }
          });

          const allStarts = cluster.filter(m => m.visit_start).map(m => new Date(m.visit_start!));
          const allEnds = cluster.filter(m => m.visit_end).map(m => new Date(m.visit_end!));
          const minStart = new Date(Math.min(...allStarts.map(d => d.getTime())));
          const maxEnd = new Date(Math.max(...allEnds.map(d => d.getTime())));
          const nights = differenceInCalendarDays(maxEnd, minStart);

          const memIds = cluster.map(m => m.id);
          const stayPhotos = photos.filter(p => memIds.includes(p.memory_id));
          const participants = [...new Set(cluster.map(m => m.created_by))];

          grouped.push({
            key: mem.id,
            label: `Séjour ${format(minStart, "MMMM yyyy", { locale: fr })}`,
            dateRange: `${format(minStart, "d MMM", { locale: fr })} → ${format(maxEnd, "d MMM yyyy", { locale: fr })}`,
            nights,
            memories: cluster,
            photos: stayPhotos,
            participants,
          });
        } else {
          // Standalone memory without dates
          const memPhotos = photos.filter(p => p.memory_id === mem.id);
          grouped.push({
            key: mem.id,
            label: mem.title,
            dateRange: format(new Date(mem.created_at), "d MMMM yyyy", { locale: fr }),
            nights: 0,
            memories: [mem],
            photos: memPhotos,
            participants: [mem.created_by],
          });
        }
      });

      setGroups(grouped);
      setLoading(false);
    };
    fetch();
  }, [houseId]);

  if (loading) return <div className="animate-pulse text-muted-foreground text-sm p-4">Chargement...</div>;

  if (groups.length === 0) {
    return (
      <Card className="border-border/50 shadow-soft">
        <CardContent className="py-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-lavender/10 flex items-center justify-center mx-auto">
            <Camera className="h-6 w-6 text-lavender" />
          </div>
          <h3 className="font-display text-lg text-foreground">Aucun souvenir</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">Partagez vos plus beaux moments en ajoutant un premier souvenir.</p>
          <Button variant="outline" className="rounded-xl mt-1" asChild>
            <a href="/journal">
              <ImageIcon className="h-4 w-4 mr-2" />
              Ajouter votre premier souvenir
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Camera className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg text-foreground">Album souvenirs</h3>
        <Badge variant="secondary" className="text-xs">{groups.length} séjour{groups.length > 1 ? "s" : ""}</Badge>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-h-[85vh] max-w-full rounded-lg object-contain" />
        </div>
      )}

      <div className="space-y-3">
        {groups.map((group) => {
          const isOpen = expanded === group.key;
          return (
            <Card key={group.key} className="border-border/50 shadow-soft overflow-hidden">
              <button
                className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
                onClick={() => setExpanded(isOpen ? null : group.key)}
              >
                {/* Thumbnail */}
                {group.photos.length > 0 ? (
                  <div className="h-14 w-14 rounded-lg overflow-hidden shrink-0 bg-muted">
                    <img src={group.photos[0].image_url} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="font-display text-sm text-foreground truncate">{group.label}</h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{group.dateRange}</span>
                    {group.nights > 0 && <span>· {group.nights} nuit{group.nights > 1 ? "s" : ""}</span>}
                    {group.photos.length > 0 && <span>· {group.photos.length} photo{group.photos.length > 1 ? "s" : ""}</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {group.participants.map((uid) => (
                      <Badge key={uid} variant="outline" className="text-[10px] py-0">
                        {getName(uid)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>

              {isOpen && (
                <CardContent className="pt-0 pb-4 space-y-4">
                  {/* Photos gallery */}
                  {group.photos.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {group.photos.map((photo) => (
                        <button
                          key={photo.id}
                          className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                          onClick={() => setLightbox(photo.image_url)}
                        >
                          <img src={photo.image_url} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Memories list */}
                  <div className="space-y-2">
                    {group.memories.map((mem) => (
                      <div key={mem.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                        <p className="text-sm font-medium text-foreground">{mem.title}</p>
                        {mem.description && <p className="text-xs text-muted-foreground">{mem.description}</p>}
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <User className="h-2.5 w-2.5" /> {getName(mem.created_by)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SmartAlbum;
