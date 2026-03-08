import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHouseContext } from "@/contexts/HouseContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Ban, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onCreated: () => void;
}

const BlockPeriodDialog = ({ onCreated }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { houses } = useHouseContext();
  const [open, setOpen] = useState(false);
  const [houseId, setHouseId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!startDate || !endDate || !houseId || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("blocked_periods").insert({
      house_id: houseId,
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim() || null,
      created_by: user.id,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Période bloquée !" });
      setOpen(false);
      setStartDate("");
      setEndDate("");
      setReason("");
      onCreated();
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Ban className="h-4 w-4 mr-2" />
          Bloquer une période
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bloquer une période</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Maison</Label>
            <Select value={houseId} onValueChange={setHouseId}>
              <SelectTrigger><SelectValue placeholder="Choisir une maison" /></SelectTrigger>
              <SelectContent>
                {houses.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date début</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date fin</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Raison (optionnel)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Travaux, entretien..." maxLength={200} />
          </div>
          <Button onClick={handleSubmit} disabled={!startDate || !endDate || !houseId || submitting} className="w-full">
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Bloquer cette période
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlockPeriodDialog;
