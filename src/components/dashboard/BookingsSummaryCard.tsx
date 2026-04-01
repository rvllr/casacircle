import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/dateFormatter";
import { BOOKING_STATUS_CONFIG } from "@/lib/constants";

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  user_id: string;
  houses: { name: string; location: string | null } | null;
}

interface BookingsSummaryCardProps {
  bookings: Booking[];
  getAuthorName: (userId: string) => string;
}

const statusLabels = BOOKING_STATUS_CONFIG;

const BookingsSummaryCard = ({ bookings, getAuthorName }: BookingsSummaryCardProps) => {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl text-foreground flex items-center gap-2.5">
          <CalendarDays className="h-5 w-5 text-primary" />
          Prochaines réservations
        </h3>
        <Link to="/bookings" className="text-sm text-primary hover:underline flex items-center gap-1 font-medium">
          Tout voir <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {bookings.length === 0 ? (
        <Card className="border-border/50 shadow-soft">
          <CardContent className="empty-state">
            <CalendarDays className="empty-state-icon" />
            <p className="text-muted-foreground">Aucune réservation à venir.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {bookings.map((booking) => (
            <Card key={booking.id} className="border-border/50 shadow-soft hover:shadow-card transition-all duration-200">
              <CardContent className="py-4 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{booking.houses?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(booking.start_date)} → {formatDate(booking.end_date)}
                    <span className="ml-2 text-xs opacity-70">par {getAuthorName(booking.user_id)}</span>
                  </p>
                </div>
                <Badge variant={statusLabels[booking.status]?.variant || "secondary"} className="self-start sm:self-center">
                  {statusLabels[booking.status]?.label || booking.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
};

export default BookingsSummaryCard;
