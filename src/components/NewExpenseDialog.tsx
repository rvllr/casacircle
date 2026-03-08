import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface House {
  id: string;
  name: string;
  family_id: string;
}

interface Member {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
}

interface Props {
  onCreated: () => void;
}

const NewExpenseDialog = ({ onCreated }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouse, setSelectedHouse] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    const fetchHouses = async () => {
      const { data } = await supabase.from("houses").select("id, name, family_id");
      setHouses(data || []);
    };
    fetchHouses();
  }, [open, user]);

  useEffect(() => {
    if (!selectedHouse) { setMembers([]); return; }
    const fetchMembers = async () => {
      const house = houses.find((h) => h.id === selectedHouse);
      if (!house) return;
      const { data: fm } = await supabase
        .from("family_members")
        .select("user_id")
        .eq("family_id", house.family_id);
      const userIds = (fm || []).map((m) => m.user_id);
      if (userIds.length === 0) { setMembers([]); return; }
      const { data: profiles } = await supabase
        .from("users_profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);
      setMembers(profiles || []);
      setSelectedMembers(userIds);
    };
    fetchMembers();
  }, [selectedHouse, houses]);

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const getMemberName = (m: Member) =>
    m.first_name ? `${m.first_name}${m.last_name ? ` ${m.last_name}` : ""}` : "Membre";

  const handleSubmit = async () => {
    if (!user || !selectedHouse || !description.trim() || !amount || selectedMembers.length === 0) {
      toast({ title: "Veuillez remplir tous les champs.", variant: "destructive" });
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ title: "Montant invalide.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data: expense, error } = await supabase
      .from("expenses")
      .insert({ house_id: selectedHouse, description: description.trim(), amount: numAmount, paid_by: user.id })
      .select("id")
      .single();

    if (error || !expense) {
      toast({ title: "Erreur", description: error?.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const shareAmount = numAmount / selectedMembers.length;
    const shares = selectedMembers.map((uid) => ({
      expense_id: expense.id,
      user_id: uid,
      amount: Math.round(shareAmount * 100) / 100,
    }));

    const { error: sharesError } = await supabase.from("expense_shares").insert(shares);
    if (sharesError) {
      toast({ title: "Erreur partage", description: sharesError.message, variant: "destructive" });
    } else {
      toast({ title: "Dépense ajoutée !" });
      onCreated();
      setOpen(false);
      setDescription("");
      setAmount("");
      setSelectedHouse("");
      setSelectedMembers([]);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />Nouvelle dépense</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Ajouter une dépense</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Maison</Label>
            <Select value={selectedHouse} onValueChange={setSelectedHouse}>
              <SelectTrigger><SelectValue placeholder="Choisir une maison" /></SelectTrigger>
              <SelectContent>
                {houses.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Courses, réparation..." maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label>Montant (€)</Label>
            <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          {members.length > 0 && (
            <div className="space-y-2">
              <Label>Partager entre</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {members.map((m) => (
                  <label key={m.user_id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedMembers.includes(m.user_id)}
                      onCheckedChange={() => toggleMember(m.user_id)}
                    />
                    <span className="text-sm text-foreground">{getMemberName(m)}</span>
                  </label>
                ))}
              </div>
              {selectedMembers.length > 0 && amount && (
                <p className="text-xs text-muted-foreground">
                  {(parseFloat(amount) / selectedMembers.length).toFixed(2)} € par personne
                </p>
              )}
            </div>
          )}
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Ajout..." : "Ajouter la dépense"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewExpenseDialog;
