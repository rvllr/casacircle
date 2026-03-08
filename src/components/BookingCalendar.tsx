import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, isBefore, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CalendarBooking {
  start_date: string;
  end_date: string;
  status: string;
  userName?: string;
  houseName?: string;
  unitName?: string;
}

interface BookingCalendarProps {
  month: Date;
  onMonthChange: (date: Date) => void;
  bookings: CalendarBooking[];
  onDayClick?: (date: Date) => void;
}

const WEEKDAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

const PERSON_COLORS = [
  { bg: "bg-blue-500/20", text: "text-blue-700", dot: "bg-blue-500" },
  { bg: "bg-emerald-500/20", text: "text-emerald-700", dot: "bg-emerald-500" },
  { bg: "bg-amber-500/20", text: "text-amber-700", dot: "bg-amber-500" },
  { bg: "bg-purple-500/20", text: "text-purple-700", dot: "bg-purple-500" },
  { bg: "bg-rose-500/20", text: "text-rose-700", dot: "bg-rose-500" },
  { bg: "bg-cyan-500/20", text: "text-cyan-700", dot: "bg-cyan-500" },
  { bg: "bg-orange-500/20", text: "text-orange-700", dot: "bg-orange-500" },
  { bg: "bg-indigo-500/20", text: "text-indigo-700", dot: "bg-indigo-500" },
];

const BookingCalendar = ({ month, onMonthChange, bookings, onDayClick }: BookingCalendarProps) => {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const personColorMap = useMemo(() => {
    const uniqueNames = [...new Set(bookings.map((b) => b.userName || "?"))];
    const map: Record<string, typeof PERSON_COLORS[0]> = {};
    uniqueNames.forEach((name, i) => {
      map[name] = PERSON_COLORS[i % PERSON_COLORS.length];
    });
    return map;
  }, [bookings]);

  const days = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const allDays = eachDayOfInterval({ start, end });
    const startPad = (getDay(start) + 6) % 7;
    const paddedStart: (Date | null)[] = Array(startPad).fill(null);
    return [...paddedStart, ...allDays];
  }, [month]);

  const getBookingsForDay = (date: Date): CalendarBooking[] => {
    return bookings.filter((b) => {
      const bStart = new Date(b.start_date);
      const bEnd = new Date(b.end_date);
      return date >= bStart && date <= bEnd && (b.status === "approved" || b.status === "pending");
    });
  };

  const getDayStatus = (date: Date): "available" | "pending" | "booked" | "past" => {
    if (isBefore(date, startOfDay(new Date()))) return "past";
    const dayBookings = getBookingsForDay(date);
    if (dayBookings.some((b) => b.status === "approved")) return "booked";
    if (dayBookings.some((b) => b.status === "pending")) return "pending";
    return "available";
  };

  const prev = () => {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1));
    setSelectedDay(null);
  };
  const next = () => {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const handleDayClick = (day: Date) => {
    setSelectedDay((prev) => prev && prev.getTime() === day.getTime() ? null : day);
    onDayClick?.(day);
  };

  const selectedDayBookings = selectedDay ? getBookingsForDay(selectedDay) : [];

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
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {WEEKDAYS_SHORT.map((d, i) => (
          <div key={i} className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} />;

          const status = getDayStatus(day);
          const current = isSameMonth(day, month);
          const dayBookings = getBookingsForDay(day);
          const isSelected = selectedDay && day.getTime() === selectedDay.getTime();

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className={cn(
                "min-h-[2.75rem] sm:min-h-[4.5rem] flex flex-col items-start justify-start rounded-md text-sm transition-colors relative p-0.5 sm:p-1.5 overflow-hidden",
                !current && "opacity-30",
                status === "available" && "bg-accent/30 text-foreground hover:bg-accent/60 cursor-pointer",
                status === "pending" && "bg-secondary text-secondary-foreground border border-primary/30 cursor-pointer",
                status === "booked" && "bg-destructive/15 text-destructive border border-destructive/30 cursor-pointer",
                status === "past" && "text-muted-foreground/40 cursor-default",
                isToday(day) && "ring-2 ring-primary ring-offset-1",
                isSelected && "ring-2 ring-foreground ring-offset-1"
              )}
            >
              <span className="text-[10px] sm:text-xs font-medium">{format(day, "d")}</span>
              {dayBookings.length > 0 && (
                <div className="flex flex-col gap-0.5 mt-0.5 w-full overflow-hidden">
                  {/* Mobile: show colored dots only; Desktop: show names */}
                  <div className="hidden sm:flex sm:flex-col gap-0.5 w-full">
                    {dayBookings.slice(0, 2).map((b, idx) => {
                      const firstName = b.userName?.split(" ")[0] || "?";
                      const color = personColorMap[b.userName || "?"];
                      return (
                        <span
                          key={idx}
                          className={cn(
                            "text-[10px] leading-tight truncate rounded px-0.5 py-px w-full",
                            color.bg, color.text
                          )}
                        >
                          {firstName}
                        </span>
                      );
                    })}
                    {dayBookings.length > 2 && (
                      <span className="text-[9px] text-muted-foreground">+{dayBookings.length - 2}</span>
                    )}
                  </div>
                  <div className="flex sm:hidden gap-0.5 flex-wrap">
                    {dayBookings.slice(0, 3).map((b, idx) => {
                      const color = personColorMap[b.userName || "?"];
                      return (
                        <span
                          key={idx}
                          className={cn("w-1.5 h-1.5 rounded-full", color.dot)}
                        />
                      );
                    })}
                    {dayBookings.length > 3 && (
                      <span className="text-[8px] text-muted-foreground leading-none">+{dayBookings.length - 3}</span>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/30">
          <p className="text-sm font-medium text-foreground capitalize">
            {format(selectedDay, "EEEE d MMMM yyyy", { locale: fr })}
          </p>
          {selectedDayBookings.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucune réservation ce jour.</p>
          ) : (
            <div className="space-y-1.5">
              {selectedDayBookings.map((b, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    personColorMap[b.userName || "?"]?.dot || "bg-muted-foreground"
                  )} />
                  <span className="font-medium text-foreground">{b.userName || "Membre"}</span>
                  {b.unitName && (
                    <span className="text-xs text-muted-foreground">— {b.unitName}</span>
                  )}
                  {b.houseName && (
                    <Badge variant="outline" className="text-xs ml-auto">{b.houseName}</Badge>
                  )}
                  <Badge
                    variant={b.status === "approved" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {b.status === "approved" ? "Confirmée" : "En attente"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-accent/30 border border-accent/50" />
          Disponible
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-secondary border border-primary/30" />
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
