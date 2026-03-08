import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface House { id: string; name: string; }
interface Props { onCreated: () => void; }

const NewMemoryDialog = ({ onCreated }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouse, setSelectedHouse] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visitStart, setVisitStart] = useState("");
  const [visitEnd, setVisitEnd] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    const fetch = async () => {
      const { data } = await supabase.from("houses").select("id, name");
      setHouses(data || []);
    };
    fetch();
  }, [open, user]);

  const handleSubmit = async () => {
    if (!user || !selectedHouse || !title.trim()) {
      toast({ title: "Veuillez remplir le titre et la maison.", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { error } = await supabase.from("house_memories").insert({
      house_id: selectedHouse,
      created_by: user.id,
      title: title.trim(),
      description: description.trim() || null,
      visit_start: visitStart || null,
      visit_end: visitEnd || null,
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Souvenir ajouté !" });
      onCreated();
      setOpen(false);
      setTitle("");
      setDescription("");
      setVisitStart("");
      setVisitEnd("");
      setSelectedHouse("");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />Nouveau souvenir</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Ajouter un souvenir</DialogTitle>
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
            <Label>Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Noël 2024, Été en famille..." maxLength={150} />
          </div>
          <div className="space-y-2">
            <Label>Description / Anecdote</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Racontez ce moment..." rows={4} maxLength={2000} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Début du séjour</Label>
              <Input type="date" value={visitStart} onChange={(e) => setVisitStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fin du séjour</Label>
              <Input type="date" value={visitEnd} onChange={(e) => setVisitEnd(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Ajout..." : "Ajouter le souvenir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewMemoryDialog;
