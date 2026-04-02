import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

interface EditSpaceDialogProps {
  spaceId: string;
  currentName: string;
  currentDescription: string | null;
  onUpdated: () => void;
}

const EditSpaceDialog = ({ spaceId, currentName, currentDescription, onUpdated }: EditSpaceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription || "");
  const [saving, setSaving] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setName(currentName);
      setDescription(currentDescription || "");
    }
    setOpen(isOpen);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("families")
      .update({ name: name.trim(), description: description.trim() || null })
      .eq("id", spaceId);

    setSaving(false);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }
    toast.success("Espace mis à jour");
    setOpen(false);
    onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Pencil className="h-4 w-4" /> Modifier
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier l'espace</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="space-name">Nom</Label>
            <Input
              id="space-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom de l'espace"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="space-desc">Description</Label>
            <Textarea
              id="space-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optionnelle)"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditSpaceDialog;
