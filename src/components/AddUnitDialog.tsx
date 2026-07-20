import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { friendlyError } from "@/lib/errorMessages";

interface AddUnitDialogProps {
  houseId: string;
  houseName: string;
  existingBuildings?: { id: string; name: string }[];
  onCreated: () => void;
}

const AddUnitDialog = ({ houseId, houseName, existingBuildings = [], onCreated }: AddUnitDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"building" | "room">("room");
  const [parentId, setParentId] = useState<string>("none");
  const [capacity, setCapacity] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);

    const { error } = await supabase.from("house_units").insert({
      house_id: houseId,
      name: name.trim(),
      type,
      parent_id: type === "room" && parentId !== "none" ? parentId : null,
      capacity: capacity ? parseInt(capacity) : null,
      description: description.trim() || null,
    });

    if (error) {
      toast({ title: "Erreur", description: friendlyError(error), variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({ title: "Espace ajouté !", description: `"${name}" a été ajouté à ${houseName}.` });
    setName("");
    setType("room");
    setParentId("none");
    setCapacity("");
    setDescription("");
    setOpen(false);
    setLoading(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un espace
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Ajouter un espace</DialogTitle>
          <DialogDescription>
            Ajoutez un bâtiment ou une chambre à {houseName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as "building" | "room")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="building">🏘️ Bâtiment</SelectItem>
                <SelectItem value="room">🛏️ Chambre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "room" && existingBuildings.length > 0 && (
            <div className="space-y-2">
              <Label>Dans quel bâtiment ? (optionnel)</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun (chambre indépendante)</SelectItem>
                  {existingBuildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="unitName">Nom</Label>
            <Input
              id="unitName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === "building" ? "Ex : Gîte principal" : "Ex : Chambre bleue"}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitCapacity">Capacité (personnes)</Label>
            <Input
              id="unitCapacity"
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Ex : 4"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitDesc">Description</Label>
            <Textarea
              id="unitDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description optionnelle..."
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Ajout..." : "Ajouter l'espace"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUnitDialog;
