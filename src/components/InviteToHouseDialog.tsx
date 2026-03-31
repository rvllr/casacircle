import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

interface InviteToHouseDialogProps {
  houseId: string;
  houseName: string;
  familyId?: string | null;
  onInvited: () => void;
}

const roleOptions = [
  { value: "admin", label: "Admin — gère la maison et les membres" },
  { value: "editor", label: "Éditeur — peut réserver, ajouter dépenses et souvenirs" },
  { value: "member", label: "Membre — peut réserver et ajouter des dépenses" },
  { value: "viewer", label: "Lecteur — consultation seule" },
  { value: "guest", label: "Invité — accès limité temporaire" },
  { value: "maintenance", label: "Maintenance — accès technique uniquement" },
];

const InviteToHouseDialog = ({ houseId, houseName, familyId, onInvited }: InviteToHouseDialogProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState("member");
  const [addToSpace, setAddToSpace] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !user) return;

    setLoading(true);

    // Find user by email
    const { data: profile, error: profileError } = await supabase
      .from("users_profiles")
      .select("user_id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (profileError) {
      toast({ title: "Erreur", description: profileError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (!profile) {
      toast({
        title: "Utilisateur non trouvé",
        description: "Aucun compte n'existe avec cet email. L'utilisateur doit d'abord créer un compte.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("house_members")
      .select("id")
      .eq("house_id", houseId)
      .eq("user_id", profile.user_id)
      .maybeSingle();

    if (existing) {
      toast({
        title: "Déjà membre",
        description: "Cette personne a déjà accès à cette maison.",
      });
      setLoading(false);
      return;
    }

    const accessScope = addToSpace && familyId ? "mixed" : "house_only";

    // Add house member
    const { error: insertError } = await supabase
      .from("house_members")
      .insert({
        house_id: houseId,
        user_id: profile.user_id,
        role: selectedRole,
        added_by_user_id: user.id,
        access_scope: accessScope,
      });

    if (insertError) {
      toast({ title: "Erreur", description: insertError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Also add to space if requested
    if (addToSpace && familyId) {
      const { data: existingFm } = await supabase
        .from("family_members")
        .select("id")
        .eq("family_id", familyId)
        .eq("user_id", profile.user_id)
        .maybeSingle();

      if (!existingFm) {
        await supabase.from("family_members").insert({
          family_id: familyId,
          user_id: profile.user_id,
          role: "member",
        });
      }
    }

    toast({ title: "Membre ajouté !", description: `${email} a maintenant accès à cette maison.` });
    setEmail("");
    setSelectedRole("member");
    setAddToSpace(false);
    setOpen(false);
    setLoading(false);
    onInvited();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Inviter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Inviter un membre</DialogTitle>
          <DialogDescription>
            Ajoutez un membre qui pourra accéder à cette maison.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="inviteEmail">Email du membre</Label>
            <Input
              id="inviteEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="membre@email.com"
              required
            />
            <p className="text-xs text-muted-foreground">
              Le membre doit avoir un compte CasaCircle.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Rôle</Label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground"
            >
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          {familyId && (
            <div className="flex items-start space-x-3 rounded-lg border border-border p-3 bg-muted/30">
              <Checkbox
                id="addToSpace"
                checked={addToSpace}
                onCheckedChange={(checked) => setAddToSpace(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="addToSpace" className="text-sm font-medium cursor-pointer">
                  Ajouter aussi à l'espace patrimoine
                </Label>
                <p className="text-xs text-muted-foreground">
                  Donne accès à toutes les maisons de l'espace, aux votes et aux documents juridiques.
                </p>
              </div>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Invitation..." : "Ajouter le membre"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteToHouseDialog;
