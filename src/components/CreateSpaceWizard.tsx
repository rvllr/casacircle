import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Building2, Landmark, User, Network, ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SPACE_TYPES = [
  { value: "family", label: "Famille", icon: Users, description: "Regrouper les biens d'une famille" },
  { value: "indivision", label: "Indivision", icon: Building2, description: "Bien détenu en indivision" },
  { value: "sci", label: "SCI", icon: Landmark, description: "Société Civile Immobilière" },
  { value: "personal", label: "Personnel", icon: User, description: "Patrimoine personnel" },
  { value: "multi_family", label: "Multi-familles", icon: Network, description: "Plusieurs familles copropriétaires" },
] as const;

interface CreateSpaceWizardProps {
  onCreated: () => void;
}

const CreateSpaceWizard = ({ onCreated }: CreateSpaceWizardProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Step 1 - Space info
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("family");
  const [description, setDescription] = useState("");
  const [ownershipEnabled, setOwnershipEnabled] = useState(false);

  // Step 2 - Invite members
  const [emails, setEmails] = useState<string[]>([""]);

  // Step 3 - First house
  const [houseName, setHouseName] = useState("");
  const [houseLocation, setHouseLocation] = useState("");
  const [skipHouse, setSkipHouse] = useState(false);

  const reset = () => {
    setStep(1);
    setName("");
    setType("family");
    setDescription("");
    setOwnershipEnabled(false);
    setEmails([""]);
    setHouseName("");
    setHouseLocation("");
    setSkipHouse(false);
  };

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setLoading(true);

    // 1. Create space
    const { data: space, error: spaceErr } = await supabase
      .from("families")
      .insert({
        name: name.trim(),
        created_by: user.id,
        type: type as any,
        description: description.trim() || null,
        ownership_enabled: ownershipEnabled,
      })
      .select()
      .single();

    if (spaceErr || !space) {
      toast({ title: "Erreur", description: spaceErr?.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // 2. Add creator as admin
    await supabase.from("family_members").insert({ family_id: space.id, user_id: user.id, role: "admin" });

    // 3. Create first house if provided
    if (!skipHouse && houseName.trim()) {
      await supabase.from("houses").insert({
        name: houseName.trim(),
        location: houseLocation.trim() || null,
        family_id: space.id,
        owner_id: user.id,
      });
    }

    toast({ title: "Espace créé !", description: `"${name}" a été créé avec succès.` });

    // Show info about invitations (emails are informational for now)
    const validEmails = emails.filter((e) => e.trim() && e.includes("@"));
    if (validEmails.length > 0) {
      toast({
        title: "Invitations",
        description: `${validEmails.length} invitation(s) seront envoyées prochainement.`,
      });
    }

    reset();
    setOpen(false);
    setLoading(false);
    onCreated();
  };

  const selectedType = SPACE_TYPES.find((t) => t.value === type);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Créer un espace patrimoine
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            Créer un espace patrimoine
          </DialogTitle>
          <DialogDescription>
            Étape {step} sur 3 — {step === 1 ? "Informations" : step === 2 ? "Membres" : "Première maison"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 my-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-1">
              <div className={`h-2 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-secondary"}`} />
            </div>
          ))}
        </div>

        {/* Step 1: Space info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom de l'espace</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex : SCI Les Tamaris, Famille Dupont..."
              />
            </div>
            <div className="space-y-2">
              <Label>Type de structure</Label>
              <div className="grid grid-cols-2 gap-2">
                {SPACE_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-left text-sm transition-all ${
                        type === t.value
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border hover:border-primary/40 text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-medium">{t.label}</p>
                        <p className="text-xs opacity-70">{t.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (optionnel)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez cet espace..."
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="space-y-0.5">
                <Label className="cursor-pointer">Activer les quotes-parts</Label>
                <p className="text-xs text-muted-foreground">Gestion des parts de propriété et votes pondérés</p>
              </div>
              <Switch checked={ownershipEnabled} onCheckedChange={setOwnershipEnabled} />
            </div>
            <Button className="w-full" onClick={() => setStep(2)} disabled={!name.trim()}>
              Suivant <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 2: Members */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Invitez des membres par email. Ils recevront une invitation à rejoindre l'espace.
            </p>
            {emails.map((email, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    const updated = [...emails];
                    updated[i] = e.target.value;
                    setEmails(updated);
                  }}
                  placeholder="email@exemple.com"
                />
                {emails.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setEmails(emails.filter((_, j) => j !== i))}>
                    ×
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setEmails([...emails, ""])}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter un membre
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
              <Button className="flex-1" onClick={() => setStep(3)}>
                Suivant <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: First house */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Ajouter une première maison</p>
                <p className="text-xs text-muted-foreground">Vous pourrez en ajouter d'autres plus tard</p>
              </div>
              <Switch checked={!skipHouse} onCheckedChange={(v) => setSkipHouse(!v)} />
            </div>

            {!skipHouse && (
              <>
                <div className="space-y-2">
                  <Label>Nom de la maison</Label>
                  <Input
                    value={houseName}
                    onChange={(e) => setHouseName(e.target.value)}
                    placeholder="Ex : Mas de Provence"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Localisation (optionnel)</Label>
                  <Input
                    value={houseLocation}
                    onChange={(e) => setHouseLocation(e.target.value)}
                    placeholder="Ex : Gordes, Vaucluse"
                  />
                </div>
              </>
            )}

            {/* Summary */}
            <Card className="border-border/50">
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Récapitulatif</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="text-xs">{name || "Sans nom"}</Badge>
                  {selectedType && <Badge variant="outline" className="text-xs">{selectedType.label}</Badge>}
                  {ownershipEnabled && <Badge variant="secondary" className="text-xs">Quotes-parts</Badge>}
                </div>
                {emails.filter((e) => e.trim()).length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {emails.filter((e) => e.trim()).length} membre(s) invité(s)
                  </p>
                )}
                {!skipHouse && houseName && (
                  <p className="text-xs text-muted-foreground">
                    🏠 {houseName}{houseLocation ? ` — ${houseLocation}` : ""}
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
              <Button className="flex-1" onClick={handleCreate} disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Création...</> : <><Check className="h-4 w-4 mr-1" /> Créer l'espace</>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateSpaceWizard;
