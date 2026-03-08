import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useHouseContext } from "@/contexts/HouseContext";
import AppLayout from "@/components/AppLayout";
import HouseSelector from "@/components/HouseSelector";
import BookingCalendar from "@/components/BookingCalendar";
import NewBookingDialog from "@/components/NewBookingDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Check, X, Users, BarChart3, Plus } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface BookingRow {
  id: string;
  house_id: string;
  unit_id: string | null;
  user_id: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  houses: { name: string; family_id: string | null } | null;
  house_units: { name: string; type: string } | null;
  users_profiles: { first_name: string | null; last_name: string | null } | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "secondary" },
  approved: { label: "Confirmée", variant: "default" },
  refused: { label: "Refusée", variant: "destructive" },
  cancelled: { label: "Annulée", variant: "outline" },
};

const BookingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { houses, selectedHouseId, loading: housesLoading } = useHouseContext();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  const [newBookingStartDate, setNewBookingStartDate] = useState<Date | undefined>();

  const handleCalendarDayClick = (date: Date) => {
    // Only open dialog for available (future) days
    if (date < new Date(new Date().toDateString())) return;
    setNewBookingStartDate(date);
    setNewBookingOpen(true);
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("id, house_id, unit_id, user_id, start_date, end_date, status, created_at, houses(name, family_id), house_units(name, type)")
      .order("start_date", { ascending: true });

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
  }, [user]);

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

  const canManageBooking = (booking: BookingRow) => {
    return booking.user_id !== user?.id;
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
      <div className="space-y-4 sm:space-y-6 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-display text-foreground">Réservations</h2>
            <p className="text-muted-foreground mt-1">Planifiez et gérez les séjours.</p>
          </div>
          <Button onClick={() => { setNewBookingStartDate(undefined); setNewBookingOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle réservation
          </Button>
          <NewBookingDialog
            onCreated={fetchData}
            externalOpen={newBookingOpen}
            onExternalOpenChange={setNewBookingOpen}
            initialStartDate={newBookingStartDate}
          />
        </div>

        <HouseSelector />

        {houses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-xl text-foreground mb-2">Aucune maison</h3>
              <p className="text-muted-foreground">Créez d'abord une maison pour commencer à réserver.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="calendar" className="space-y-3 sm:space-y-4">
            <TabsList className="w-full grid grid-cols-4 h-auto">
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
                    }))
                  }
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
                      onApprove={() => updateBookingStatus(b.id, "approved")}
                      onRefuse={() => updateBookingStatus(b.id, "refused")}
                      onCancel={() => updateBookingStatus(b.id, "cancelled")}
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
              {filteredBookings.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">Aucune réservation.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredBookings.map((b) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      label={getBookingLabel(b)}
                      userName={getUserName(b)}
                      formatDate={formatDate}
                      canManage={b.status === "pending" && canManageBooking(b)}
                      canCancel={b.user_id === user?.id && (b.status === "pending" || b.status === "approved")}
                      onApprove={() => updateBookingStatus(b.id, "approved")}
                      onRefuse={() => updateBookingStatus(b.id, "refused")}
                      onCancel={() => updateBookingStatus(b.id, "cancelled")}
                    />
                  ))}
                </div>
              )}
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
  onApprove,
  onRefuse,
  onCancel,
}: {
  booking: BookingRow;
  label: string;
  userName: string;
  formatDate: (d: string) => string;
  canManage: boolean;
  canCancel?: boolean;
  onApprove: () => void;
  onRefuse: () => void;
  onCancel?: () => void;
}) => (
  <Card>
    <CardContent className="p-3 sm:py-4 sm:px-6">
      <div className="flex flex-col gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-medium text-sm sm:text-base text-foreground">{label}</p>
            <Badge variant={statusConfig[booking.status]?.variant || "secondary"} className="text-[10px] sm:text-xs">
              {statusConfig[booking.status]?.label || booking.status}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {userName} · {formatDate(booking.start_date)} → {formatDate(booking.end_date)}
          </p>
        </div>
        {(canManage || canCancel) && (
          <div className="flex items-center gap-2 flex-wrap">
            {canManage && (
              <>
                <Button size="sm" variant="outline" className="h-7 text-xs sm:h-8 sm:text-sm" onClick={onApprove}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Accepter
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs sm:h-8 sm:text-sm text-destructive border-destructive/30 hover:bg-destructive/10" onClick={onRefuse}>
                  <X className="h-3.5 w-3.5 mr-1" /> Refuser
                </Button>
              </>
            )}
            {canCancel && onCancel && (
              <Button size="sm" variant="outline" className="h-7 text-xs sm:h-8 sm:text-sm text-destructive border-destructive/30 hover:bg-destructive/10" onClick={onCancel}>
                <X className="h-3.5 w-3.5 mr-1" /> Annuler
              </Button>
            )}
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

export default BookingsPage;
