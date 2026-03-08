import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import { Plus } from "lucide-react";

interface CreateFamilyDialogProps {
  onCreated: () => void;
}

const CreateFamilyDialog = ({ onCreated }: CreateFamilyDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);

    // Create family
    const { data: family, error: familyError } = await supabase
      .from("families")
      .insert({ name: name.trim(), created_by: user.id })
      .select()
      .single();

    if (familyError) {
      toast({ title: "Erreur", description: familyError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from("family_members")
      .insert({ family_id: family.id, user_id: user.id, role: "admin" });

    if (memberError) {
      toast({ title: "Erreur", description: memberError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({ title: "Famille créée !", description: `"${name}" a été créée avec succès.` });
    setName("");
    setOpen(false);
    setLoading(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Créer une famille
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Créer une famille</DialogTitle>
          <DialogDescription>
            Donnez un nom à votre espace familial pour commencer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="familyName">Nom de la famille</Label>
            <Input
              id="familyName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Famille Dupont"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Création..." : "Créer la famille"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFamilyDialog;
