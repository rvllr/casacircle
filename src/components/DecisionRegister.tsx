import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookMarked, CheckCircle2, XCircle } from "lucide-react";
import { formatDateLong } from "@/lib/dateFormatter";

interface DecisionRegisterProps {
  houseId: string;
}

interface Decision {
  id: string;
  title: string;
  description: string | null;
  decision: string;
  decided_at: string;
  yes_count: number;
  no_count: number;
  abstain_count: number;
  yes_weighted: number;
  no_weighted: number;
  majority_rule: string;
  voting_mode: string;
}

const DecisionRegister = ({ houseId }: DecisionRegisterProps) => {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDecisions = useCallback(async () => {
    const { data } = await supabase
      .from("decision_register")
      .select("*")
      .eq("house_id", houseId)
      .order("decided_at", { ascending: false });
    setDecisions((data || []) as Decision[]);
    setLoading(false);
  }, [houseId]);

  useEffect(() => { fetchDecisions(); }, [fetchDecisions]);

  if (loading) return <div className="animate-pulse text-muted-foreground text-sm p-4">Chargement...</div>;

  if (decisions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookMarked className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display text-lg text-foreground mb-1">Aucune décision enregistrée</h3>
          <p className="text-sm text-muted-foreground">Les votes validés apparaîtront ici automatiquement.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <BookMarked className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg text-foreground">Registre des décisions</h3>
        <Badge variant="secondary" className="text-xs">{decisions.length}</Badge>
      </div>

      <div className="relative border-l-2 border-border ml-3 space-y-4">
        {decisions.map((d) => {
          const isApproved = d.decision === "approved";
          return (
            <div key={d.id} className="relative pl-6">
              <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-background ${isApproved ? "bg-accent" : "bg-destructive"}`} />
              <Card className="border-border/50 shadow-soft">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <h4 className="font-medium text-foreground text-sm flex items-center gap-1.5">
                        {isApproved ? <CheckCircle2 className="h-3.5 w-3.5 text-accent" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                        {d.title}
                      </h4>
                      {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
                    </div>
                    <Badge variant={isApproved ? "default" : "destructive"} className={`text-xs shrink-0 ${isApproved ? "bg-accent text-accent-foreground" : ""}`}>
                      {isApproved ? "Approuvé" : "Rejeté"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDateLong(d.decided_at)}</span>
                    <span>·</span>
                    <span>Oui: {d.yes_count} · Non: {d.no_count} · Abst: {d.abstain_count}</span>
                    {d.voting_mode === "weighted" && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          Pondéré: {d.yes_weighted.toFixed(1)}% / {d.no_weighted.toFixed(1)}%
                        </span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DecisionRegister;
