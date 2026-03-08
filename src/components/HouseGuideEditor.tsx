import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Trash2, GripVertical } from "lucide-react";

interface HouseGuideEditorProps {
  houseId: string;
  type: "arrival" | "departure" | "rules" | "practical_info";
  guide?: {
    id: string;
    title: string;
    content: string | null;
  };
  onSaved: () => void;
}

const typeLabels = {
  arrival: "Kit d'arrivée",
  departure: "Kit de départ",
  rules: "Règles de la maison",
  practical_info: "Infos pratiques",
};

const typeExamples: Record<string, string[]> = {
  arrival: [
    "Code du portail : 1234",
    "Les clés sont dans la boîte à lettres",
    "Wi-Fi : MaisonBretagne / mdp123",
    "Draps et serviettes dans le placard de l'entrée",
  ],
  departure: [
    "Vider les poubelles (tri sélectif)",
    "Lancer une machine si draps utilisés",
    "Fermer les volets et les fenêtres",
    "Remettre les clés dans la boîte",
  ],
  rules: [
    "Pas de fête après 22h",
    "Animaux acceptés sous conditions",
    "Merci de respecter le voisinage",
  ],
  practical_info: [
    "Supermarché le plus proche : 2km",
    "Médecin : Dr. Dupont, 02 99 XX XX XX",
    "Plage à 500m à pied",
  ],
};

/** Parse bullet-point text content into an array of items */
function parseContentToItems(content: string | null | undefined): string[] {
  if (!content || !content.trim()) return [];
  return content
    .split("\n")
    .map((line) => line.replace(/^[\s•\-\*·]+/, "").trim())
    .filter(Boolean);
}

/** Serialize items back to bullet-point text */
function itemsToContent(items: string[]): string {
  return items.map((item) => `• ${item}`).join("\n");
}

const HouseGuideEditor = ({ houseId, type, guide, onSaved }: HouseGuideEditorProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(guide?.title || typeLabels[type]);
  const [items, setItems] = useState<string[]>(() => parseContentToItems(guide?.content));
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleOpen = useCallback((isOpen: boolean) => {
    if (isOpen) {
      setTitle(guide?.title || typeLabels[type]);
      setItems(parseContentToItems(guide?.content));
      setNewItem("");
    }
    setOpen(isOpen);
  }, [guide, type]);

  const addItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    setItems((prev) => [...prev, trimmed]);
    setNewItem("");
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    setItems((prev) => {
      const arr = [...prev];
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return arr;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const content = itemsToContent(items);

    if (guide) {
      const { error } = await supabase
        .from("house_guides")
        .update({ title: title.trim(), content })
        .eq("id", guide.id);

      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("house_guides")
        .insert({ house_id: houseId, type, title: title.trim(), content });

      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
    }

    toast({ title: "Enregistré !" });
    setOpen(false);
    setLoading(false);
    onSaved();
  };

  const examples = typeExamples[type] || [];

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs gap-1">
          {guide ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {guide ? "Modifier" : "Ajouter"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{typeLabels[type]}</DialogTitle>
          <DialogDescription>
            Ajoutez les éléments un par un pour constituer votre checklist.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label htmlFor="guideTitle">Titre</Label>
            <Input
              id="guideTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Items list */}
          <div className="space-y-2">
            <Label>Éléments de la checklist</Label>
            {items.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-2">
                Aucun élément. Ajoutez-en ci-dessous ou utilisez les suggestions.
              </p>
            )}
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2 group">
                  <div className="flex flex-col -space-y-1">
                    <button
                      type="button"
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                    >
                      <GripVertical className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-muted-foreground text-sm shrink-0">•</span>
                  <Input
                    value={item}
                    onChange={(e) => updateItem(index, e.target.value)}
                    className="h-8 text-sm flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add new item */}
            <div className="flex gap-2 pt-1">
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Nouvel élément…"
                className="h-9 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem();
                  }
                }}
              />
              <Button type="button" variant="secondary" size="sm" onClick={addItem} className="h-9 px-3">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Suggestions */}
          {items.length === 0 && examples.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Suggestions</Label>
              <div className="flex flex-wrap gap-1.5">
                {examples.map((example, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setItems((prev) => [...prev, example])}
                    className="text-xs px-2.5 py-1.5 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    + {example.length > 30 ? example.slice(0, 30) + "…" : example}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setItems(examples)}
                  className="text-xs px-2.5 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors font-medium"
                >
                  Tout ajouter
                </button>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading || items.length === 0}>
            {loading ? "Enregistrement..." : `Enregistrer (${items.length} élément${items.length > 1 ? "s" : ""})`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default HouseGuideEditor;
