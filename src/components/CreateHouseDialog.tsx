import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface Family {
  id: string;
  name: string;
}

interface CreateHouseDialogProps {
  families?: Family[];
  familyId?: string;
  familyName?: string;
  onCreated: () => void;
}

const CreateHouseDialog = ({ families, familyId, familyName, onCreated }: CreateHouseDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState(familyId || "none");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;

    setLoading(true);

    const resolvedFamilyId = selectedFamilyId === "none" ? null : selectedFamilyId;

    const { data: house, error } = await supabase.from("houses").insert({
      family_id: resolvedFamilyId,
      owner_id: resolvedFamilyId ? null : user.id,
      name: name.trim(),
      location: location.trim() || null,
      description: description.trim() || null,
      capacity: capacity ? parseInt(capacity) : null,
    }).select("id").single();

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // If no family, add creator as house owner
    if (!resolvedFamilyId && house) {
      await supabase.from("house_members").insert({
        house_id: house.id,
        user_id: user.id,
        role: "owner",
      });
    }

    toast({ title: "Maison créée !", description: `"${name}" a été ajoutée.` });
    setName("");
    setLocation("");
    setDescription("");
    setCapacity("");
    setSelectedFamilyId(familyId || "none");
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
            {familyName ? `Ajoutez une maison à la famille ${familyName}.` : "Créez une maison et invitez des proches."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 mt-2">
          {!familyId && families && families.length > 0 && (
            <div className="space-y-2">
              <Label>Rattacher à une famille (optionnel)</Label>
              <Select value={selectedFamilyId} onValueChange={setSelectedFamilyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucune famille" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune famille</SelectItem>
                  {families.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
            {loading ? "Création..." : "Créer la maison"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateHouseDialog;
