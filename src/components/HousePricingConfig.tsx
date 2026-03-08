import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Euro, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  houseId: string;
  isAdmin: boolean;
}

const pricingModeLabels: Record<string, string> = {
  per_night: "Par nuit",
  per_person: "Par personne",
  per_person_per_night: "Par personne / nuit",
};

const HousePricingConfig = ({ houseId, isAdmin }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricingId, setPricingId] = useState<string | null>(null);
  const [mode, setMode] = useState("per_night");
  const [basePrice, setBasePrice] = useState("");
  const [capAmount, setCapAmount] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("house_pricing")
        .select("*")
        .eq("house_id", houseId)
        .maybeSingle();

      if (data) {
        setPricingId(data.id);
        setMode(data.pricing_mode);
        setBasePrice(data.base_price?.toString() || "");
        setCapAmount(data.cap_amount?.toString() || "");
        setIsActive(data.is_active);
      }
      setLoading(false);
    };
    fetch();
  }, [houseId]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      house_id: houseId,
      pricing_mode: mode as any,
      base_price: parseFloat(basePrice) || 0,
      cap_amount: capAmount ? parseFloat(capAmount) : null,
      is_active: isActive,
    };

    let error;
    if (pricingId) {
      ({ error } = await supabase
        .from("house_pricing")
        .update(payload)
        .eq("id", pricingId));
    } else {
      const res = await supabase
        .from("house_pricing")
        .insert(payload)
        .select("id")
        .single();
      error = res.error;
      if (res.data) setPricingId(res.data.id);
    }

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tarification enregistrée !" });
    }
    setSaving(false);
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
    if (!pricingId || !isActive) return null;
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Euro className="h-4 w-4 text-primary" />
            Tarification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">{basePrice} €</span>
            <Badge variant="outline">{pricingModeLabels[mode]}</Badge>
          </div>
          {capAmount && (
            <p className="text-sm text-muted-foreground">
              Plafond : {capAmount} € maximum par séjour
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Euro className="h-4 w-4 text-primary" />
            Tarification
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="pricing-active" className="text-xs text-muted-foreground">Activer</Label>
            <Switch id="pricing-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Mode de tarification</Label>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="per_night">Par nuit (prix fixe / nuit)</SelectItem>
              <SelectItem value="per_person">Par personne (prix fixe / personne)</SelectItem>
              <SelectItem value="per_person_per_night">Par personne / nuit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Prix de base (€)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="Ex: 50"
            />
          </div>
          <div className="space-y-2">
            <Label>Plafond max (€)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={capAmount}
              onChange={(e) => setCapAmount(e.target.value)}
              placeholder="Pas de plafond"
            />
            <p className="text-[10px] text-muted-foreground">Montant maximum par séjour</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full" size="sm">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer la tarification
        </Button>
      </CardContent>
    </Card>
  );
};

export default HousePricingConfig;
