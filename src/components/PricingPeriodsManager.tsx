import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarRange, Plus, Trash2, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  houseId: string;
  isAdmin: boolean;
}

interface PricingPeriod {
  id: string;
  name: string;
  start_month: number;
  start_day: number;
  end_month: number;
  end_day: number;
  is_recurring: boolean;
  start_date: string | null;
  end_date: string | null;
  price_type: "absolute" | "multiplier";
  price_value: number;
  priority: number;
}

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const formatPeriodDates = (p: PricingPeriod) => {
  if (!p.is_recurring && p.start_date && p.end_date) {
    return `${new Date(p.start_date).toLocaleDateString("fr-FR")} → ${new Date(p.end_date).toLocaleDateString("fr-FR")}`;
  }
  return `${p.start_day} ${MONTHS[p.start_month - 1]} → ${p.end_day} ${MONTHS[p.end_month - 1]}`;
};

const PricingPeriodsManager = ({ houseId, isAdmin }: Props) => {
  const { toast } = useToast();
  const [periods, setPeriods] = useState<PricingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [isRecurring, setIsRecurring] = useState(true);
  const [startMonth, setStartMonth] = useState("7");
  const [startDay, setStartDay] = useState("1");
  const [endMonth, setEndMonth] = useState("8");
  const [endDay, setEndDay] = useState("31");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priceType, setPriceType] = useState<"absolute" | "multiplier">("absolute");
  const [priceValue, setPriceValue] = useState("");
  const [priority, setPriority] = useState("0");

  const fetchPeriods = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pricing_periods")
      .select("*")
      .eq("house_id", houseId)
      .order("priority", { ascending: false });
    setPeriods((data as any as PricingPeriod[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPeriods();
  }, [houseId]);

  const resetForm = () => {
    setName("");
    setIsRecurring(true);
    setStartMonth("7");
    setStartDay("1");
    setEndMonth("8");
    setEndDay("31");
    setStartDate("");
    setEndDate("");
    setPriceType("absolute");
    setPriceValue("");
    setPriority("0");
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!name.trim() || !priceValue) {
      toast({ title: "Remplissez le nom et le prix", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      house_id: houseId,
      name: name.trim(),
      is_recurring: isRecurring,
      start_month: parseInt(startMonth),
      start_day: parseInt(startDay),
      end_month: parseInt(endMonth),
      end_day: parseInt(endDay),
      start_date: !isRecurring && startDate ? startDate : null,
      end_date: !isRecurring && endDate ? endDate : null,
      price_type: priceType,
      price_value: parseFloat(priceValue) || 0,
      priority: parseInt(priority) || 0,
    };

    const { error } = await supabase.from("pricing_periods").insert(payload as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Période ajoutée !" });
      resetForm();
      fetchPeriods();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("pricing_periods").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setPeriods((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Période supprimée" });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Read-only view for non-admins
  if (!isAdmin) {
    if (periods.length === 0) return null;
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" />
            Tarifs saisonniers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {periods.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">{formatPeriodDates(p)}</p>
              </div>
              <Badge variant="outline" className="shrink-0">
                {p.price_type === "absolute"
                  ? `${p.price_value} €`
                  : `×${p.price_value}`}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" />
            Tarifs saisonniers
          </CardTitle>
          {!showForm && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Ajouter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Existing periods */}
        {periods.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune période définie. Le prix de base s'applique toute l'année.
          </p>
        )}

        {periods.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                <Badge variant={p.is_recurring ? "secondary" : "outline"} className="text-[10px]">
                  {p.is_recurring ? "Récurrent" : "Ponctuel"}
                </Badge>
                {p.priority > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    Priorité {p.priority}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{formatPeriodDates(p)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <Badge variant="outline">
                {p.price_type === "absolute"
                  ? `${p.price_value} €`
                  : `×${p.price_value}`}
              </Badge>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => handleDelete(p.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {/* Add form */}
        {showForm && (
          <>
            <Separator />
            <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
              <div className="space-y-2">
                <Label>Nom de la période</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Haute saison, Noël 2026..."
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={isRecurring} onCheckedChange={setIsRecurring} id="recurring" />
                <Label htmlFor="recurring" className="text-sm">
                  {isRecurring ? "Récurrent chaque année" : "Dates fixes (ponctuel)"}
                </Label>
              </div>

              {isRecurring ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Début</Label>
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={startDay}
                        onChange={(e) => setStartDay(e.target.value)}
                        className="w-16"
                        placeholder="Jour"
                      />
                      <Select value={startMonth} onValueChange={setStartMonth}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((m, i) => (
                            <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fin</Label>
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={endDay}
                        onChange={(e) => setEndDay(e.target.value)}
                        className="w-16"
                        placeholder="Jour"
                      />
                      <Select value={endMonth} onValueChange={setEndMonth}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((m, i) => (
                            <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Date début</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date fin</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Type de prix</Label>
                  <Select value={priceType} onValueChange={(v) => setPriceType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="absolute">Prix absolu (€)</SelectItem>
                      <SelectItem value="multiplier">Multiplicateur (×)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    {priceType === "absolute" ? "Prix (€)" : "Coefficient"}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step={priceType === "absolute" ? "0.01" : "0.1"}
                    value={priceValue}
                    onChange={(e) => setPriceValue(e.target.value)}
                    placeholder={priceType === "absolute" ? "Ex: 80" : "Ex: 1.5"}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Priorité (plus élevé = prioritaire)</Label>
                <Input
                  type="number"
                  min="0"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  placeholder="0"
                />
                <p className="text-[10px] text-muted-foreground">
                  Si deux périodes se chevauchent, celle avec la priorité la plus haute prévaut.
                </p>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={resetForm} className="flex-1">
                  Annuler
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Ajouter
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PricingPeriodsManager;
