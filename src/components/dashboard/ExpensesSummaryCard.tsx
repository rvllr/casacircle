import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/dateFormatter";

interface Expense {
  id: string;
  amount: number;
  description: string;
  created_at: string;
  paid_by: string;
  houses: { name: string } | null;
}

interface ExpensesSummaryCardProps {
  expenses: Expense[];
  getAuthorName: (userId: string) => string;
}

const ExpensesSummaryCard = ({ expenses, getAuthorName }: ExpensesSummaryCardProps) => {
  return (
    <section className="space-y-4 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-xl text-foreground flex items-center gap-2.5 truncate">
          <Wallet className="h-5 w-5 text-primary flex-shrink-0" />
          Dépenses récentes
        </h3>
        <Link to="/expenses" className="text-sm text-primary hover:underline flex items-center gap-1 font-medium whitespace-nowrap flex-shrink-0">
          Tout voir <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {expenses.length === 0 ? (
        <Card className="border-border/50 shadow-soft">
          <CardContent className="empty-state">
            <Wallet className="empty-state-icon" />
            <p className="text-muted-foreground">Aucune dépense.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {expenses.map((expense) => (
            <Card key={expense.id} className="border-border/50 shadow-soft hover:shadow-card transition-all duration-200">
              <CardContent className="py-3.5 px-5 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{expense.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {getAuthorName(expense.paid_by)} · {formatDate(expense.created_at)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-foreground">{Number(expense.amount).toFixed(2)}€</p>
                    <Badge variant="outline" className="text-[10px]">{expense.houses?.name}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};

export default ExpensesSummaryCard;
