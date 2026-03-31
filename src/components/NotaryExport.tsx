import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileDown, Loader2, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface NotaryExportProps {
  houseId: string;
  houseName: string;
  members: { user_id: string; profile?: { first_name: string | null; last_name: string | null; email: string | null } }[];
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes(";")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const NotaryExport = ({ houseId, houseName, members }: NotaryExportProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const getName = (userId: string) => {
    const m = members.find((m) => m.user_id === userId);
    if (!m?.profile) return "Membre";
    return [m.profile.first_name, m.profile.last_name].filter(Boolean).join(" ") || m.profile.email || "Membre";
  };

  const handleExport = async () => {
    setLoading(true);

    const [{ data: shares }, { data: decisions }, { data: pacts }, { data: sigs }] = await Promise.all([
      supabase.from("ownership_shares").select("user_id, percentage").eq("house_id", houseId),
      supabase.from("decision_register").select("*").eq("house_id", houseId).order("decided_at", { ascending: false }),
      supabase.from("family_pacts").select("*").eq("house_id", houseId).order("created_at", { ascending: false }),
      supabase.from("pact_signatures").select("*"),
    ]);

    const now = format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr });
    const sections: string[] = [];

    // Header
    sections.push(`DOSSIER PATRIMONIAL — ${houseName.toUpperCase()}`);
    sections.push(`Exporté le ${now}`);
    sections.push(`${"=".repeat(60)}\n`);

    // Section 1: Ownership
    sections.push("1. RÉPARTITION DES QUOTES-PARTS");
    sections.push("-".repeat(40));
    if (shares && shares.length > 0) {
      (shares as any[]).forEach((s) => {
        sections.push(`  ${getName(s.user_id)} : ${s.percentage}%`);
      });
      const total = (shares as any[]).reduce((sum, s) => sum + s.percentage, 0);
      sections.push(`  TOTAL : ${total}%`);
    } else {
      sections.push("  Aucune quote-part configurée.");
    }
    sections.push("");

    // Section 2: Decisions
    sections.push("2. REGISTRE DES DÉCISIONS");
    sections.push("-".repeat(40));
    if (decisions && decisions.length > 0) {
      (decisions as any[]).forEach((d, i) => {
        const date = format(new Date(d.decided_at), "dd/MM/yyyy", { locale: fr });
        const result = d.decision === "approved" ? "APPROUVÉ" : "REJETÉ";
        sections.push(`  ${i + 1}. [${date}] ${d.title} — ${result}`);
        if (d.description) sections.push(`     ${d.description}`);
        sections.push(`     Votes: Oui ${d.yes_count} / Non ${d.no_count} / Abstention ${d.abstain_count}`);
        if (d.voting_mode === "weighted") {
          sections.push(`     Pondéré: Oui ${(d.yes_weighted || 0).toFixed(1)}% / Non ${(d.no_weighted || 0).toFixed(1)}%`);
        }
        sections.push("");
      });
    } else {
      sections.push("  Aucune décision enregistrée.");
    }
    sections.push("");

    // Section 3: Pacts
    sections.push("3. PACTES FAMILIAUX");
    sections.push("-".repeat(40));
    if (pacts && pacts.length > 0) {
      (pacts as any[]).forEach((p) => {
        const statusLabel = p.status === "active" ? "EN VIGUEUR" : p.status === "draft" ? "BROUILLON" : "ARCHIVÉ";
        sections.push(`  ► ${p.title} [${statusLabel}]`);
        sections.push(`    Créé le ${format(new Date(p.created_at), "dd/MM/yyyy", { locale: fr })}`);

        const pactSigs = (sigs || []).filter((s: any) => s.pact_id === p.id);
        if (pactSigs.length > 0) {
          sections.push(`    Signataires (${pactSigs.length}):`);
          pactSigs.forEach((s: any) => {
            sections.push(`      - ${getName(s.user_id)} (signé le ${format(new Date(s.signed_at), "dd/MM/yyyy", { locale: fr })})`);
          });
        } else {
          sections.push("    Aucun signataire.");
        }
        if (p.content) {
          sections.push("    --- Contenu ---");
          p.content.split("\n").forEach((line: string) => sections.push(`    ${line}`));
          sections.push("    --- Fin ---");
        }
        sections.push("");
      });
    } else {
      sections.push("  Aucun pacte familial.");
    }

    // Section 4: Members
    sections.push("");
    sections.push("4. MEMBRES DU BIEN");
    sections.push("-".repeat(40));
    members.forEach((m) => {
      sections.push(`  - ${getName(m.user_id)}`);
    });

    // Footer
    sections.push(`\n${"=".repeat(60)}`);
    sections.push("Document généré automatiquement par CasaCircle.");
    sections.push("Ce document n'a pas de valeur juridique intrinsèque.");
    sections.push("Il est destiné à faciliter le travail du notaire.");

    const text = sections.join("\n");
    const blob = new Blob(["\uFEFF" + text], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dossier_patrimonial_${houseName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Dossier exporté !", description: "Le fichier a été téléchargé." });
    setLoading(false);
  };

  return (
    <Card className="border-border/50 shadow-soft">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h4 className="font-display text-sm text-foreground">Coffre notaire</h4>
              <p className="text-xs text-muted-foreground">Exportez le dossier patrimonial complet : quotes-parts, décisions, pactes, signataires.</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleExport} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
            Exporter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotaryExport;
