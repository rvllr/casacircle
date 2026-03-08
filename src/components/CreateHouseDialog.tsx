import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface CreateHouseDialogProps {
  familyId: string;
  familyName: string;
  onCreated: () => void;
}

const CreateHouseDialog = ({ familyId, familyName, onCreated }: CreateHouseDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);

    const { error } = await supabase.from("houses").insert({
      family_id: familyId,
      name: name.trim(),
      location: location.trim() || null,
      description: description.trim() || null,
      capacity: capacity ? parseInt(capacity) : null,
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({ title: "Maison ajoutée !", description: `"${name}" a été ajoutée à ${familyName}.` });
    setName("");
    setLocation("");
    setDescription("");
    setCapacity("");
    setOpen(false);
    setLoading(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une maison
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Ajouter une maison</DialogTitle>
          <DialogDescription>
            Ajoutez une maison à la famille {familyName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="houseName">Nom de la maison</Label>
            <Input
              id="houseName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Maison de Provence"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="houseLocation">Lieu</Label>
            <Input
              id="houseLocation"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex : Gordes, Vaucluse"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="houseCapacity">Capacité (personnes)</Label>
            <Input
              id="houseCapacity"
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Ex : 8"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="houseDescription">Description</Label>
            <Textarea
              id="houseDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez la maison..."
              rows={3}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Ajout..." : "Ajouter la maison"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateHouseDialog;
