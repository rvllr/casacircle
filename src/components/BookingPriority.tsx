import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Scale, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";

interface BookingPriorityProps {
  houseId: string;
  members: { user_id: string; profile?: { first_name: string | null; last_name: string | null; email: string | null } }[];
}

const BookingPriority = ({ houseId, members }: BookingPriorityProps) => {
  const [priorities, setPriorities] = useState<{
    userId: string;
    name: string;
    ownershipPct: number;
    usagePct: number;
    delta: number;
    priority: number;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const year = new Date().getFullYear();
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      const [{ data: shares }, { data: bookings }] = await Promise.all([
        supabase.from("ownership_shares").select("user_id, percentage").eq("house_id", houseId),
        supabase.from("bookings").select("user_id, start_date, end_date, status")
          .eq("house_id", houseId).in("status", ["approved", "pending"])
          .gte("start_date", yearStart).lte("start_date", yearEnd),
      ]);

      const shareMap: Record<string, number> = {};
      (shares || []).forEach((s: any) => { shareMap[s.user_id] = s.percentage; });

      // Calculate nights per member
      const nightsMap: Record<string, number> = {};
      let totalNights = 0;
      (bookings || []).forEach((b: any) => {
        const nights = Math.max(1, differenceInCalendarDays(new Date(b.end_date), new Date(b.start_date)));
        nightsMap[b.user_id] = (nightsMap[b.user_id] || 0) + nights;
        totalNights += nights;
      });

      const result = members.map((m) => {
        const ownership = shareMap[m.user_id] || 0;
        const usage = totalNights > 0 ? ((nightsMap[m.user_id] || 0) / totalNights) * 100 : 0;
        const delta = ownership - usage; // positive = under-using = higher priority
        const name = m.profile
          ? [m.profile.first_name, m.profile.last_name].filter(Boolean).join(" ") || m.profile.email || "Membre"
          : "Membre";
        return { userId: m.user_id, name, ownershipPct: ownership, usagePct: usage, delta, priority: delta };
      });

      // Sort by priority (highest delta = most priority)
      result.sort((a, b) => b.priority - a.priority);
      setPriorities(result);
      setLoading(false);
    };
    fetch();
  }, [houseId, members]);

  if (loading) return <div className="animate-pulse text-muted-foreground text-sm p-4">Chargement...</div>;

  if (priorities.length === 0 || priorities.every(p => p.ownershipPct === 0)) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Scale className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Configurez les quotes-parts pour activer la priorité de réservation.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Scale className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg text-foreground">Priorité de réservation {new Date().getFullYear()}</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Basée sur l'écart entre quote-part de propriété et usage réel. Les membres sous-utilisateurs sont prioritaires.
      </p>

      <div className="space-y-2">
        {priorities.map((p, i) => {
          const DeltaIcon = p.delta > 2 ? TrendingUp : p.delta < -2 ? TrendingDown : Minus;
          const deltaColor = p.delta > 2 ? "text-accent" : p.delta < -2 ? "text-destructive" : "text-muted-foreground";
          return (
            <Card key={p.userId} className="border-border/50 shadow-soft">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant={i === 0 ? "default" : "outline"} className={`text-[10px] shrink-0 ${i === 0 ? "bg-accent text-accent-foreground" : ""}`}>
                      #{i + 1}
                    </Badge>
                    <span className="text-sm font-medium text-foreground truncate">{p.name}</span>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium ${deltaColor}`}>
                    <DeltaIcon className="h-3 w-3" />
                    {p.delta > 0 ? "+" : ""}{p.delta.toFixed(1)}%
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Propriété:</span>
                    <span className="ml-1 font-medium text-foreground">{p.ownershipPct.toFixed(1)}%</span>
                    <Progress value={p.ownershipPct} className="h-1.5 mt-1" />
                  </div>
                  <div>
                    <span className="text-muted-foreground">Usage:</span>
                    <span className="ml-1 font-medium text-foreground">{p.usagePct.toFixed(1)}%</span>
                    <Progress value={p.usagePct} className="h-1.5 mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default BookingPriority;
