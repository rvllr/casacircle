import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ClipboardCheck, Plus, Trash2, GripVertical, LogIn, LogOut, Loader2, AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChecklistConfigProps {
  houseId: string;
  isAdmin: boolean;
}

interface Checklist {
  id: string;
  type: string;
  title: string;
  description: string | null;
  order_index: number;
}

interface ChecklistItem {
  id: string;
  checklist_id: string;
  label: string;
  is_required: boolean;
  order_index: number;
}

const DEFAULT_ARRIVAL = [
  "Ouvrir les volets",
  "Activer le chauffe-eau",
  "Vérifier le WiFi",
  "Sortir les poubelles si besoin",
  "Vérifier l'état général",
];

const DEFAULT_DEPARTURE = [
  "Fermer tous les volets",
  "Couper le chauffe-eau",
  "Sortir les poubelles",
  "Lancer le lave-vaisselle",
  "Éteindre le chauffage",
  "Verrouiller toutes les portes",
  "Nettoyer les surfaces de cuisine",
];

const ChecklistConfig = ({ houseId, isAdmin }: ChecklistConfigProps) => {
  const { toast } = useToast();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemLabel, setNewItemLabel] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    const [{ data: cl, error: clError }, { data: it }] = await Promise.all([
      supabase.from("house_checklists").select("*").eq("house_id", houseId).order("order_index"),
      supabase.from("checklist_items").select("*").order("order_index"),
    ]);
    if (clError) {
      toast({ title: "Erreur de chargement", description: "Impossible de récupérer les checklists.", variant: "destructive" });
    }
    setChecklists((cl || []) as Checklist[]);
    setItems((it || []) as ChecklistItem[]);
    setLoading(false);
  }, [houseId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const initDefaults = async (type: "arrival" | "departure") => {
    setSubmitting(true);
    const title = type === "arrival" ? "Checklist arrivée" : "Checklist départ";
    const defaults = type === "arrival" ? DEFAULT_ARRIVAL : DEFAULT_DEPARTURE;

    const { data: cl, error } = await supabase
      .from("house_checklists")
      .insert({ house_id: houseId, type, title, order_index: type === "arrival" ? 0 : 1 } as any)
      .select()
      .single();

    if (error || !cl) {
      toast({ title: "Erreur", description: error?.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const itemRows = defaults.map((label, i) => ({
      checklist_id: (cl as any).id,
      label,
      is_required: false,
      order_index: i,
    }));

    await supabase.from("checklist_items").insert(itemRows as any);
    toast({ title: `${title} créée avec ${defaults.length} items par défaut` });
    setSubmitting(false);
    fetchAll();
  };

  const addItem = async (checklistId: string) => {
    const label = newItemLabel[checklistId]?.trim();
    if (!label) return;
    const maxOrder = items.filter(i => i.checklist_id === checklistId).reduce((m, i) => Math.max(m, i.order_index), -1);
    await supabase.from("checklist_items").insert({
      checklist_id: checklistId, label, is_required: false, order_index: maxOrder + 1,
    } as any);
    setNewItemLabel(p => ({ ...p, [checklistId]: "" }));
    fetchAll();
  };

  const toggleRequired = async (itemId: string, current: boolean) => {
    await supabase.from("checklist_items").update({ is_required: !current } as any).eq("id", itemId);
    fetchAll();
  };

  const deleteItem = async (itemId: string) => {
    await supabase.from("checklist_items").delete().eq("id", itemId);
    fetchAll();
  };

  const deleteChecklist = async (clId: string) => {
    await supabase.from("house_checklists").delete().eq("id", clId);
    fetchAll();
  };

  if (loading) return <div className="animate-pulse text-muted-foreground text-sm p-4">Chargement...</div>;

  const arrivalCl = checklists.find(c => c.type === "arrival");
  const departureCl = checklists.find(c => c.type === "departure");

  const renderChecklist = (cl: Checklist | undefined, type: "arrival" | "departure") => {
    const Icon = type === "arrival" ? LogIn : LogOut;
    const label = type === "arrival" ? "Arrivée" : "Départ";
    const clItems = cl ? items.filter(i => i.checklist_id === cl.id).sort((a, b) => a.order_index - b.order_index) : [];

    if (!cl) {
      return (
        <Card className="border-border/50 shadow-soft">
          <CardContent className="py-8 text-center space-y-3">
            <Icon className="h-8 w-8 text-muted-foreground mx-auto" />
            <h4 className="font-display text-sm text-foreground">Checklist {label}</h4>
            <p className="text-xs text-muted-foreground">Aucune checklist configurée.</p>
            {isAdmin && (
              <Button size="sm" onClick={() => initDefaults(type)} disabled={submitting}>
                {submitting && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                <Plus className="h-3.5 w-3.5 mr-1" />Créer avec valeurs par défaut
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-border/50 shadow-soft">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <h4 className="font-display text-sm text-foreground">{cl.title}</h4>
              <Badge variant="secondary" className="text-[10px]">{clItems.length} items</Badge>
            </div>
            {isAdmin && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteChecklist(cl.id)}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            {clItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/30">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                <span className="text-sm text-foreground flex-1">{item.label}</span>
                {item.is_required && (
                  <Badge variant="outline" className="text-[9px] border-destructive/50 text-destructive shrink-0">
                    <AlertCircle className="h-2.5 w-2.5 mr-0.5" />Obligatoire
                  </Badge>
                )}
                {isAdmin && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={item.is_required}
                        onCheckedChange={() => toggleRequired(item.id, item.is_required)}
                        className="scale-75"
                      />
                      <span className="text-[9px] text-muted-foreground">Requis</span>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteItem(item.id)}>
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {isAdmin && (
            <div className="flex gap-2">
              <Input
                value={newItemLabel[cl.id] || ""}
                onChange={(e) => setNewItemLabel(p => ({ ...p, [cl.id]: e.target.value }))}
                placeholder="Ajouter un item..."
                className="text-sm h-8"
                onKeyDown={(e) => e.key === "Enter" && addItem(cl.id)}
              />
              <Button size="sm" className="h-8 shrink-0" onClick={() => addItem(cl.id)} disabled={!newItemLabel[cl.id]?.trim()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg text-foreground">Checklists séjour</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Configurez les tâches à réaliser à l'arrivée et au départ. Elles seront associées à chaque réservation validée.
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        {renderChecklist(arrivalCl, "arrival")}
        {renderChecklist(departureCl, "departure")}
      </div>
    </div>
  );
};

export default ChecklistConfig;
