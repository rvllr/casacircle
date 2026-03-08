import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, AlertTriangle, Clock, CheckCircle2, Building2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "resolved";
  priority: "low" | "medium" | "high" | "urgent";
  created_at: string;
  created_by: string;
  house_id: string;
  house_name?: string;
  creator_name?: string;
}

const statusConfig = {
  open: { label: "Ouvert", icon: AlertTriangle, color: "bg-destructive/15 text-destructive border-destructive/30" },
  in_progress: { label: "En cours", icon: Clock, color: "bg-primary/15 text-primary border-primary/30" },
  resolved: { label: "Résolu", icon: CheckCircle2, color: "bg-accent/15 text-accent-foreground border-accent/30" },
};

const MaintenancePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [adminHouseIds, setAdminHouseIds] = useState<string[]>([]);

  const fetchTickets = async () => {
    if (!user) return;
    setLoading(true);

    // Get all tickets from houses user is member of
    const { data, error } = await supabase
      .from("maintenance_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setTickets([]);
      setLoading(false);
      return;
    }

    // Get house names
    const houseIds = [...new Set(data.map((t) => t.house_id))];
    const { data: houses } = await supabase
      .from("houses")
      .select("id, name")
      .in("id", houseIds);

    // Get creator profiles
    const creatorIds = [...new Set(data.map((t) => t.created_by))];
    const { data: profiles } = await supabase
      .from("users_profiles")
      .select("user_id, first_name, last_name, email")
      .in("user_id", creatorIds);

    // Check admin status
    const { data: memberRows } = await supabase
      .from("house_members")
      .select("house_id, role")
      .eq("user_id", user.id)
      .in("role", ["admin", "owner"]);

    setAdminHouseIds((memberRows || []).map((m) => m.house_id));

    const houseMap = Object.fromEntries((houses || []).map((h) => [h.id, h.name]));
    const profileMap = Object.fromEntries(
      (profiles || []).map((p) => [
        p.user_id,
        [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Membre",
      ])
    );

    setTickets(
      data.map((t) => ({
        ...t,
        status: t.status as Ticket["status"],
        priority: (t as any).priority as Ticket["priority"] || "medium",
        house_name: houseMap[t.house_id] || "Maison",
        creator_name: profileMap[t.created_by] || "Membre",
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const updateStatus = async (ticketId: string, newStatus: string) => {
    const { error } = await supabase
      .from("maintenance_tickets")
      .update({ status: newStatus as "open" | "in_progress" | "resolved" })
      .eq("id", ticketId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Statut mis à jour" });
      fetchTickets();
    }
  };

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);

  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  return (
    <AppLayout title="Maintenance">
      <div className="max-w-5xl space-y-6 animate-fade-in">
        <div>
          <h2 className="page-header-title flex items-center gap-3">
            <Wrench className="h-6 w-6 text-primary" />
            Maintenance
          </h2>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: "all", label: "Tous", count: counts.all, icon: Wrench },
            { key: "open", label: "Ouverts", count: counts.open, icon: AlertTriangle },
            { key: "in_progress", label: "En cours", count: counts.in_progress, icon: Clock },
            { key: "resolved", label: "Résolus", count: counts.resolved, icon: CheckCircle2 },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                filter === s.key ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <s.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-display text-foreground mt-1">{s.count}</p>
            </button>
          ))}
        </div>

        {/* Tickets */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wrench className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun signalement {filter !== "all" ? "dans cette catégorie" : ""}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((ticket) => {
              const cfg = statusConfig[ticket.status];
              const StatusIcon = cfg.icon;
              const isAdmin = adminHouseIds.includes(ticket.house_id);

              return (
                <Card key={ticket.id} className="overflow-hidden">
                  <CardContent className="p-4 sm:flex sm:items-start sm:justify-between gap-4">
                     <div className="flex-1 space-y-1.5">
                      <div className="flex items-start gap-2 flex-wrap">
                        <h3 className="font-medium text-foreground">{ticket.title}</h3>
                        <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {cfg.label}
                        </Badge>
                        {ticket.priority && ticket.priority !== "medium" && (
                          <Badge variant="outline" className={`text-xs ${
                            ticket.priority === "urgent" ? "bg-destructive/15 text-destructive border-destructive/30" :
                            ticket.priority === "high" ? "bg-primary/15 text-primary border-primary/30" :
                            "bg-muted text-muted-foreground border-border"
                          }`}>
                            {ticket.priority === "urgent" ? "🔴 Urgent" : ticket.priority === "high" ? "🟠 Important" : "🟢 Faible"}
                          </Badge>
                        )}
                      </div>
                      {ticket.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <button
                            className="hover:underline hover:text-foreground"
                            onClick={() => navigate(`/houses/${ticket.house_id}`)}
                          >
                            {ticket.house_name}
                          </button>
                        </span>
                        <span>par {ticket.creator_name}</span>
                        <span>{format(new Date(ticket.created_at), "d MMM yyyy", { locale: fr })}</span>
                      </div>
                    </div>

                    {isAdmin && ticket.status !== "resolved" && (
                      <div className="mt-3 sm:mt-0 flex gap-2 shrink-0">
                        {ticket.status === "open" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(ticket.id, "in_progress")}
                          >
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            En cours
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => updateStatus(ticket.id, "resolved")}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Résolu
                        </Button>
                      </div>
                    )}
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

export default MaintenancePage;
