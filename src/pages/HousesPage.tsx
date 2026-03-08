import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import CreateFamilyDialog from "@/components/CreateFamilyDialog";
import CreateHouseDialog from "@/components/CreateHouseDialog";
import InviteMemberDialog from "@/components/InviteMemberDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Users, Crown, User } from "lucide-react";

interface Family {
  id: string;
  name: string;
  created_by: string;
}

interface FamilyMember {
  id: string;
  user_id: string;
  role: "admin" | "member";
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
  family_id: string;
}

interface FamilyWithDetails extends Family {
  members: FamilyMember[];
  houses: House[];
  userRole: "admin" | "member";
}

const HousesPage = () => {
  const { user } = useAuth();
  const [families, setFamilies] = useState<FamilyWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get families user belongs to
    const { data: memberData } = await supabase
      .from("family_members")
      .select("family_id, role")
      .eq("user_id", user.id);

    if (!memberData || memberData.length === 0) {
      setFamilies([]);
      setLoading(false);
      return;
    }

    const familyIds = memberData.map((m) => m.family_id);
    const roleMap = Object.fromEntries(memberData.map((m) => [m.family_id, m.role]));

    // Fetch families
    const { data: familiesData } = await supabase
      .from("families")
      .select("id, name, created_by")
      .in("id", familyIds);

    // Fetch all houses for these families
    const { data: housesData } = await supabase
      .from("houses")
      .select("id, name, location, description, capacity, family_id")
      .in("family_id", familyIds);

    // Fetch all members for these families with profiles
    const { data: allMembers } = await supabase
      .from("family_members")
      .select("id, family_id, user_id, role, users_profiles(first_name, last_name, email)")
      .in("family_id", familyIds);

    const result: FamilyWithDetails[] = (familiesData || []).map((f) => ({
      ...f,
      userRole: roleMap[f.id] as "admin" | "member",
      houses: (housesData || []).filter((h) => h.family_id === f.id),
      members: (allMembers || [])
        .filter((m) => m.family_id === f.id)
        .map((m) => ({
          ...m,
          role: m.role as "admin" | "member",
          users_profiles: m.users_profiles as FamilyMember["users_profiles"],
        })),
    }));

    setFamilies(result);
    setLoading(false);
  }, [user]);

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

  return (
    <AppLayout title="Maisons">
      <div className="space-y-8 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-display text-foreground">Mes maisons</h2>
            <p className="text-muted-foreground mt-1">Gérez vos familles et leurs maisons.</p>
          </div>
          <CreateFamilyDialog onCreated={fetchData} />
        </div>

        {/* Empty state */}
        {families.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-xl text-foreground mb-2">Aucune famille</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Créez votre première famille pour commencer à gérer vos maisons.
              </p>
              <CreateFamilyDialog onCreated={fetchData} />
            </CardContent>
          </Card>
        )}

        {/* Family sections */}
        {families.map((family) => (
          <section key={family.id} className="space-y-4">
            {/* Family header */}
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

            {/* Members */}
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

            {/* Houses grid */}
            {family.houses.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Aucune maison dans cette famille.</p>
                  {family.userRole === "admin" && (
                    <div className="mt-3">
                      <CreateHouseDialog
                        familyId={family.id}
                        familyName={family.name}
                        onCreated={fetchData}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {family.houses.map((house) => (
                  <Card key={house.id} className="hover:shadow-md transition-shadow group">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-display flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        {house.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
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
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {house.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </AppLayout>
  );
};

export default HousesPage;
