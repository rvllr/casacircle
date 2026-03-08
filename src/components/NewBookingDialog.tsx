import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { format, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface House {
  id: string;
  name: string;
  families: { name: string } | null;
  booking_auto_approve?: boolean;
}

interface HouseUnit {
  id: string;
  house_id: string;
  name: string;
  type: "building" | "room";
  parent_id: string | null;
  capacity: number | null;
}

interface NewBookingDialogProps {
  onCreated: () => void;
  preselectedHouseId?: string;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  initialStartDate?: Date;
}

const NewBookingDialog = ({ onCreated, preselectedHouseId, externalOpen, onExternalOpenChange, initialStartDate }: NewBookingDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (onExternalOpenChange) onExternalOpenChange(v);
    else setInternalOpen(v);
  };
  const [houses, setHouses] = useState<House[]>([]);
  const [units, setUnits] = useState<HouseUnit[]>([]);
  const [houseId, setHouseId] = useState(preselectedHouseId || "");
  const [unitId, setUnitId] = useState<string>("whole");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [pricing, setPricing] = useState<{ pricing_mode: string; base_price: number; cap_amount: number | null; is_active: boolean; payment_method: string; accepted_payments: string[]; payment_instructions: string | null; cleaning_fee: number | null; cleaning_mode: string } | null>(null);
  const [guestCount, setGuestCount] = useState("2");
  const [wantsCleaning, setWantsCleaning] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    supabase
      .from("houses")
      .select("id, name, families(name), booking_auto_approve")
      .then(({ data }) => {
        if (data) setHouses(data as unknown as House[]);
      });
    if (initialStartDate) {
      setStartDate(initialStartDate);
    }
  }, [open, initialStartDate]);

  // Load units and pricing when house changes
  useEffect(() => {
    if (!houseId) {
      setUnits([]);
      setUnitId("whole");
      setPricing(null);
      return;
    }
    supabase
      .from("house_units")
      .select("id, house_id, name, type, parent_id, capacity")
      .eq("house_id", houseId)
      .order("type", { ascending: true })
      .order("name", { ascending: true })
      .then(({ data }) => {
        setUnits((data as HouseUnit[]) || []);
        setUnitId("whole");
      });
    supabase
      .from("house_pricing")
      .select("pricing_mode, base_price, cap_amount, is_active, payment_method, accepted_payments, payment_instructions, cleaning_fee, cleaning_mode")
      .eq("house_id", houseId)
      .maybeSingle()
      .then(({ data }) => {
        setPricing(data as any);
        if ((data as any)?.cleaning_mode === "mandatory") setWantsCleaning(true);
        else setWantsCleaning(false);
      });
  }, [houseId]);

  // Check for conflicts when dates/unit change
  useEffect(() => {
    setConflict(null);
    if (!houseId || !startDate || !endDate || endDate <= startDate) return;

    const checkConflict = async () => {
      setCheckingConflict(true);
      const sd = format(startDate, "yyyy-MM-dd");
      const ed = format(endDate, "yyyy-MM-dd");

      let query = supabase
        .from("bookings")
        .select("id, start_date, end_date, unit_id, status")
        .eq("house_id", houseId)
        .in("status", ["pending", "approved"])
        .lt("start_date", ed)
        .gt("end_date", sd);

      const { data } = await query;
      const overlapping = (data || []).filter((b) => {
        const selectedUnit = unitId === "whole" ? null : unitId;
        if (b.unit_id === null && selectedUnit === null) return true;
        if (b.unit_id === null || selectedUnit === null) return true;
        return b.unit_id === selectedUnit;
      });

      if (overlapping.length > 0) {
        setConflict(`${overlapping.length} réservation(s) existante(s) sur ces dates pour cet espace.`);
      } else {
        setConflict(null);
      }
      setCheckingConflict(false);
    };
    checkConflict();
  }, [houseId, unitId, startDate, endDate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !houseId || !startDate || !endDate) return;

    if (endDate <= startDate) {
      toast({ title: "Erreur", description: "La date de fin doit être après la date de début.", variant: "destructive" });
      return;
    }

    setLoading(true);

    const selectedHouse = houses.find((h) => h.id === houseId);
    const isAutoApprove = selectedHouse?.booking_auto_approve === true;
    const bookingStatus = isAutoApprove ? "approved" : "pending";

    const { error } = await supabase.from("bookings").insert({
      house_id: houseId,
      unit_id: unitId === "whole" ? null : unitId,
      user_id: user.id,
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
      status: bookingStatus,
    });

    if (error) {
      const msg = error.message.includes("Conflit")
        ? "Cet espace est déjà réservé sur ces dates."
        : error.message;
      toast({ title: "Erreur", description: msg, variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({
      title: isAutoApprove ? "Réservation confirmée !" : "Réservation envoyée !",
      description: isAutoApprove ? "Votre réservation est automatiquement confirmée." : "Votre demande est en attente de validation.",
    });
    setHouseId("");
    setUnitId("whole");
    setStartDate(undefined);
    setEndDate(undefined);
    setConflict(null);
    setOpen(false);
    setLoading(false);
    onCreated();
  };

  // Group units: buildings with their rooms
  const buildings = units.filter((u) => u.type === "building");
  const standaloneRooms = units.filter((u) => u.type === "room" && !u.parent_id);
  const hasUnits = units.length > 0;

  const getUnitLabel = (unit: HouseUnit) => {
    const parent = unit.parent_id ? buildings.find((b) => b.id === unit.parent_id) : null;
    return parent ? `${parent.name} — ${unit.name}` : unit.name;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!externalOpen && externalOpen !== false && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle réservation
          </Button>
        </DialogTrigger>
      )}
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

          {/* Unit select (only shown if house has units) */}
          {hasUnits && (
            <div className="space-y-2">
              <Label>Espace à réserver</Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Toute la propriété" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whole">🏠 Toute la propriété</SelectItem>

                  {/* Buildings as bookable items */}
                  {buildings.map((b) => {
                    const childRooms = units.filter((u) => u.parent_id === b.id);
                    return (
                      <div key={b.id}>
                        <SelectItem value={b.id}>
                          🏘️ {b.name}{b.capacity ? ` (${b.capacity} pers.)` : ""}
                        </SelectItem>
                        {childRooms.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            &nbsp;&nbsp;🛏️ {b.name} — {r.name}{r.capacity ? ` (${r.capacity} pers.)` : ""}
                          </SelectItem>
                        ))}
                      </div>
                    );
                  })}

                  {/* Standalone rooms */}
                  {standaloneRooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      🛏️ {r.name}{r.capacity ? ` (${r.capacity} pers.)` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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

          {/* Guest count for per_person pricing */}
          {pricing?.is_active && pricing.pricing_mode !== "per_night" && (
            <div className="space-y-2">
              <Label>Nombre de personnes</Label>
              <Input
                type="number"
                min="1"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                placeholder="2"
              />
            </div>
          )}

          {/* Conflict warning */}
          {conflict && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{conflict}</span>
            </div>
          )}

          {/* Cost estimate */}
          {pricing?.is_active && startDate && endDate && endDate > startDate && (() => {
            const nights = differenceInCalendarDays(endDate, startDate);
            const persons = parseInt(guestCount) || 1;
            let cost = 0;
            if (pricing.pricing_mode === "per_night") cost = pricing.base_price * nights;
            else if (pricing.pricing_mode === "per_person") cost = pricing.base_price * persons;
            else cost = pricing.base_price * persons * nights;
            if (pricing.cap_amount && cost > pricing.cap_amount) cost = pricing.cap_amount;
            return (
              <div className="flex items-center justify-between p-3 rounded-md bg-primary/5 border border-primary/20 text-sm">
                <span className="text-muted-foreground">
                  Coût estimé ({nights} nuit{nights > 1 ? "s" : ""}
                  {pricing.pricing_mode !== "per_night" ? `, ${persons} pers.` : ""})
                </span>
                <span className="font-bold text-foreground">{cost.toFixed(2)} €</span>
              </div>
            );
          })()}

          {/* Payment info */}
          {pricing?.is_active && (pricing.payment_method === "declarative" || pricing.payment_method === "both") && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm space-y-1.5">
              <p className="font-medium text-foreground text-xs">💳 Paiement accepté</p>
              <div className="flex flex-wrap gap-1.5">
                {(pricing.accepted_payments || []).map((p: string) => {
                  const labels: Record<string, string> = { virement: "Virement", cheque: "Chèque", liquide: "Espèces" };
                  return <span key={p} className="inline-flex items-center px-2 py-0.5 rounded-full bg-background border border-border text-xs text-muted-foreground">{labels[p] || p}</span>;
                })}
              </div>
              {pricing.payment_instructions && (
                <p className="text-xs text-muted-foreground whitespace-pre-line mt-1">{pricing.payment_instructions}</p>
              )}
            </div>
          )}

          {houseId && (
            <p className="text-xs text-muted-foreground text-center">
              {houses.find((h) => h.id === houseId)?.booking_auto_approve
                ? "✅ Cette maison accepte les réservations automatiquement"
                : "⏳ Cette maison nécessite une validation admin"}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading || !houseId || !startDate || !endDate || !!conflict || checkingConflict}>
            {checkingConflict ? "Vérification..." : loading ? "Envoi..." : 
              houses.find((h) => h.id === houseId)?.booking_auto_approve ? "Réserver" : "Demander la réservation"
            }
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewBookingDialog;
