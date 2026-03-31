import { LayoutDashboard, Building2, CalendarDays, BookOpen, Receipt, User, LogOut, Wrench, FileText, Vote, Eye, KeyRound, Briefcase } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDemo } from "@/contexts/DemoContext";
import { DEMO_PROFILE } from "@/lib/demoData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoCasaCircle from "@/assets/logo-casacircle.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Maisons", url: "/houses", icon: Building2 },
  { title: "Rejoindre", url: "/rejoindre", icon: KeyRound },
  { title: "Réservations", url: "/bookings", icon: CalendarDays },
  { title: "Journal", url: "/journal", icon: BookOpen },
];

const manageItems = [
  { title: "Dépenses", url: "/expenses", icon: Receipt },
  { title: "Votes", url: "/votes", icon: Vote },
  { title: "Maintenance", url: "/maintenance", icon: Wrench },
  { title: "Documents", url: "/documents", icon: FileText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isDemo, exitDemo } = useDemo();
  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (isDemo) {
      setProfile({ first_name: DEMO_PROFILE.first_name, last_name: DEMO_PROFILE.last_name, avatar_url: null });
      return;
    }
    if (!user) return;
    supabase
      .from("users_profiles")
      .select("first_name, last_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user, isDemo]);

  const initials = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .map((n) => n![0]?.toUpperCase())
    .join("") || "?";

  const handleLogout = () => {
    if (isDemo) {
      exitDemo();
      navigate("/");
    } else {
      signOut();
    }
  };

  const renderItems = (items: typeof mainItems) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            end={item.url === "/dashboard"}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary/60 transition-all duration-200"
            activeClassName="bg-primary/10 text-primary font-medium shadow-soft"
          >
            <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
            {!collapsed && <span className="text-[14px]">{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="py-2">
        {/* Logo */}
        <div className="px-4 py-4 flex items-center justify-center">
          <img src={logoCasaCircle} alt="CasaCircle" className="h-9 w-auto" />
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-body font-semibold px-3 mb-1">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">{renderItems(mainItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="mx-3 my-2" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-body font-semibold px-3 mb-1">
            Gestion
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">{renderItems(manageItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-2">
        {!collapsed && profile && (
          <NavLink
            to={isDemo ? "/dashboard" : "/profile"}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/60 transition-all"
            activeClassName="bg-primary/10"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-display">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {[profile.first_name, profile.last_name].filter(Boolean).join(" ") || (isDemo ? "Marie Dupont" : user?.email)}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {isDemo ? "marie@demo.com" : user?.email}
              </p>
            </div>
          </NavLink>
        )}
        {collapsed && (
          <SidebarMenuButton asChild>
            <NavLink to={isDemo ? "/dashboard" : "/profile"} className="flex items-center justify-center" activeClassName="bg-primary/10">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-display">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </NavLink>
          </SidebarMenuButton>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl"
          onClick={handleLogout}
        >
          {isDemo ? <Eye className="h-4 w-4 flex-shrink-0" /> : <LogOut className="h-4 w-4 flex-shrink-0" />}
          {!collapsed && <span className="text-sm">{isDemo ? "Quitter la démo" : "Déconnexion"}</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
