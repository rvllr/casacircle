import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDemo } from "@/contexts/DemoContext";
import { DEMO_HOUSES_FULL, DEMO_FAMILY, DEMO_FAMILY_MEMBERS, DEMO_HOUSE_UNITS } from "@/lib/demoData";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import CreateFamilyDialog from "@/components/CreateFamilyDialog";
import CreateHouseDialog from "@/components/CreateHouseDialog";
import InviteMemberDialog from "@/components/InviteMemberDialog";
import InviteToHouseDialog from "@/components/InviteToHouseDialog";
import AddUnitDialog from "@/components/AddUnitDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, MapPin, Users, Crown, User, DoorOpen } from "lucide-react";

interface Family {
  id: string;
  name: string;
  created_by: string;
  type?: string;
  description?: string | null;
  ownership_enabled?: boolean;
}

interface FamilyMember {
  id: string;
  user_id: string;
  role: "admin" | "member" | "legal_representative";
  users_profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

interface House {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  capacity: number | null;
  family_id: string | null;
  owner_id: string | null;
}

interface HouseMember {
  id: string;
  user_id: string;
  role: string;
  profile?: { first_name: string | null; last_name: string | null; email: string | null };
}

interface HouseUnit {
  id: string;
  house_id: string;
  name: string;
  type: "building" | "room";
  parent_id: string | null;
  capacity: number | null;
}

interface FamilyWithDetails extends Family {
  members: FamilyMember[];
  houses: House[];
  userRole: "admin" | "member" | "legal_representative";
}

const SPACE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  family: { label: "Famille", color: "bg-primary/10 text-primary" },
  indivision: { label: "Indivision", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  sci: { label: "SCI", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  personal: { label: "Personnel", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  multi_family: { label: "Multi-familles", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
};

const HousesPage = () => {
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const [families, setFamilies] = useState<FamilyWithDetails[]>([]);
  const [directHouses, setDirectHouses] = useState<House[]>([]);
  const [houseMembers, setHouseMembers] = useState<Record<string, HouseMember[]>>({});
  const [houseUnits, setHouseUnits] = useState<Record<string, HouseUnit[]>>({});
  const [adminFamilies, setAdminFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (isDemo) {
      const unitsGrouped: Record<string, HouseUnit[]> = {};
      DEMO_HOUSE_UNITS.forEach((u) => {
        if (!unitsGrouped[u.house_id]) unitsGrouped[u.house_id] = [];
        unitsGrouped[u.house_id].push(u);
      });
      setHouseUnits(unitsGrouped);
      setFamilies([{
        ...DEMO_FAMILY,
        userRole: "admin" as const,
        houses: DEMO_HOUSES_FULL,
        members: DEMO_FAMILY_MEMBERS,
      }]);
      setDirectHouses([]);
      setAdminFamilies([DEMO_FAMILY]);
      setLoading(false);
      return;
    }
    if (!user) return;
    setLoading(true);

    // Get families user belongs to
    const { data: memberData } = await supabase
      .from("family_members")
      .select("family_id, role")
      .eq("user_id", user.id);

    const familyIds = (memberData || []).map((m) => m.family_id);
    const roleMap = Object.fromEntries((memberData || []).map((m) => [m.family_id, m.role]));

    // Fetch families
    const { data: familiesData } = familyIds.length > 0
      ? await supabase.from("families").select("id, name, created_by").in("id", familyIds)
      : { data: [] };

    setAdminFamilies(
      (familiesData || []).filter((f) => roleMap[f.id] === "admin")
    );

    // Fetch all houses user can see
    const { data: allHouses } = await supabase
      .from("houses")
      .select("id, name, location, description, capacity, family_id, owner_id");

    const houses = allHouses || [];

    // Split: family houses vs direct houses
    const familyHouses = houses.filter((h) => h.family_id && familyIds.includes(h.family_id));
    const direct = houses.filter((h) => !h.family_id || !familyIds.includes(h.family_id));
    setDirectHouses(direct);

    // Fetch house_members for direct houses
    const directHouseIds = direct.map((h) => h.id);
    if (directHouseIds.length > 0) {
      const { data: hm } = await supabase
        .from("house_members")
        .select("id, house_id, user_id, role")
        .in("house_id", directHouseIds);

      const memberUserIds = [...new Set((hm || []).map((m) => m.user_id))];
      const { data: profs } = memberUserIds.length > 0
        ? await supabase.from("users_profiles").select("user_id, first_name, last_name, email").in("user_id", memberUserIds)
        : { data: [] };
      const profMap = Object.fromEntries((profs || []).map((p) => [p.user_id, p]));

      const grouped: Record<string, HouseMember[]> = {};
      (hm || []).forEach((m) => {
        const key = (m as any).house_id;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({ ...m, profile: profMap[m.user_id] });
      });
      setHouseMembers(grouped);
    }

    // Fetch house_units for all houses
    const allHouseIds = houses.map((h) => h.id);
    if (allHouseIds.length > 0) {
      const { data: unitsData } = await supabase
        .from("house_units")
        .select("id, house_id, name, type, parent_id, capacity")
        .in("house_id", allHouseIds)
        .order("type", { ascending: true })
        .order("name", { ascending: true });

      const unitsGrouped: Record<string, HouseUnit[]> = {};
      (unitsData || []).forEach((u: any) => {
        if (!unitsGrouped[u.house_id]) unitsGrouped[u.house_id] = [];
        unitsGrouped[u.house_id].push(u);
      });
      setHouseUnits(unitsGrouped);
    }

    // Fetch family members + profiles
    const allMemberUserIds: string[] = [];
    let allMembers: any[] = [];
    if (familyIds.length > 0) {
      const { data: fm } = await supabase
        .from("family_members")
        .select("id, family_id, user_id, role")
        .in("family_id", familyIds);
      allMembers = fm || [];
      allMembers.forEach((m) => allMemberUserIds.push(m.user_id));
    }

    const uniqueUserIds = [...new Set(allMemberUserIds)];
    const { data: profilesData } = uniqueUserIds.length > 0
      ? await supabase.from("users_profiles").select("user_id, first_name, last_name, email").in("user_id", uniqueUserIds)
      : { data: [] };
    const profilesMap = Object.fromEntries((profilesData || []).map((p) => [p.user_id, p]));

    const result: FamilyWithDetails[] = (familiesData || []).map((f) => ({
      ...f,
      userRole: roleMap[f.id] as "admin" | "member",
      houses: familyHouses.filter((h) => h.family_id === f.id),
      members: allMembers
        .filter((m: any) => m.family_id === f.id)
        .map((m: any) => ({
          ...m,
          role: m.role as "admin" | "member",
          users_profiles: profilesMap[m.user_id] || null,
        })),
    }));

    setFamilies(result);
    setLoading(false);
  }, [user, isDemo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <AppLayout title="Maisons">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </div>
      </AppLayout>
    );
  }

  const hasContent = families.length > 0 || directHouses.length > 0;

  return (
    <AppLayout title="Maisons">
      <div className="space-y-8 max-w-5xl animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div>
            <h2 className="page-header-title">Mes maisons</h2>
            <p className="page-header-subtitle">Créez des maisons et invitez vos proches.</p>
          </div>
          <div className="flex items-center gap-2">
            <CreateHouseDialog families={adminFamilies} onCreated={fetchData} />
            <CreateFamilyDialog onCreated={fetchData} />
          </div>
        </div>

        {!hasContent && (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-xl text-foreground mb-2">Aucune maison</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Créez votre première maison et invitez vos proches à la rejoindre.
              </p>
              <CreateHouseDialog families={adminFamilies} onCreated={fetchData} />
            </CardContent>
          </Card>
        )}

        {hasContent && (
          <Tabs defaultValue={directHouses.length > 0 ? "houses" : "families"}>
            <TabsList>
              <TabsTrigger value="houses">
                Mes maisons ({directHouses.length + families.reduce((s, f) => s + f.houses.length, 0)})
              </TabsTrigger>
              {families.length > 0 && (
                <TabsTrigger value="families">Familles ({families.length})</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="houses" className="space-y-6 mt-6">
              {/* Direct houses */}
              {directHouses.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {directHouses.map((house) => (
                    <HouseCard
                      key={house.id}
                      house={house}
                      members={houseMembers[house.id] || []}
                      units={houseUnits[house.id] || []}
                      isOwner={house.owner_id === user?.id}
                      onRefresh={fetchData}
                    />
                  ))}
                </div>
              )}

              {/* Family houses */}
              {families.map((family) =>
                family.houses.length > 0 ? (
                  <div key={family.id} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display text-lg text-foreground">{family.name}</h4>
                      <Badge variant="secondary" className="text-xs">Famille</Badge>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {family.houses.map((house) => (
                        <HouseCard
                          key={house.id}
                          house={house}
                          members={[]}
                          units={houseUnits[house.id] || []}
                          isOwner={family.userRole === "admin"}
                          onRefresh={fetchData}
                          familyName={family.name}
                        />
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </TabsContent>

            {families.length > 0 && (
              <TabsContent value="families" className="space-y-6 mt-6">
                {families.map((family) => (
                  <section key={family.id} className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
                      <div className="flex items-center gap-3">
                        <h3 className="font-display text-xl text-foreground">{family.name}</h3>
                        <Badge variant={family.userRole === "admin" ? "default" : "secondary"} className="text-xs">
                          {family.userRole === "admin" ? "Admin" : "Membre"}
                        </Badge>
                      </div>
                      {family.userRole === "admin" && (
                        <div className="flex items-center gap-2">
                          <CreateHouseDialog
                            familyId={family.id}
                            familyName={family.name}
                            onCreated={fetchData}
                          />
                          <InviteMemberDialog
                            familyId={family.id}
                            familyName={family.name}
                            onInvited={fetchData}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {family.members.map((member) => (
                        <div
                          key={member.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-sm"
                        >
                          {member.role === "admin" ? (
                            <Crown className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className="text-foreground">
                            {member.users_profiles?.first_name || member.users_profiles?.email || "Membre"}
                            {member.users_profiles?.last_name ? ` ${member.users_profiles.last_name}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>

                    {family.houses.length === 0 ? (
                      <Card>
                        <CardContent className="py-8 text-center">
                          <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground text-sm">Aucune maison dans cette famille.</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {family.houses.map((house) => (
                          <HouseCard
                            key={house.id}
                            house={house}
                            members={[]}
                            units={houseUnits[house.id] || []}
                            isOwner={family.userRole === "admin"}
                            onRefresh={fetchData}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
};

const HouseCard = ({
  house,
  members,
  units,
  isOwner,
  onRefresh,
  familyName,
}: {
  house: House;
  members: HouseMember[];
  units: HouseUnit[];
  isOwner: boolean;
  onRefresh: () => void;
  familyName?: string;
}) => {
  const navigate = useNavigate();
  const buildings = units.filter((u) => u.type === "building");
  const standaloneRooms = units.filter((u) => u.type === "room" && !u.parent_id);

  return (
    <Card className="border-border/50 shadow-soft hover:shadow-card transition-all duration-200 cursor-pointer group" onClick={() => navigate(`/houses/${house.id}`)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display flex items-center gap-2 group-hover:text-primary transition-colors">
          <Building2 className="h-4 w-4 text-primary" />
          {house.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {house.location && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            {house.location}
          </p>
        )}
        {house.capacity && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 flex-shrink-0" />
            {house.capacity} personnes
          </p>
        )}
        {house.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{house.description}</p>
        )}
        {familyName && (
          <Badge variant="outline" className="text-xs">{familyName}</Badge>
        )}

        {/* Units */}
        {units.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <DoorOpen className="h-3 w-3" /> Espaces réservables
            </p>
            <div className="flex flex-wrap gap-1.5">
              {buildings.map((b) => {
                const childRooms = units.filter((u) => u.parent_id === b.id);
                return (
                  <div key={b.id} className="space-y-1">
                    <Badge variant="secondary" className="text-xs">
                      🏘️ {b.name}{b.capacity ? ` · ${b.capacity} pers.` : ""}
                    </Badge>
                    {childRooms.map((r) => (
                      <Badge key={r.id} variant="outline" className="text-xs ml-2">
                        🛏️ {r.name}{r.capacity ? ` · ${r.capacity} pers.` : ""}
                      </Badge>
                    ))}
                  </div>
                );
              })}
              {standaloneRooms.map((r) => (
                <Badge key={r.id} variant="outline" className="text-xs">
                  🛏️ {r.name}{r.capacity ? ` · ${r.capacity} pers.` : ""}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Members list for direct houses */}
        {members.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {members.map((m) => (
              <div
                key={m.id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs"
              >
                {m.role === "admin" ? (
                  <Crown className="h-3 w-3 text-primary" />
                ) : (
                  <User className="h-3 w-3 text-muted-foreground" />
                )}
                {m.profile?.first_name || m.profile?.email || "Membre"}
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          <div className="flex flex-wrap gap-2 pt-1">
            {!house.family_id && (
              <InviteToHouseDialog
                houseId={house.id}
                houseName={house.name}
                onInvited={onRefresh}
              />
            )}
            <AddUnitDialog
              houseId={house.id}
              houseName={house.name}
              existingBuildings={buildings}
              onCreated={onRefresh}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HousesPage;
