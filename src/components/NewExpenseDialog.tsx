import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { normalizeRelation } from "@/lib/supabaseHelpers";
import { Plus, AlertTriangle } from "lucide-react";
import { friendlyError } from "@/lib/errorMessages";
import {
  splitExpense,
  eurosToCents,
  centsToEuros,
  isOwnershipTotalValid,
  SPLIT_MODE_LABELS,
  type SplitMode,
  type SplitParticipant,
} from "@/lib/expenseSplit";

interface House {
  id: string;
  name: string;
  family_id: string | null;
  ownership_enabled: boolean;
}

interface Member {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
}

interface Props {
  onCreated: () => void;
}

const categoryLabels: Record<string, string> = {
  courses: "🛒 Courses",
  travaux: "🔨 Travaux",
  entretien: "🧹 Entretien",
  energie: "⚡ Énergie",
  assurance: "🛡️ Assurance",
  taxes: "📋 Taxes",
  menage: "🧽 Ménage",
  autre: "📦 Autre",
};

const NewExpenseDialog = ({ onCreated }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouse, setSelectedHouse] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [ownership, setOwnership] = useState<Record<string, number>>({});
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [manualAmounts, setManualAmounts] = useState<Record<string, string>>({});
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("autre");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    const fetchHouses = async () => {
      const { data } = await supabase
        .from("houses")
        .select("id, name, family_id, families(ownership_enabled)");
      setHouses(
        (data || []).map((h) => {
          const family = normalizeRelation(h.families as { ownership_enabled: boolean } | null);
          return {
            id: h.id,
            name: h.name,
            family_id: h.family_id,
            ownership_enabled: family?.ownership_enabled ?? false,
          };
        })
      );
    };
    fetchHouses();
  }, [open, user]);

  useEffect(() => {
    if (!selectedHouse) {
      setMembers([]);
      setOwnership({});
      return;
    }
    const fetchMembers = async () => {
      const house = houses.find((h) => h.id === selectedHouse);
      if (!house) return;

      // Une maison peut être rattachée à un espace (family_id) OU être un bien direct
      // sans espace. Dans ce second cas, family_members ne renvoie rien : on retombe
      // alors sur house_members, sinon le formulaire reste bloqué sans participant.
      let userIds: string[] = [];
      if (house.family_id) {
        const { data: fm } = await supabase
          .from("family_members")
          .select("user_id")
          .eq("family_id", house.family_id);
        userIds = (fm || []).map((m) => m.user_id);
      }
      if (userIds.length === 0) {
        const { data: hm } = await supabase
          .from("house_members")
          .select("user_id")
          .eq("house_id", house.id);
        userIds = (hm || []).map((m) => m.user_id);
      }

      if (userIds.length === 0) {
        setMembers([]);
        setSelectedMembers([]);
        setOwnership({});
        return;
      }

      const [{ data: profiles }, { data: shares }] = await Promise.all([
        supabase.from("users_profiles").select("user_id, first_name, last_name").in("user_id", userIds),
        supabase.from("ownership_shares").select("user_id, percentage").eq("house_id", house.id),
      ]);

      setMembers(profiles || []);
      setSelectedMembers(userIds);

      const shareMap: Record<string, number> = {};
      (shares || []).forEach((s) => { shareMap[s.user_id] = Number(s.percentage); });
      setOwnership(shareMap);

      // Défaut : au prorata si l'espace active les quotes-parts ET qu'elles existent.
      const hasShares = Object.values(shareMap).some((p) => p > 0);
      setSplitMode(house.ownership_enabled && hasShares ? "ownership" : "equal");
      setManualAmounts({});
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

  const getNameById = (userId: string) => {
    const m = members.find((x) => x.user_id === userId);
    return m ? getMemberName(m) : "Membre";
  };

  const hasOwnershipShares = Object.values(ownership).some((p) => p > 0);

  /** Participants transmis à la fonction de répartition. */
  const participants: SplitParticipant[] = useMemo(
    () =>
      selectedMembers.map((uid) => ({
        userId: uid,
        percentage: ownership[uid] ?? 0,
        amountCents: manualAmounts[uid] ? eurosToCents(parseFloat(manualAmounts[uid])) : undefined,
      })),
    [selectedMembers, ownership, manualAmounts]
  );

  /**
   * Aperçu de la répartition. On calcule avec la MÊME fonction que celle utilisée à
   * l'enregistrement : ce qui est affiché est exactement ce qui sera écrit en base.
   */
  const preview = useMemo(() => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0 || participants.length === 0) return null;

    // En mode prorata, une assiette de quotes-parts qui ne fait pas 100 % produirait
    // des chiffres faux : on refuse plutôt que de normaliser en silence.
    if (splitMode === "ownership") {
      const pcts = participants.map((p) => p.percentage ?? 0);
      if (!isOwnershipTotalValid(pcts)) {
        const total = pcts.reduce((a, b) => a + b, 0);
        return {
          error: `La somme des quotes-parts des participants sélectionnés vaut ${total}% au lieu de 100%. Corrigez les quotes-parts dans l'onglet Propriété, ou choisissez un autre mode de répartition.`,
        } as const;
      }
    }

    const result = splitExpense(eurosToCents(numAmount), participants, splitMode);
    if (result.status === "error") return { error: result.message } as const;
    return { shares: result.shares } as const;
  }, [amount, participants, splitMode]);

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setCategory("autre");
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setSelectedHouse("");
    setSelectedMembers([]);
    setOwnership({});
    setManualAmounts({});
    setSplitMode("equal");
  };

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

    // La répartition est calculée AVANT l'insertion : inutile de créer une dépense
    // qu'on ne saurait pas répartir.
    if (!preview || "error" in preview) {
      toast({
        title: "Répartition impossible",
        description: preview?.error ?? "Vérifiez le montant et les participants.",
        variant: "destructive",
      });
      return;
    }
    const computedShares = preview.shares;

    setLoading(true);
    const { data: expense, error } = await supabase
      .from("expenses")
      .insert({
        house_id: selectedHouse,
        description: description.trim(),
        amount: numAmount,
        paid_by: user.id,
        category,
        expense_date: expenseDate || null,
        split_mode: splitMode,
      } as never)
      .select("id")
      .single();

    if (error || !expense) {
      toast({ title: "Erreur", description: friendlyError(error), variant: "destructive" });
      setLoading(false);
      return;
    }

    const shares = computedShares.map((s) => ({
      expense_id: expense.id,
      user_id: s.userId,
      amount: centsToEuros(s.amountCents),
    }));

    const { error: sharesError } = await supabase.from("expense_shares").insert(shares);
    if (sharesError) {
      // La dépense existe mais n'est pas répartie : on le dit explicitement, sinon
      // elle apparaîtrait dans les totaux sans jamais peser sur le solde de personne.
      toast({
        title: "Erreur de répartition",
        description: `La dépense a été créée mais n'a pas pu être répartie (${sharesError.message}). Supprimez-la et recommencez.`,
        variant: "destructive",
      });
    } else {
      toast({ title: "Dépense ajoutée !" });
      onCreated();
      setOpen(false);
      resetForm();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-soft"><Plus className="h-4 w-4 mr-2" />Nouvelle dépense</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Ajouter une dépense</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Maison</Label>
            <Select value={selectedHouse} onValueChange={setSelectedHouse}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choisir une maison" /></SelectTrigger>
              <SelectContent>
                {houses.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Courses, réparation..." maxLength={200} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Montant (€)</Label>
            <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="rounded-xl" />
          </div>
          {members.length > 0 && (
            <>
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
                      {splitMode === "ownership" && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          {ownership[m.user_id] ?? 0}%
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mode de répartition</Label>
                <Select value={splitMode} onValueChange={(v) => setSplitMode(v as SplitMode)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equal">{SPLIT_MODE_LABELS.equal}</SelectItem>
                    <SelectItem value="ownership" disabled={!hasOwnershipShares}>
                      {SPLIT_MODE_LABELS.ownership}
                    </SelectItem>
                    <SelectItem value="manual">{SPLIT_MODE_LABELS.manual}</SelectItem>
                  </SelectContent>
                </Select>
                {!hasOwnershipShares && (
                  <p className="text-xs text-muted-foreground">
                    Aucune quote-part définie pour cette maison : le prorata est indisponible.
                  </p>
                )}
              </div>

              {splitMode === "manual" && selectedMembers.length > 0 && (
                <div className="space-y-2">
                  <Label>Parts manuelles (€)</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedMembers.map((uid) => (
                      <div key={uid} className="flex items-center gap-2">
                        <span className="text-sm flex-1 truncate">{getNameById(uid)}</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={manualAmounts[uid] ?? ""}
                          onChange={(e) => setManualAmounts({ ...manualAmounts, [uid]: e.target.value })}
                          placeholder="0.00"
                          className="w-24 h-8 text-right rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview && "error" in preview && (
                <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-2.5 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{preview.error}</span>
                </div>
              )}

              {preview && "shares" in preview && (
                <div className="space-y-1 rounded-xl bg-muted/50 p-2.5">
                  <p className="text-xs font-medium text-foreground">Répartition</p>
                  {preview.shares.map((s) => (
                    <div key={s.userId} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate">{getNameById(s.userId)}</span>
                      <span className="font-mono text-foreground">{centsToEuros(s.amountCents).toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          <Button
            onClick={handleSubmit}
            disabled={loading || !preview || "error" in preview}
            className="w-full rounded-xl"
          >
            {loading ? "Ajout..." : "Ajouter la dépense"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewExpenseDialog;
