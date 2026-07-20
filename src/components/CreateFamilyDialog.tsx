import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Building2, Landmark, User, Network } from "lucide-react";
import { friendlyError } from "@/lib/errorMessages";

const SPACE_TYPES = [
  { value: "family", label: "Famille", icon: Users, description: "Regrouper les biens d'une famille" },
  { value: "indivision", label: "Indivision", icon: Building2, description: "Bien détenu en indivision" },
  { value: "sci", label: "SCI", icon: Landmark, description: "Société Civile Immobilière" },
  { value: "personal", label: "Personnel", icon: User, description: "Patrimoine personnel" },
  { value: "multi_family", label: "Multi-familles", icon: Network, description: "Plusieurs familles copropriétaires" },
] as const;

interface CreateFamilyDialogProps {
  onCreated: () => void;
}

const CreateFamilyDialog = ({ onCreated }: CreateFamilyDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("family");
  const [description, setDescription] = useState("");
  const [ownershipEnabled, setOwnershipEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);

    const { data: family, error: familyError } = await supabase
      .from("families")
      .insert({
        name: name.trim(),
        created_by: user.id,
        type: type as any,
        description: description.trim() || null,
        ownership_enabled: ownershipEnabled,
      })
      .select()
      .single();

    if (familyError) {
      toast({ title: "Erreur", description: friendlyError(familyError), variant: "destructive" });
      setLoading(false);
      return;
    }

    // Le créateur est déjà ajouté comme admin par le trigger
    // trigger_auto_add_family_creator ; on garde cet appel en filet de sécurité,
    // en ignorant le doublon.
    const { error: memberError } = await supabase
      .from("family_members")
      .upsert(
        { family_id: family.id, user_id: user.id, role: "admin" },
        { onConflict: "family_id,user_id", ignoreDuplicates: true }
      );

    if (memberError) {
      toast({ title: "Erreur", description: friendlyError(memberError), variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({ title: "Espace créé !", description: `"${name}" a été créé avec succès.` });
    setName("");
    setType("family");
    setDescription("");
    setOwnershipEnabled(false);
    setOpen(false);
    setLoading(false);
    onCreated();
  };

  const selectedType = SPACE_TYPES.find((t) => t.value === type);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Créer un espace patrimoine
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Créer un espace patrimoine</DialogTitle>
          <DialogDescription>
            Organisez vos biens par structure familiale ou juridique.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="spaceName">Nom de l'espace</Label>
            <Input
              id="spaceName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : SCI Les Tamaris, Famille Dupont..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Type de structure</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPACE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">
                      <t.icon className="h-4 w-4 text-muted-foreground" />
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedType && (
              <p className="text-xs text-muted-foreground">{selectedType.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="spaceDescription">Description (optionnel)</Label>
            <Textarea
              id="spaceDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez cet espace patrimoine..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="ownershipEnabled" className="cursor-pointer">Activer les quotes-parts</Label>
              <p className="text-xs text-muted-foreground">Permet la gestion des parts de propriété et les votes pondérés</p>
            </div>
            <Switch
              id="ownershipEnabled"
              checked={ownershipEnabled}
              onCheckedChange={setOwnershipEnabled}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Création..." : "Créer l'espace patrimoine"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFamilyDialog;
