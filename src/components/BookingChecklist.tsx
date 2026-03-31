import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ClipboardCheck, LogIn, LogOut, CheckCircle2, AlertCircle, Clock, Wrench,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BookingChecklistProps {
  bookingId: string;
  houseId: string;
  members?: { user_id: string; profile?: { first_name: string | null; last_name: string | null; email: string | null } }[];
  onCreateTicket?: (label: string) => void;
}

interface Checklist {
  id: string;
  type: string;
  title: string;
}

interface ChecklistItem {
  id: string;
  checklist_id: string;
  label: string;
  is_required: boolean;
  order_index: number;
}

interface CompletionStatus {
  id: string;
  checklist_item_id: string;
  completed_by_user_id: string;
  completed_at: string;
}

const BookingChecklist = ({ bookingId, houseId, members, onCreateTicket }: BookingChecklistProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [statuses, setStatuses] = useState<CompletionStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const getName = useCallback((userId: string) => {
    const m = members?.find((m) => m.user_id === userId);
    if (!m?.profile) return "Membre";
    return [m.profile.first_name, m.profile.last_name].filter(Boolean).join(" ") || "Membre";
  }, [members]);

  const fetchAll = useCallback(async () => {
    const [{ data: cl }, { data: it }, { data: st }] = await Promise.all([
      supabase.from("house_checklists").select("id, type, title").eq("house_id", houseId).order("order_index"),
      supabase.from("checklist_items").select("*").order("order_index"),
      supabase.from("reservation_checklist_status").select("*").eq("reservation_id", bookingId),
    ]);
    setChecklists((cl || []) as Checklist[]);
    setItems((it || []) as ChecklistItem[]);
    setStatuses((st || []) as CompletionStatus[]);
    setLoading(false);
  }, [houseId, bookingId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleItem = async (itemId: string) => {
    if (!user) return;
    const existing = statuses.find(s => s.checklist_item_id === itemId);
    if (existing) {
      await supabase.from("reservation_checklist_status").delete().eq("id", existing.id);
    } else {
      await supabase.from("reservation_checklist_status").insert({
        reservation_id: bookingId,
        checklist_item_id: itemId,
        completed_by_user_id: user.id,
      } as any);
    }
    fetchAll();
  };

  if (loading) return <div className="animate-pulse text-muted-foreground text-sm p-4">Chargement...</div>;
  if (checklists.length === 0) return null;

  const renderSection = (cl: Checklist) => {
    const Icon = cl.type === "arrival" ? LogIn : LogOut;
    const clItems = items.filter(i => i.checklist_id === cl.id).sort((a, b) => a.order_index - b.order_index);
    if (clItems.length === 0) return null;

    const completed = clItems.filter(i => statuses.some(s => s.checklist_item_id === i.id)).length;
    const total = clItems.length;
    const pct = total > 0 ? (completed / total) * 100 : 0;
    const allDone = completed === total;
    const requiredPending = clItems.filter(i => i.is_required && !statuses.some(s => s.checklist_item_id === i.id));

    return (
      <Card key={cl.id} className="border-border/50 shadow-soft">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <h4 className="font-display text-sm text-foreground">{cl.title}</h4>
            </div>
            <Badge
              variant={allDone ? "default" : "secondary"}
              className={`text-xs ${allDone ? "bg-accent text-accent-foreground" : ""}`}
            >
              {allDone ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" />Complétée</>
              ) : (
                <>{completed} / {total}</>
              )}
            </Badge>
          </div>

          <Progress value={pct} className="h-2" />

          {requiredPending.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-destructive">
              <AlertCircle className="h-3 w-3" />
              {requiredPending.length} tâche{requiredPending.length > 1 ? "s" : ""} obligatoire{requiredPending.length > 1 ? "s" : ""} restante{requiredPending.length > 1 ? "s" : ""}
            </div>
          )}

          <div className="space-y-1">
            {clItems.map((item) => {
              const status = statuses.find(s => s.checklist_item_id === item.id);
              const isDone = !!status;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                    isDone
                      ? "bg-accent/5 border-accent/20"
                      : "bg-card border-border/50 hover:bg-muted/30"
                  }`}
                  onClick={() => toggleItem(item.id)}
                >
                  <Checkbox checked={isDone} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {item.label}
                    </span>
                    {item.is_required && !isDone && (
                      <span className="ml-2 text-[9px] text-destructive font-medium">OBLIGATOIRE</span>
                    )}
                    {isDone && status && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {getName(status.completed_by_user_id)} · {format(new Date(status.completed_at), "d MMM HH:mm", { locale: fr })}
                      </p>
                    )}
                  </div>
                  {!isDone && onCreateTicket && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={(e) => { e.stopPropagation(); onCreateTicket(item.label); }}
                      title="Signaler un problème"
                    >
                      <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg text-foreground">Checklists du séjour</h3>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {checklists.map(cl => renderSection(cl))}
      </div>
    </div>
  );
};

export default BookingChecklist;

export const ChecklistSummaryBadge = ({
  bookingId, houseId,
}: { bookingId: string; houseId: string }) => {
  const [summary, setSummary] = useState<{ total: number; completed: number } | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: cls }, { data: statuses }] = await Promise.all([
        supabase.from("house_checklists").select("id").eq("house_id", houseId),
        supabase.from("reservation_checklist_status").select("id").eq("reservation_id", bookingId),
      ]);
      if (!cls || cls.length === 0) return;
      const clIds = cls.map((c: any) => c.id);
      const { count } = await supabase
        .from("checklist_items")
        .select("id", { count: "exact", head: true })
        .in("checklist_id", clIds);
      setSummary({ total: count || 0, completed: (statuses || []).length });
    };
    fetch();
  }, [bookingId, houseId]);

  if (!summary || summary.total === 0) return null;

  const allDone = summary.completed >= summary.total;
  return (
    <Badge
      variant={allDone ? "default" : "outline"}
      className={`text-[10px] ${allDone ? "bg-accent text-accent-foreground" : "border-warning text-warning"}`}
    >
      {allDone ? (
        <><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Checklist ✓</>
      ) : (
        <><AlertCircle className="h-2.5 w-2.5 mr-0.5" />{summary.completed}/{summary.total}</>
      )}
    </Badge>
  );
};
