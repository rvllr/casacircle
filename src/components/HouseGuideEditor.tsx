import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { Pencil, Plus } from "lucide-react";

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

const typePlaceholders = {
  arrival: "Ex :\n• Code du portail : 1234\n• Les clés sont dans la boîte à lettres\n• Le Wi-Fi : MaisonBretagne / mdp123\n• Draps et serviettes dans le placard de l'entrée",
  departure: "Ex :\n• Vider les poubelles (tri sélectif)\n• Lancer une machine si draps utilisés\n• Fermer les volets et les fenêtres\n• Remettre les clés dans la boîte",
  rules: "Ex :\n• Pas de fête après 22h\n• Animaux acceptés sous conditions\n• Merci de respecter le voisinage",
  practical_info: "Ex :\n• Supermarché le plus proche : 2km\n• Médecin : Dr. Dupont, 02 99 XX XX XX\n• Plage à 500m à pied",
};

const HouseGuideEditor = ({ houseId, type, guide, onSaved }: HouseGuideEditorProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(guide?.title || typeLabels[type]);
  const [content, setContent] = useState(guide?.content || "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (guide) {
      const { error } = await supabase
        .from("house_guides")
        .update({ title: title.trim(), content: content.trim() })
        .eq("id", guide.id);

      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("house_guides")
        .insert({
          house_id: houseId,
          type,
          title: title.trim(),
          content: content.trim(),
        });

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs gap-1">
          {guide ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {guide ? "Modifier" : "Ajouter"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{typeLabels[type]}</DialogTitle>
          <DialogDescription>
            Ajoutez les informations utiles pour les occupants.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="guideTitle">Titre</Label>
            <Input
              id="guideTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guideContent">Contenu</Label>
            <Textarea
              id="guideContent"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={typePlaceholders[type]}
              rows={10}
              className="font-mono text-sm"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default HouseGuideEditor;
