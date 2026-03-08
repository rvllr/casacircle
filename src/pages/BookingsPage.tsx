import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import BookingCalendar from "@/components/BookingCalendar";
import NewBookingDialog from "@/components/NewBookingDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Check, X, Building2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface House {
  id: string;
  name: string;
  family_id: string;
}

interface BookingRow {
  id: string;
  house_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  houses: { name: string; family_id: string } | null;
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
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouse, setSelectedHouse] = useState<string>("all");
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [adminFamilyIds, setAdminFamilyIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get admin families
    const { data: memberData } = await supabase
      .from("family_members")
      .select("family_id, role")
      .eq("user_id", user.id);

    const adminIds = (memberData || [])
      .filter((m) => m.role === "admin")
      .map((m) => m.family_id);
    setAdminFamilyIds(adminIds);

    // Get houses
    const { data: housesData } = await supabase
      .from("houses")
      .select("id, name, family_id");

    setHouses(housesData || []);

    // Get bookings with profile info (separate query since no FK)
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("id, house_id, user_id, start_date, end_date, status, created_at, houses(name, family_id)")
      .order("start_date", { ascending: true });

    // Get profiles for booking users
    const userIds = [...new Set((bookingsData || []).map((b) => b.user_id))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from("users_profiles").select("user_id, first_name, last_name").in("user_id", userIds)
      : { data: [] };

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));

    const enriched: BookingRow[] = (bookingsData || []).map((b) => ({
      ...b,
      houses: b.houses as BookingRow["houses"],
      users_profiles: profileMap[b.user_id] || null,
    }));

    setBookings(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredBookings = selectedHouse === "all"
    ? bookings
    : bookings.filter((b) => b.house_id === selectedHouse);

  const calendarBookings = filteredBookings.filter(
    (b) => b.status === "approved" || b.status === "pending"
  );

  const pendingBookings = filteredBookings.filter((b) => b.status === "pending");
  const allBookings = filteredBookings;

  const canManageBooking = (booking: BookingRow) => {
    const familyId = booking.houses?.family_id;
    return familyId ? adminFamilyIds.includes(familyId) : false;
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

  if (loading) {
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-display text-foreground">Réservations</h2>
            <p className="text-muted-foreground mt-1">Planifiez et gérez les séjours.</p>
          </div>
          <NewBookingDialog onCreated={fetchData} />
        </div>

        {/* House filter */}
        {houses.length > 1 && (
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedHouse} onValueChange={setSelectedHouse}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les maisons</SelectItem>
                {houses.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {houses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-xl text-foreground mb-2">Aucune maison</h3>
              <p className="text-muted-foreground">Créez d'abord une famille et une maison pour commencer à réserver.</p>
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
            </TabsList>

            {/* Calendar tab */}
            <TabsContent value="calendar">
              <Card>
                <CardContent className="pt-6">
                  <BookingCalendar
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    bookings={calendarBookings}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pending tab */}
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
                    <Card key={b.id}>
                      <CardContent className="py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{b.houses?.name}</p>
                              <Badge variant="secondary">En attente</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {getUserName(b)} · {formatDate(b.start_date)} → {formatDate(b.end_date)}
                            </p>
                          </div>
                          {canManageBooking(b) && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-sage border-sage/30 hover:bg-sage/10"
                                onClick={() => updateBookingStatus(b.id, "approved")}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Accepter
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => updateBookingStatus(b.id, "refused")}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Refuser
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* All bookings tab */}
            <TabsContent value="all">
              {allBookings.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">Aucune réservation.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {allBookings.map((b) => (
                    <Card key={b.id}>
                      <CardContent className="py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{b.houses?.name}</p>
                              <Badge variant={statusConfig[b.status]?.variant || "secondary"}>
                                {statusConfig[b.status]?.label || b.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {getUserName(b)} · {formatDate(b.start_date)} → {formatDate(b.end_date)}
                            </p>
                          </div>
                          {b.status === "pending" && canManageBooking(b) && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-sage border-sage/30 hover:bg-sage/10"
                                onClick={() => updateBookingStatus(b.id, "approved")}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Accepter
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => updateBookingStatus(b.id, "refused")}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Refuser
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
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

export default BookingsPage;
