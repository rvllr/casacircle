import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

interface InviteMemberDialogProps {
  familyId: string;
  familyName: string;
  onInvited: () => void;
}

const InviteMemberDialog = ({ familyId, familyName, onInvited }: InviteMemberDialogProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);

    // Find user by email in profiles
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
        description: "Aucun compte n'existe avec cet email. L'utilisateur doit d'abord créer un compte sur CasaCircle.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("family_members")
      .select("id")
      .eq("family_id", familyId)
      .eq("user_id", profile.user_id)
      .maybeSingle();

    if (existing) {
      toast({
        title: "Déjà membre",
        description: "Cette personne fait déjà partie de la famille.",
      });
      setLoading(false);
      return;
    }

    // Add as member
    const { error: insertError } = await supabase
      .from("family_members")
      .insert({ family_id: familyId, user_id: profile.user_id, role: "member" });

    if (insertError) {
      toast({ title: "Erreur", description: insertError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({ title: "Membre ajouté !", description: `${email} a été ajouté à ${familyName}.` });
    setEmail("");
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
            Ajoutez un membre à la famille {familyName} par email.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="memberEmail">Email du membre</Label>
            <Input
              id="memberEmail"
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Invitation..." : "Ajouter le membre"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteMemberDialog;
