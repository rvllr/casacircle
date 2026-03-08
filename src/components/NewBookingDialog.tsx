import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface House {
  id: string;
  name: string;
  families: { name: string } | null;
}

interface NewBookingDialogProps {
  onCreated: () => void;
  preselectedHouseId?: string;
}

const NewBookingDialog = ({ onCreated, preselectedHouseId }: NewBookingDialogProps) => {
  const [open, setOpen] = useState(false);
  const [houses, setHouses] = useState<House[]>([]);
  const [houseId, setHouseId] = useState(preselectedHouseId || "");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    supabase
      .from("houses")
      .select("id, name, families(name)")
      .then(({ data }) => {
        if (data) setHouses(data as unknown as House[]);
      });
  }, [open]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !houseId || !startDate || !endDate) return;

    if (endDate <= startDate) {
      toast({ title: "Erreur", description: "La date de fin doit être après la date de début.", variant: "destructive" });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("bookings").insert({
      house_id: houseId,
      user_id: user.id,
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
      status: "pending",
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({ title: "Réservation envoyée !", description: "Votre demande est en attente de validation." });
    setHouseId("");
    setStartDate(undefined);
    setEndDate(undefined);
    setOpen(false);
    setLoading(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle réservation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Nouvelle réservation</DialogTitle>
          <DialogDescription>Choisissez une maison et vos dates de séjour.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 mt-2">
          {/* House select */}
          <div className="space-y-2">
            <Label>Maison</Label>
            <Select value={houseId} onValueChange={setHouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une maison" />
              </SelectTrigger>
              <SelectContent>
                {houses.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name} {h.families ? `(${(h.families as any).name})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Arrivée</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "d MMM yyyy", { locale: fr }) : "Choisir"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Départ</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "d MMM yyyy", { locale: fr }) : "Choisir"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date < (startDate || new Date())}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !houseId || !startDate || !endDate}>
            {loading ? "Envoi..." : "Demander la réservation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewBookingDialog;
