import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Plus, Save, Trash2, AlertTriangle, CheckCircle2, History } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isOwnershipTotalValid } from "@/lib/expenseSplit";
import { friendlyError } from "@/lib/errorMessages";

/** Affiche un pourcentage sans traîne flottante (99.99000000000001 → 99.99). */
const formatPct = (value: number) => Number(value.toFixed(2)).toString();

interface OwnershipShare {
  id: string;
  user_id: string;
  percentage: number;
  profile?: { first_name: string | null; last_name: string | null; email: string | null };
}

interface OwnershipTabProps {
  houseId: string;
  isAdmin: boolean;
  members: { user_id: string; profile?: { first_name: string | null; last_name: string | null; email: string | null } }[];
}

const OwnershipTab = ({ houseId, isAdmin, members }: OwnershipTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shares, setShares] = useState<OwnershipShare[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, number>>({});

  const fetchData = useCallback(async () => {
    const [{ data: sharesData, error: sharesError }, { data: historyData }] = await Promise.all([
      supabase.from("ownership_shares").select("*").eq("house_id", houseId),
      supabase.from("ownership_history").select("*").eq("house_id", houseId).order("created_at", { ascending: false }).limit(20),
    ]);
    if (sharesError) {
      toast({ title: "Erreur de chargement", description: "Impossible de récupérer les parts de propriété.", variant: "destructive" });
    }

    const profileMap: Record<string, any> = {};
    members.forEach((m) => { profileMap[m.user_id] = m.profile; });

    const enriched = (sharesData || []).map((s: any) => ({
      ...s,
      profile: profileMap[s.user_id],
    }));
    setShares(enriched);
    setHistory(historyData || []);

    const draftMap: Record<string, number> = {};
    enriched.forEach((s) => { draftMap[s.user_id] = s.percentage; });
    setDraft(draftMap);
  }, [houseId, members]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentPercentages = Object.values(
    editing ? draft : shares.reduce((acc, s) => { acc[s.user_id] = s.percentage; return acc; }, {} as Record<string, number>)
  );
  const total = currentPercentages.reduce((a, b) => a + b, 0);
  const isCurrentTotalValid = isOwnershipTotalValid(currentPercentages);

  const startEditing = () => {
    const d: Record<string, number> = {};
    shares.forEach((s) => { d[s.user_id] = s.percentage; });
    // Add members without shares
    members.forEach((m) => { if (!(m.user_id in d)) d[m.user_id] = 0; });
    setDraft(d);
    setEditing(true);
  };

  /**
   * Enregistrement ATOMIQUE de toutes les quotes-parts via la RPC dédiée.
   *
   * L'ancienne version écrivait ligne par ligne : une part mise à 0 n'était jamais
   * supprimée (on ne pouvait donc pas retirer un copropriétaire), et un échec en cours
   * de boucle laissait la maison dans un état incohérent. La RPC fait le remplacement
   * complet en une transaction et valide la somme à 100 % côté base.
   */
  const saveDraft = async () => {
    if (!isTotalValid) {
      toast({
        title: "Répartition incomplète",
        description: `La somme des quotes-parts doit valoir exactement 100 % (actuellement ${formatPct(draftTotal)} %).`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { error } = await (supabase.rpc as any)("save_ownership_shares", {
      _house_id: houseId,
      _shares: Object.entries(draft).map(([userId, percentage]) => ({ user_id: userId, percentage })),
    });
    setSaving(false);

    if (error) {
      toast({ title: "Erreur d'enregistrement", description: friendlyError(error), variant: "destructive" });
      return;
    }

    toast({ title: "Quotes-parts mises à jour !" });
    setEditing(false);
    fetchData();
  };

  const getName = (userId: string) => {
    const m = members.find((m) => m.user_id === userId);
    if (!m?.profile) return "Membre";
    return [m.profile.first_name, m.profile.last_name].filter(Boolean).join(" ") || m.profile.email || "Membre";
  };

  const draftTotal = Object.values(draft).reduce((a, b) => a + b, 0);
  // Validation stricte : la somme doit valoir 100 %, à la tolérance décimale près
  // (les parts sont en numeric, 33.33 × 3 = 99.99 doit rester acceptable).
  const isTotalValid = isOwnershipTotalValid(Object.values(draft));

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="border-border/50 shadow-soft">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total réparti</p>
            <p className={`text-2xl font-display ${isCurrentTotalValid ? "text-accent" : "text-destructive"}`}>
              {formatPct(total)}%
            </p>
            {!isCurrentTotalValid && (
              <div className="flex items-center justify-center gap-1 mt-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" /> {total < 100 ? `${formatPct(100 - total)}% non attribué` : `${formatPct(total - 100)}% en trop`}
              </div>
            )}
            {isCurrentTotalValid && (
              <div className="flex items-center justify-center gap-1 mt-1 text-xs text-accent">
                <CheckCircle2 className="h-3 w-3" /> Répartition complète
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-soft">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Copropriétaires</p>
            <p className="text-2xl font-display text-foreground">{shares.filter((s) => s.percentage > 0).length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-soft">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Mode</p>
            <p className="text-lg font-display text-foreground">Indivision</p>
          </CardContent>
        </Card>
      </div>

      {/* Visual bar */}
      {shares.length > 0 && (
        <Card className="border-border/50 shadow-soft">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-3 font-medium">Répartition</p>
            <div className="flex rounded-lg overflow-hidden h-8">
              {shares.filter((s) => s.percentage > 0).map((s, i) => {
                const colors = [
                  "bg-primary", "bg-accent", "bg-[hsl(var(--lavender))]",
                  "bg-[hsl(var(--sand))]", "bg-muted-foreground", "bg-primary/60",
                ];
                return (
                  <div
                    key={s.id}
                    className={`${colors[i % colors.length]} flex items-center justify-center text-xs font-medium text-white transition-all`}
                    style={{ width: `${s.percentage}%` }}
                    title={`${getName(s.user_id)}: ${s.percentage}%`}
                  >
                    {s.percentage >= 10 && `${s.percentage}%`}
                  </div>
                );
              })}
              {total < 100 && (
                <div className="bg-muted flex items-center justify-center text-xs text-muted-foreground" style={{ width: `${100 - total}%` }}>
                  {100 - total >= 10 && `${100 - total}%`}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              {shares.filter((s) => s.percentage > 0).map((s, i) => {
                const colors = ["text-primary", "text-accent", "text-[hsl(var(--lavender))]", "text-muted-foreground"];
                const dots = ["bg-primary", "bg-accent", "bg-[hsl(var(--lavender))]", "bg-muted-foreground"];
                return (
                  <div key={s.id} className="flex items-center gap-1.5 text-xs">
                    <div className={`w-2.5 h-2.5 rounded-full ${dots[i % dots.length]}`} />
                    <span className="text-foreground">{getName(s.user_id)}</span>
                    <span className="text-muted-foreground">{s.percentage}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="border-border/50 shadow-soft">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <PieChart className="h-4 w-4 text-primary" /> Quotes-parts
          </CardTitle>
          <div className="flex items-center gap-2">
            {isAdmin && !editing && (
              <Button variant="outline" size="sm" onClick={startEditing} className="h-8 text-xs">
                Modifier
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="h-8 text-xs">
              <History className="h-3.5 w-3.5 mr-1" /> Historique
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-3">
              {Object.entries(draft).map(([userId, pct]) => (
                <div key={userId} className="flex items-center gap-3">
                  <span className="text-sm flex-1 truncate">{getName(userId)}</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={pct}
                      onChange={(e) => setDraft({ ...draft, [userId]: parseFloat(e.target.value) || 0 })}
                      className="w-20 h-8 text-center text-sm"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${isTotalValid ? "text-accent" : "text-destructive"}`}>
                    Total : {formatPct(draftTotal)}%
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Annuler</Button>
                    <Button size="sm" onClick={saveDraft} disabled={!isTotalValid || saving}>
                      <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                  </div>
                </div>
                {!isTotalValid && (
                  <p className="flex items-start gap-1.5 text-xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5 mt-px shrink-0" />
                    <span>
                      La répartition doit totaliser exactement 100 %
                      {draftTotal < 100
                        ? ` — il manque ${formatPct(100 - draftTotal)} %.`
                        : ` — ${formatPct(draftTotal - 100)} % en trop.`}
                      {" "}Mettez une part à 0 pour retirer un copropriétaire.
                    </span>
                  </p>
                )}
              </div>
            </div>
          ) : shares.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <PieChart className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Aucune quote-part définie.</p>
              {isAdmin && <p className="text-sm mt-1">Cliquez sur "Modifier" pour attribuer les parts.</p>}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead className="text-right">Quote-part</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shares.filter((s) => s.percentage > 0).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{getName(s.user_id)}</TableCell>
                    <TableCell className="text-right font-mono">{s.percentage}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {showHistory && (
        <Card className="border-border/50 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">Historique des modifications</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun historique.</p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-muted/50">
                    <History className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium">{getName(h.user_id)}</span>
                      {" : "}
                      <span className="text-muted-foreground">{h.old_percentage}% → {h.new_percentage}%</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(h.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OwnershipTab;
