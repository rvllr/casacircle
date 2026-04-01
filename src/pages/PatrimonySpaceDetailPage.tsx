import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { DEMO_FAMILY, DEMO_HOUSES_FULL, DEMO_FAMILY_MEMBERS, DEMO_ALL_EXPENSES, DEMO_ALL_BOOKINGS } from "@/lib/demoData";
import AppLayout from "@/components/AppLayout";
import CreateHouseDialog from "@/components/CreateHouseDialog";
import InviteMemberDialog from "@/components/InviteMemberDialog";
import SpaceDocuments from "@/components/SpaceDocuments";
import SpaceVotes from "@/components/SpaceVotes";
import SpaceSubscriptionTab from "@/components/SpaceSubscriptionTab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, Users, ArrowLeft, Crown, User, MapPin,
  Wallet, AlertTriangle, Scale,
  ChevronRight, FileText, Vote, CreditCard,
} from "lucide-react";

const SPACE_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  family: { label: "Famille", color: "bg-primary/10 text-primary" },
  indivision: { label: "Indivision", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  sci: { label: "SCI", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  personal: { label: "Personnel", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  multi_family: { label: "Multi-familles", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
};

interface SpaceData {
  id: string;
  name: string;
  type: string;
  description: string | null;
  ownership_enabled: boolean;
  created_by: string;
}

interface SpaceHouse {
  id: string;
  name: string;
  location: string | null;
  capacity: number | null;
}

interface SpaceMember {
  id: string;
  user_id: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

const PatrimonySpaceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const navigate = useNavigate();
  const [space, setSpace] = useState<SpaceData | null>(null);
  const [houses, setHouses] = useState<SpaceHouse[]>([]);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalExpenses: 0, totalBookings: 0, openTickets: 0 });

  const fetchData = useCallback(async () => {
    if (isDemo && id === "demo-family") {
      setSpace({
        id: DEMO_FAMILY.id,
        name: DEMO_FAMILY.name,
        type: DEMO_FAMILY.type,
        description: DEMO_FAMILY.description,
        ownership_enabled: DEMO_FAMILY.ownership_enabled,
        created_by: DEMO_FAMILY.created_by,
      });
      setHouses(DEMO_HOUSES_FULL.map((h) => ({ id: h.id, name: h.name, location: h.location, capacity: h.capacity })));
      setMembers(DEMO_FAMILY_MEMBERS.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        first_name: m.users_profiles.first_name,
        last_name: m.users_profiles.last_name,
        email: m.users_profiles.email,
      })));
      setIsAdmin(true);
      setStats({
        totalExpenses: DEMO_ALL_EXPENSES.reduce((s, e) => s + e.amount, 0),
        totalBookings: DEMO_ALL_BOOKINGS.length,
        openTickets: 1,
      });
      setLoading(false);
      return;
    }

    if (!user || !id) return;
    setLoading(true);

    // Fetch space
    const { data: spaceData } = await supabase
      .from("families")
      .select("id, name, created_by, type, description, ownership_enabled")
      .eq("id", id)
      .single();

    if (!spaceData) {
      navigate("/spaces");
      return;
    }

    setSpace({
      ...spaceData,
      type: (spaceData as any).type || "family",
      description: (spaceData as any).description || null,
      ownership_enabled: (spaceData as any).ownership_enabled || false,
    });

    // Check admin
    const { data: myMembership } = await supabase
      .from("family_members")
      .select("role")
      .eq("family_id", id)
      .eq("user_id", user.id)
      .single();

    setIsAdmin(myMembership?.role === "admin");

    // Fetch houses
    const { data: housesData } = await supabase
      .from("houses")
      .select("id, name, location, capacity")
      .eq("family_id", id);
    setHouses(housesData || []);

    // Fetch members with profiles
    const { data: membersData } = await supabase
      .from("family_members")
      .select("id, user_id, role")
      .eq("family_id", id);

    const memberUserIds = (membersData || []).map((m) => m.user_id);
    const { data: profiles } = memberUserIds.length > 0
      ? await supabase.from("users_profiles").select("user_id, first_name, last_name, email").in("user_id", memberUserIds)
      : { data: [] };
    const profMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));

    setMembers((membersData || []).map((m) => ({
      ...m,
      first_name: profMap[m.user_id]?.first_name || null,
      last_name: profMap[m.user_id]?.last_name || null,
      email: profMap[m.user_id]?.email || null,
    })));

    // Aggregate stats
    const houseIds = (housesData || []).map((h) => h.id);
    if (houseIds.length > 0) {
      const [{ data: expenses }, { data: bookings }, { data: tickets }] = await Promise.all([
        supabase.from("expenses").select("amount").in("house_id", houseIds),
        supabase.from("bookings").select("id").in("house_id", houseIds),
        supabase.from("maintenance_tickets").select("status").in("house_id", houseIds).neq("status", "resolved"),
      ]);
      setStats({
        totalExpenses: (expenses || []).reduce((s, e) => s + Number(e.amount), 0),
        totalBookings: (bookings || []).length,
        openTickets: (tickets || []).length,
      });
    }

    setLoading(false);
  }, [id, user, isDemo, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !space) {
    return (
      <AppLayout title="Espace patrimoine">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </div>
      </AppLayout>
    );
  }

  const typeConfig = SPACE_TYPE_CONFIG[space.type] || SPACE_TYPE_CONFIG.family;

  return (
    <AppLayout title={space.name}>
      <div className="max-w-5xl space-y-8 animate-fade-in">
        {/* Back + Header */}
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/spaces")} className="mb-4 -ml-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-display text-foreground">{space.name}</h1>
                <Badge className={`text-xs border-0 ${typeConfig.color}`}>{typeConfig.label}</Badge>
                {space.ownership_enabled && (
                  <Badge variant="outline" className="text-xs">Quotes-parts actives</Badge>
                )}
              </div>
              {space.description && (
                <p className="text-muted-foreground max-w-xl">{space.description}</p>
              )}
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                <CreateHouseDialog familyId={space.id} familyName={space.name} onCreated={fetchData} />
                <InviteMemberDialog familyId={space.id} familyName={space.name} onInvited={fetchData} />
              </div>
            )}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-border/50 shadow-soft">
            <CardContent className="p-4 text-center">
              <Building2 className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-display text-foreground">{houses.length}</p>
              <p className="text-xs text-muted-foreground">Maison{houses.length !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-soft">
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-display text-foreground">{members.length}</p>
              <p className="text-xs text-muted-foreground">Membre{members.length !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-soft">
            <CardContent className="p-4 text-center">
              <Wallet className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-display text-foreground">{stats.totalExpenses.toLocaleString("fr-FR")} €</p>
              <p className="text-xs text-muted-foreground">Dépenses totales</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-soft">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-5 w-5 text-destructive mx-auto mb-1" />
              <p className="text-2xl font-display text-foreground">{stats.openTickets}</p>
              <p className="text-xs text-muted-foreground">Ticket{stats.openTickets !== 1 ? "s" : ""} ouvert{stats.openTickets !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="houses" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="houses" className="gap-1.5">
              <Building2 className="h-4 w-4" /> Maisons
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-1.5">
              <Users className="h-4 w-4" /> Membres
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5">
              <FileText className="h-4 w-4" /> Documents
            </TabsTrigger>
            <TabsTrigger value="votes" className="gap-1.5">
              <Vote className="h-4 w-4" /> Votes
            </TabsTrigger>
            <TabsTrigger value="subscription" className="gap-1.5">
              <CreditCard className="h-4 w-4" /> Abonnement
            </TabsTrigger>
          </TabsList>

          <TabsContent value="houses" className="space-y-4">
            {houses.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm mb-4">Aucune maison dans cet espace.</p>
                  {isAdmin && <CreateHouseDialog familyId={space.id} familyName={space.name} onCreated={fetchData} />}
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {houses.map((house) => (
                  <Card
                    key={house.id}
                    className="border-border/50 shadow-soft hover:shadow-card transition-all cursor-pointer group"
                    onClick={() => navigate(`/houses/${house.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-display flex items-center justify-between group-hover:text-primary transition-colors">
                        <span className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          {house.name}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {house.location && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" /> {house.location}
                        </p>
                      )}
                      {house.capacity && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" /> {house.capacity} personnes
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map((member) => (
                <Card key={member.id} className="border-border/50 shadow-soft">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {member.role === "admin" ? (
                        <Crown className="h-4 w-4 text-primary" />
                      ) : member.role === "legal_representative" ? (
                        <Scale className="h-4 w-4 text-blue-600" />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {[member.first_name, member.last_name].filter(Boolean).join(" ") || member.email || "Membre"}
                      </p>
                      {member.email && (
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      )}
                    </div>
                    <Badge variant={member.role === "admin" ? "default" : "secondary"} className="text-xs shrink-0">
                      {member.role === "admin" ? "Admin" : member.role === "legal_representative" ? "Rep. légal" : "Membre"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <SpaceDocuments spaceId={space.id} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="votes">
            <SpaceVotes spaceId={space.id} isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default PatrimonySpaceDetailPage;
