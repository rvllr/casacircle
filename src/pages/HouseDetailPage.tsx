import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import AddUnitDialog from "@/components/AddUnitDialog";
import InviteToHouseDialog from "@/components/InviteToHouseDialog";
import HouseGuideEditor, { parseContent, groupByCategory } from "@/components/HouseGuideEditor";
import EditHouseDialog from "@/components/EditHouseDialog";
import LocationMap from "@/components/LocationMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, MapPin, Users, Crown, User, DoorOpen,
  ArrowLeft, LogIn, LogOut, BookOpen, Wrench, Info,
  LayoutList, LayoutGrid,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface House {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  capacity: number | null;
  family_id: string | null;
  owner_id: string | null;
  photo_url: string | null;
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
    ] = await Promise.all([
      supabase.from("houses").select("*").eq("id", id).single(),
      supabase.from("house_members").select("id, user_id, role").eq("house_id", id),
      supabase.from("house_units").select("id, name, type, parent_id, capacity, description").eq("house_id", id).order("type").order("name"),
      supabase.from("house_guides").select("id, title, content, type").eq("house_id", id).order("type"),
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
    const userIds = membersList.map((m) => m.user_id);
    const { data: profiles } = userIds.length > 0
      ? await supabase.from("users_profiles").select("user_id, first_name, last_name, email, phone").in("user_id", userIds)
      : { data: [] };
    const profMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));

    const enrichedMembers = membersList.map((m) => ({
      ...m,
      profile: profMap[m.user_id],
    }));
    setMembers(enrichedMembers);

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
        </div>

        {/* Tabs */}
        <Tabs defaultValue="guides" className="space-y-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="guides" className="gap-1.5">
              <BookOpen className="h-4 w-4" /> Guides
            </TabsTrigger>
            <TabsTrigger value="spaces" className="gap-1.5">
              <DoorOpen className="h-4 w-4" /> Espaces
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-1.5">
              <Users className="h-4 w-4" /> Membres
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
            const RoleIcon = m.role === "admin" ? Crown : User;
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

export default HouseDetailPage;
