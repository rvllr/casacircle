import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, differenceInCalendarDays, startOfYear, endOfYear, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/constants";

const PIE_COLORS = [
  "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--honey))",
  "hsl(var(--lavender))", "hsl(var(--chart-1))", "hsl(var(--chart-2))",
  "hsl(var(--chart-3))", "hsl(var(--chart-4))",
];

interface Booking {
  start_date: string;
  end_date: string;
  status: string;
}

interface Expense {
  amount: number;
  created_at: string;
  category?: string;
}

interface OccupancyStatsProps {
  allBookings: Booking[];
  allExpenses: Expense[];
}

const OccupancyStats = ({ allBookings, allExpenses }: OccupancyStatsProps) => {
  const now = new Date();
  const yearStart = startOfYear(now);
  const yearEnd = endOfYear(now);
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  // Occupancy per month
  const occupancyData = months.map((month) => {
    const mStart = startOfMonth(month);
    const mEnd = endOfMonth(month);
    const totalDays = differenceInCalendarDays(mEnd, mStart) + 1;
    let bookedDays = 0;

    allBookings.forEach((b) => {
      const bStart = new Date(b.start_date);
      const bEnd = new Date(b.end_date);
      const overlapStart = bStart < mStart ? mStart : bStart;
      const overlapEnd = bEnd > mEnd ? mEnd : bEnd;
      if (overlapStart <= overlapEnd) {
        bookedDays += differenceInCalendarDays(overlapEnd, overlapStart) + 1;
      }
    });

    const rate = totalDays > 0 ? Math.min(100, Math.round((bookedDays / totalDays) * 100)) : 0;
    return { month: format(month, "MMM", { locale: fr }), taux: rate };
  });

  // Expense breakdown by category
  const expenseByCategory = (() => {
    const map = new Map<string, number>();
    allExpenses.forEach((e) => {
      const cat = e.category || "autre";
      map.set(cat, (map.get(cat) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([category, amount]) => ({
        name: EXPENSE_CATEGORY_LABELS[category] || category,
        value: Math.round(amount * 100) / 100,
      }))
      .sort((a, b) => b.value - a.value);
  })();

  // Annual totals
  const yearBookings = allBookings.filter((b) => {
    const d = new Date(b.start_date);
    return isWithinInterval(d, { start: yearStart, end: yearEnd });
  });
  const totalNightsYear = yearBookings.reduce((sum, b) => {
    return sum + Math.max(1, differenceInCalendarDays(new Date(b.end_date), new Date(b.start_date)));
  }, 0);
  const totalExpensesYear = allExpenses
    .filter((e) => isWithinInterval(new Date(e.created_at), { start: yearStart, end: yearEnd }))
    .reduce((sum, e) => sum + e.amount, 0);

  if (allBookings.length === 0 && allExpenses.length === 0) return null;

  return (
    <section className="space-y-4">
      <h3 className="font-display text-xl text-foreground flex items-center gap-2.5">
        <TrendingUp className="h-5 w-5 text-primary" />
        Statistiques {now.getFullYear()}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border/50 shadow-soft">
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">Nuitées cette année</p>
            <p className="text-2xl font-display text-foreground">{totalNightsYear}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-soft">
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">Dépenses cette année</p>
            <p className="text-2xl font-display text-foreground">{totalExpensesYear.toFixed(0)} €</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {allBookings.length > 0 && (
          <Card className="border-border/50 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Taux d'occupation mensuel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={occupancyData}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="%" domain={[0, 100]} />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, "Occupation"]}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="taux" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {expenseByCategory.length > 0 && (
          <Card className="border-border/50 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Répartition des dépenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={35}
                    >
                      {expenseByCategory.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(0)} €`]}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5 pl-2">
                  {expenseByCategory.slice(0, 5).map((cat, idx) => (
                    <div key={cat.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground truncate">{cat.name}</span>
                      <span className="font-medium text-foreground ml-auto">{cat.value.toFixed(0)} €</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
};

export default OccupancyStats;
