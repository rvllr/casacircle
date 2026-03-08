import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, isBefore, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Booking {
  start_date: string;
  end_date: string;
  status: string;
}

interface BookingCalendarProps {
  month: Date;
  onMonthChange: (date: Date) => void;
  bookings: Booking[];
  onDayClick?: (date: Date) => void;
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const BookingCalendar = ({ month, onMonthChange, bookings, onDayClick }: BookingCalendarProps) => {
  const days = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const allDays = eachDayOfInterval({ start, end });

    // Pad start to Monday
    const startPad = (getDay(start) + 6) % 7;
    const paddedStart: (Date | null)[] = Array(startPad).fill(null);

    return [...paddedStart, ...allDays];
  }, [month]);

  const getDayStatus = (date: Date): "available" | "pending" | "booked" | "past" => {
    if (isBefore(date, startOfDay(new Date()))) return "past";

    for (const b of bookings) {
      const bStart = new Date(b.start_date);
      const bEnd = new Date(b.end_date);
      if (date >= bStart && date <= bEnd) {
        if (b.status === "approved") return "booked";
        if (b.status === "pending") return "pending";
      }
    }
    return "available";
  };

  const prev = () => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const next = () => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-display text-lg text-foreground capitalize">
          {format(month, "MMMM yyyy", { locale: fr })}
        </h3>
        <Button variant="ghost" size="icon" onClick={next}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} />;

          const status = getDayStatus(day);
          const current = isSameMonth(day, month);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick?.(day)}
              disabled={status === "past" || status === "booked"}
              className={cn(
                "aspect-square flex items-center justify-center rounded-md text-sm transition-colors relative",
                !current && "opacity-30",
                status === "available" && "bg-accent/30 text-foreground hover:bg-accent/60 cursor-pointer",
                status === "pending" && "bg-amber-100 text-amber-800 border border-amber-300",
                status === "booked" && "bg-destructive/15 text-destructive border border-destructive/30 cursor-not-allowed",
                status === "past" && "text-muted-foreground/40 cursor-default",
                isToday(day) && "ring-2 ring-primary ring-offset-1"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-accent/30 border border-accent/50" />
          Disponible
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
          En attente
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-destructive/15 border border-destructive/30" />
          Réservé
        </div>
      </div>
    </div>
  );
};

export default BookingCalendar;
