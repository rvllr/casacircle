import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBookings, type BookingRow } from "@/hooks/useBookings";
import { formatDate } from "@/lib/dateFormatter";
import { useHouseContext } from "@/contexts/HouseContext";
import AppLayout from "@/components/AppLayout";
import HouseSelector from "@/components/HouseSelector";
import BookingCalendar from "@/components/BookingCalendar";
import NewBookingDialog from "@/components/NewBookingDialog";
import BlockPeriodDialog from "@/components/BlockPeriodDialog";
import BookingCard from "@/components/bookings/BookingCard";
import BookingFilters from "@/components/bookings/BookingFilters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Users, BarChart3, Plus, Download } from "lucide-react";
import { exportBookingsCsv } from "@/lib/csvExport";
import { differenceInCalendarDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useDemo } from "@/contexts/DemoContext";

const BookingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isDemo } = useDemo();
  const { houses, selectedHouseId, loading: housesLoading } = useHouseContext();
  const { data: bookings, blockedPeriods, pricingActiveHouseIds, loading, refetch: fetchData } = useBookings();
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  const [newBookingStartDate, setNewBookingStartDate] = useState<Date | undefined>();
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const handleCalendarDayClick = (date: Date) => {
    if (date < new Date(new Date().toDateString())) return;
    setNewBookingStartDate(date);
    setNewBookingOpen(true);
  };

  const contextHouseIds = new Set(houses.map(h => h.id));
  const filteredBookings = selectedHouseId === "all"
    ? bookings.filter((b) => contextHouseIds.has(b.house_id))
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

  const canManageBooking = (booking: BookingRow) => adminHouseIds.has(booking.house_id);

  const updateBookingStatus = async (bookingId: string, status: "approved" | "refused" | "cancelled") => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
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
    if (amountPaid !== undefined) {
      const booking = bookings.find((b) => b.id === bookingId);
      const total = booking?.total_price ? Number(booking.total_price) : 0;
      if (amountPaid <= 0) updateData.payment_status = "unpaid";
      else if (total > 0 && amountPaid >= total) updateData.payment_status = "paid";
      else updateData.payment_status = "partial";
    }
    const { error } = await supabase.from("bookings").update(updateData).eq("id", bookingId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Paiement mis à jour" });
      fetchData();
    }
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

  const renderBookingCard = (b: BookingRow, canManageOverride?: boolean) => (
    <BookingCard
      key={b.id}
      booking={b}
      label={getBookingLabel(b)}
      userName={getUserName(b)}
      canManage={canManageOverride !== undefined ? canManageOverride : (b.status === "pending" && canManageBooking(b))}
      canCancel={b.user_id === user?.id && (b.status === "pending" || b.status === "approved")}
      hasPricing={pricingActiveHouseIds.has(b.house_id)}
      onApprove={() => updateBookingStatus(b.id, "approved")}
      onRefuse={() => updateBookingStatus(b.id, "refused")}
      onCancel={() => updateBookingStatus(b.id, "cancelled")}
      onPaymentStatusChange={(ps) => updatePaymentStatus(b.id, ps)}
      onAmountPaidChange={(amount) => updatePaymentStatus(b.id, b.payment_status, amount)}
    />
  );

  if (loading || housesLoading) {
    return (
      <AppLayout title="Réservations">
        <div className="space-y-6 max-w-5xl animate-fade-in">
          <div className="page-header">
            <div>
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-44 rounded-xl" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-3 w-28" />
                </CardContent>
              </Card>
            ))}
          </div>
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
                  {pendingBookings.map((b) => renderBookingCard(b, canManageBooking(b)))}
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
              <BookingFilters paymentFilter={paymentFilter} onPaymentFilterChange={setPaymentFilter} />
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
                    {displayed.map((b) => renderBookingCard(b))}
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

export default BookingsPage;
