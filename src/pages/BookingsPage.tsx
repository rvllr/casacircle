import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHouseContext } from "@/contexts/HouseContext";
import AppLayout from "@/components/AppLayout";
import HouseSelector from "@/components/HouseSelector";
import BookingCalendar from "@/components/BookingCalendar";
import NewBookingDialog from "@/components/NewBookingDialog";
import BlockPeriodDialog from "@/components/BlockPeriodDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Check, X, Users, BarChart3, Plus, Ban, Trash2, Download, CreditCard, ChevronDown, ChevronUp } from "lucide-react";
import { ChecklistSummaryBadge } from "@/components/BookingChecklist";
import BookingChecklist from "@/components/BookingChecklist";
import { exportBookingsCsv } from "@/lib/csvExport";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useDemo } from "@/contexts/DemoContext";
import { DEMO_BOOKINGS_ENRICHED, DEMO_PROFILES } from "@/lib/demoData";

interface BookingRow {
  id: string;
  house_id: string;
  unit_id: string | null;
  user_id: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  payment_status: string;
  total_price: number | null;
  amount_paid: number | null;
  houses: { name: string; family_id: string | null } | null;
  house_units: { name: string; type: string } | null;
  users_profiles: { first_name: string | null; last_name: string | null } | null;
}

const paymentStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  not_applicable: { label: "N/A", variant: "outline" },
  unpaid: { label: "Non payé", variant: "destructive" },
  partial: { label: "Partiel", variant: "secondary" },
  paid: { label: "Payé", variant: "default" },
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "secondary" },
  approved: { label: "Confirmée", variant: "default" },
  refused: { label: "Refusée", variant: "destructive" },
  cancelled: { label: "Annulée", variant: "outline" },
};

