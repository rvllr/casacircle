import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Plus, CheckCircle2, Clock, Loader2, PenLine, Users, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDateLong } from "@/lib/dateFormatter";

interface FamilyPactProps {
  houseId: string;
  isAdmin: boolean;
  members: { user_id: string; profile?: { first_name: string | null; last_name: string | null; email: string | null } }[];
}

interface Pact {
  id: string;
  title: string;
  content: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Signature {
  id: string;
  pact_id: string;
  user_id: string;
  signed_at: string;
}

const PACT_TEMPLATE = `# Pacte familial — Règles de gouvernance

## 1. Répartition de l'usage
- Chaque copropriétaire bénéficie d'un droit d'usage proportionnel à sa quote-part.
- Un système de rotation annuelle garantit l'équité des périodes de haute saison.

## 2. Réservations
- Les réservations sont soumises au système de priorité pondéré.
- Un délai de prévenance de 30 jours est recommandé.
- Les invités sont autorisés dans la limite de la capacité du logement.

## 3. Entretien et charges
- Les charges courantes sont réparties au prorata des quotes-parts.
- Les travaux exceptionnels font l'objet d'un vote à la majorité des 2/3.

## 4. Cession de parts
- Tout projet de cession doit être notifié aux autres copropriétaires.
- Un droit de préemption est accordé aux membres de la famille.

## 5. Résolution des conflits
- Les différends sont d'abord soumis au vote familial.
- En cas de blocage, un médiateur familial peut être désigné.
`;

const FamilyPact = ({ houseId, isAdmin, members }: FamilyPactProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pacts, setPacts] = useState<Pact[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingPact, setEditingPact] = useState<Pact | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const getName = useCallback((userId: string) => {
    const m = members.find((m) => m.user_id === userId);
    if (!m?.profile) return "Membre";
    return [m.profile.first_name, m.profile.last_name].filter(Boolean).join(" ") || m.profile.email || "Membre";
  }, [members]);

  const fetchPacts = useCallback(async () => {
    const [{ data: pactData }, { data: sigData }] = await Promise.all([
      supabase.from("family_pacts").select("*").eq("house_id", houseId).order("created_at", { ascending: false }),
      supabase.from("pact_signatures").select("*"),
    ]);
    setPacts((pactData || []) as Pact[]);
    setSignatures((sigData || []) as Signature[]);
    setLoading(false);
  }, [houseId]);

  useEffect(() => { fetchPacts(); }, [fetchPacts]);

