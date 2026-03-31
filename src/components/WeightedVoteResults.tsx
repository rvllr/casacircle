import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Scale } from "lucide-react";

interface WeightedVoteResultsProps {
  voteId: string;
  houseId: string;
  votingMode: string;
  majorityRule: string;
  responses: { user_id: string; response: "yes" | "no" | "abstain" }[];
}

const WeightedVoteResults = ({ voteId, houseId, votingMode, majorityRule, responses }: WeightedVoteResultsProps) => {
  const [shares, setShares] = useState<Record<string, number>>({});

  useEffect(() => {
    if (votingMode !== "weighted") return;
    supabase
      .from("ownership_shares")
      .select("user_id, percentage")
      .eq("house_id", houseId)
      .then(({ data }) => {
        const map: Record<string, number> = {};
        (data || []).forEach((s: any) => { map[s.user_id] = s.percentage; });
        setShares(map);
      });
  }, [houseId, votingMode]);

  if (votingMode !== "weighted" || Object.keys(shares).length === 0) return null;

  const yesW = responses
    .filter((r) => r.response === "yes")
    .reduce((sum, r) => sum + (shares[r.user_id] || 0), 0);
  const noW = responses
    .filter((r) => r.response === "no")
    .reduce((sum, r) => sum + (shares[r.user_id] || 0), 0);
  const abstainW = responses
    .filter((r) => r.response === "abstain")
    .reduce((sum, r) => sum + (shares[r.user_id] || 0), 0);
  const totalW = yesW + noW + abstainW;

  const threshold = majorityRule === "two_thirds" ? 66.67 : 50;
  const votingBase = totalW - abstainW;
  const yesPct = votingBase > 0 ? (yesW / votingBase) * 100 : 0;
  const isApproved = yesPct > threshold;

  const ruleLabel = majorityRule === "two_thirds" ? "Majorité 2/3" : majorityRule === "ownership" ? "Majorité quote-part" : "Majorité simple";

  return (
    <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Scale className="h-3.5 w-3.5" />
        Vote pondéré par quote-part · {ruleLabel}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-accent font-medium">Oui: {yesW.toFixed(1)}%</span>
        <span className="text-destructive font-medium">Non: {noW.toFixed(1)}%</span>
        <span className="text-muted-foreground">Abst: {abstainW.toFixed(1)}%</span>
      </div>
      <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden bg-muted">
        {yesW > 0 && <div className="bg-accent" style={{ width: `${totalW > 0 ? (yesW / totalW) * 100 : 0}%` }} />}
        {noW > 0 && <div className="bg-destructive" style={{ width: `${totalW > 0 ? (noW / totalW) * 100 : 0}%` }} />}
        {abstainW > 0 && <div className="bg-muted-foreground/30" style={{ width: `${totalW > 0 ? (abstainW / totalW) * 100 : 0}%` }} />}
      </div>
      <Badge variant={isApproved ? "default" : "secondary"} className={`text-xs ${isApproved ? "bg-accent text-accent-foreground" : ""}`}>
        {isApproved ? "✓ Approuvé" : "✗ Non approuvé"} ({yesPct.toFixed(1)}% vs {threshold}% requis)
      </Badge>
    </div>
  );
};

export default WeightedVoteResults;
