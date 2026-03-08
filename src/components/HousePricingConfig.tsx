import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Euro, Loader2, Save, CreditCard, Banknote, Wallet } from "lucide-react";
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

const paymentMethodLabels: Record<string, string> = {
  declarative: "Déclaratif uniquement",
  stripe: "Stripe uniquement",
  both: "Déclaratif + Stripe",
};

const acceptedPaymentOptions = [
  { id: "virement", label: "Virement bancaire", icon: Banknote },
  { id: "cheque", label: "Chèque", icon: Wallet },
  { id: "liquide", label: "Espèces", icon: Euro },
];

const HousePricingConfig = ({ houseId, isAdmin }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricingId, setPricingId] = useState<string | null>(null);
  const [mode, setMode] = useState("per_night");
  const [basePrice, setBasePrice] = useState("");
  const [capAmount, setCapAmount] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("declarative");
  const [acceptedPayments, setAcceptedPayments] = useState<string[]>(["virement", "cheque", "liquide"]);
  const [paymentInstructions, setPaymentInstructions] = useState("");

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
        setPaymentMethod((data as any).payment_method || "declarative");
        setAcceptedPayments((data as any).accepted_payments || ["virement", "cheque", "liquide"]);
        setPaymentInstructions((data as any).payment_instructions || "");
      }
      setLoading(false);
    };
    fetch();
  }, [houseId]);

  const toggleAcceptedPayment = (id: string) => {
    setAcceptedPayments((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      house_id: houseId,
      pricing_mode: mode as any,
      base_price: parseFloat(basePrice) || 0,
      cap_amount: capAmount ? parseFloat(capAmount) : null,
      is_active: isActive,
      payment_method: paymentMethod as any,
      accepted_payments: acceptedPayments,
      payment_instructions: paymentInstructions.trim() || null,
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
            Tarification & Paiement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">{basePrice} €</span>
            <Badge variant="outline">{pricingModeLabels[mode]}</Badge>
          </div>
          {capAmount && (
            <p className="text-sm text-muted-foreground">
              Plafond : {capAmount} € maximum par séjour
            </p>
          )}

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Moyens de paiement acceptés</p>
            <div className="flex flex-wrap gap-2">
              {(paymentMethod === "declarative" || paymentMethod === "both") &&
                acceptedPayments.map((p) => {
                  const opt = acceptedPaymentOptions.find((o) => o.id === p);
                  return opt ? (
                    <Badge key={p} variant="secondary" className="gap-1.5">
                      <opt.icon className="h-3 w-3" />
                      {opt.label}
                    </Badge>
                  ) : null;
                })}
              {(paymentMethod === "stripe" || paymentMethod === "both") && (
                <Badge variant="secondary" className="gap-1.5">
                  <CreditCard className="h-3 w-3" />
                  Carte bancaire (Stripe)
                </Badge>
              )}
            </div>
          </div>

          {paymentInstructions && (paymentMethod === "declarative" || paymentMethod === "both") && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-foreground mb-1">Instructions de paiement</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{paymentInstructions}</p>
            </div>
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
            Tarification & Paiement
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="pricing-active" className="text-xs text-muted-foreground">Activer</Label>
            <Switch id="pricing-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pricing mode */}
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

        <Separator />

        {/* Payment method */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Mode de paiement
          </Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="declarative">Déclaratif (virement, chèque, liquide)</SelectItem>
              <SelectItem value="stripe">Stripe (paiement en ligne)</SelectItem>
              <SelectItem value="both">Les deux (déclaratif + Stripe)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Accepted declarative payments */}
        {(paymentMethod === "declarative" || paymentMethod === "both") && (
          <div className="space-y-3">
            <Label>Moyens de paiement acceptés</Label>
            <div className="space-y-2">
              {acceptedPaymentOptions.map((opt) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`payment-${opt.id}`}
                    checked={acceptedPayments.includes(opt.id)}
                    onCheckedChange={() => toggleAcceptedPayment(opt.id)}
                  />
                  <Label htmlFor={`payment-${opt.id}`} className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
                    <opt.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {opt.label}
                  </Label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Instructions de paiement (optionnel)</Label>
              <Textarea
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                placeholder="Ex: IBAN FR76 ... / Chèque à l'ordre de..."
                rows={3}
                maxLength={1000}
              />
              <p className="text-[10px] text-muted-foreground">
                Visible par les membres lors de la réservation
              </p>
            </div>
          </div>
        )}

        {(paymentMethod === "stripe" || paymentMethod === "both") && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
            <p className="flex items-center gap-2 font-medium text-foreground mb-1">
              <CreditCard className="h-4 w-4 text-primary" />
              Paiement Stripe
            </p>
            <p>Le paiement en ligne par carte sera disponible prochainement. En attendant, le mode déclaratif est utilisé.</p>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full" size="sm">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer la tarification
        </Button>
      </CardContent>
    </Card>
  );
};

export default HousePricingConfig;
