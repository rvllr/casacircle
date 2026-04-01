import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, X } from "lucide-react";

interface BookingFiltersProps {
  paymentFilter: string;
  onPaymentFilterChange: (value: string) => void;
}

const BookingFilters = ({ paymentFilter, onPaymentFilterChange }: BookingFiltersProps) => {
  return (
    <div className="flex items-center gap-2 mb-3">
      <CreditCard className="h-4 w-4 text-muted-foreground" />
      <Select value={paymentFilter} onValueChange={onPaymentFilterChange}>
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <SelectValue placeholder="Statut paiement" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les paiements</SelectItem>
          <SelectItem value="unpaid">Non payé</SelectItem>
          <SelectItem value="partial">Partiel</SelectItem>
          <SelectItem value="paid">Payé</SelectItem>
          <SelectItem value="not_applicable">N/A</SelectItem>
        </SelectContent>
      </Select>
      {paymentFilter !== "all" && (
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onPaymentFilterChange("all")}>
          <X className="h-3.5 w-3.5 mr-1" /> Réinitialiser
        </Button>
      )}
    </div>
  );
};

export default BookingFilters;