interface BlockedPeriod {
  id: string;
  house_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

const BookingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isDemo } = useDemo();
  const { houses, selectedHouseId, loading: housesLoading } = useHouseContext();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [pricingActiveHouseIds, setPricingActiveHouseIds] = useState<Set<string>>(new Set());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  const [newBookingStartDate, setNewBookingStartDate] = useState<Date | undefined>();
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const handleCalendarDayClick = (date: Date) => {
    // Only open dialog for available (future) days
    if (date < new Date(new Date().toDateString())) return;
    setNewBookingStartDate(date);
    setNewBookingOpen(true);
  };

  const fetchData = useCallback(async () => {
    if (isDemo) {
      setBookings(DEMO_BOOKINGS_ENRICHED as any);
      setBlockedPeriods([]);
      setPricingActiveHouseIds(new Set());
      setLoading(false);
      return;
    }
    if (!user) return;
    setLoading(true);

    const [{ data: bookingsData }, { data: blockedData }, { data: pricingData }] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, house_id, unit_id, user_id, start_date, end_date, status, created_at, payment_status, total_price, amount_paid, houses(name, family_id), house_units(name, type)")
        .order("start_date", { ascending: true }),
      supabase
        .from("blocked_periods")
        .select("id, house_id, start_date, end_date, reason"),
      supabase
        .from("house_pricing")
        .select("house_id, is_active")
        .eq("is_active", true),
    ]);

    setPricingActiveHouseIds(new Set((pricingData || []).map((p) => p.house_id)));

    setBlockedPeriods((blockedData || []) as BlockedPeriod[]);

    const userIds = [...new Set((bookingsData || []).map((b) => b.user_id))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from("users_profiles").select("user_id, first_name, last_name").in("user_id", userIds)
      : { data: [] };

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));

    const enriched: BookingRow[] = (bookingsData || []).map((b) => ({
      ...b,
      houses: b.houses as BookingRow["houses"],
      house_units: b.house_units as BookingRow["house_units"],
      users_profiles: profileMap[b.user_id] || null,
    }));

    setBookings(enriched);
    setLoading(false);
  }, [user, isDemo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredBookings = selectedHouseId === "all"
    ? bookings
    : bookings.filter((b) => b.house_id === selectedHouseId);

  const calendarBookings = filteredBookings.filter(
    (b) => b.status === "approved" || b.status === "pending"
  );
  const pendingBookings = filteredBookings.filter((b) => b.status === "pending");

  const memberStats = useMemo(() => {
    const approvedBookings = filteredBookings.filter((b) => b.status === "approved");
    const statsMap = new Map<string, { name: string; days: number; bookings: number }>();
    
    for (const b of approvedBookings) {
      const days = Math.max(1, differenceInCalendarDays(new Date(b.end_date), new Date(b.start_date)));
      const name = [b.users_profiles?.first_name, b.users_profiles?.last_name].filter(Boolean).join(" ") || "Membre";
      const existing = statsMap.get(b.user_id);
      if (existing) {
        existing.days += days;
        existing.bookings += 1;
      } else {
        statsMap.set(b.user_id, { name, days, bookings: 1 });
      }
    }
    
    return [...statsMap.entries()]
      .map(([userId, s]) => ({ userId, ...s }))
      .sort((a, b) => b.days - a.days);
  }, [filteredBookings]);

  const [adminHouseIds, setAdminHouseIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isDemo) {
      setAdminHouseIds(new Set(["demo-house-1", "demo-house-2"]));
      return;
    }
    if (!user) return;
    supabase
      .from("house_members")
      .select("house_id, role")
      .eq("user_id", user.id)
      .in("role", ["admin", "owner"])
      .then(({ data }) => {
        const ids = new Set((data || []).map((d) => d.house_id));
        supabase
          .from("family_members")
          .select("family_id")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .then(({ data: famData }) => {
            if (famData && famData.length > 0) {
              const familyIds = famData.map((f) => f.family_id);
              supabase
                .from("houses")
                .select("id")
                .in("family_id", familyIds)
                .then(({ data: famHouses }) => {
                  (famHouses || []).forEach((h) => ids.add(h.id));
                  setAdminHouseIds(new Set(ids));
                });
            } else {
              setAdminHouseIds(ids);
            }
          });
      });
  }, [user, isDemo]);

  const canManageBooking = (booking: BookingRow) => {
    return adminHouseIds.has(booking.house_id);
  };

  const updateBookingStatus = async (bookingId: string, status: "approved" | "refused" | "cancelled") => {
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      const messages = { approved: "Réservation confirmée !", refused: "Réservation refusée.", cancelled: "Réservation annulée." };
      toast({ title: messages[status] });
      fetchData();
    }
  };

  const updatePaymentStatus = async (bookingId: string, paymentStatus: string, amountPaid?: number) => {
    const updateData: any = { payment_status: paymentStatus };
    if (amountPaid !== undefined) updateData.amount_paid = amountPaid;
    // Auto-set status based on amount
    if (amountPaid !== undefined) {
      const booking = bookings.find((b) => b.id === bookingId);
      const total = booking?.total_price ? Number(booking.total_price) : 0;
      if (amountPaid <= 0) updateData.payment_status = "unpaid";
      else if (total > 0 && amountPaid >= total) updateData.payment_status = "paid";
      else updateData.payment_status = "partial";
    }

    const { error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Paiement mis à jour" });
      fetchData();
    }
  };

  const formatDate = (d: string) => {
    try { return format(new Date(d), "d MMM yyyy", { locale: fr }); }
    catch { return d; }
  };

  const getUserName = (b: BookingRow) => {
    const p = b.users_profiles;
    if (p?.first_name) return `${p.first_name}${p.last_name ? ` ${p.last_name}` : ""}`;
    return "Membre";
  };

  const getBookingLabel = (b: BookingRow) => {
    const houseName = b.houses?.name || "Maison";
    if (b.house_units) {
      const icon = b.house_units.type === "building" ? "🏘️" : "🛏️";
      return `${houseName} — ${icon} ${b.house_units.name}`;
    }
    return houseName;
  };

  if (loading || housesLoading) {
    return (
      <AppLayout title="Réservations">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Réservations">
      <div className="space-y-6 max-w-5xl animate-fade-in">
        <div className="page-header">
          <div>
            <h2 className="page-header-title">Réservations</h2>
            <p className="page-header-subtitle">Planifiez et gérez les séjours.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => { setNewBookingStartDate(undefined); setNewBookingOpen(true); }} className="rounded-xl shadow-soft text-xs sm:text-sm">
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Nouvelle réservation</span>
              <span className="sm:hidden">Réserver</span>
            </Button>
            <BlockPeriodDialog onCreated={fetchData} />
          </div>
          <NewBookingDialog
            onCreated={fetchData}
            externalOpen={newBookingOpen}
            onExternalOpenChange={setNewBookingOpen}
            initialStartDate={newBookingStartDate}
          />
        </div>

        <HouseSelector />

        {houses.length === 0 ? (
          <Card className="border-border/50 shadow-soft">
            <CardContent className="empty-state">
              <CalendarDays className="empty-state-icon" />
              <h3 className="font-display text-xl text-foreground mb-2">Aucune maison</h3>
              <p className="text-muted-foreground">Créez d'abord une maison pour commencer à réserver.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="calendar" className="space-y-3 sm:space-y-4">
            <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 h-auto gap-1">
              <TabsTrigger value="calendar" className="text-xs sm:text-sm py-1.5">Calendrier</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs sm:text-sm py-1.5 relative">
                En attente
                {pendingBookings.length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 text-[10px] sm:text-xs rounded-full bg-primary text-primary-foreground">
                    {pendingBookings.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs sm:text-sm py-1.5">Toutes</TabsTrigger>
              <TabsTrigger value="stats" className="text-xs sm:text-sm py-1.5">
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Stats</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  exportBookingsCsv(
                    filteredBookings.map((b) => ({
                      start_date: b.start_date,
                      end_date: b.end_date,
                      status: b.status,
                      userName: getUserName(b),
                      houseName: b.houses?.name || "Maison",
                      unitName: b.house_units?.name || undefined,
                    }))
                  );
                }}
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Export CSV
              </Button>
            </div>

            <TabsContent value="calendar">
              <Card>
                <CardContent className="p-3 sm:pt-6 sm:px-6">
                  <BookingCalendar
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    onDayClick={handleCalendarDayClick}
                    bookings={calendarBookings.map((b) => ({
                      start_date: b.start_date,
                      end_date: b.end_date,
                      status: b.status,
                      userName: [b.users_profiles?.first_name, b.users_profiles?.last_name].filter(Boolean).join(" ") || undefined,
                      houseName: selectedHouseId === "all" ? (b.houses?.name || undefined) : undefined,
                      unitName: b.house_units?.name || undefined,
                    }))}
                    blockedPeriods={(selectedHouseId === "all" ? blockedPeriods : blockedPeriods.filter(bp => bp.house_id === selectedHouseId)).map(bp => ({
                      start_date: bp.start_date,
                      end_date: bp.end_date,
                      reason: bp.reason,
                    }))}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pending">
              {pendingBookings.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">Aucune demande en attente.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {pendingBookings.map((b) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      label={getBookingLabel(b)}
                      userName={getUserName(b)}
                      formatDate={formatDate}
                      canManage={canManageBooking(b)}
                      canCancel={b.user_id === user?.id}
                      hasPricing={pricingActiveHouseIds.has(b.house_id)}
                      onApprove={() => updateBookingStatus(b.id, "approved")}
                      onRefuse={() => updateBookingStatus(b.id, "refused")}
                      onCancel={() => updateBookingStatus(b.id, "cancelled")}
                      onPaymentStatusChange={(ps) => updatePaymentStatus(b.id, ps)}
                      onAmountPaidChange={(amount) => updatePaymentStatus(b.id, b.payment_status, amount)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="stats">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="font-display text-lg text-foreground">Jours par membre</h3>
                    <Badge variant="outline" className="ml-auto text-xs">Réservations confirmées</Badge>
                  </div>
                  {memberStats.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Aucune réservation confirmée.</p>
                  ) : (
                    <div className="space-y-3">
                      {memberStats.map((m, idx) => {
                        const maxDays = memberStats[0]?.days || 1;
                        const pct = Math.round((m.days / maxDays) * 100);
                        return (
                          <div key={m.userId} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                  {idx + 1}
                                </span>
                                <span className="font-medium text-foreground">{m.name}</span>
                              </div>
                              <div className="flex items-center gap-3 text-muted-foreground">
                                <span>{m.bookings} séjour{m.bookings > 1 ? "s" : ""}</span>
                                <span className="font-semibold text-foreground">{m.days} jour{m.days > 1 ? "s" : ""}</span>
                              </div>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="all">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
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
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setPaymentFilter("all")}>
                    <X className="h-3.5 w-3.5 mr-1" /> Réinitialiser
                  </Button>
                )}
              </div>
              {(() => {
                const displayed = paymentFilter === "all"
                  ? filteredBookings
                  : filteredBookings.filter((b) => b.payment_status === paymentFilter);
                return displayed.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">Aucune réservation{paymentFilter !== "all" ? " avec ce statut de paiement" : ""}.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {displayed.map((b) => (
                      <BookingCard
                        key={b.id}
                        booking={b}
                        label={getBookingLabel(b)}
                        userName={getUserName(b)}
                        formatDate={formatDate}
                        canManage={b.status === "pending" && canManageBooking(b)}
                        canCancel={b.user_id === user?.id && (b.status === "pending" || b.status === "approved")}
                        hasPricing={pricingActiveHouseIds.has(b.house_id)}
                        onApprove={() => updateBookingStatus(b.id, "approved")}
                        onRefuse={() => updateBookingStatus(b.id, "refused")}
                        onCancel={() => updateBookingStatus(b.id, "cancelled")}
                        onPaymentStatusChange={(ps) => updatePaymentStatus(b.id, ps)}
                        onAmountPaidChange={(amount) => updatePaymentStatus(b.id, b.payment_status, amount)}
                      />
                    ))}
                  </div>
                );
              })()}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
};

const BookingCard = ({
  booking,
  label,
  userName,
  formatDate,
  canManage,
  canCancel = false,
  hasPricing = false,
  onApprove,
  onRefuse,
  onCancel,
  onPaymentStatusChange,
  onAmountPaidChange,
}: {
  booking: BookingRow;
  label: string;
  userName: string;
  formatDate: (d: string) => string;
  canManage: boolean;
  canCancel?: boolean;
  hasPricing?: boolean;
  onApprove: () => void;
  onRefuse: () => void;
  onCancel?: () => void;
  onPaymentStatusChange?: (status: string) => void;
  onAmountPaidChange?: (amount: number) => void;
}) => {
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
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {userName} · {formatDate(booking.start_date)} → {formatDate(booking.end_date)}
            </p>
          </div>

          {/* Payment details */}
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingsPage;
