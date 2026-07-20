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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Trash2, GripVertical, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { friendlyError } from "@/lib/errorMessages";

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

const defaultCategories: Record<string, string[]> = {
  arrival: ["🔑 Clés & accès", "⚡ Énergie", "📶 Internet", "🛏️ Linge & confort", "🍳 Cuisine", "📋 Autre"],
  departure: ["🧹 Ménage", "⚡ Énergie", "🔑 Clés & accès", "🗑️ Déchets", "📋 Autre"],
  rules: ["🔇 Bruit", "🐾 Animaux", "🏠 Maison", "📋 Autre"],
  practical_info: ["🏪 Commerces", "🏥 Santé", "🏖️ Loisirs", "🚗 Transport", "📋 Autre"],
};

interface GuideItem {
  category: string;
  text: string;
}

/** Parse structured content: "[Category] • text" per line */
function parseContent(content: string | null | undefined): GuideItem[] {
  if (!content || !content.trim()) return [];
  return content.split("\n").map((line) => {
    const match = line.match(/^\[(.+?)\]\s*•?\s*(.+)$/);
    if (match) return { category: match[1], text: match[2].trim() };
    // Legacy format: plain bullet
    const text = line.replace(/^[\s•\-*·]+/, "").trim();
    if (text) return { category: "📋 Autre", text };
    return null;
  }).filter(Boolean) as GuideItem[];
}

/** Serialize items back to structured text */
function serializeContent(items: GuideItem[]): string {
  return items.map((item) => `[${item.category}] • ${item.text}`).join("\n");
}

/** Group items by category, preserving order */
function groupByCategory(items: GuideItem[]): Map<string, GuideItem[]> {
  const map = new Map<string, GuideItem[]>();
  for (const item of items) {
    if (!map.has(item.category)) map.set(item.category, []);
    map.get(item.category)!.push(item);
  }
  return map;
}

const typeExamples: Record<string, GuideItem[]> = {
  arrival: [
    { category: "🔑 Clés & accès", text: "Code du portail : 1234" },
    { category: "🔑 Clés & accès", text: "Les clés sont dans la boîte à lettres" },
    { category: "📶 Internet", text: "Wi-Fi : MaisonBretagne / mdp123" },
    { category: "🛏️ Linge & confort", text: "Draps et serviettes dans le placard de l'entrée" },
    { category: "⚡ Énergie", text: "Allumer le chauffe-eau en arrivant" },
  ],
  departure: [
    { category: "🗑️ Déchets", text: "Vider les poubelles (tri sélectif)" },
    { category: "🧹 Ménage", text: "Lancer une machine si draps utilisés" },
    { category: "⚡ Énergie", text: "Fermer les volets et les fenêtres" },
    { category: "🔑 Clés & accès", text: "Remettre les clés dans la boîte" },
  ],
  rules: [
    { category: "🔇 Bruit", text: "Pas de fête après 22h" },
    { category: "🐾 Animaux", text: "Animaux acceptés sous conditions" },
    { category: "🏠 Maison", text: "Merci de respecter le voisinage" },
  ],
  practical_info: [
    { category: "🏪 Commerces", text: "Supermarché le plus proche : 2km" },
    { category: "🏥 Santé", text: "Médecin : Dr. Dupont, 02 99 XX XX XX" },
    { category: "🏖️ Loisirs", text: "Plage à 500m à pied" },
  ],
};

const HouseGuideEditor = ({ houseId, type, guide, onSaved }: HouseGuideEditorProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(guide?.title || typeLabels[type]);
  const [items, setItems] = useState<GuideItem[]>(() => parseContent(guide?.content));
  const [newItem, setNewItem] = useState("");
  const [newCategory, setNewCategory] = useState(defaultCategories[type]?.[0] || "📋 Autre");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const categories = defaultCategories[type] || ["📋 Autre"];

  const handleOpen = useCallback((isOpen: boolean) => {
    if (isOpen) {
      setTitle(guide?.title || typeLabels[type]);
      setItems(parseContent(guide?.content));
      setNewItem("");
      setNewCategory(categories[0]);
    }
    setOpen(isOpen);
  }, [guide, type, categories]);

  const addItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    setItems((prev) => [...prev, { category: newCategory, text: trimmed }]);
    setNewItem("");
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, text: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, text } : item)));
  };

  const updateItemCategory = (index: number, category: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, category } : item)));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const content = serializeContent(items);

    if (guide) {
      const { error } = await supabase
        .from("house_guides")
        .update({ title: title.trim(), content })
        .eq("id", guide.id);
      if (error) {
        toast({ title: "Erreur", description: friendlyError(error), variant: "destructive" });
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("house_guides")
        .insert({ house_id: houseId, type, title: title.trim(), content });
      if (error) {
        toast({ title: "Erreur", description: friendlyError(error), variant: "destructive" });
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
  const grouped = groupByCategory(items);

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
            Organisez les éléments par catégorie pour plus de clarté.
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

          {/* Items grouped by category */}
          <div className="space-y-3">
            <Label>Éléments par catégorie</Label>
            {items.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-2">
                Aucun élément. Ajoutez-en ci-dessous ou utilisez les suggestions.
              </p>
            )}
            {Array.from(grouped.entries()).map(([cat, catItems]) => (
              <div key={cat} className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">{cat}</p>
                {catItems.map((item) => {
                  const globalIndex = items.indexOf(item);
                  return (
                    <div key={globalIndex} className="flex items-center gap-1.5 group pl-3">
                      <span className="text-muted-foreground text-xs shrink-0">•</span>
                      <Input
                        value={item.text}
                        onChange={(e) => updateItem(globalIndex, e.target.value)}
                        className="h-8 text-sm flex-1"
                      />
                      <select
                        value={item.category}
                        onChange={(e) => updateItemCategory(globalIndex, e.target.value)}
                        className="h-8 text-xs border border-border rounded-md px-1.5 bg-background text-foreground shrink-0 max-w-[120px]"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeItem(globalIndex)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Add new item */}
          <div className="space-y-2">
            <Label>Ajouter un élément</Label>
            <div className="flex gap-2">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="h-9 text-xs border border-border rounded-md px-2 bg-background text-foreground shrink-0"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
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
                {examples.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setItems((prev) => [...prev, ex])}
                    className="text-xs px-2.5 py-1.5 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    + {ex.text.length > 28 ? ex.text.slice(0, 28) + "…" : ex.text}
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

/** Parse content for display - exported for use in GuideCard */
export { parseContent, groupByCategory };
export type { GuideItem };

export default HouseGuideEditor;
