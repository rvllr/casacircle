import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Moon, Users, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UsageTabProps {
  houseId: string;
  members: { user_id: string; profile?: { first_name: string | null; last_name: string | null; email: string | null } }[];
}

interface UsageStat {
  user_id: string;
  nights: number;
  guests: number;
  bookings: number;
  name: string;
}

const UsageTab = ({ houseId, members }: UsageTabProps) => {
  const [stats, setStats] = useState<UsageStat[]>([]);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [shares, setShares] = useState<Record<string, number>>({});

  const getName = useCallback((userId: string) => {
    const m = members.find((m) => m.user_id === userId);
    if (!m?.profile) return "Membre";
    return [m.profile.first_name, m.profile.last_name].filter(Boolean).join(" ") || m.profile.email || "Membre";
  }, [members]);

  const fetchData = useCallback(async () => {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const [{ data: bookings }, { data: ownershipData }] = await Promise.all([
      supabase.from("bookings").select("user_id, start_date, end_date, guest_count, status")
        .eq("house_id", houseId)
        .in("status", ["approved", "pending"])
        .gte("start_date", yearStart)
        .lte("start_date", yearEnd),
      supabase.from("ownership_shares").select("user_id, percentage").eq("house_id", houseId),
    ]);

    const shareMap: Record<string, number> = {};
    (ownershipData || []).forEach((s: any) => { shareMap[s.user_id] = s.percentage; });
    setShares(shareMap);

    const statsMap: Record<string, UsageStat> = {};
    members.forEach((m) => {
      statsMap[m.user_id] = { user_id: m.user_id, nights: 0, guests: 0, bookings: 0, name: getName(m.user_id) };
    });

    (bookings || []).forEach((b: any) => {
      if (!statsMap[b.user_id]) {
        statsMap[b.user_id] = { user_id: b.user_id, nights: 0, guests: 0, bookings: 0, name: getName(b.user_id) };
      }
      const start = new Date(b.start_date);
      const end = new Date(b.end_date);
      const nights = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      statsMap[b.user_id].nights += nights;
      statsMap[b.user_id].guests += b.guest_count || 0;
      statsMap[b.user_id].bookings += 1;
    });

    setStats(Object.values(statsMap).sort((a, b) => b.nights - a.nights));
  }, [houseId, year, members, getName]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalNights = stats.reduce((a, s) => a + s.nights, 0);
  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  const getEquityStatus = (userId: string, usagePct: number) => {
    const ownershipPct = shares[userId];
    if (ownershipPct === undefined || ownershipPct === 0) return null;
    const diff = usagePct - ownershipPct;
    if (Math.abs(diff) <= 5) return { label: "Équitable", variant: "secondary" as const, icon: Minus, color: "text-accent" };
    if (diff > 0) return { label: "Sur-usage", variant: "outline" as const, icon: TrendingUp, color: "text-primary" };
    return { label: "Sous-usage", variant: "outline" as const, icon: TrendingDown, color: "text-muted-foreground" };
  };

  return (
    <div className="space-y-4">
      {/* Year selector */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> Statistiques d'usage
        </h3>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-28 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="border-border/50 shadow-soft">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total nuits</p>
            <p className="text-2xl font-display text-foreground">{totalNights}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-soft">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Réservations</p>
            <p className="text-2xl font-display text-foreground">{stats.reduce((a, s) => a + s.bookings, 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-soft">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Invités accueillis</p>
            <p className="text-2xl font-display text-foreground">{stats.reduce((a, s) => a + s.guests, 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage bar */}
      {totalNights > 0 && (
        <Card className="border-border/50 shadow-soft">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-3 font-medium">Répartition de l'usage</p>
            <div className="flex rounded-lg overflow-hidden h-8">
              {stats.filter((s) => s.nights > 0).map((s, i) => {
                const pct = (s.nights / totalNights) * 100;
                const colors = ["bg-primary", "bg-accent", "bg-[hsl(var(--lavender))]", "bg-[hsl(var(--sand))]", "bg-muted-foreground"];
                return (
                  <div key={s.user_id} className={`${colors[i % colors.length]} flex items-center justify-center text-xs font-medium text-white`}
                    style={{ width: `${pct}%` }} title={`${s.name}: ${s.nights} nuits`}>
                    {pct >= 12 && `${Math.round(pct)}%`}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              {stats.filter((s) => s.nights > 0).map((s, i) => {
                const dots = ["bg-primary", "bg-accent", "bg-[hsl(var(--lavender))]", "bg-muted-foreground"];
                return (
                  <div key={s.user_id} className="flex items-center gap-1.5 text-xs">
                    <div className={`w-2.5 h-2.5 rounded-full ${dots[i % dots.length]}`} />
                    <span className="text-foreground">{s.name}</span>
                    <span className="text-muted-foreground">{s.nights}n</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed table */}
      <Card className="border-border/50 shadow-soft">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead className="text-right">Nuits</TableHead>
                <TableHead className="text-right">Usage</TableHead>
                {Object.keys(shares).length > 0 && <TableHead className="text-right">Propriété</TableHead>}
                {Object.keys(shares).length > 0 && <TableHead>Équité</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((s) => {
                const usagePct = totalNights > 0 ? (s.nights / totalNights) * 100 : 0;
                const equity = getEquityStatus(s.user_id, usagePct);
                return (
                  <TableRow key={s.user_id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-right font-mono">{s.nights}</TableCell>
                    <TableCell className="text-right font-mono">{totalNights > 0 ? `${Math.round(usagePct)}%` : "—"}</TableCell>
                    {Object.keys(shares).length > 0 && (
                      <TableCell className="text-right font-mono">{shares[s.user_id] ? `${shares[s.user_id]}%` : "—"}</TableCell>
                    )}
                    {Object.keys(shares).length > 0 && (
                      <TableCell>
                        {equity && (
                          <Badge variant={equity.variant} className="text-xs gap-1">
                            <equity.icon className={`h-3 w-3 ${equity.color}`} />
                            {equity.label}
                          </Badge>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsageTab;
