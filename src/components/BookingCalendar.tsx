import { useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  isSameMonth, isToday, isBefore, startOfDay, startOfWeek, endOfWeek,
  addWeeks, subWeeks, addDays, subDays, isSameDay, differenceInCalendarDays,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Columns3, LayoutGrid, Grid3X3, CalendarRange, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

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

type ViewMode = "month" | "week" | "day" | "year" | "period";
type DayFilter = "all" | "booked" | "available";

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
  const isMobile = useIsMobile();
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [periodRange, setPeriodRange] = useState<DateRange | undefined>();
  const [dayFilter, setDayFilter] = useState<DayFilter>("all");

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

  // Period view days
  const periodDays = useMemo(() => {
    if (!periodRange?.from) return [];
    const end = periodRange.to || periodRange.from;
    return eachDayOfInterval({ start: periodRange.from, end });
  }, [periodRange]);

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

  const hasBooking = (date: Date): boolean => {
    return getBookingsForDay(date).length > 0;
  };

  const filterDay = (date: Date): boolean => {
    if (dayFilter === "all") return true;
    if (dayFilter === "booked") return hasBooking(date);
    if (dayFilter === "available") return !hasBooking(date) && !isBlocked(date);
    return true;
  };

  const navigate = (dir: -1 | 1) => {
    if (view === "year") {
      onMonthChange(new Date(month.getFullYear() + dir, month.getMonth(), 1));
    } else if (view === "month") {
      onMonthChange(new Date(month.getFullYear(), month.getMonth() + dir, 1));
    } else if (view === "week") {
      setCurrentDate(dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else if (view === "day") {
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
    if (view === "year") return `${month.getFullYear()}`;
    if (view === "period") {
      if (!periodRange?.from) return "Sélectionnez une période";
      const from = format(periodRange.from, "d MMM", { locale: fr });
      const to = periodRange.to ? format(periodRange.to, "d MMM yyyy", { locale: fr }) : format(periodRange.from, "d MMM yyyy", { locale: fr });
      return `${from} → ${to}`;
    }
    if (view === "month") return format(month, "MMMM yyyy", { locale: fr });
    if (view === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(ws, "d MMM", { locale: fr })} — ${format(we, "d MMM yyyy", { locale: fr })}`;
    }
    return format(currentDate, "EEEE d MMMM yyyy", { locale: fr });
  };

  const selectedDayBookings = selectedDay ? getBookingsForDay(selectedDay) : [];

  // Period stats
  const periodStats = useMemo(() => {
    if (!periodRange?.from) return null;
    const days = periodDays;
    const totalDays = days.length;
    const bookedDays = days.filter(d => hasBooking(d)).length;
    const availableDays = days.filter(d => !hasBooking(d) && !isBlocked(d) && !isBefore(d, startOfDay(new Date()))).length;
    const blockedDays = days.filter(d => isBlocked(d)).length;
    const pastDays = days.filter(d => isBefore(d, startOfDay(new Date()))).length;

    // Unique bookings in range
    const uniqueBookings = new Set<string>();
    days.forEach(d => {
      getBookingsForDay(d).forEach(b => {
        uniqueBookings.add(`${b.userName}-${b.start_date}-${b.end_date}`);
      });
    });

    return { totalDays, bookedDays, availableDays, blockedDays, pastDays, uniqueBookings: uniqueBookings.size };
  }, [periodRange, periodDays, bookings, blockedPeriods]);

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

  // Period view: list-based rendering for filtered days
  const renderPeriodDayRow = (day: Date) => {
    const status = getDayStatus(day);
    const dayBookings = getBookingsForDay(day);
    const isSelected = selectedDay && day.getTime() === selectedDay.getTime();

    return (
      <button
        key={day.toISOString()}
        onClick={() => handleDayClick(day)}
        className={cn(
          "flex items-start gap-3 rounded-lg p-3 transition-all text-left w-full",
          status === "available" && "bg-accent/20 hover:bg-accent/40",
          status === "pending" && "bg-secondary/50 border border-primary/20",
          status === "booked" && "bg-destructive/10 border border-destructive/20",
          status === "blocked" && "bg-muted/50 opacity-60",
          status === "past" && "opacity-40",
          isToday(day) && "ring-2 ring-primary ring-offset-1",
          isSelected && "ring-2 ring-foreground ring-offset-1",
        )}
      >
        <div className="flex flex-col items-center shrink-0 w-12">
          <span className="text-[10px] text-muted-foreground uppercase">
            {format(day, "EEE", { locale: fr })}
          </span>
          <span className={cn("text-lg font-display", isToday(day) ? "text-primary" : "text-foreground")}>
            {format(day, "d")}
          </span>
          <span className="text-[10px] text-muted-foreground capitalize">
            {format(day, "MMM", { locale: fr })}
          </span>
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          {dayBookings.length === 0 ? (
            <p className="text-xs text-muted-foreground pt-1">
              {status === "blocked" ? (getBlockedReason(day) || "Bloqué") : status === "past" ? "Passé" : "Disponible"}
            </p>
          ) : (
            dayBookings.map((b, idx) => {
              const color = personColorMap[b.userName || "?"];
              return (
                <div key={idx} className={cn("rounded-md px-2.5 py-1.5 flex items-center gap-2", color.bg)}>
                  <div className={cn("w-2 h-2 rounded-full shrink-0", color.dot)} />
                  <span className={cn("text-sm font-medium truncate", color.text)}>
                    {b.userName || "Membre"}
                  </span>
                  {b.unitName && <span className="text-xs text-muted-foreground hidden sm:inline">· {b.unitName}</span>}
                  <Badge variant={b.status === "approved" ? "default" : "secondary"} className="text-[10px] ml-auto shrink-0">
                    {b.status === "approved" ? "✓" : "⏳"}
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </button>
    );
  };

  const filterButtons: { value: DayFilter; label: string; icon?: string }[] = [
    { value: "all", label: "Tous" },
    { value: "booked", label: "Avec réservation" },
    { value: "available", label: "Disponibles" },
  ];

  return (
    <div className="space-y-3">
      {/* View toggle + navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 overflow-x-auto">
          {([
            { mode: "day" as ViewMode, icon: CalIcon, label: "Jour" },
            { mode: "week" as ViewMode, icon: Columns3, label: "Semaine" },
            { mode: "month" as ViewMode, icon: LayoutGrid, label: "Mois" },
            { mode: "year" as ViewMode, icon: Grid3X3, label: "Année" },
            { mode: "period" as ViewMode, icon: CalendarRange, label: "Période" },
          ]).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              className={cn(
                "flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap",
                view === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {view !== "period" && (
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
        )}

        {view === "period" && (
          <div className="flex items-center gap-2 flex-1 justify-center">
            <span className="font-display text-sm sm:text-lg text-foreground capitalize">
              {getHeaderLabel()}
            </span>
          </div>
        )}

        <Button variant="outline" size="sm" className="hidden sm:flex text-xs" onClick={goToToday}>
          Aujourd'hui
        </Button>
      </div>

      {/* Day filter (visible on all views) */}
      <div className="flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          {filterButtons.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setDayFilter(value)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                dayFilter === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* PERIOD VIEW */}
      {view === "period" && (
        <div className="space-y-4">
          {/* Date range picker */}
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
                  <CalendarRange className="h-4 w-4 mr-2" />
                  {periodRange?.from ? (
                    periodRange.to ? (
                      <>
                        {format(periodRange.from, "d MMM yyyy", { locale: fr })} — {format(periodRange.to, "d MMM yyyy", { locale: fr })}
                      </>
                    ) : (
                      format(periodRange.from, "d MMM yyyy", { locale: fr })
                    )
                  ) : (
                    <span className="text-muted-foreground">Choisir une période</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={periodRange}
                  onSelect={setPeriodRange}
                  numberOfMonths={isMobile ? 1 : 2}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {periodRange?.from && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setPeriodRange(undefined)}
              >
                Réinitialiser
              </Button>
            )}
          </div>

          {/* Period stats */}
          {periodStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-xl font-display text-foreground">{periodStats.totalDays}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">jours</p>
              </div>
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-center">
                <p className="text-xl font-display text-destructive">{periodStats.bookedDays}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">jours réservés</p>
              </div>
              <div className="rounded-lg border border-accent/50 bg-accent/10 p-3 text-center">
                <p className="text-xl font-display text-foreground">{periodStats.availableDays}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">jours disponibles</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <p className="text-xl font-display text-foreground">{periodStats.uniqueBookings}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">réservations</p>
              </div>
            </div>
          )}

          {/* Period day list */}
          {periodDays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Sélectionnez une plage de dates pour afficher les jours.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {periodDays.filter(filterDay).length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Aucun jour ne correspond au filtre sélectionné.
                </div>
              ) : (
                periodDays.filter(filterDay).map((day) => renderPeriodDayRow(day))
              )}
            </div>
          )}
        </div>
      )}

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
              day ? (
                filterDay(day) ? renderDayCell(day, true) : (
                  <div key={day.toISOString()} className="min-h-[2.75rem] sm:min-h-[4.5rem] rounded-md opacity-10 bg-muted" />
                )
              ) : <div key={`pad-${i}`} />
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
            {weekDays.map((day) =>
              filterDay(day) ? renderDayCell(day, false) : (
                <div key={day.toISOString()} className="min-h-[4rem] sm:min-h-[5rem] rounded-md opacity-10 bg-muted" />
              )
            )}
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

      {/* YEAR VIEW */}
      {view === "year" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 12 }, (_, monthIdx) => {
            const yearDate = new Date(month.getFullYear(), monthIdx, 1);
            const monthStart = startOfMonth(yearDate);
            const monthEnd = endOfMonth(yearDate);
            const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
            const startPad = (getDay(monthStart) + 6) % 7;
            const paddedDays: (Date | null)[] = [...Array(startPad).fill(null), ...days];

            return (
              <div key={monthIdx} className="space-y-1">
                <button
                  onClick={() => {
                    onMonthChange(yearDate);
                    setView("month");
                  }}
                  className="text-xs sm:text-sm font-display text-foreground capitalize hover:text-primary transition-colors w-full text-left px-1"
                >
                  {format(yearDate, "MMMM", { locale: fr })}
                </button>
                <div className="grid grid-cols-7 gap-px">
                  {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                    <div key={i} className="text-center text-[7px] sm:text-[8px] text-muted-foreground font-medium py-0.5">
                      {d}
                    </div>
                  ))}
                  {paddedDays.map((day, i) => {
                    if (!day) return <div key={`pad-${i}`} />;
                    const status = getDayStatus(day);
                    const dayBookings = getBookingsForDay(day);
                    const show = filterDay(day);
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => {
                          onMonthChange(startOfMonth(day));
                          setCurrentDate(day);
                          setView("day");
                        }}
                        className={cn(
                          "aspect-square flex items-center justify-center text-[8px] sm:text-[10px] rounded-sm transition-colors",
                          !show && "opacity-10",
                          show && status === "available" && "text-foreground hover:bg-accent/40",
                          show && status === "pending" && "bg-secondary text-secondary-foreground",
                          show && status === "booked" && "bg-destructive/20 text-destructive font-semibold",
                          show && status === "blocked" && "bg-muted text-muted-foreground/40 line-through",
                          show && status === "past" && "text-muted-foreground/30",
                          isToday(day) && "ring-1 ring-primary font-bold",
                        )}
                        title={dayBookings.length > 0 ? dayBookings.map(b => b.userName || "Réservation").join(", ") : undefined}
                      >
                        {format(day, "d")}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected day detail (month/week views) */}
      {view !== "day" && view !== "period" && selectedDay && (
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
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-muted border border-border" />
          Bloqué
        </div>
      </div>
    </div>
  );
};

export default BookingCalendar;
