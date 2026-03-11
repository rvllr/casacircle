import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { parseContent, groupByCategory } from "@/components/HouseGuideEditor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MapPin, Users, Building2, DoorOpen, LogIn, LogOut,
  BookOpen, Info, Home,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import logoCasaCircle from "@/assets/logo-casacircle.png";

interface HousePublic {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  capacity: number | null;
  photo_url: string | null;
}

interface GuidePublic {
  id: string;
  title: string;
  content: string | null;
  type: string;
}

interface UnitPublic {
  id: string;
  name: string;
  type: "building" | "room";
  parent_id: string | null;
  capacity: number | null;
  description: string | null;
}

const guideTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  arrival: { label: "Kit d'arrivée", icon: LogIn, color: "text-accent" },
  departure: { label: "Kit de départ", icon: LogOut, color: "text-primary" },
  rules: { label: "Règles de la maison", icon: BookOpen, color: "text-foreground" },
  practical_info: { label: "Infos pratiques", icon: Info, color: "text-muted-foreground" },
};

const PublicHousePage = () => {
  const { id } = useParams<{ id: string }>();
  const [house, setHouse] = useState<HousePublic | null>(null);
  const [guides, setGuides] = useState<GuidePublic[]>([]);
  const [units, setUnits] = useState<UnitPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      const [houseResult, { data: guidesData }, { data: unitsData }] = await Promise.all([
        supabase.from("houses").select("id, name, location, description, capacity, photo_url").eq("id", id).eq("is_public", true).single(),
        supabase.from("house_guides").select("id, title, content, type").eq("house_id", id).order("type"),
        supabase.from("house_units").select("id, name, type, parent_id, capacity, description").eq("house_id", id).order("type").order("name"),
      ]);
      const houseData = houseResult.data as HousePublic | null;

      if (!houseData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setHouse(houseData);
      setGuides(guidesData || []);
      setUnits((unitsData || []) as UnitPublic[]);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (notFound || !house) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <img src={logoCasaCircle} alt="CasaCircle" className="h-12 w-auto mx-auto opacity-50" />
          <h1 className="text-2xl font-display text-foreground">Page introuvable</h1>
          <p className="text-muted-foreground">Ce bien n'est pas accessible publiquement.</p>
        </div>
      </div>
    );
  }

  const buildings = units.filter((u) => u.type === "building");
  const standaloneRooms = units.filter((u) => u.type === "room" && !u.parent_id);
  const guidesWithContent = guides.filter((g) => g.content && g.content.trim().length > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero / Cover */}
      {house.photo_url ? (
        <div className="relative w-full h-56 sm:h-72 md:h-80">
          <img
            src={house.photo_url}
            alt={house.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="text-3xl md:text-4xl font-display text-white drop-shadow-lg">{house.name}</h1>
            {house.location && (
              <p className="text-white/80 flex items-center gap-1.5 mt-2 drop-shadow text-sm">
                <MapPin className="h-4 w-4" /> {house.location}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-muted/50 border-b border-border py-12 px-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-display text-foreground">{house.name}</h1>
            {house.location && (
              <p className="text-muted-foreground flex items-center gap-1.5 mt-2">
                <MapPin className="h-4 w-4" /> {house.location}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Description & capacity */}
        <div className="space-y-4">
          {house.capacity && (
            <Badge variant="secondary" className="text-sm px-3 py-1.5">
              <Users className="h-4 w-4 mr-1.5" />
              {house.capacity} personnes
            </Badge>
          )}
          {house.description && (
            <p className="text-muted-foreground leading-relaxed">{house.description}</p>
          )}
        </div>

        {/* Spaces */}
        {units.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <h2 className="text-xl font-display text-foreground flex items-center gap-2">
                <DoorOpen className="h-5 w-5 text-primary" /> Espaces
              </h2>
              <div className="space-y-3">
                {buildings.map((building) => {
                  const childRooms = units.filter((u) => u.parent_id === building.id);
                  return (
                    <Card key={building.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-display flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          {building.name}
                          {building.capacity && (
                            <Badge variant="secondary" className="text-xs ml-auto">{building.capacity} pers.</Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      {(building.description || childRooms.length > 0) && (
                        <CardContent className="space-y-3">
                          {building.description && (
                            <p className="text-sm text-muted-foreground">{building.description}</p>
                          )}
                          {childRooms.length > 0 && (
                            <div className="grid sm:grid-cols-2 gap-2">
                              {childRooms.map((room) => (
                                <div key={room.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border">
                                  <span className="text-base">🛏️</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{room.name}</p>
                                    {room.capacity && <p className="text-xs text-muted-foreground">{room.capacity} pers.</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
                {standaloneRooms.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-display">Chambres</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {standaloneRooms.map((room) => (
                          <div key={room.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border">
                            <span className="text-base">🛏️</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{room.name}</p>
                              {room.capacity && <p className="text-xs text-muted-foreground">{room.capacity} pers.</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </>
        )}

        {/* Guides */}
        {guidesWithContent.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <h2 className="text-xl font-display text-foreground flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" /> Guides
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {guidesWithContent.map((guide) => {
                  const config = guideTypeConfig[guide.type];
                  if (!config) return null;
                  const Icon = config.icon;
                  const items = parseContent(guide.content);
                  const grouped = groupByCategory(items);

                  return (
                    <Card key={guide.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-display flex items-center gap-2">
                          <Icon className={`h-5 w-5 ${config.color}`} />
                          {config.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Array.from(grouped.entries()).map(([cat, catItems]) => (
                            <div key={cat}>
                              <p className="text-xs font-medium text-foreground mb-1">{cat}</p>
                              <ul className="space-y-1 pl-1">
                                {catItems.map((item, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <span className="text-primary mt-0.5 shrink-0">•</span>
                                    <span>{item.text}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <Separator />
        <p className="text-center text-xs text-muted-foreground py-4">
          Page générée par CasaCircle
        </p>
      </div>
    </div>
  );
};

export default PublicHousePage;
