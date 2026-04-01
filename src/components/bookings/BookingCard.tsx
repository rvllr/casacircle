import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, CreditCard, ChevronDown, ChevronUp } from "lucide-react";
import { ChecklistSummaryBadge } from "@/components/BookingChecklist";
import BookingChecklist from "@/components/BookingChecklist";
import { formatDate } from "@/lib/dateFormatter";
import { BOOKING_STATUS_CONFIG, PAYMENT_STATUS_CONFIG } from "@/lib/constants";
import type { BookingRow } from "@/hooks/useBookings";

const statusConfig = BOOKING_STATUS_CONFIG;
const paymentStatusConfig = PAYMENT_STATUS_CONFIG;

interface BookingCardProps {
  booking: BookingRow;
  label: string;
  userName: string;
  canManage: boolean;
  canCancel?: boolean;
  hasPricing?: boolean;
  onApprove: () => void;
  onRefuse: () => void;
  onCancel?: () => void;
  onPaymentStatusChange?: (status: string) => void;
  onAmountPaidChange?: (amount: number) => void;
}

const BookingCard = ({
  booking,
  label,
  userName,
  canManage,
  canCancel = false,
  hasPricing = false,
  onApprove,
  onRefuse,
  onCancel,
  onPaymentStatusChange,
  onAmountPaidChange,
}: BookingCardProps) => {
  const showPayment = hasPricing && booking.payment_status !== "not_applicable";
  const showPaymentSelector = hasPricing && canManage;
  const totalPrice = booking.total_price != null ? Number(booking.total_price) : 0;
  const amountPaid = booking.amount_paid != null ? Number(booking.amount_paid) : 0;
  const remaining = Math.max(0, totalPrice - amountPaid);

  const [editingAmount, setEditingAmount] = useState(false);
  const [amountInput, setAmountInput] = useState(amountPaid.toString());
  const [showChecklist, setShowChecklist] = useState(false);
  const isApprovedOrPending = booking.status === "approved" || booking.status === "pending";

  const handleAmountSubmit = () => {
    const val = parseFloat(amountInput);
    if (!isNaN(val) && val >= 0 && onAmountPaidChange) {
      onAmountPaidChange(val);
    }
    setEditingAmount(false);
  };

  return (
    <Card className="border-border/50 shadow-soft hover:shadow-card transition-all duration-200">
      <CardContent className="p-4 sm:py-4 sm:px-5">
        <div className="flex flex-col gap-2.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm sm:text-base text-foreground">{label}</p>
              <Badge variant={statusConfig[booking.status]?.variant || "secondary"} className="text-[10px] sm:text-xs">
                {statusConfig[booking.status]?.label || booking.status}
              </Badge>
              {showPayment && (
                <Badge variant={paymentStatusConfig[booking.payment_status]?.variant || "outline"} className="text-[10px] sm:text-xs">
                  <CreditCard className="h-3 w-3 mr-1" />
                  {paymentStatusConfig[booking.payment_status]?.label || booking.payment_status}
                </Badge>
              )}
              {isApprovedOrPending && (
                <ChecklistSummaryBadge bookingId={booking.id} houseId={booking.house_id} />
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {userName} · {formatDate(booking.start_date)} → {formatDate(booking.end_date)}
            </p>
          </div>

          {showPayment && totalPrice > 0 && (
            <div className="flex items-center gap-3 text-xs sm:text-sm flex-wrap p-2 rounded-lg bg-muted/50">
              <span className="text-muted-foreground">Total : <span className="font-semibold text-foreground">{totalPrice.toFixed(2)} €</span></span>
              <span className="text-muted-foreground">Payé : <span className="font-semibold text-foreground">{amountPaid.toFixed(2)} €</span></span>
              {remaining > 0 && (
                <span className="text-destructive font-medium">Reste : {remaining.toFixed(2)} €</span>
              )}
              {remaining <= 0 && amountPaid > 0 && (
                <span className="text-accent font-medium">✓ Soldé</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {canManage && (
              <>
                <Button size="sm" variant="outline" className="h-8 text-xs sm:text-sm rounded-lg" onClick={onApprove}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Accepter
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs sm:text-sm rounded-lg text-destructive border-destructive/30 hover:bg-destructive/5" onClick={onRefuse}>
                  <X className="h-3.5 w-3.5 mr-1" /> Refuser
                </Button>
              </>
            )}
            {canCancel && onCancel && (
              <Button size="sm" variant="outline" className="h-8 text-xs sm:text-sm rounded-lg text-destructive border-destructive/30 hover:bg-destructive/5" onClick={onCancel}>
                <X className="h-3.5 w-3.5 mr-1" /> Annuler
              </Button>
            )}
            {showPaymentSelector && onPaymentStatusChange && (
              <Select value={booking.payment_status} onValueChange={onPaymentStatusChange}>
                <SelectTrigger className="h-8 w-[130px] text-xs rounded-lg">
                  <CreditCard className="h-3.5 w-3.5 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Non payé</SelectItem>
                  <SelectItem value="partial">Partiel</SelectItem>
                  <SelectItem value="paid">Payé</SelectItem>
                </SelectContent>
              </Select>
            )}
            {showPaymentSelector && totalPrice > 0 && onAmountPaidChange && (
              editingAmount ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAmountSubmit()}
                    className="h-8 w-24 text-xs rounded-lg"
                    autoFocus
                  />
                  <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg" onClick={handleAmountSubmit}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg" onClick={() => setEditingAmount(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="h-8 text-xs sm:text-sm rounded-lg" onClick={() => { setAmountInput(amountPaid.toString()); setEditingAmount(true); }}>
                  💰 Saisir paiement
                </Button>
              )
            )}
            {isApprovedOrPending && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs rounded-lg"
                onClick={() => setShowChecklist(!showChecklist)}
              >
                {showChecklist ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                Checklist
              </Button>
            )}
          </div>

          {showChecklist && isApprovedOrPending && (
            <div className="pt-2 border-t border-border/30">
              <BookingChecklist bookingId={booking.id} houseId={booking.house_id} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingCard;
