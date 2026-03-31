import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import AddUnitDialog from "@/components/AddUnitDialog";
import InviteToHouseDialog from "@/components/InviteToHouseDialog";
import HouseGuideEditor, { parseContent, groupByCategory } from "@/components/HouseGuideEditor";
import EditHouseDialog from "@/components/EditHouseDialog";
import HousePricingConfig from "@/components/HousePricingConfig";
import PricingPeriodsManager from "@/components/PricingPeriodsManager";
import OwnershipTab from "@/components/OwnershipTab";
import UsageTab from "@/components/UsageTab";
import FairnessScore from "@/components/FairnessScore";
import FinancialDashboard from "@/components/FinancialDashboard";
import DecisionRegister from "@/components/DecisionRegister";
import HouseTimeline from "@/components/HouseTimeline";
import SmartAlbum from "@/components/SmartAlbum";
import FamilyTree from "@/components/FamilyTree";
import BookingPriority from "@/components/BookingPriority";
import FamilyPact from "@/components/FamilyPact";
import NotaryExport from "@/components/NotaryExport";
import ChecklistConfig from "@/components/ChecklistConfig";
import LocationMap from "@/components/LocationMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, MapPin, Users, Crown, User, DoorOpen,
  ArrowLeft, LogIn, LogOut, BookOpen, Wrench, Info,
  LayoutList, LayoutGrid, AlertTriangle, Plus, CheckCircle2, Clock, Loader2,
  Eye, PieChart, BarChart3, Scale, Wallet, BookMarked,
  History, Camera, TreePine, Shield, Briefcase, ClipboardCheck,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface House {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  capacity: number | null;
  family_id: string | null;
  owner_id: string | null;
  photo_url: string | null;
  is_public?: boolean;
  booking_auto_approve?: boolean;
  wifi_name?: string | null;
  wifi_password?: string | null;
  access_code?: string | null;
  join_code?: string | null;
  emergency_contact?: string | null;
}

interface HouseMember {
  id: string;
  user_id: string;
  role: string;
  profile?: { first_name: string | null; last_name: string | null; email: string | null; phone: string | null };
}

interface HouseUnit {
  id: string;
  name: string;
  type: "building" | "room";
  parent_id: string | null;
  capacity: number | null;
  description: string | null;
}

interface HouseGuide {
  id: string;
  title: string;
  content: string | null;
  type: "arrival" | "departure" | "rules" | "practical_info";
}

interface MaintenanceTicket {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "resolved";
  priority: "low" | "medium" | "high" | "urgent";
  created_by: string;
  created_at: string;
  updated_at: string;
  authorName?: string;
}

const guideTypeConfig = {
  arrival: { label: "Kit d'arrivée", icon: LogIn, color: "text-accent" },
  departure: { label: "Kit de départ", icon: LogOut, color: "text-primary" },
  rules: { label: "Règles de la maison", icon: BookOpen, color: "text-foreground" },
  practical_info: { label: "Infos pratiques", icon: Info, color: "text-muted-foreground" },
};

const HouseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [house, setHouse] = useState<House | null>(null);
  const [members, setMembers] = useState<HouseMember[]>([]);
  const [units, setUnits] = useState<HouseUnit[]>([]);
  const [guides, setGuides] = useState<HouseGuide[]>([]);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchHouse = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);

    const [
      { data: houseData },
      { data: membersData },
      { data: unitsData },
      { data: guidesData },
      { data: ticketsData },
    ] = await Promise.all([
      supabase.from("houses").select("*").eq("id", id).single(),
      supabase.from("house_members").select("id, user_id, role").eq("house_id", id),
      supabase.from("house_units").select("id, name, type, parent_id, capacity, description").eq("house_id", id).order("type").order("name"),
      supabase.from("house_guides").select("id, title, content, type").eq("house_id", id).order("type"),
      supabase.from("maintenance_tickets").select("*").eq("house_id", id).order("created_at", { ascending: false }),
    ]);

    if (!houseData) {
      navigate("/houses");
      return;
    }

    setHouse(houseData);
    setUnits(unitsData || []);
    setGuides(guidesData || []);

    // Fetch member profiles
    const membersList = membersData || [];
    const ticketCreatorIds = [...new Set((ticketsData || []).map((t) => t.created_by))];
    const allUserIds = [...new Set([...membersList.map((m) => m.user_id), ...ticketCreatorIds])];
    const { data: profiles } = allUserIds.length > 0
      ? await supabase.from("users_profiles").select("user_id, first_name, last_name, email, phone").in("user_id", allUserIds)
      : { data: [] };
    const profMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));

    const enrichedMembers = membersList.map((m) => ({
      ...m,
      profile: profMap[m.user_id],
    }));
    setMembers(enrichedMembers);

    // Enrich tickets with author names
    const enrichedTickets: MaintenanceTicket[] = (ticketsData || []).map((t) => {
      const prof = profMap[t.created_by];
      return {
        ...t,
        status: t.status as MaintenanceTicket["status"],
        priority: (t as any).priority as MaintenanceTicket["priority"] || "medium",
        authorName: [prof?.first_name, prof?.last_name].filter(Boolean).join(" ") || "Membre",
      };
    });
    setTickets(enrichedTickets);

    // Check admin status
    const isHouseAdmin = enrichedMembers.some((m) => m.user_id === user.id && m.role === "admin");
    let isFamilyAdmin = false;
    if (houseData.family_id) {
      const { data: fm } = await supabase
        .from("family_members")
        .select("role")
        .eq("family_id", houseData.family_id)
        .eq("user_id", user.id)
        .single();
      isFamilyAdmin = fm?.role === "admin";
    }
    setIsAdmin(isHouseAdmin || isFamilyAdmin);
    setLoading(false);
  }, [id, user, navigate]);

  useEffect(() => {
    fetchHouse();
  }, [fetchHouse]);

  if (loading || !house) {
    return (
      <AppLayout title="Maison">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </div>
      </AppLayout>
    );
  }

  const buildings = units.filter((u) => u.type === "building");
  const standaloneRooms = units.filter((u) => u.type === "room" && !u.parent_id);

  return (
    <AppLayout title={house.name}>
      <div className="max-w-4xl space-y-8">
        {/* Back + Header */}
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/houses")} className="mb-4 -ml-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>

          {/* Cover photo */}
          {house.photo_url && (
            <div className="relative rounded-xl overflow-hidden mb-6 border border-border">
              <img
                src={house.photo_url}
                alt={house.name}
                className="w-full h-48 sm:h-64 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-display text-white drop-shadow-lg">{house.name}</h1>
                    {house.location && (
                      <p className="text-sm text-white/80 flex items-center gap-1 mt-1 drop-shadow">
                        <MapPin className="h-3.5 w-3.5" /> {house.location}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {house.capacity && (
                      <Badge variant="secondary" className="text-sm px-3 py-1.5 bg-background/80 backdrop-blur-sm">
                        <Users className="h-4 w-4 mr-1.5" />
                        {house.capacity} pers.
                      </Badge>
                    )}
                    {isAdmin && <EditHouseDialog house={house} onSaved={fetchHouse} />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Header without photo */}
          {!house.photo_url && (
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl md:text-4xl font-display text-foreground">{house.name}</h1>
                  {isAdmin && <EditHouseDialog house={house} onSaved={fetchHouse} />}
                </div>
                {house.location && (
                  <LocationMap location={house.location} />
                )}
                {house.description && (
                  <p className="text-muted-foreground max-w-xl">{house.description}</p>
                )}
              </div>
              {house.capacity && (
                <Badge variant="secondary" className="text-sm px-3 py-1.5 self-start">
                  <Users className="h-4 w-4 mr-1.5" />
                  {house.capacity} personnes
                </Badge>
              )}
            </div>
          )}

          {/* Description & location below photo */}
          {house.photo_url && (
            <div className="space-y-2">
              {house.location && <LocationMap location={house.location} />}
              {house.description && (
                <p className="text-muted-foreground max-w-xl">{house.description}</p>
              )}
            </div>
          )}
        </div>

        {/* Practical info cards */}
        {(house.wifi_name || house.access_code || house.emergency_contact) && (
          <div className="grid sm:grid-cols-3 gap-3">
            {house.wifi_name && (
              <Card className="border-border/50 shadow-soft">
                <CardContent className="p-4 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">📶 WiFi</p>
                  <p className="font-medium text-foreground text-sm">{house.wifi_name}</p>
                  {house.wifi_password && (
                    <p className="text-xs text-muted-foreground">Mot de passe : <span className="font-mono text-foreground">{house.wifi_password}</span></p>
                  )}
                </CardContent>
              </Card>
            )}
            {house.access_code && (
              <Card className="border-border/50 shadow-soft">
                <CardContent className="p-4 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">🔑 Code d'accès</p>
                  <p className="font-mono font-bold text-foreground text-lg">{house.access_code}</p>
                </CardContent>
              </Card>
            )}
            {house.emergency_contact && (
              <Card className="border-border/50 shadow-soft">
                <CardContent className="p-4 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">🚨 Contact d'urgence</p>
                  <p className="text-sm text-foreground">{house.emergency_contact}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Fairness Score */}
        <FairnessScore houseId={house.id} members={members} />

        {/* Pricing */}
        <HousePricingConfig houseId={house.id} isAdmin={isAdmin} />
        <PricingPeriodsManager houseId={house.id} isAdmin={isAdmin} />

        {/* Tabs */}
        <Tabs defaultValue="guides" className="space-y-6">
          <TabsList className="w-full flex flex-wrap h-auto gap-1">
            <TabsTrigger value="guides" className="gap-1.5 text-xs sm:text-sm py-1.5">
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Guides</span>
            </TabsTrigger>
            <TabsTrigger value="spaces" className="gap-1.5 text-xs sm:text-sm py-1.5">
              <DoorOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Espaces</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-1.5 text-xs sm:text-sm py-1.5">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Membres</span>
            </TabsTrigger>
            <TabsTrigger value="ownership" className="gap-1.5 text-xs sm:text-sm py-1.5">
              <PieChart className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Propriété</span>
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-1.5 text-xs sm:text-sm py-1.5">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Usage</span>
            </TabsTrigger>
            <TabsTrigger value="finances" className="gap-1.5 text-xs sm:text-sm py-1.5">
              <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Finances</span>
            </TabsTrigger>
            <TabsTrigger value="decisions" className="gap-1.5 text-xs sm:text-sm py-1.5">
              <BookMarked className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Décisions</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm py-1.5">
              <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Histoire</span>
            </TabsTrigger>
            <TabsTrigger value="album" className="gap-1.5 text-xs sm:text-sm py-1.5">
              <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Album</span>
            </TabsTrigger>
            {house.family_id && (
              <TabsTrigger value="family" className="gap-1.5 text-xs sm:text-sm py-1.5">
                <TreePine className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Famille</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="pact" className="gap-1.5 text-xs sm:text-sm py-1.5">
              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Pacte</span>
            </TabsTrigger>
            <TabsTrigger value="checklists" className="gap-1.5 text-xs sm:text-sm py-1.5">
              <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Checklists</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-1.5 text-xs sm:text-sm py-1.5 relative">
              <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Signalements</span>
              {tickets.filter(t => t.status !== "resolved").length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 text-[10px] sm:text-xs rounded-full bg-destructive text-destructive-foreground">
                  {tickets.filter(t => t.status !== "resolved").length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Guides Tab */}
          <TabsContent value="guides" className="space-y-6">
            {/* Arrival & Departure kits side by side */}
            <div className="grid md:grid-cols-2 gap-4">
              {(["arrival", "departure"] as const).map((type) => {
                const config = guideTypeConfig[type];
                const guide = guides.find((g) => g.type === type);
                return (
                  <GuideCard
                    key={type}
                    type={type}
                    config={config}
                    guide={guide}
                    houseId={house.id}
                    isAdmin={isAdmin}
                    onSaved={fetchHouse}
                  />
                );
              })}
            </div>

            {/* Rules & Practical info */}
            <div className="grid md:grid-cols-2 gap-4">
              {(["rules", "practical_info"] as const).map((type) => {
                const config = guideTypeConfig[type];
                const guide = guides.find((g) => g.type === type);
                return (
                  <GuideCard
                    key={type}
                    type={type}
                    config={config}
                    guide={guide}
                    houseId={house.id}
                    isAdmin={isAdmin}
                    onSaved={fetchHouse}
                  />
                );
              })}
            </div>
          </TabsContent>

          {/* Spaces Tab */}
          <TabsContent value="spaces" className="space-y-4">
            {isAdmin && (
              <div className="flex justify-end">
                <AddUnitDialog houseId={house.id} houseName={house.name} onCreated={fetchHouse} />
              </div>
            )}

            {units.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <DoorOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucun espace défini.</p>
                  {isAdmin && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Ajoutez des bâtiments ou chambres pour permettre la réservation par espace.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {buildings.map((building) => {
                  const childRooms = units.filter((u) => u.parent_id === building.id);
                  return (
                    <Card key={building.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-display flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          {building.name}
                          {building.capacity && (
                            <Badge variant="secondary" className="text-xs ml-auto">
                              {building.capacity} pers.
                            </Badge>
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
                                    {room.capacity && (
                                      <p className="text-xs text-muted-foreground">{room.capacity} pers.</p>
                                    )}
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
                              {room.capacity && (
                                <p className="text-xs text-muted-foreground">{room.capacity} pers.</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4">
            <MembersTab members={members} isAdmin={isAdmin} userId={user?.id} houseId={house.id} familyId={house.family_id} fetchHouse={fetchHouse} />
          </TabsContent>

          {/* Ownership Tab */}
          <TabsContent value="ownership" className="space-y-4">
            <OwnershipTab houseId={house.id} isAdmin={isAdmin} members={members} />
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            <UsageTab houseId={house.id} members={members} />
            <BookingPriority houseId={house.id} members={members} />
          </TabsContent>

          {/* Finances Tab */}
          <TabsContent value="finances" className="space-y-4">
            <FinancialDashboard houseId={house.id} members={members} />
          </TabsContent>

          {/* Decisions Tab */}
          <TabsContent value="decisions" className="space-y-4">
            <DecisionRegister houseId={house.id} />
            <NotaryExport houseId={house.id} houseName={house.name} members={members} />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <HouseTimeline houseId={house.id} isAdmin={isAdmin} />
          </TabsContent>

          {/* Album Tab */}
          <TabsContent value="album" className="space-y-4">
            <SmartAlbum houseId={house.id} members={members} />
          </TabsContent>

          {/* Family Tab */}
          {house.family_id && (
            <TabsContent value="family" className="space-y-4">
              <FamilyTree familyId={house.family_id} isAdmin={isAdmin} />
            </TabsContent>
          )}

          {/* Pact Tab */}
          <TabsContent value="pact" className="space-y-4">
            <FamilyPact houseId={house.id} isAdmin={isAdmin} members={members} />
          </TabsContent>

          <TabsContent value="tickets" className="space-y-4">
            <TicketsTab tickets={tickets} houseId={house.id} isAdmin={isAdmin} userId={user?.id} onRefresh={fetchHouse} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

const GuideCard = ({
  type,
  config,
  guide,
  houseId,
  isAdmin,
  onSaved,
}: {
  type: string;
  config: { label: string; icon: any; color: string };
  guide?: HouseGuide;
  houseId: string;
  isAdmin: boolean;
  onSaved: () => void;
}) => {
  const Icon = config.icon;
  const hasContent = guide?.content && guide.content.trim().length > 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Icon className={`h-5 w-5 ${config.color}`} />
          {config.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {hasContent ? (() => {
          const items = parseContent(guide!.content);
          const grouped = groupByCategory(items);
          return (
            <div className="space-y-3 flex-1">
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
          );
        })() : (
          <p className="text-sm text-muted-foreground/60 italic flex-1">
            Aucun contenu ajouté.
          </p>
        )}
        {isAdmin && (
          <div className="mt-3 pt-3 border-t border-border">
            <HouseGuideEditor
              houseId={houseId}
              type={type as any}
              guide={guide}
              onSaved={onSaved}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const roleConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  admin: { label: "Admin", variant: "default" },
  member: { label: "Membre", variant: "secondary" },
  guest: { label: "Invité", variant: "outline" },
};

const MembersTab = ({
  members, isAdmin, userId, houseId, familyId, fetchHouse,
}: {
  members: HouseMember[];
  isAdmin: boolean;
  userId?: string;
  houseId: string;
  familyId: string | null;
  fetchHouse: () => void;
}) => {
  const [view, setView] = useState<"cards" | "table">("table");

  const renderRoleCell = (m: HouseMember) => {
    const rc = roleConfig[m.role] || roleConfig.member;
    if (isAdmin && m.user_id !== userId) {
      return (
        <select
          value={m.role}
          onChange={async (e) => {
            await supabase.from("house_members").update({ role: e.target.value }).eq("id", m.id);
            fetchHouse();
          }}
          className="text-xs border border-border rounded-md px-2 py-1 bg-background text-foreground"
        >
          <option value="admin">Admin</option>
          <option value="member">Membre</option>
          <option value="guest">Invité</option>
        </select>
      );
    }
    return <Badge variant={rc.variant} className="text-xs">{rc.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
          <Button
            variant={view === "cards" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2"
            onClick={() => setView("cards")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={view === "table" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2"
            onClick={() => setView("table")}
          >
            <LayoutList className="h-3.5 w-3.5" />
          </Button>
        </div>
        {isAdmin && !familyId && (
          <InviteToHouseDialog houseId={houseId} houseName="" onInvited={fetchHouse} />
        )}
      </div>

      {view === "table" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden sm:table-cell">Téléphone</TableHead>
                <TableHead>Rôle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const fullName = [m.profile?.first_name, m.profile?.last_name].filter(Boolean).join(" ") || "Membre";
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{fullName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{m.profile?.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">{m.profile?.phone || "—"}</TableCell>
                    <TableCell>{renderRoleCell(m)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="space-y-3">
          {members.map((m) => {
            const rc = roleConfig[m.role] || roleConfig.member;
            const RoleIcon = m.role === "admin" ? Crown : m.role === "guest" ? Eye : User;
            const fullName = [m.profile?.first_name, m.profile?.last_name].filter(Boolean).join(" ") || "Membre";

            return (
              <Card key={m.id}>
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <RoleIcon className={`h-5 w-5 ${m.role === "admin" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{fullName}</p>
                      <div className="ml-auto shrink-0">{renderRoleCell(m)}</div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      {m.profile?.email && <span>✉️ {m.profile.email}</span>}
                      {m.profile?.phone && <span>📞 {m.profile.phone}</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ticketStatusConfig = {
  open: { label: "Ouvert", icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10", variant: "destructive" as const },
  in_progress: { label: "En cours", icon: Clock, color: "text-primary", bgColor: "bg-primary/10", variant: "secondary" as const },
  resolved: { label: "Résolu", icon: CheckCircle2, color: "text-accent", bgColor: "bg-accent/10", variant: "outline" as const },
};

const TicketsTab = ({
  tickets, houseId, isAdmin, userId, onRefresh,
}: {
  tickets: MaintenanceTicket[];
  houseId: string;
  isAdmin: boolean;
  userId?: string;
  onRefresh: () => void;
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("medium");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !userId) return;
    setSubmitting(true);
    const { error } = await supabase.from("maintenance_tickets").insert({
      title: title.trim(),
      description: description.trim() || null,
      house_id: houseId,
      created_by: userId,
      priority,
    } as any);
    setSubmitting(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Signalement créé !" });
      setTitle("");
      setDescription("");
      setPriority("medium");
      setOpen(false);
      onRefresh();
    }
  };

  const updateStatus = async (ticketId: string, status: "open" | "in_progress" | "resolved") => {
    const { error } = await supabase.from("maintenance_tickets").update({ status }).eq("id", ticketId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      onRefresh();
    }
  };

  const openTickets = tickets.filter((t) => t.status === "open");
  const inProgressTickets = tickets.filter((t) => t.status === "in_progress");
  const resolvedTickets = tickets.filter((t) => t.status === "resolved");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {tickets.filter(t => t.status !== "resolved").length} signalement{tickets.filter(t => t.status !== "resolved").length > 1 ? "s" : ""} en cours
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Signaler
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau signalement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Titre</label>
                <Input
                  placeholder="Ex: Fuite robinet cuisine"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Description (optionnel)</label>
                <Textarea
                  placeholder="Décrivez le problème ou la suggestion..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Priorité</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Faible</SelectItem>
                    <SelectItem value="medium">🟡 Moyenne</SelectItem>
                    <SelectItem value="high">🟠 Important</SelectItem>
                    <SelectItem value="urgent">🔴 Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={!title.trim() || submitting} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Envoyer le signalement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wrench className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun signalement pour le moment.</p>
            <p className="text-sm text-muted-foreground mt-1">Signalez un problème ou proposez une amélioration.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {[
            { label: "Ouverts", items: openTickets, status: "open" as const },
            { label: "En cours", items: inProgressTickets, status: "in_progress" as const },
            { label: "Résolus", items: resolvedTickets, status: "resolved" as const },
          ].filter(g => g.items.length > 0).map((group) => (
            <div key={group.status} className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {(() => { const Icon = ticketStatusConfig[group.status].icon; return <Icon className={`h-4 w-4 ${ticketStatusConfig[group.status].color}`} />; })()}
                {group.label} ({group.items.length})
              </h4>
              <div className="space-y-2">
                {group.items.map((t) => {
                  const sc = ticketStatusConfig[t.status];
                  return (
                    <Card key={t.id}>
                      <CardContent className="py-3 px-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-foreground text-sm">{t.title}</p>
                              <Badge variant={sc.variant} className="text-xs">{sc.label}</Badge>
                            </div>
                            {t.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {t.authorName} · {format(new Date(t.created_at), "d MMM yyyy", { locale: fr })}
                            </p>
                          </div>
                          {isAdmin && t.status !== "resolved" && (
                            <Select
                              value={t.status}
                              onValueChange={(v) => updateStatus(t.id, v as any)}
                            >
                              <SelectTrigger className="w-[130px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Ouvert</SelectItem>
                                <SelectItem value="in_progress">En cours</SelectItem>
                                <SelectItem value="resolved">Résolu</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HouseDetailPage;
