import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { History, Plus, Home, Wrench, ArrowRightLeft, Heart, Star, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface HouseTimelineProps {
  houseId: string;
  isAdmin: boolean;
}

interface HistoryEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string;
  photo_url: string | null;
  created_by: string;
}

const EVENT_TYPES: Record<string, { label: string; icon: typeof Home; color: string }> = {
  purchase: { label: "Achat", icon: Home, color: "text-primary" },
  renovation: { label: "Travaux", icon: Wrench, color: "text-accent" },
  transmission: { label: "Transmission", icon: ArrowRightLeft, color: "text-chart-1" },
  heritage: { label: "Héritage", icon: Star, color: "text-chart-2" },
  family_event: { label: "Événement familial", icon: Heart, color: "text-lavender" },
  other: { label: "Autre", icon: History, color: "text-muted-foreground" },
};

const HouseTimeline = ({ houseId, isAdmin }: HouseTimelineProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("other");

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from("house_history_events")
      .select("*")
      .eq("house_id", houseId)
      .order("event_date", { ascending: false });
    setEvents((data || []) as HistoryEvent[]);
    setLoading(false);
  }, [houseId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleCreate = async () => {
    if (!title.trim() || !eventDate || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("house_history_events").insert({
      house_id: houseId,
      created_by: user.id,
      title: title.trim(),
      description: description.trim() || null,
      event_date: eventDate,
      event_type: eventType,
    } as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Événement ajouté !" });
      setTitle(""); setDescription(""); setEventDate(""); setEventType("other");
      setDialogOpen(false);
      fetchEvents();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("house_history_events").delete().eq("id", id);
    fetchEvents();
  };

  if (loading) return <div className="animate-pulse text-muted-foreground text-sm p-4">Chargement...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg text-foreground">Histoire de la maison</h3>
          {events.length > 0 && <Badge variant="secondary" className="text-xs">{events.length}</Badge>}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajouter un événement historique</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Titre</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Achat de la maison" maxLength={200} />
              </div>
              <div className="space-y-2">
                <Label>Description (optionnel)</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(EVENT_TYPES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreate} disabled={!title.trim() || !eventDate || submitting} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Ajouter l'événement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-display text-lg text-foreground mb-1">Aucun événement</h3>
            <p className="text-sm text-muted-foreground">Retracez l'histoire de votre maison : achat, travaux, transmissions...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative border-l-2 border-border ml-4 space-y-6">
          {events.map((event) => {
            const cfg = EVENT_TYPES[event.event_type] || EVENT_TYPES.other;
            const Icon = cfg.icon;
            return (
              <div key={event.id} className="relative pl-8">
                <div className={`absolute -left-[13px] top-1 h-6 w-6 rounded-full border-2 border-background bg-card flex items-center justify-center shadow-soft`}>
                  <Icon className={`h-3 w-3 ${cfg.color}`} />
                </div>
                <Card className="border-border/50 shadow-soft">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-display text-sm text-foreground">{event.title}</h4>
                          <Badge variant="outline" className="text-[10px]">{cfg.label}</Badge>
                        </div>
                        {event.description && (
                          <p className="text-xs text-muted-foreground">{event.description}</p>
                        )}
                      </div>
                      {(isAdmin || event.created_by === user?.id) && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => handleDelete(event.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                    {event.photo_url && (
                      <img src={event.photo_url} alt={event.title} className="rounded-lg max-h-40 object-cover w-full" />
                    )}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.event_date), "d MMMM yyyy", { locale: fr })}
                    </p>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HouseTimeline;
