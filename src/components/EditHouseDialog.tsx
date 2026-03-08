import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Settings } from "lucide-react";

interface EditHouseDialogProps {
  house: {
    id: string;
    name: string;
    location: string | null;
    description: string | null;
    capacity: number | null;
    photo_url: string | null;
  };
  onSaved: () => void;
}

const EditHouseDialog = ({ house, onSaved }: EditHouseDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(house.name);
  const [location, setLocation] = useState(house.location || "");
  const [description, setDescription] = useState(house.description || "");
  const [capacity, setCapacity] = useState(house.capacity?.toString() || "");
  const [photoUrl, setPhotoUrl] = useState(house.photo_url || "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setName(house.name);
      setLocation(house.location || "");
      setDescription(house.description || "");
      setCapacity(house.capacity?.toString() || "");
      setPhotoUrl(house.photo_url || "");
    }
    setOpen(isOpen);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const { error } = await supabase
      .from("houses")
      .update({
        name: name.trim(),
        location: location.trim() || null,
        description: description.trim() || null,
        capacity: capacity ? parseInt(capacity, 10) : null,
        photo_url: photoUrl.trim() || null,
      })
      .eq("id", house.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Maison mise à jour !" });
      setOpen(false);
      onSaved();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings className="h-4 w-4" />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Modifier la maison</DialogTitle>
          <DialogDescription>Mettez à jour les informations de votre maison.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="editName">Nom *</Label>
            <Input
              id="editName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editLocation">Adresse / Localisation</Label>
            <Input
              id="editLocation"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex : Bretagne, France"
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editDescription">Description</Label>
            <Textarea
              id="editDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre maison..."
              rows={3}
              maxLength={1000}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editCapacity">Capacité (personnes)</Label>
            <Input
              id="editCapacity"
              type="number"
              min={1}
              max={999}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Ex : 8"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editPhoto">URL de la photo</Label>
            <Input
              id="editPhoto"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
              maxLength={500}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditHouseDialog;
