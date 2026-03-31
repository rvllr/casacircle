import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, TrendingUp, TrendingDown, Minus, CheckCircle2 } from "lucide-react";

interface FairnessScoreProps {
  houseId: string;
  members: { user_id: string; profile?: { first_name: string | null; last_name: string | null; email: string | null } }[];
}

interface MemberScore {
  user_id: string;
  name: string;
  ownershipPct: number;
  usagePct: number;
  expensePct: number;
  score: number; // 0-100, 100 = perfectly fair
  status: "equitable" | "sur-usage" | "sous-usage";
}

const FairnessScore = ({ houseId, members }: FairnessScoreProps) => {
  const [scores, setScores] = useState<MemberScore[]>([]);
  const [globalScore, setGlobalScore] = useState(100);

  const getName = useCallback((userId: string) => {
    const m = members.find((m) => m.user_id === userId);
    if (!m?.profile) return "Membre";
    return [m.profile.first_name, m.profile.last_name].filter(Boolean).join(" ") || m.profile.email || "Membre";
  }, [members]);

  const fetchData = useCallback(async () => {
    const year = new Date().getFullYear();
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const [{ data: sharesData }, { data: bookingsData }, { data: expensesData }] = await Promise.all([
      supabase.from("ownership_shares").select("user_id, percentage").eq("house_id", houseId),
      supabase.from("bookings").select("user_id, start_date, end_date, status")
        .eq("house_id", houseId).in("status", ["approved", "pending"])
        .gte("start_date", yearStart).lte("start_date", yearEnd),
      supabase.from("expenses").select("paid_by, amount")
        .eq("house_id", houseId)
        .gte("created_at", yearStart),
    ]);

    if (!sharesData?.length) {
      setScores([]);
      setGlobalScore(100);
      return;
    }

    const ownershipMap: Record<string, number> = {};
    (sharesData || []).forEach((s: any) => { ownershipMap[s.user_id] = s.percentage; });

    // Usage
    const nightsMap: Record<string, number> = {};
    let totalNights = 0;
    (bookingsData || []).forEach((b: any) => {
      const nights = Math.max(0, Math.round((new Date(b.end_date).getTime() - new Date(b.start_date).getTime()) / 86400000));
      nightsMap[b.user_id] = (nightsMap[b.user_id] || 0) + nights;
      totalNights += nights;
    });

    // Expenses
    const expenseMap: Record<string, number> = {};
    let totalExpenses = 0;
    (expensesData || []).forEach((e: any) => {
      expenseMap[e.paid_by] = (expenseMap[e.paid_by] || 0) + Number(e.amount);
      totalExpenses += Number(e.amount);
    });

    const memberScores: MemberScore[] = Object.entries(ownershipMap).map(([userId, ownershipPct]) => {
      const usagePct = totalNights > 0 ? ((nightsMap[userId] || 0) / totalNights) * 100 : ownershipPct;
      const expensePct = totalExpenses > 0 ? ((expenseMap[userId] || 0) / totalExpenses) * 100 : ownershipPct;

      // Score: how close usage + expenses are to ownership (weighted)
      const usageDiff = Math.abs(usagePct - ownershipPct);
      const expenseDiff = Math.abs(expensePct - ownershipPct);
      const score = Math.max(0, 100 - (usageDiff * 0.6 + expenseDiff * 0.4));

      let status: MemberScore["status"] = "equitable";
      if (usagePct - ownershipPct > 5) status = "sur-usage";
      else if (ownershipPct - usagePct > 5) status = "sous-usage";

      return {
        user_id: userId, name: getName(userId),
        ownershipPct, usagePct: Math.round(usagePct), expensePct: Math.round(expensePct),
        score: Math.round(score), status,
      };
    });

    setScores(memberScores);
    setGlobalScore(Math.round(memberScores.reduce((a, s) => a + s.score, 0) / memberScores.length));
  }, [houseId, members, getName]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (scores.length === 0) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-accent";
    if (score >= 50) return "text-primary";
    return "text-destructive";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Équitable";
    if (score >= 50) return "Déséquilibré";
    return "Très déséquilibré";
  };

  const statusConfig = {
    equitable: { icon: Minus, color: "text-accent", bg: "bg-accent/10" },
    "sur-usage": { icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
    "sous-usage": { icon: TrendingDown, color: "text-muted-foreground", bg: "bg-muted" },
  };

  return (
    <Card className="border-border/50 shadow-soft">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <h3 className="font-display text-base text-foreground">Score d'équité</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-display ${getScoreColor(globalScore)}`}>{globalScore}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>

        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${globalScore >= 80 ? "bg-accent" : globalScore >= 50 ? "bg-primary" : "bg-destructive"}`}
            style={{ width: `${globalScore}%` }}
          />
        </div>

        <p className={`text-sm font-medium ${getScoreColor(globalScore)}`}>
          {getScoreLabel(globalScore)}
        </p>

        <div className="space-y-2">
          {scores.map((s) => {
            const cfg = statusConfig[s.status];
            const Icon = cfg.icon;
            return (
              <div key={s.user_id} className={`flex items-center gap-3 p-2.5 rounded-lg ${cfg.bg}`}>
                <Icon className={`h-4 w-4 ${cfg.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Propriété {s.ownershipPct}% · Usage {s.usagePct}% · Dépenses {s.expensePct}%
                  </p>
                </div>
                <Badge variant={s.status === "equitable" ? "secondary" : "outline"} className="text-xs shrink-0">
                  {s.score}/100
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default FairnessScore;