  const handleCreate = async () => {
    if (!title.trim() || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("family_pacts").insert({
      house_id: houseId,
      created_by: user.id,
      title: title.trim(),
      content: content.trim() || null,
      status: "draft",
    } as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pacte créé !" });
      setTitle(""); setContent(""); setDialogOpen(false);
      fetchPacts();
    }
    setSubmitting(false);
  };

  const handleActivate = async (pactId: string) => {
    await supabase.from("family_pacts").update({ status: "active", updated_at: new Date().toISOString() } as any).eq("id", pactId);
    toast({ title: "Pacte activé" });
    fetchPacts();
  };

  const handleArchive = async (pactId: string) => {
    await supabase.from("family_pacts").update({ status: "archived", updated_at: new Date().toISOString() } as any).eq("id", pactId);
    toast({ title: "Pacte archivé" });
    fetchPacts();
  };

  const handleSign = async (pactId: string) => {
    if (!user) return;
    const { error } = await supabase.from("pact_signatures").insert({
      pact_id: pactId,
      user_id: user.id,
    } as any);
    if (error) {
      if (error.code === "23505") toast({ title: "Vous avez déjà signé ce pacte" });
      else toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pacte signé ✓" });
      fetchPacts();
    }
  };

  const handleEditSave = async () => {
    if (!editingPact) return;
    setSubmitting(true);
    await supabase.from("family_pacts").update({
      title: title.trim(),
      content: content.trim() || null,
      updated_at: new Date().toISOString(),
    } as any).eq("id", editingPact.id);
    toast({ title: "Pacte mis à jour" });
    setEditingPact(null); setTitle(""); setContent("");
    setSubmitting(false);
    fetchPacts();
  };

  if (loading) return <div className="animate-pulse text-muted-foreground text-sm p-4">Chargement...</div>;

  const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: "Brouillon", color: "" },
    active: { label: "En vigueur", color: "bg-accent text-accent-foreground" },
    archived: { label: "Archivé", color: "" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg text-foreground">Pacte familial</h3>
          {pacts.length > 0 && <Badge variant="secondary" className="text-xs">{pacts.length}</Badge>}
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { setTitle(""); setContent(PACT_TEMPLATE); }}>
                <Plus className="h-4 w-4 mr-1" />Nouveau pacte
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Créer un pacte familial</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Pacte de gouvernance 2026" />
                </div>
                <div className="space-y-2">
                  <Label>Contenu (Markdown)</Label>
                  <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={16} className="font-mono text-xs" />
                </div>
                <Button onClick={handleCreate} disabled={!title.trim() || submitting} className="w-full">
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Créer le pacte
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Edit dialog */}
      {editingPact && (
        <Dialog open={!!editingPact} onOpenChange={() => setEditingPact(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Modifier le pacte</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Titre</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contenu (Markdown)</Label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={16} className="font-mono text-xs" />
              </div>
              <Button onClick={handleEditSave} disabled={!title.trim() || submitting} className="w-full">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {pacts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-display text-lg text-foreground mb-1">Aucun pacte familial</h3>
            <p className="text-sm text-muted-foreground">Créez un pacte pour formaliser les règles de gouvernance de votre bien.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pacts.map((pact) => {
            const cfg = statusConfig[pact.status] || statusConfig.draft;
            const pactSigs = signatures.filter(s => s.pact_id === pact.id);
            const hasSigned = pactSigs.some(s => s.user_id === user?.id);
            const activeMembers = members.filter(m => m.user_id);

            return (
              <Card key={pact.id} className="border-border/50 shadow-soft">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="font-display text-sm text-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        {pact.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Mis à jour le {formatDateLong(pact.updated_at)}
                      </p>
                    </div>
                    <Badge variant={pact.status === "active" ? "default" : "secondary"} className={`text-xs shrink-0 ${cfg.color}`}>
                      {cfg.label}
                    </Badge>
                  </div>

                  {/* Pact content preview */}
                  {pact.content && (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border/30 max-h-40 overflow-y-auto">
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">{pact.content}</pre>
                    </div>
                  )}

                  {/* Signatures */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{pactSigs.length} / {activeMembers.length} signature{pactSigs.length > 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeMembers.map((m) => {
                        const sig = pactSigs.find(s => s.user_id === m.user_id);
                        return (
                          <Badge
                            key={m.user_id}
                            variant={sig ? "default" : "outline"}
                            className={`text-[10px] ${sig ? "bg-accent text-accent-foreground" : "border-dashed"}`}
                          >
                            {sig && <CheckCircle2 className="h-2.5 w-2.5 mr-1" />}
                            {!sig && <Clock className="h-2.5 w-2.5 mr-1" />}
                            {getName(m.user_id)}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {pact.status === "active" && !hasSigned && (
                      <Button size="sm" onClick={() => handleSign(pact.id)}>
                        <PenLine className="h-3.5 w-3.5 mr-1" />Signer
                      </Button>
                    )}
                    {isAdmin && pact.status === "draft" && (
                      <>
                        <Button size="sm" onClick={() => handleActivate(pact.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Activer
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          setEditingPact(pact); setTitle(pact.title); setContent(pact.content || "");
                        }}>
                          <PenLine className="h-3.5 w-3.5 mr-1" />Modifier
                        </Button>
                      </>
                    )}
                    {isAdmin && pact.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => handleArchive(pact.id)}>
                        Archiver
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FamilyPact;
