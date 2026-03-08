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
import { CalendarDays, Check, X, Users, BarChart3 } from "lucide-react";
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

  const canManageBooking = (booking: BookingRow) => {
    return booking.user_id !== user?.id;
  };

  const updateBookingStatus = async (bookingId: string, status: "approved" | "refused") => {
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "approved" ? "Réservation confirmée !" : "Réservation refusée." });
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
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-display text-foreground">Réservations</h2>
            <p className="text-muted-foreground mt-1">Planifiez et gérez les séjours.</p>
          </div>
          <NewBookingDialog onCreated={fetchData} />
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
          <Tabs defaultValue="calendar" className="space-y-4">
            <TabsList>
              <TabsTrigger value="calendar">Calendrier</TabsTrigger>
              <TabsTrigger value="pending" className="relative">
                En attente
                {pendingBookings.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-primary text-primary-foreground">
                    {pendingBookings.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">Toutes</TabsTrigger>
              <TabsTrigger value="stats">
                <BarChart3 className="h-4 w-4 mr-1" />
                Statistiques
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar">
              <Card>
                <CardContent className="pt-6">
                  <BookingCalendar
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    bookings={calendarBookings.map((b) => ({
                      start_date: b.start_date,
                      end_date: b.end_date,
                      status: b.status,
                      userName: [b.users_profiles?.first_name, b.users_profiles?.last_name].filter(Boolean).join(" ") || undefined,
                      houseName: selectedHouseId === "all" ? (b.houses?.name || undefined) : undefined,
                      unitName: b.house_units?.name || undefined,
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
                      onApprove={() => updateBookingStatus(b.id, "approved")}
                      onRefuse={() => updateBookingStatus(b.id, "refused")}
                    />
                  ))}
                </div>
              )}
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
                      onApprove={() => updateBookingStatus(b.id, "approved")}
                      onRefuse={() => updateBookingStatus(b.id, "refused")}
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
  onApprove,
  onRefuse,
}: {
  booking: BookingRow;
  label: string;
  userName: string;
  formatDate: (d: string) => string;
  canManage: boolean;
  onApprove: () => void;
  onRefuse: () => void;
}) => (
  <Card>
    <CardContent className="py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-foreground">{label}</p>
            <Badge variant={statusConfig[booking.status]?.variant || "secondary"}>
              {statusConfig[booking.status]?.label || booking.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {userName} · {formatDate(booking.start_date)} → {formatDate(booking.end_date)}
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onApprove}>
              <Check className="h-4 w-4 mr-1" /> Accepter
            </Button>
            <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={onRefuse}>
              <X className="h-4 w-4 mr-1" /> Refuser
            </Button>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

export default BookingsPage;
