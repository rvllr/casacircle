import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { DEMO_FAMILY, DEMO_HOUSES_FULL, DEMO_FAMILY_MEMBERS } from "@/lib/demoData";
import AppLayout from "@/components/AppLayout";
import CreateFamilyDialog from "@/components/CreateFamilyDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Landmark, User, Network, ChevronRight, Briefcase } from "lucide-react";

interface Space {
  id: string;
  name: string;
  type: string;
  description: string | null;
  ownership_enabled: boolean;
  created_by: string;
  houseCount: number;
  memberCount: number;
  userRole: string;
}

const SPACE_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  family: { label: "Famille", icon: Users, color: "bg-primary/10 text-primary" },
  indivision: { label: "Indivision", icon: Building2, color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  sci: { label: "SCI", icon: Landmark, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  personal: { label: "Personnel", icon: User, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  multi_family: { label: "Multi-familles", icon: Network, color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
};

const PatrimonySpacesPage = () => {
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSpaces = useCallback(async () => {
    if (isDemo) {
      setSpaces([{
        id: DEMO_FAMILY.id,
        name: DEMO_FAMILY.name,
        type: DEMO_FAMILY.type,
        description: DEMO_FAMILY.description,
        ownership_enabled: DEMO_FAMILY.ownership_enabled,
        created_by: DEMO_FAMILY.created_by,
        houseCount: DEMO_HOUSES_FULL.length,
        memberCount: DEMO_FAMILY_MEMBERS.length,
        userRole: "admin",
      }]);
      setLoading(false);
      return;
    }
    if (!user) return;
    setLoading(true);

    // Get user's memberships
    const { data: memberships } = await supabase
      .from("family_members")
      .select("family_id, role")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setSpaces([]);
      setLoading(false);
      return;
    }

    const familyIds = memberships.map((m) => m.family_id);
    const roleMap = Object.fromEntries(memberships.map((m) => [m.family_id, m.role]));

    // Fetch families
    const { data: families } = await supabase
      .from("families")
      .select("id, name, created_by, type, description, ownership_enabled")
      .in("id", familyIds);

    // Count houses per family
    const { data: houses } = await supabase
      .from("houses")
      .select("id, family_id")
      .in("family_id", familyIds);

    const houseCounts: Record<string, number> = {};
    (houses || []).forEach((h) => {
      if (h.family_id) houseCounts[h.family_id] = (houseCounts[h.family_id] || 0) + 1;
    });

    // Count members per family
    const { data: allMembers } = await supabase
      .from("family_members")
      .select("family_id")
      .in("family_id", familyIds);

    const memberCounts: Record<string, number> = {};
    (allMembers || []).forEach((m) => {
      memberCounts[m.family_id] = (memberCounts[m.family_id] || 0) + 1;
    });

    const result: Space[] = (families || []).map((f) => ({
      id: f.id,
      name: f.name,
      type: (f as any).type || "family",
      description: (f as any).description || null,
      ownership_enabled: (f as any).ownership_enabled || false,
      created_by: f.created_by,
      houseCount: houseCounts[f.id] || 0,
      memberCount: memberCounts[f.id] || 0,
      userRole: roleMap[f.id] || "member",
    }));

    setSpaces(result);
    setLoading(false);
  }, [user, isDemo]);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  if (loading) {
    return (
      <AppLayout title="Espaces patrimoine">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Espaces patrimoine">
      <div className="space-y-8 max-w-5xl animate-fade-in">
        <div className="page-header">
          <div>
            <h2 className="page-header-title">Mes espaces patrimoine</h2>
            <p className="page-header-subtitle">
              Organisez vos biens par structure familiale ou juridique.
            </p>
          </div>
          <CreateFamilyDialog onCreated={fetchSpaces} />
        </div>

        {spaces.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-xl text-foreground mb-2">Aucun espace patrimoine</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Créez votre premier espace pour regrouper vos biens immobiliers.
              </p>
              <CreateFamilyDialog onCreated={fetchSpaces} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {spaces.map((space) => {
              const config = SPACE_TYPE_CONFIG[space.type] || SPACE_TYPE_CONFIG.family;
              const Icon = config.icon;
              return (
                <Card
                  key={space.id}
                  className="border-border/50 shadow-soft hover:shadow-card transition-all duration-200 cursor-pointer group"
                  onClick={() => navigate(`/spaces/${space.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base font-display flex items-center gap-2 group-hover:text-primary transition-colors">
                        <Icon className="h-4 w-4 text-primary" />
                        {space.name}
                      </CardTitle>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs border-0 ${config.color}`}>
                        {config.label}
                      </Badge>
                      {space.ownership_enabled && (
                        <Badge variant="outline" className="text-xs">
                          Quotes-parts
                        </Badge>
                      )}
                    </div>

                    {space.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{space.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {space.houseCount} maison{space.houseCount !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {space.memberCount} membre{space.memberCount !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <Badge variant={space.userRole === "admin" ? "default" : "secondary"} className="text-xs">
                      {space.userRole === "admin" ? "Admin" : space.userRole === "legal_representative" ? "Représentant légal" : "Membre"}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default PatrimonySpacesPage;
