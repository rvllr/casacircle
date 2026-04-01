import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { useHouseContext } from "@/contexts/HouseContext";
import { DEMO_NOTIFICATIONS } from "@/lib/demoData";
import { Bell, Check, CalendarDays, X, AlertCircle, BanknoteIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
  house_id: string | null;
  metadata: { booking_id?: string } | null;
}

const typeIcons: Record<string, { icon: typeof Bell; color: string; badge?: string; badgeVariant?: "destructive" | "secondary" }> = {
  booking_new: { icon: CalendarDays, color: "text-primary" },
  booking_approved: { icon: Check, color: "text-accent" },
  booking_refused: { icon: X, color: "text-destructive" },
  booking_cancelled: { icon: X, color: "text-muted-foreground" },
  payment_overdue: { icon: AlertCircle, color: "text-destructive", badge: "Paiement", badgeVariant: "destructive" },
  payment_overdue_admin: { icon: AlertCircle, color: "text-destructive", badge: "Paiement", badgeVariant: "destructive" },
};

type FilterType = "all" | "booking" | "payment";

const filterLabels: { value: FilterType; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "booking", label: "Réservations" },
  { value: "payment", label: "Paiements" },
];

const getFilterCategory = (type: string): FilterType => {
  if (type.startsWith("payment_overdue")) return "payment";
  if (type.startsWith("booking_")) return "booking";
  return "booking";
};

const NotificationBell = () => {
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const { houses } = useHouseContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const fetchNotifications = useCallback(async () => {
    if (isDemo) {
      setNotifications(DEMO_NOTIFICATIONS as Notification[]);
      return;
    }
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, is_read, created_at, house_id, metadata")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications((data as Notification[]) || []);
  }, [user, isDemo]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-" + user.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 30));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Filter notifications by active context
  const contextHouseIds = useMemo(() => new Set(houses.map(h => h.id)), [houses]);
  const contextNotifications = useMemo(() => 
    notifications.filter(n => !n.house_id || contextHouseIds.has(n.house_id)),
    [notifications, contextHouseIds]
  );

  const unreadCount = contextNotifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true } as any).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true } as any).eq("user_id", user.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const markPaymentReceived = async (n: Notification) => {
    const bookingId = n.metadata?.booking_id;
    if (!bookingId) return;
    const { error } = await supabase
      .from("bookings")
      .update({ payment_status: "paid" as any })
      .eq("id", bookingId);
    if (error) {
      toast.error("Impossible de marquer le paiement (droits insuffisants ?)");
      return;
    }
    toast.success("Paiement marqué comme reçu");
    markAsRead(n.id);
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="font-display text-sm font-medium text-foreground">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
              Tout marquer lu
            </Button>
          )}
        </div>
        <div className="flex gap-1 px-3 py-2 border-b border-border">
          {filterLabels.map((f) => {
            const count = f.value === "all"
              ? contextNotifications.filter((n) => !n.is_read).length
              : contextNotifications.filter((n) => !n.is_read && getFilterCategory(n.type) === f.value).length;
            return (
              <Button
                key={f.value}
                variant={filter === f.value ? "default" : "ghost"}
                size="sm"
                className="text-xs h-6 px-2.5 rounded-full gap-1"
                onClick={() => setFilter(f.value)}
              >
                {f.label}
                {count > 0 && (
                  <Badge variant={filter === f.value ? "secondary" : "destructive"} className="text-[9px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center">
                    {count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
        <ScrollArea className="max-h-72">
          {(() => {
            const filtered = filter === "all"
              ? contextNotifications
              : contextNotifications.filter((n) => getFilterCategory(n.type) === filter);

            if (filtered.length === 0) {
              return (
                <div className="py-8 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {filter === "all" ? "Aucune notification" : "Aucune notification de ce type"}
                  </p>
                </div>
              );
            }

            return (
              <div className="divide-y divide-border">
                {filtered.map((n) => {
                const config = typeIcons[n.type] || { icon: Bell, color: "text-primary" };
                const Icon = config.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) markAsRead(n.id);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3",
                      !n.is_read && "bg-primary/5",
                      config.badge && !n.is_read && "bg-destructive/5"
                    )}
                  >
                    <div className={cn("mt-0.5 shrink-0", config.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm truncate", !n.is_read ? "font-medium text-foreground" : "text-muted-foreground")}>
                          {n.title}
                        </p>
                        {config.badge && (
                          <Badge variant={config.badgeVariant || "secondary"} className="text-[9px] px-1.5 py-0 h-4 shrink-0">
                            {config.badge}
                          </Badge>
                        )}
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      {n.body && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground/60">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                        </p>
                        {n.type === "payment_overdue_admin" && n.metadata?.booking_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-5 text-[10px] px-2 gap-1 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              markPaymentReceived(n);
                            }}
                          >
                            <BanknoteIcon className="h-3 w-3" />
                            Marquer payé
                          </Button>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
              </div>
            );
          })()}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
