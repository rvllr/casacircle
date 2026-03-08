import { useMemo, useState } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  isSameMonth, isToday, isBefore, startOfDay, startOfWeek, endOfWeek,
  addWeeks, subWeeks, addDays, subDays, isSameDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Columns3, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface CalendarBooking {
  start_date: string;
  end_date: string;
  status: string;
  userName?: string;
  houseName?: string;
  unitName?: string;
}

interface BlockedPeriodEntry {
  start_date: string;
  end_date: string;
  reason: string | null;
}

interface BookingCalendarProps {
  month: Date;
  onMonthChange: (date: Date) => void;
  bookings: CalendarBooking[];
  blockedPeriods?: BlockedPeriodEntry[];
  onDayClick?: (date: Date) => void;
}

type ViewMode = "month" | "week" | "day";

const WEEKDAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];
const WEEKDAYS_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

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

const BookingCalendar = ({ month, onMonthChange, bookings, blockedPeriods = [], onDayClick }: BookingCalendarProps) => {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  const personColorMap = useMemo(() => {
    const uniqueNames = [...new Set(bookings.map((b) => b.userName || "?"))];
    const map: Record<string, typeof PERSON_COLORS[0]> = {};
    uniqueNames.forEach((name, i) => {
      map[name] = PERSON_COLORS[i % PERSON_COLORS.length];
    });
    return map;
  }, [bookings]);

  // Month view days
  const monthDays = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const allDays = eachDayOfInterval({ start, end });
    const startPad = (getDay(start) + 6) % 7;
    const paddedStart: (Date | null)[] = Array(startPad).fill(null);
    return [...paddedStart, ...allDays];
  }, [month]);

  // Week view days
  const weekDays = useMemo(() => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    const we = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: ws, end: we });
  }, [currentDate]);

  const getBookingsForDay = (date: Date): CalendarBooking[] => {
    return bookings.filter((b) => {
      const bStart = new Date(b.start_date);
      const bEnd = new Date(b.end_date);
      return date >= bStart && date <= bEnd && (b.status === "approved" || b.status === "pending");
    });
  };

  const isBlocked = (date: Date): boolean => {
    return blockedPeriods.some((bp) => {
      const bpStart = new Date(bp.start_date);
      const bpEnd = new Date(bp.end_date);
      return date >= bpStart && date <= bpEnd;
    });
  };

  const getBlockedReason = (date: Date): string | null => {
    const bp = blockedPeriods.find((bp) => {
      const bpStart = new Date(bp.start_date);
      const bpEnd = new Date(bp.end_date);
      return date >= bpStart && date <= bpEnd;
    });
    return bp?.reason || null;
  };

  const getDayStatus = (date: Date): "available" | "pending" | "booked" | "past" | "blocked" => {
    if (isBefore(date, startOfDay(new Date()))) return "past";
    if (isBlocked(date)) return "blocked";
    const dayBookings = getBookingsForDay(date);
    if (dayBookings.some((b) => b.status === "approved")) return "booked";
    if (dayBookings.some((b) => b.status === "pending")) return "pending";
    return "available";
  };

  const navigate = (dir: -1 | 1) => {
    if (view === "month") {
      onMonthChange(new Date(month.getFullYear(), month.getMonth() + dir, 1));
    } else if (view === "week") {
      setCurrentDate(dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(dir === 1 ? addDays(currentDate, 1) : subDays(currentDate, 1));
    }
    setSelectedDay(null);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    onMonthChange(startOfMonth(today));
    setSelectedDay(null);
  };

  const handleDayClick = (day: Date) => {
    setSelectedDay((prev) => prev && prev.getTime() === day.getTime() ? null : day);
    onDayClick?.(day);
  };

  const getHeaderLabel = () => {
    if (view === "month") return format(month, "MMMM yyyy", { locale: fr });
    if (view === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, "d MMM", { locale: fr })} — ${format(we, "d MMM yyyy", { locale: fr })}`;
    }
    return format(currentDate, "EEEE d MMMM yyyy", { locale: fr });
  };

  const selectedDayBookings = selectedDay ? getBookingsForDay(selectedDay) : [];

  const renderBookingDetail = (b: CalendarBooking, idx: number) => (
    <div key={idx} className="flex items-center gap-2 text-sm flex-wrap">
      <div className={cn(
        "w-2 h-2 rounded-full shrink-0",
        personColorMap[b.userName || "?"]?.dot || "bg-muted-foreground"
      )} />
      <span className="font-medium text-foreground">{b.userName || "Membre"}</span>
      {b.unitName && <span className="text-xs text-muted-foreground">— {b.unitName}</span>}
      {b.houseName && <Badge variant="outline" className="text-xs">{b.houseName}</Badge>}
      <Badge variant={b.status === "approved" ? "default" : "secondary"} className="text-xs">
        {b.status === "approved" ? "Confirmée" : "En attente"}
      </Badge>
    </div>
  );

  const renderDayCell = (day: Date, compact = false) => {
    const status = getDayStatus(day);
    const dayBookings = getBookingsForDay(day);
    const isSelected = selectedDay && day.getTime() === selectedDay.getTime();
    const current = view === "month" ? isSameMonth(day, month) : true;

    return (
      <button
        key={day.toISOString()}
        onClick={() => handleDayClick(day)}
        className={cn(
          "flex flex-col items-start justify-start rounded-md text-sm transition-colors relative overflow-hidden",
          compact
            ? "min-h-[2.75rem] sm:min-h-[4.5rem] p-0.5 sm:p-1.5"
            : "min-h-[4rem] sm:min-h-[5rem] p-1.5 sm:p-2",
          !current && "opacity-30",
          status === "available" && "bg-accent/30 text-foreground hover:bg-accent/60 cursor-pointer",
          status === "pending" && "bg-secondary text-secondary-foreground border border-primary/30 cursor-pointer",
          status === "booked" && "bg-destructive/15 text-destructive border border-destructive/30 cursor-pointer",
          status === "blocked" && "bg-muted text-muted-foreground/60 cursor-not-allowed line-through",
          status === "past" && "text-muted-foreground/40 cursor-default",
          isToday(day) && "ring-2 ring-primary ring-offset-1",
          isSelected && "ring-2 ring-foreground ring-offset-1"
        )}
      >
        <span className={cn("font-medium", compact ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm")}>
          {format(day, "d")}
        </span>
        {status === "blocked" && (
          <span className={cn("text-muted-foreground/50 truncate w-full", compact ? "text-[8px] sm:text-[10px]" : "text-[10px]")}>
            {getBlockedReason(day) || "Bloqué"}
          </span>
        )}
        {dayBookings.length > 0 && status !== "blocked" && (
          <div className="flex flex-col gap-0.5 mt-0.5 w-full overflow-hidden">
            {compact ? (
              <>
                <div className="hidden sm:flex sm:flex-col gap-0.5 w-full">
                  {dayBookings.slice(0, 2).map((b, idx) => {
                    const color = personColorMap[b.userName || "?"];
                    return (
                      <span key={idx} className={cn("text-[10px] leading-tight truncate rounded px-0.5 py-px w-full", color.bg, color.text)}>
                        {b.userName?.split(" ")[0] || "?"}
                      </span>
                    );
                  })}
                  {dayBookings.length > 2 && <span className="text-[9px] text-muted-foreground">+{dayBookings.length - 2}</span>}
                </div>
                <div className="flex sm:hidden gap-0.5 flex-wrap">
                  {dayBookings.slice(0, 3).map((b, idx) => (
                    <span key={idx} className={cn("w-1.5 h-1.5 rounded-full", personColorMap[b.userName || "?"]?.dot)} />
                  ))}
                  {dayBookings.length > 3 && <span className="text-[8px] text-muted-foreground leading-none">+{dayBookings.length - 3}</span>}
                </div>
              </>
            ) : (
              dayBookings.map((b, idx) => {
                const color = personColorMap[b.userName || "?"];
                return (
                  <span key={idx} className={cn("text-[10px] sm:text-xs leading-tight truncate rounded px-1 py-0.5 w-full", color.bg, color.text)}>
                    {b.userName?.split(" ")[0] || "?"} {b.unitName ? `· ${b.unitName}` : ""}
                  </span>
                );
              })
            )}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {/* View toggle + navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          {([
            { mode: "day" as ViewMode, icon: CalIcon, label: "Jour" },
            { mode: "week" as ViewMode, icon: Columns3, label: "Semaine" },
            { mode: "month" as ViewMode, icon: LayoutGrid, label: "Mois" },
          ]).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors",
                view === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 flex-1 justify-between sm:justify-center">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="font-display text-sm sm:text-lg text-foreground capitalize hover:text-primary transition-colors"
              >
                {getHeaderLabel()}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={view === "month" ? month : currentDate}
                onSelect={(date) => {
                  if (!date) return;
                  setCurrentDate(date);
                  onMonthChange(startOfMonth(date));
                  setSelectedDay(null);
                }}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" className="hidden sm:flex text-xs" onClick={goToToday}>
          Aujourd'hui
        </Button>
      </div>

      {/* MONTH VIEW */}
      {view === "month" && (
        <>
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {WEEKDAYS_SHORT.map((d, i) => (
              <div key={i} className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {monthDays.map((day, i) =>
              day ? renderDayCell(day, true) : <div key={`pad-${i}`} />
            )}
          </div>
        </>
      )}

      {/* WEEK VIEW */}
      {view === "week" && (
        <>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, i) => (
              <div key={i} className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1">
                <span className="hidden sm:inline">{WEEKDAYS_FULL[i].slice(0, 3)}</span>
                <span className="sm:hidden">{WEEKDAYS_SHORT[i]}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => renderDayCell(day, false))}
          </div>
        </>
      )}

      {/* DAY VIEW */}
      {view === "day" && (
        <div className="space-y-3">
          <div className={cn(
            "rounded-lg border p-4 space-y-3",
            isToday(currentDate) ? "border-primary bg-primary/5" : "border-border bg-card"
          )}>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-display text-foreground">{format(currentDate, "d")}</span>
              <div>
                <p className="text-sm font-medium text-foreground capitalize">
                  {format(currentDate, "EEEE", { locale: fr })}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {format(currentDate, "MMMM yyyy", { locale: fr })}
                </p>
              </div>
              {isToday(currentDate) && (
                <Badge className="ml-auto">Aujourd'hui</Badge>
              )}
            </div>

            {(() => {
              const dayBookings = getBookingsForDay(currentDate);
              if (dayBookings.length === 0) {
                return <p className="text-sm text-muted-foreground">Aucune réservation ce jour.</p>;
              }
              return (
                <div className="space-y-2">
                  {dayBookings.map((b, idx) => {
                    const color = personColorMap[b.userName || "?"];
                    return (
                      <div key={idx} className={cn("rounded-lg p-3 space-y-1", color.bg)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className={cn("w-2.5 h-2.5 rounded-full", color.dot)} />
                          <span className={cn("font-medium text-sm", color.text)}>{b.userName || "Membre"}</span>
                          <Badge variant={b.status === "approved" ? "default" : "secondary"} className="text-xs ml-auto">
                            {b.status === "approved" ? "Confirmée" : "En attente"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(b.start_date), "d MMM", { locale: fr })} → {format(new Date(b.end_date), "d MMM yyyy", { locale: fr })}
                        </p>
                        {b.unitName && <p className="text-xs text-muted-foreground">🛏️ {b.unitName}</p>}
                        {b.houseName && <p className="text-xs text-muted-foreground">🏠 {b.houseName}</p>}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Selected day detail (month/week views) */}
      {view !== "day" && selectedDay && (
        <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/30">
          <p className="text-sm font-medium text-foreground capitalize">
            {format(selectedDay, "EEEE d MMMM yyyy", { locale: fr })}
          </p>
          {selectedDayBookings.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucune réservation ce jour.</p>
          ) : (
            <div className="space-y-1.5">
              {selectedDayBookings.map((b, idx) => renderBookingDetail(b, idx))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground pt-2">
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
